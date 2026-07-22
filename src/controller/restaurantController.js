import restaurantModel from "../models/restaurantDetails.js"
import restaurantMenuModel from "../models/restaurantMenu.js";

export const getRestaurants = async (req, res) => {
    try {
        const { search } = req.query;

        let restaurantFilter = {};
        if (search && search.trim()) {
            const query = search.trim();
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escaped, "i");

            const menuDocs = await restaurantMenuModel.find({
                "menu.items.name": { $regex: regex },
            }).select("restaurantId").lean();

            const matchedIds = [
                ...new Set(menuDocs.map((d) => d.restaurantId).filter(Boolean)),
            ];

            const validObjectIds = matchedIds.filter((id) =>
                /^[0-9a-fA-F]{24}$/.test(id)
            );
            const conditions = [
                { name: { $regex: regex } },
                { cuisines: { $regex: regex } },
                { restaurantId: { $in: matchedIds } },
            ];
            if (validObjectIds.length) {
                conditions.push({ _id: { $in: validObjectIds } });
            }
            restaurantFilter = { $or: conditions };
        }

        const restaurants = await restaurantModel.find(restaurantFilter).lean();
        const menuDocs = await restaurantMenuModel.find({}).lean();

        const toStr = (id) => (id ? String(id) : "");
        const itemNamesByRid = {};
        for (const doc of menuDocs) {
            const key = toStr(doc.restaurantId) || toStr(doc._id);
            if (!key) continue;
            const names = [];
            for (const cat of doc.menu || []) {
                for (const item of cat.items || []) {
                    if (item.name) names.push(item.name);
                }
            }
            itemNamesByRid[key] = names;
        }

        const enriched = restaurants.map((r) => {
            const key = toStr(r.restaurantId) || toStr(r._id);
            r.menuItemNames = itemNamesByRid[key] || [];
            return r;
        });

        res.status(200).json({
            success: true,
            message: "Restaurants fetched successfully",
            restaurants: enriched,
        })

    } catch (error) {
        console.error("getRestaurants Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch restaurants"
        })
    }
}
export const getRestaurantMenu = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const restaurantMenu = await restaurantMenuModel.findOne({
            restaurantId,
        });

        if (!restaurantMenu) {
            return res.status(404).send({
                success: false,
                message: "Restaurant menu not found",
            });
        }

        let needsSave = false;
        let catIndex = 0;
        for (const category of restaurantMenu.menu) {
            catIndex++;
            let itemIndex = 0;
            for (const item of category.items) {
                itemIndex++;
                if (!item.itemId) {
                    item.itemId = `${restaurantMenu.restaurantId}_${catIndex}_${itemIndex}`;
                    needsSave = true;
                }
            }
        }
        if (needsSave) {
            await restaurantMenu.save();
        }

        return res.status(200).send({
            success: true,
            message: "Restaurant menu fetched successfully",
            data: restaurantMenu,
        });
    } catch (error) {
        console.error("getRestaurantMenu Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch restaurant menu",
        });
    }
};