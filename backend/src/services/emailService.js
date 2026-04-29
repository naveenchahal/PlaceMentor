import nodemailer from "nodemailer";
import axios from "axios";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const isValidEmail = async (email) => {
  // 1. Basic format check — instant
  const formatOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!formatOk) return { valid: false, reason: "Invalid email format" };

  // 2. Abstract API se real check — 3 sec timeout
  try {
    const response = await axios.get(
      "https://emailvalidation.abstractapi.com/v1/",
      {
        params: {
          api_key: process.env.ABSTRACT_API_KEY,
          email,
        },
        timeout: 3000, // 3 sec se zyada nahi rukega
      }
    );

    const data = response.data;

    // Deliverable nahi hai
    if (data.deliverability === "UNDELIVERABLE") {
      return { valid: false, reason: "This email address does not exist" };
    }

    // Disposable/temporary email
    if (data.is_disposable_email?.value === true) {
      return { valid: false, reason: "Disposable emails are not allowed" };
    }

    return { valid: true };

  } catch (err) {
    // Timeout ya API down — allow karo, OTP bhejne pe fail hoga
    console.warn("Email validation API error:", err.message);
    return { valid: true };
  }
};

const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: `"PlaceMentor" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP - PlaceMentor",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #6366f1;">PlaceMentor</h2>
        <p>Your OTP for verification is:</p>
        <h1 style="color: #6366f1; letter-spacing: 8px;">${otp}</h1>
        <p>This OTP expires in <strong>5 minutes</strong>.</p>
        <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};

export default sendOTP;