import axios from "axios";
import prisma from "../config/prisma.js";
import sendOTP from "../services/emailService.js";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fixJSON = (str) => {
  str = str.replace(/:(\s*)(\d+)"/g, ':$1$2');
  str = str.replace(/,(\s*[}\]])/g, '$1');
  return str;
};

const parseJSON = (rawText) => {
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found");
  let jsonStr = jsonMatch[0];
  try { return JSON.parse(jsonStr); }
  catch { return JSON.parse(fixJSON(jsonStr)); }
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const GIFT_MESSAGES = {
  weekly: {
    7:   "🎉 7-Day Streak! You're on fire! Keep this momentum going!",
    14:  "🔥 14-Day Streak! Two weeks of dedication — amazing!",
    21:  "⚡ 21-Day Streak! Three weeks strong! You're unstoppable!",
    28:  "🌟 28-Day Streak! Almost a month — incredible dedication!"
  },
  monthly: {
    30:  "🏆 30-Day Streak! One full month! You're a placement prep champion!",
    60:  "💎 60-Day Streak! Two months of consistency — legendary!",
    90:  "🚀 90-Day Streak! Three months! You're going to crush every interview!"
  },
  yearly: {
    365: "👑 365-Day Streak! ONE FULL YEAR! You are absolutely unstoppable!"
  }
};

// ─── GENERATE DAILY QUESTIONS ─────────────────────────────────────────────────
const generateDailyQuestions = async (date) => {
  const prompt = `You are an expert interviewer. Generate exactly 5 interview questions for daily practice.
One question per topic in this exact order: DSA, System Design, HR, OOPs, Aptitude.
Date: ${date}

Return ONLY a raw JSON array. No markdown, no explanation, no placeholder text.

IMPORTANT: The "answer" field must contain a REAL, DETAILED answer — not placeholder text like "Expected answer with key points".

Example of GOOD answer: "Abstract classes can have method implementations while interfaces cannot (before Java 8). Use abstract class when classes share common behavior, use interface for unrelated classes that share a contract."

Example of BAD answer: "Expected answer with key points" ← NEVER DO THIS

[
  {
    "id": 1,
    "topic": "DSA",
    "difficulty": "medium",
    "type": "text",
    "question": "Explain the difference between BFS and DFS graph traversal.",
    "answer": "BFS uses a queue and explores level by level, good for shortest path. DFS uses a stack/recursion and explores depth first, good for cycle detection and topological sort."
  },
  {
    "id": 2,
    "topic": "System Design",
    "difficulty": "medium",
    "type": "text",
    "question": "How would you design a URL shortener?",
    "answer": "Use a hash function to generate short codes, store mapping in DB with key-value store like Redis for caching, use load balancer for scale, handle redirects with 301/302 status codes."
  },
  {
    "id": 3,
    "topic": "HR",
    "difficulty": "easy",
    "type": "text",
    "question": "Tell me about yourself.",
    "answer": "Structure: Brief intro, education, key skills/projects, why this role. Keep it under 2 minutes. Focus on relevant experience and end with why you are excited about this opportunity."
  },
  {
    "id": 4,
    "topic": "OOPs",
    "difficulty": "medium",
    "type": "mcq",
    "question": "Which OOP concept allows a class to have multiple methods with the same name?",
    "options": ["A) Inheritance", "B) Polymorphism", "C) Encapsulation", "D) Abstraction"],
    "correctAnswer": "B) Polymorphism",
    "answer": "Polymorphism allows multiple methods with same name but different parameters (overloading) or different implementations in subclasses (overriding)."
  },
  {
    "id": 5,
    "topic": "Aptitude",
    "difficulty": "easy",
    "type": "mcq",
    "question": "If a train travels 60km in 1 hour, how long to travel 150km?",
    "options": ["A) 2 hours", "B) 2.5 hours", "C) 3 hours", "D) 1.5 hours"],
    "correctAnswer": "B) 2.5 hours",
    "answer": "Speed = 60 km/h. Time = Distance/Speed = 150/60 = 2.5 hours."
  }
]

Rules:
- id must be plain integer 1-5
- topics must be in order: DSA, System Design, HR, OOPs, Aptitude
- difficulty: easy/medium/hard
- type: text or mcq
- answer MUST be a real detailed answer, never placeholder text
- For mcq: include options array and correctAnswer matching exactly one option`;

  const ollamaRes = await axios.post(OLLAMA_URL, {
    model: OLLAMA_MODEL,
    prompt,
    stream: false
  }, { timeout: 180000 });

  return parseJSON(ollamaRes.data.response.trim());
};

// ─── GET TODAY'S QUESTIONS ────────────────────────────────────────────────────

export const getTodayQuestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const today  = getTodayDate();

    let dailyQ = await prisma.dailyQuestion.findUnique({ where: { date: today } });

    if (!dailyQ) {
      let questions;
      try {
        questions = await generateDailyQuestions(today);
      } catch (err) {
        return res.status(503).json({ message: "Ollama is not running. Start with: ollama serve" });
      }

      dailyQ = await prisma.dailyQuestion.upsert({
        where:  { date: today },
        update: {},
        create: { date: today, questions: JSON.stringify(questions) }
      });
    }

    let userStreak = await prisma.userStreak.findUnique({
      where: { userId_streakDate: { userId, streakDate: today } }
    });

    if (!userStreak) {
      userStreak = await prisma.userStreak.upsert({
        where:  { userId_streakDate: { userId, streakDate: today } },
        update: {},
        create: {
          userId,
          streakDate: today,
          dailyQuestionId: dailyQ.id,
          isCompleted: false
        }
      });
    }

    const streakInfo = await getStreakInfo(userId);

    return res.json({
      success: true,
      date: today,
      isCompleted: userStreak.isCompleted,
      questions: JSON.parse(dailyQ.questions).map(q => {
        if (!userStreak.isCompleted) {
          const { answer, correctAnswer, ...safeQ } = q;
          return safeQ;
        }
        return q;
      }),
      streak: streakInfo,
      userAnswers: userStreak.answers ? JSON.parse(userStreak.answers) : []
    });

  } catch (error) {
    console.error("GET TODAY ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── SUBMIT DAILY ANSWERS ─────────────────────────────────────────────────────

export const submitDailyAnswers = async (req, res) => {
  try {
    const userId  = req.user.id;
    const today   = getTodayDate();
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "answers array is required" });
    }

    const dailyQ = await prisma.dailyQuestion.findUnique({ where: { date: today } });
    if (!dailyQ) return res.status(404).json({ message: "Today's questions not found. Call /today first." });

    const existing = await prisma.userStreak.findUnique({
      where: { userId_streakDate: { userId, streakDate: today } }
    });

    if (existing?.isCompleted) {
      return res.status(400).json({ message: "Already completed today's questions!" });
    }

    await prisma.userStreak.upsert({
      where:  { userId_streakDate: { userId, streakDate: today } },
      update: { answers: JSON.stringify(answers), isCompleted: true, completedAt: new Date() },
      create: {
        userId,
        streakDate: today,
        dailyQuestionId: dailyQ.id,
        answers: JSON.stringify(answers),
        isCompleted: true,
        completedAt: new Date()
      }
    });

    const streakInfo = await getStreakInfo(userId);
    const gifts = await checkAndAwardGifts(userId, streakInfo.currentStreak);

    return res.json({
      success: true,
      message: "Daily questions completed! 🎉",
      streak: streakInfo,
      gifts,
      questions: JSON.parse(dailyQ.questions)
    });

  } catch (error) {
    console.error("SUBMIT DAILY ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── GET STREAK DASHBOARD ─────────────────────────────────────────────────────

export const getStreakDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    // ✅ completedDates ab yahan bhi aa raha hai
    const streakInfo = await getStreakInfo(userId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.userStreak.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { streakDate: 'desc' },
      take: 30
    });

    const gifts = await prisma.gift.findMany({
      where: { userId },
      orderBy: { claimedAt: 'desc' }
    });

    return res.json({
      success: true,
      streak: streakInfo,
      recentActivity: recentActivity.map(a => ({
        date: a.streakDate,
        isCompleted: a.isCompleted
      })),
      gifts
    });

  } catch (error) {
    console.error("STREAK DASHBOARD ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── GET PREVIOUS DAY QUESTIONS ───────────────────────────────────────────────

export const getDayQuestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.params;

    const dailyQ = await prisma.dailyQuestion.findUnique({ where: { date } });
    if (!dailyQ) return res.status(404).json({ message: "No questions found for this date" });

    const userStreak = await prisma.userStreak.findUnique({
      where: { userId_streakDate: { userId, streakDate: date } }
    });

    return res.json({
      success: true,
      date,
      isCompleted: userStreak?.isCompleted || false,
      questions: JSON.parse(dailyQ.questions),
      userAnswers: userStreak?.answers ? JSON.parse(userStreak.answers) : []
    });

  } catch (error) {
    console.error("GET DAY QUESTIONS ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── SEND REMINDER EMAILS ─────────────────────────────────────────────────────

export const sendReminders = async (req, res) => {
  try {
    const today = getTodayDate();

    const allUsers = await prisma.user.findMany({
      where: { isVerified: true },
      select: { id: true, email: true, name: true }
    });

    const completedUserIds = await prisma.userStreak.findMany({
      where: { streakDate: today, isCompleted: true },
      select: { userId: true }
    });
    const completedIds = new Set(completedUserIds.map(u => u.userId));

    let reminderCount = 0;

    for (const user of allUsers) {
      if (completedIds.has(user.id)) continue;
      try {
        await sendReminderEmail(user.email, user.name);
        reminderCount++;
        await prisma.userStreak.upsert({
          where:  { userId_streakDate: { userId: user.id, streakDate: today } },
          update: { reminderSent: true },
          create: { userId: user.id, streakDate: today, reminderSent: true, isCompleted: false }
        });
      } catch (err) {
        console.error(`Reminder failed for ${user.email}:`, err.message);
      }
    }

    return res.json({ success: true, remindersSent: reminderCount });

  } catch (error) {
    console.error("SEND REMINDERS ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ✅ FIX: completedDates array add kiya — Dashboard heatmap ke liye
const getStreakInfo = async (userId) => {
  const streaks = await prisma.userStreak.findMany({
    where: { userId, isCompleted: true },
    orderBy: { streakDate: 'desc' }
  });

  // ✅ Last 365 days ki completed dates — heatmap ke liye
  const yearAgo = new Date();
  yearAgo.setDate(yearAgo.getDate() - 365);
  const completedDates = streaks
    .filter(s => new Date(s.streakDate) >= yearAgo)
    .map(s => s.streakDate)

  if (streaks.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalCompleted: 0,
      lastCompletedDate: null,
      completedDates: []  // ✅
    };
  }

  let currentStreak = 0;
  const today = getTodayDate();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let checkDate = streaks[0].streakDate === today || streaks[0].streakDate === yesterdayStr
    ? streaks[0].streakDate : null;

  if (checkDate) {
    for (const streak of streaks) {
      if (streak.streakDate === checkDate) {
        currentStreak++;
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = prev.toISOString().split('T')[0];
      } else break;
    }
  }

  let longestStreak = 0, tempStreak = 1;
  for (let i = 1; i < streaks.length; i++) {
    const curr = new Date(streaks[i-1].streakDate);
    const prev = new Date(streaks[i].streakDate);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak); }
    else tempStreak = 1;
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    totalCompleted: streaks.length,
    lastCompletedDate: streaks[0]?.streakDate || null,
    completedDates  // ✅ Dashboard heatmap ko green dots milenge
  };
};

const checkAndAwardGifts = async (userId, currentStreak) => {
  const awarded = [];
  const checkMilestones = async (type, milestones) => {
    for (const [days, message] of Object.entries(milestones)) {
      if (currentStreak === parseInt(days)) {
        const existing = await prisma.gift.findFirst({ where: { userId, type, milestone: parseInt(days) } });
        if (!existing) {
          const gift = await prisma.gift.create({ data: { userId, type, milestone: parseInt(days), message } });
          awarded.push(gift);
        }
      }
    }
  };
  await checkMilestones('weekly', GIFT_MESSAGES.weekly);
  await checkMilestones('monthly', GIFT_MESSAGES.monthly);
  await checkMilestones('yearly', GIFT_MESSAGES.yearly);
  return awarded;
};

const sendReminderEmail = async (email, name) => {
  const subject = "⏰ Don't break your streak! Daily questions await";
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0ea5e9;">Hey ${name}! 🔥</h2>
      <p>You have <strong>4 hours left</strong> to complete today's 5 daily questions and maintain your streak!</p>
      <p>Don't let your hard work go to waste. Just 5 questions — that's it!</p>
      <a href="http://localhost:3000/streak"
         style="background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
        Complete Today's Questions →
      </a>
      <p style="color: #64748b; font-size: 12px; margin-top: 20px;">PlaceMentor — Ace Your Placement</p>
    </div>
  `;
  await sendOTP(email, null, subject, html);
};