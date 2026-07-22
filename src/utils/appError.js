export const errorResponse = (res, err, status = 500) => {
    console.error(`[ERROR] ${err.message}`, err.stack?.split('\n').slice(0, 2).join('\n'));
    return res.status(status).json({
        success: false,
        message: status === 500 ? "Something went wrong. Please try again later." : err.message,
    });
};

export const AppError = class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
};
