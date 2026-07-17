export const ORDER_STATUS = {
    PLACED: 0,
    ACCEPTED: 1,
    PREPARING: 2,
    READY_FOR_PICKUP: 3,
    PICKED_UP: 4,
    OUT_FOR_DELIVERY: 5,
    ARRIVING: 6,
    DELIVERED: 7,
    CANCELLED: 8,
};

export const ORDER_STATUS_TEXT = {
    0: "Placed",
    1: "Accepted",
    2: "Preparing",
    3: "Ready for Pickup",
    4: "Picked Up",
    5: "Out for Delivery",
    6: "Arriving",
    7: "Delivered",
    8: "Cancelled",
};

export const ACTIVE_STATUSES = [0, 1, 2, 3, 4, 5, 6];

export const NON_CANCELLABLE_STATUSES = [4, 5, 6, 7];
