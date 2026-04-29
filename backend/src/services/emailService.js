// src/services/emailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,  // ✅ IPv4 force — Railway/Render pe IPv6 blocked hai
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("SMTP VERIFY ERROR:", error.message, error.code);
  } else {
    console.log("SMTP ready ✅");
  }
});

export const isValidEmail = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(email)) {
    return { valid: false, reason: "Invalid email format" };
  }
  return { valid: true };
};

const sendOTP = async (email, otp) => {
  try {
    const info = await transporter.sendMail({
      from: `"PlaceMentor" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP - PlaceMentor",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="color: #6366f1;">PlaceMentor</h2>
          <p>Your OTP for verification is:</p>
          <h1 style="color: #6366f1; letter-spacing: 8px;">${otp}</h1>
          <p>This OTP expires in <strong>5 minutes</strong>.</p>
          <p style="color: #94a3b8; font-size: 12px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
    });
    console.log("✅ Email sent:", info.response);
    return { success: true };
  } catch (err) {
    console.error("❌ Email send failed:", err.message, err.code);
    return { success: false, error: err.message };
  }
};

export default sendOTP;