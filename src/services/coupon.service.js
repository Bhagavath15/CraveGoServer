import couponModel from "../models/couponModel.js";
import orderModel from "../models/orderModel.js";

const hasPreviousOrders = async (userId) => {
  const count = await orderModel.countDocuments({ userId });
  return count > 0;
};

export const getAvailableCoupons = async ({ userId, restaurantId, subtotal }) => {
  const now = new Date();
  const isFirstOrder = !(await hasPreviousOrders(userId));

  const coupons = await couponModel.find({
    isActive: true,
    $and: [
      {
        $or: [
          { validFrom: { $exists: false } },
          { validFrom: null },
          { validFrom: { $lte: now } },
        ],
      },
      {
        $or: [
          { validTill: { $exists: false } },
          { validTill: null },
          { validTill: { $gte: now } },
        ],
      },
      {
        $or: [
          { restaurantId: null },
          { restaurantId: restaurantId },
        ],
      },
      {
        $or: [
          { usageLimit: 0 },
          { $expr: { $lt: [{ $size: "$usedBy" }, "$usageLimit"] } },
        ],
      },
    ],
  }).lean();

  return coupons
    .filter((c) => subtotal === 0 || subtotal >= (c.minimumOrderAmount || 0))
    .filter((c) => !c.firstOrderOnly || isFirstOrder)
    .filter((c) => !c.usedBy?.includes(userId))
    .map((c) => ({
      _id: c._id,
      code: c.code,
      title: c.title,
      description: c.description,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minimumOrderAmount: c.minimumOrderAmount,
      maximumDiscount: c.maximumDiscount,
    }));
};

export const validateCoupon = async ({
  userId,
  couponCode,
  restaurantId,
  subtotal,
  deliveryFee = 0,
  tax = 0,
}) => {
  const code = couponCode.toUpperCase().trim();
  const coupon = await couponModel.findOne({ code, isActive: true });

  if (!coupon) {
    throw new Error("Invalid coupon code");
  }

  const now = new Date();

  if (coupon.validFrom && coupon.validFrom > now) {
    throw new Error("Coupon is not yet valid");
  }

  if (coupon.validTill && coupon.validTill < now) {
    throw new Error("Coupon has expired");
  }

  if (coupon.restaurantId && coupon.restaurantId !== restaurantId) {
    throw new Error("Coupon is not applicable for this restaurant");
  }

  if (subtotal < (coupon.minimumOrderAmount || 0)) {
    throw new Error(
      `Minimum order amount of ₹${coupon.minimumOrderAmount} required`
    );
  }

  if (coupon.usageLimit > 0 && (coupon.usedBy?.length || 0) >= coupon.usageLimit) {
    throw new Error("Coupon usage limit has been reached");
  }

  if (coupon.usedBy?.includes(userId)) {
    throw new Error("You have already used this coupon");
  }

  if (coupon.firstOrderOnly) {
    const orderCount = await orderModel.countDocuments({ userId });
    if (orderCount > 0) {
      throw new Error("This coupon is valid for first order only");
    }
  }

  let discountAmount = 0;

  if (coupon.discountType === "FLAT") {
    discountAmount = coupon.discountValue;
  } else if (coupon.discountType === "PERCENTAGE") {
    discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
    if (coupon.maximumDiscount > 0 && discountAmount > coupon.maximumDiscount) {
      discountAmount = coupon.maximumDiscount;
    }
  } else if (coupon.discountType === "FREE_DELIVERY") {
    discountAmount = deliveryFee;
  }

  const round2 = (n) => Math.round(n * 100) / 100;

  const grandTotal = round2(Number(subtotal) + Number(deliveryFee) + Number(tax) - Number(discountAmount));

  return {
    couponId: coupon._id,
    couponCode: coupon.code,
    couponTitle: coupon.title,
    couponType: coupon.discountType,
    discount: discountAmount,
    grandTotal,
  };
};

export const incrementCouponUsage = async (couponId, userId, session) => {
  await couponModel.findByIdAndUpdate(
    couponId,
    { $addToSet: { usedBy: userId } },
    { session }
  );
};

export const decrementCouponUsage = async (couponId, userId) => {
  await couponModel.findByIdAndUpdate(
    couponId,
    { $pull: { usedBy: userId } }
  );
};
