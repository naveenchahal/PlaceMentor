import express from "express";
import {
  getTodayQuestions,
  submitDailyAnswers,
  getStreakDashboard,
  getDayQuestions,
  sendReminders
} from "../controllers/streakController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET  /api/streak/today          — today's 5 questions
router.get("/today", authMiddleware, getTodayQuestions);

// POST /api/streak/submit         — submit answers
router.post("/submit", authMiddleware, submitDailyAnswers);

// GET  /api/streak/info           — streak dashboard
router.get("/info", authMiddleware, getStreakDashboard);

// GET  /api/streak/history/:date  — past day questions
router.get("/history/:date", authMiddleware, getDayQuestions);

// POST /api/streak/send-reminders — send reminder emails (cron job)
router.post("/send-reminders", sendReminders);

export default router;
