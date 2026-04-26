import express from "express";
import multer from "multer";
import path from "path";
import { analyzeResume } from "../controllers/resumeController.js";
import authMiddleware from "../middleware/authmiddleware.js";

const router = express.Router();



// Multer config — PDF only, 5MB max
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// POST /api/resume/analyze
router.post("/analyze", authMiddleware, upload.single("resume"), analyzeResume);

export default router;