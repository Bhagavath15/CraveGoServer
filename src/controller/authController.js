import userModel from "../models/user.js";
import emailOtpModel from "../models/emailOtp.js";
import jwt from "jsonwebtoken";
import { sendEmailOtp } from "../utils/emailTransporter.js";

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists with this email"
            });
        }

        const user = await userModel.create({
            name,
            email,
            password,
            isVerified: false
        });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await emailOtpModel.create({
            email,
            otp,
            type: "signup",
            expiresAt
        });

        await sendEmailOtp(email, otp, "signup");

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            success: true,
            message: "User registered. Verification OTP sent to email.",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isVerified: user.isVerified
            }
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const otpData = await emailOtpModel.findOne({ email, type: "signup" });

        if (!otpData) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new one."
            });
        }

        if (otpData.expiresAt < new Date()) {
            await emailOtpModel.deleteOne({ _id: otpData._id });
            return res.status(400).json({
                success: false,
                message: "OTP has expired"
            });
        }

        if (otpData.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        await emailOtpModel.deleteOne({ _id: otpData._id });

        const user = await userModel.findOneAndUpdate(
            { email },
            { isVerified: true },
            { returnDocument: "after" }
        );

        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isVerified: user.isVerified
            }
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isVerified: user.isVerified
            }
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No account found with this email"
            });
        }

        await emailOtpModel.deleteMany({ email, type: "forgot_password" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await emailOtpModel.create({
            email,
            otp,
            type: "forgot_password",
            expiresAt
        });

        await sendEmailOtp(email, otp, "forgot_password");

        return res.status(200).json({
            success: true,
            message: "Password reset OTP sent to your email"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const verifyForgotPasswordOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const otpData = await emailOtpModel.findOne({ email, type: "forgot_password" });

        if (!otpData) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new one."
            });
        }

        if (otpData.expiresAt < new Date()) {
            await emailOtpModel.deleteOne({ _id: otpData._id });
            return res.status(400).json({
                success: false,
                message: "OTP has expired"
            });
        }

        if (otpData.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        await emailOtpModel.deleteOne({ _id: otpData._id });

        const resetToken = jwt.sign(
            { email, purpose: "reset_password" },
            process.env.JWT_SECRET,
            { expiresIn: "10m" }
        );

        return res.status(200).json({
            success: true,
            message: "OTP verified",
            resetToken
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Reset token and new password are required"
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }

        if (decoded.purpose !== "reset_password") {
            return res.status(400).json({
                success: false,
                message: "Invalid reset token"
            });
        }

        const user = await userModel.findOne({ email: decoded.email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const { email, type } = req.body;

        if (!email || !type) {
            return res.status(400).json({
                success: false,
                message: "Email and type (signup/forgot_password) are required"
            });
        }

        if (!["signup", "forgot_password"].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP type"
            });
        }

        if (type === "forgot_password") {
            const user = await userModel.findOne({ email });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "No account found with this email"
                });
            }
        }

        await emailOtpModel.deleteMany({ email, type });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await emailOtpModel.create({ email, otp, type, expiresAt });
        await sendEmailOtp(email, otp, type);

        return res.status(200).json({
            success: true,
            message: "OTP resent to your email"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};