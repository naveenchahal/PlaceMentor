// src/controllers/authController.js
import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import generateOTP from "../services/otpService.js";
import sendOTP, { isValidEmail } from "../services/emailService.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const logEmailError = (err) => {
  console.error("Email error FULL:", {
    message: err.message,
    code: err.code,
    command: err.command,
    response: err.response,
    responseCode: err.responseCode,
  });
};

// ✅ REGISTER
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const emailCheck = isValidEmail(normalizedEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({ message: emailCheck.reason });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    const otp = generateOTP();

    if (existingUser) {
      if (!existingUser.isVerified) {
        await prisma.user.update({
          where: { email: normalizedEmail },
          data: {
            name,
            password: await bcrypt.hash(password, 10),
            otp,
            otpExpire: new Date(Date.now() + OTP_TTL_MS),
            otpSentAt: new Date()
          }
        });

        res.json({ message: "OTP sent" });
        sendOTP(normalizedEmail, otp).catch(logEmailError);
        return;
      }
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashed,
        otp,
        otpExpire: new Date(Date.now() + OTP_TTL_MS),
        otpSentAt: new Date()
      }
    });

    res.status(201).json({ message: "OTP sent" });
    sendOTP(normalizedEmail, otp).catch(logEmailError);
    return;

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ VERIFY OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: "Email & OTP required" });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user)                           return res.status(400).json({ message: "User not found" });
    if (user.otpExpire < new Date())     return res.status(400).json({ message: "OTP expired" });
    if (user.otp !== String(otp).trim()) return res.status(400).json({ message: "Invalid OTP" });

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { isVerified: true, otp: null, otpExpire: null, otpSentAt: null }
    });

    return res.json({ message: "Account verified" });

  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ RESEND OTP
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail) return res.status(400).json({ message: "Email required" });

    const emailCheck = isValidEmail(normalizedEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({ message: emailCheck.reason });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user)           return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Account already verified" });

    if (user.otpSentAt) {
      const elapsed = Date.now() - new Date(user.otpSentAt).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({ message: `Please wait ${waitSec}s before requesting a new OTP` });
      }
    }

    const otp = generateOTP();
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { otp, otpExpire: new Date(Date.now() + OTP_TTL_MS), otpSentAt: new Date() }
    });

    res.json({ message: "OTP resent successfully" });
    sendOTP(normalizedEmail, otp).catch(logEmailError);
    return;

  } catch (error) {
    console.error("RESEND OTP ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ UPDATE NAME
export const updateName = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name required" });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name.trim() }
    });

    const { password: _pw, otp: _o, otpExpire: _e, otpSentAt: _s, sessionToken: _st, ...safeUser } = updated;
    return res.json(safeUser);
  } catch (error) {
    console.error("UPDATE NAME ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email & password required" });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user)            return res.status(404).json({ message: "User not found" });
    if (!user.isVerified) return res.status(400).json({ message: "Please verify your email first" });
    if (!user.password)   return res.status(400).json({ message: "Use Google login" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid password" });

    const sessionToken = crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: { sessionToken }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, sessionToken },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _pw, otp: _otp, otpExpire: _exp, otpSentAt: _sent, sessionToken: _st, ...safeUser } = user;
    return res.json({ token, user: safeUser });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail) return res.status(400).json({ message: "Email required" });

    const emailCheck = isValidEmail(normalizedEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({ message: emailCheck.reason });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !user.isVerified) {
      return res.json({ message: "If this email exists, an OTP has been sent" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Use Google login to reset your password" });
    }

    if (user.otpSentAt) {
      const elapsed = Date.now() - new Date(user.otpSentAt).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({ message: `Please wait ${waitSec}s before requesting again` });
      }
    }

    const otp = generateOTP();
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { otp, otpExpire: new Date(Date.now() + OTP_TTL_MS), otpSentAt: new Date() }
    });

    res.json({ message: "If this email exists, an OTP has been sent" });
    sendOTP(normalizedEmail, otp).catch(logEmailError);
    return;

  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP & new password required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user)                           return res.status(400).json({ message: "User not found" });
    if (!user.otp || !user.otpExpire)    return res.status(400).json({ message: "No OTP requested. Please use forgot password first." });
    if (user.otpExpire < new Date())     return res.status(400).json({ message: "OTP expired. Please request a new one." });
    if (user.otp !== String(otp).trim()) return res.status(400).json({ message: "Invalid OTP" });

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        password: hashed,
        otp: null,
        otpExpire: null,
        otpSentAt: null,
        sessionToken: null
      }
    });

    return res.json({ message: "Password reset successfully" });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};