import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import  protect  from "../middleware/authMiddleware.js"; // ✅ protect import

import {
  register,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  updateName
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register",      register);
router.post("/verify-otp",    verifyOTP);
router.post("/login",         login);
router.post("/resend-otp",    resendOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);
router.put("/update-name",    protect, updateName); // ✅ protect sahi se import hua

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: req.user });
  }
);

export default router;