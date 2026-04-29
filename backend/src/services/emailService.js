// src/services/emailService.js
import nodemailer from "nodemailer";
import { validate } from "deep-email-validator";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Real email existence check — DNS + MX records verify karta hai
export const isValidEmail = async (email) => {
  // Basic format check pehle
  const formatOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!formatOk) return { valid: false, reason: "Invalid email format" };

  // Blocked disposable domains
  const domain = email.split('@')[1].toLowerCase();
  const blockedDomains = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email'];
  if (blockedDomains.includes(domain)) return { valid: false, reason: "Disposable emails not allowed" };

  // DNS + MX record check
  try {
    const result = await validate({
      email,
      sender: email,
      validateRegex: true,
      validateMx: true,
      validateTypo: false,
      validateDisposable: true,
      validateSMTP: false,
    });

    if (!result.valid) {
      return { valid: false, reason: "Email domain does not exist" };
    }

    return { valid: true };
  } catch {
    // Network error pe fail mat karo — allow kardo
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