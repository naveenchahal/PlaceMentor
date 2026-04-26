import express from "express";

import { generateQuestions, evaluateAnswers } from "../controllers/questionController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/questions/generate
router.post("/generate", authMiddleware, generateQuestions);

// POST /api/questions/evaluate
router.post("/evaluate", authMiddleware, evaluateAnswers);

export default router;
