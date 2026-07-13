import cartModel from "../models/cart.js";
import restaurantMenu from "../models/restaurantMenu.js";

const calculateCartTotals = (cart) => {
    let subtotal = 0;

    for (const item of cart.items) {
        const customizationPrice = (item.customization || []).reduce(
            (sum, opt) => sum + (opt.price || 0),
            0
        );
        item.totalPrice = (item.price + customizationPrice) * item.quantity;
        subtotal += item.totalPrice;
    }

    cart.subtotal = subtotal;
    cart.deliveryFee = subtotal >= 499 ? 0 : 40;
    cart.taxes = Number((subtotal * 0.05).toFixed(2));
    cart.grandTotal = cart.subtotal + cart.deliveryFee + cart.taxes - (cart.discount || 0);

    return cart;
};

const findMenuItem = (menuDoc, menuItemId, name) => {
    for (const category of menuDoc.menu) {
        const found =
            category.items.find(
                (i) => i.itemId === menuItemId || i.id === menuItemId || String(i._id) === menuItemId
            ) ||
            category.items.id(menuItemId) ||
            (name && category.items.find((i) => i.name === name));
        if (found) return found;
    }
    return null;
};

export const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { restaurantId, menuItemId, quantity, customization, name } = req.body;

        if (!restaurantId || !menuItemId) {
            return res.status(400).json({
                success: false,
                message: "Restaurant ID and Menu Item ID are required.",
            });
        }
        const qty = Math.max(1, Number(quantity) || 1);

        const menuDoc = await restaurantMenu.findOne({ restaurantId });
        if (!menuDoc) {
            return res.status(404).json({
                success: false,
                message: "Restaurant menu not found.",
            });
        }

        const selectedItem = findMenuItem(menuDoc, menuItemId, name);
        if (!selectedItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found.",
            });
        }

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            cart = await cartModel.create({
                userId,
                restaurantId,
                items: [],
            });
        }

        if (cart.restaurantId && cart.restaurantId !== restaurantId && cart.items.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart contains items from another restaurant.",
            });
        }

        cart.restaurantId = restaurantId;

        const existingItem = cart.items.find(
            (item) => item.menuItemId === menuItemId
        );

        if (existingItem) {
            existingItem.quantity += qty;
        } else {
            cart.items.push({
                menuItemId,
                name: selectedItem.name,
                image: selectedItem.image || "",
                price: selectedItem.price,
                quantity: qty,
                isVeg: selectedItem.isVeg ?? false,
                customization: customization || [],
            });
        }

        calculateCartTotals(cart);
        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Item added to cart.",
            cart,
        });
    } catch (error) {
        console.error("addToCart error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to add item to cart.",
        });
    }
};

export const getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.status(200).json({
                success: true,
                cart: null,
            });
        }

        return res.status(200).json({
            success: true,
            cart,
        });
    } catch (error) {
        console.error("getCart error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get cart.",
        });
    }
};

export const updateCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { menuItemId, quantity } = req.body;

        if (!menuItemId) {
            return res.status(400).json({
                success: false,
                message: "Menu item ID is required.",
            });
        }

        const qty = Math.max(1, Number(quantity) || 1);

        const cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found.",
            });
        }

        const item = cart.items.find((item) => item.menuItemId === menuItemId);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart.",
            });
        }

        item.quantity = qty;
        calculateCartTotals(cart);
        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Cart updated.",
            cart,
        });
    } catch (error) {
        console.error("updateCartItem error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update cart item.",
        });
    }
};

export const removeCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { menuItemId } = req.body;

        if (!menuItemId) {
            return res.status(400).json({
                success: false,
                message: "Menu item ID is required.",
            });
        }

        const cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found.",
            });
        }

        const initialLength = cart.items.length;
        cart.items = cart.items.filter((item) => item.menuItemId !== menuItemId);

        if (cart.items.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart.",
            });
        }

        if (cart.items.length === 0) {
            cart.restaurantId = null;
        }

        calculateCartTotals(cart);
        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Item removed from cart.",
            cart,
        });
    } catch (error) {
        console.error("removeCartItem error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to remove item.",
        });
    }
};

export const clearCart = async (req, res) => {
    try {
        const userId = req.user.id;

        const cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.status(200).json({
                success: true,
                message: "Cart is already empty.",
                cart: null,
            });
        }

        cart.items = [];
        cart.restaurantId = null;
        cart.subtotal = 0;
        cart.deliveryFee = 0;
        cart.taxes = 0;
        cart.discount = 0;
        cart.grandTotal = 0;

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully.",
            cart,
        });
    } catch (error) {
        console.error("clearCart error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to clear cart.",
        });
    }
};
