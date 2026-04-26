import express from "express";
import {
  startInterview,
  nextQuestion,
  finishInterview,
  getHistory,
  getSessionDetail
} from "../controllers/interviewController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/interview/start           — start new session
router.post("/start", authMiddleware, startInterview);

// POST /api/interview/next            — submit answer, get next question
router.post("/next", authMiddleware, nextQuestion);

// POST /api/interview/finish          — end session & get full analysis
router.post("/finish", authMiddleware, finishInterview);

// GET  /api/interview/history         — all past sessions (summary)
router.get("/history", authMiddleware, getHistory);

// GET  /api/interview/session/:id     — single session full detail
router.get("/session/:id", authMiddleware, getSessionDetail);

export default router;
