// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

 const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // DB se sessionToken fetch karo
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, sessionToken: true }
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // JWT ka sessionToken DB se match nahi karta = naya login aa gaya = purani device logout
    if (!user.sessionToken || user.sessionToken !== decoded.sessionToken) {
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
export default protect;