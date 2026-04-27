// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ DB se user fetch karo aur sessionToken match karo
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, sessionToken: true }
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // ✅ Agar sessionToken match nahi karta — matlab kisi aur device ne login kar liya
    if (user.sessionToken !== decoded.sessionToken) {
      return res.status(401).json({ message: "Session expired. Please login again." });
    }

    req.user = { id: user.id, role: user.role };
    next();

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired. Please login again." });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};
