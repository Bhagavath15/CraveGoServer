import restaurantModel from "../models/restaurantDetails.js"
import restaurantMenuModel from "../models/restaurantMenu.js";

const computeIsOpen = (operatingHours) => {
    if (!operatingHours || !operatingHours.trim()) return true;
    const range = operatingHours.trim();
    const parts = range.split("-").map((p) => p.trim());
    if (parts.length !== 2) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const parseTime = (t) => {
        const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (!match) return NaN;
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3];
        if (ampm) {
            if (ampm.toUpperCase() === "PM" && h !== 12) h += 12;
            if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
        }
        return h * 60 + m;
    };
    const openMin = parseTime(parts[0]);
    const closeMin = parseTime(parts[1]);
    if (isNaN(openMin) || isNaN(closeMin)) return true;
    if (closeMin < openMin) {
        return currentMinutes >= openMin || currentMinutes <= closeMin;
    }
    return currentMinutes >= openMin && currentMinutes <= closeMin;
};

export const getRestaurants = async (req, res) => {
    try {
        const {
            search, page = "1", limit = "20",
            sortBy, sortOrder = "desc",
            rating, minRating,
            maxDeliveryTime, maxDistance, maxPrice,
            veg, offers, freeDelivery,
            cuisines, category,
            openNow,
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        let restaurantFilter = {};

        if (search && search.trim()) {
            const query = search.trim();
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escaped, "i");

            const menuDocs = await restaurantMenuModel.find({
                $or: [
                    { "menu.items.name": { $regex: regex } },
                    { "menu.items.description": { $regex: regex } },
                ],
            }).select("restaurantId").lean();

            const matchedIds = [
                ...new Set(menuDocs.map((d) => d.restaurantId).filter(Boolean)),
            ];

            const conditions = [
                { name: { $regex: regex } },
                { cuisines: { $regex: regex } },
                { description: { $regex: regex } },
                { category: { $regex: regex } },
                { offer: { $regex: regex } },
                { offerDescription: { $regex: regex } },
                { restaurantId: { $in: matchedIds } },
            ];
            const validObjectIds = matchedIds.filter((id) =>
                /^[0-9a-fA-F]{24}$/.test(id)
            );
            if (validObjectIds.length) {
                conditions.push({ _id: { $in: validObjectIds } });
            }
            restaurantFilter = { $or: conditions };
        }

        if (veg === "true") restaurantFilter.isVeg = true;
        else if (veg === "false") restaurantFilter.isVeg = false;

        if (minRating) {
            restaurantFilter.rating = { $gte: parseFloat(minRating) };
        } else if (rating) {
            restaurantFilter.rating = { $gte: parseFloat(rating) };
        }

        if (maxDeliveryTime) {
            restaurantFilter.deliveryTime = { $nin: ["", null] };
        }

        if (cuisines) {
            const cuisineList = cuisines.split(",").map((c) => c.trim()).filter(Boolean);
            if (cuisineList.length) {
                restaurantFilter.cuisines = { $in: cuisineList };
            }
        }

        if (category) {
            const catList = category.split(",").map((c) => c.trim()).filter(Boolean);
            if (catList.length) {
                restaurantFilter.category = { $in: catList };
            }
        }

        const allRestaurants = await restaurantModel.find(restaurantFilter).lean();

        const enriched = allRestaurants.map((r) => {
            let parsedDistance = Infinity;
            if (r.distance) {
                const num = parseFloat(r.distance.replace(/[^0-9.]/g, ""));
                if (!isNaN(num)) parsedDistance = num;
            }

            let parsedDeliveryTime = Infinity;
            if (r.deliveryTime) {
                const nums = r.deliveryTime.match(/\d+/g);
                if (nums) parsedDeliveryTime = Math.min(...nums.map(Number));
            }

            let parsedPrice = Infinity;
            if (r.priceForOne) {
                const num = parseFloat(r.priceForOne.replace(/[^0-9.]/g, ""));
                if (!isNaN(num)) parsedPrice = num;
            }

            return {
                ...r,
                _parsedDistance: parsedDistance,
                _parsedDeliveryTime: parsedDeliveryTime,
                _parsedPrice: parsedPrice,
            };
        });

        let filtered = enriched;

        if (maxDeliveryTime) {
            const maxTime = parseInt(maxDeliveryTime, 10);
            if (!isNaN(maxTime)) {
                filtered = filtered.filter((r) => r._parsedDeliveryTime <= maxTime);
            }
        }

        if (maxDistance) {
            const maxDist = parseFloat(maxDistance);
            if (!isNaN(maxDist)) {
                filtered = filtered.filter((r) => r._parsedDistance <= maxDist);
            }
        }

        if (maxPrice) {
            const maxP = parseFloat(maxPrice);
            if (!isNaN(maxP)) {
                filtered = filtered.filter((r) => r._parsedPrice <= maxP);
            }
        }

        if (offers === "true") {
            filtered = filtered.filter((r) => r.offer && r.offer.trim());
        }

        if (freeDelivery === "true") {
            filtered = filtered.filter((r) => r.freeDelivery === true || (r.deliveryFee && r.deliveryFee.trim().toLowerCase() === "free"));
        }

        if (openNow === "true") {
            filtered = filtered.filter((r) => computeIsOpen(r.operatingHours));
        }

        if (sortBy) {
            const order = sortOrder === "asc" ? 1 : -1;
            const sortMap = {
                rating: (r) => r.rating || 0,
                deliveryTime: (r) => r._parsedDeliveryTime,
                priceForOne: (r) => r._parsedPrice,
                distance: (r) => r._parsedDistance,
                name: (r) => (r.name || "").toLowerCase(),
            };
            const getVal = sortMap[sortBy];
            if (getVal) {
                filtered.sort((a, b) => {
                    const va = getVal(a);
                    const vb = getVal(b);
                    if (va < vb) return -1 * order;
                    if (va > vb) return 1 * order;
                    return 0;
                });
            }
        }

        const total = filtered.length;
        const totalPages = Math.ceil(total / limitNum);
        const paginated = filtered.slice(skip, skip + limitNum);

        const restaurantIds = paginated.map((r) => r.restaurantId || r._id).filter(Boolean);

        const menuDocs = await restaurantMenuModel.find({
            restaurantId: { $in: restaurantIds.map(String) },
        }).lean();

        const itemNamesByRid = {};
        for (const doc of menuDocs) {
            const key = String(doc.restaurantId || doc._id);
            const names = [];
            for (const cat of doc.menu || []) {
                for (const item of cat.items || []) {
                    if (item.name) names.push(item.name);
                }
            }
            itemNamesByRid[key] = names;
        }

        const final = paginated.map((r) => {
            const key = String(r.restaurantId || r._id);
            const names = itemNamesByRid[key] || [];
            const dynamicIsOpen = computeIsOpen(r.operatingHours);
            return {
                id: String(r.restaurantId || r._id),
                restaurantId: String(r.restaurantId || r._id),
                name: r.name,
                image: r.image,
                description: r.description,
                category: r.category || [],
                cuisines: Array.isArray(r.cuisines) ? r.cuisines : r.cuisines ? [r.cuisines] : [],
                address: r.address,
                rating: r.rating || 0,
                totalRatings: r.totalRatings || "0",
                distance: r.distance || "",
                deliveryTime: r.deliveryTime || "",
                priceForOne: r.priceForOne || "",
                priceForTwo: r.priceForTwo || "",
                deliveryFee: r.deliveryFee || "",
                freeDelivery: r.freeDelivery ?? false,
                operatingHours: r.operatingHours || "",
                isOpen: dynamicIsOpen,
                offer: r.offer,
                offerDescription: r.offerDescription,
                isVeg: r.isVeg ?? false,
                isFavorite: r.isFavorite ?? false,
                menuItemNames: names,
            };
        });

        const allCuisines = new Set();
        for (const r of final) {
            for (const c of r.cuisines) {
                if (c) allCuisines.add(c);
            }
        }

        res.status(200).json({
            success: true,
            message: "Restaurants fetched successfully",
            restaurants: final,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages,
                hasMore: pageNum < totalPages,
            },
            metadata: {
                cuisines: Array.from(allCuisines).sort(),
            },
        });

    } catch (error) {
        console.error("getRestaurants Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch restaurants",
        });
    }
};

export const getSuggestions = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || !q.trim()) {
            return res.status(200).json({ success: true, suggestions: [] });
        }

        const query = q.trim();
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");

        const results = new Map();

        const restaurants = await restaurantModel.find({
            $or: [
                { name: { $regex: regex } },
                { cuisines: { $regex: regex } },
                { category: { $regex: regex } },
            ],
        }).select("name cuisines category image").limit(10).lean();

        for (const r of restaurants) {
            if (r.name && !results.has(r.name)) {
                results.set(r.name, { type: "restaurant", label: r.name, image: r.image });
            }
            if (Array.isArray(r.cuisines)) {
                for (const c of r.cuisines) {
                    if (c && regex.test(c) && !results.has(c)) {
                        results.set(c, { type: "cuisine", label: c });
                    }
                }
            }
            if (Array.isArray(r.category)) {
                for (const c of r.category) {
                    if (c && regex.test(c) && !results.has(c)) {
                        results.set(c, { type: "category", label: c });
                    }
                }
            }
        }

        const menuDocs = await restaurantMenuModel.find({
            "menu.items.name": { $regex: regex },
        }).select("restaurantId menu").limit(10).lean();

        const seenItems = new Set();
        for (const doc of menuDocs) {
            for (const cat of doc.menu || []) {
                for (const item of cat.items || []) {
                    const key = item.name;
                    if (key && regex.test(key) && !seenItems.has(key)) {
                        seenItems.add(key);
                        const label = key.length > 50 ? key.substring(0, 50) + "..." : key;
                        if (!results.has(label)) {
                            results.set(label, {
                                type: "menu_item", label,
                                restaurantId: doc.restaurantId,
                            });
                        }
                    }
                }
            }
        }

        const suggestions = Array.from(results.values()).slice(0, 12);

        res.status(200).json({ success: true, suggestions });
    } catch (error) {
        console.error("getSuggestions Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch suggestions" });
    }
};

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
