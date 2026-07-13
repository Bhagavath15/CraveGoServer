import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendEmailOtp = async (email, otp, type) => {
    const subject = type === "signup" ? "CraveGo - Verify Your Email" : "CraveGo - Reset Your Password";
    const message =
        type === "signup"
            ? `Welcome to CraveGo! Your email verification OTP is: ${otp}. It expires in 5 minutes.`
            : `You requested a password reset. Your OTP is: ${otp}. It expires in 5 minutes.`;

    await transporter.sendMail({
        from: `"CraveGo" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        text: message,
    });
};

export default transporter;