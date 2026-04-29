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

        // 🔥 FIX: await sendOTP
        await sendOTP(normalizedEmail, otp);

        return res.json({ message: "OTP sent" });
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

    // 🔥 FIX: await sendOTP
    await sendOTP(normalizedEmail, otp);

    return res.status(201).json({ message: "OTP sent" });

  } catch (error) {
    logEmailError(error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ RESEND OTP
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email required" });
    }

    const emailCheck = isValidEmail(normalizedEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({ message: emailCheck.reason });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) return res.status(404).json({ message: "User not found" });
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
      data: {
        otp,
        otpExpire: new Date(Date.now() + OTP_TTL_MS),
        otpSentAt: new Date()
      }
    });

    // 🔥 FIX
    await sendOTP(normalizedEmail, otp);

    return res.json({ message: "OTP resent successfully" });

  } catch (error) {
    logEmailError(error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ✅ FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email required" });
    }

    const emailCheck = isValidEmail(normalizedEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({ message: emailCheck.reason });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user || !user.isVerified) {
      return res.json({ message: "If this email exists, an OTP has been sent" });
    }

    const otp = generateOTP();

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        otp,
        otpExpire: new Date(Date.now() + OTP_TTL_MS),
        otpSentAt: new Date()
      }
    });

    // 🔥 FIX
    await sendOTP(normalizedEmail, otp);

    return res.json({ message: "If this email exists, an OTP has been sent" });

  } catch (error) {
    logEmailError(error);
    return res.status(500).json({ message: "Server error" });
  }
};