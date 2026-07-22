import mongoose from "mongoose";

const emailOtpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        otp: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ["signup", "forgot_password"],
            required: true
        },
        expiresAt: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
)

emailOtpSchema.index({ email: 1, type: 1 });
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const emailOtpModel = mongoose.model("EmailOtp", emailOtpSchema);

export default emailOtpModel;