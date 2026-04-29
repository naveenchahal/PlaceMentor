import nodemailer from "nodemailer";
import { validate } from "deep-email-validator";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const isValidEmail = async (email) => {
  // 1. Basic format check
  const formatOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!formatOk) return { valid: false, reason: "Invalid email format" };

  // 2. Blocked disposable domains
  const domain = email.split('@')[1].toLowerCase();
  const blockedDomains = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email'];
  if (blockedDomains.includes(domain)) return { valid: false, reason: "Disposable emails not allowed" };

  // 3. DNS + MX check with strict timeout
  try {
    const result = await Promise.race([
      validate({
        email,
        sender: email,
        validateRegex: true,
        validateMx: true,
        validateTypo: false,
        validateDisposable: true,
        validateSMTP: false,
      }),
      // ✅ 5 second timeout — agar DNS slow hai toh fail karo, allow mat karo
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Email validation timeout")), 5000)
      )
    ]);

    if (!result.valid) {
      const reason = result.validators?.mx?.reason || result.validators?.disposable?.reason;
      return { valid: false, reason: reason || "Email domain does not exist" };
    }

    return { valid: true };

  } catch (err) {
    // ✅ Ab network error/timeout pe BLOCK karo — allow mat karo
    console.warn("Email validation failed:", err.message);
    return { valid: false, reason: "Could not verify email. Please enter a valid email address." };
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