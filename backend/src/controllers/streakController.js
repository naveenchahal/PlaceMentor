import prisma from "../config/prisma.js";
import sendOTP, { sendEmail } from "../services/emailService.js"; // ✅ sendEmail bhi import
import { callOllama } from "../config/groq.js";
import cron from "node-cron";

// ─── JSON Helpers ─────────────────────────────────────────────────────────────

const fixJSON = (str) => {
  str = str.replace(/:(\s*)(\d+)"/g, ":$1$2");
  str = str.replace(/,(\s*[}\]])/g, "$1");
  return str;
};

const parseJSON = (rawText) => {
  const cleaned = rawText.replace(/```json|```/gi, "").trim();
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in AI response");
  const jsonStr = jsonMatch[0];
  try {
    return JSON.parse(jsonStr);
  } catch {
    try {
      return JSON.parse(fixJSON(jsonStr));
    } catch (e) {
      throw new Error("Failed to parse AI response as JSON: " + e.message);
    }
  }
};

const getTodayDate = () => new Date().toISOString().split("T")[0];

// ─── Topics & Difficulty ──────────────────────────────────────────────────────

const ALL_TOPICS = [
  "DSA", "System Design", "HR", "OOPs", "Aptitude",
  "Operating Systems", "DBMS", "Networking",
  "Node.js", "Express.js", "React", "JavaScript",
];

const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];

const pickRandomTopics = (count = 5) => {
  const shuffled = [...ALL_TOPICS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const pickDifficulty = (topic) => {
  if (topic === "Aptitude") return "hard";
  return DIFFICULTY_LEVELS[Math.floor(Math.random() * DIFFICULTY_LEVELS.length)];
};

// ─── Gift Messages ────────────────────────────────────────────────────────────

const GIFT_MESSAGES = {
  weekly: {
    7:  "🎉 7-Day Streak! You're on fire! Keep this momentum going!",
    14: "🔥 14-Day Streak! Two weeks of dedication — amazing!",
    21: "⚡ 21-Day Streak! Three weeks strong! You're unstoppable!",
    28: "🌟 28-Day Streak! Almost a month — incredible dedication!",
  },
  monthly: {
    30: "🏆 30-Day Streak! One full month! You're a placement prep champion!",
    60: "💎 60-Day Streak! Two months of consistency — legendary!",
    90: "🚀 90-Day Streak! Three months! You're going to crush every interview!",
  },
  yearly: {
    365: "👑 365-Day Streak! ONE FULL YEAR! You are absolutely unstoppable!",
  },
};

// ─── Pure JS Dice Coefficient ─────────────────────────────────────────────────

const getBigrams = (str) => {
  const bigrams = new Set();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.slice(i, i + 2));
  }
  return bigrams;
};

const diceCoefficient = (a, b) => {
  if (!a || !b) return 0;
  const A = a.toLowerCase().trim();
  const B = b.toLowerCase().trim();
  if (A === B) return 1;
  if (A.length < 2 || B.length < 2) return 0;
  const bigramsA = getBigrams(A);
  const bigramsB = getBigrams(B);
  let intersection = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
};

// ─── 90-Day Duplicate Prevention ─────────────────────────────────────────────

const getRecentQuestionTexts = async () => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentDailyQs = await prisma.dailyQuestion.findMany({
    where:  { createdAt: { gte: ninetyDaysAgo } },
    select: { questions: true },
  });

  const recentTexts = [];
  for (const dq of recentDailyQs) {
    try {
      const parsed = JSON.parse(dq.questions);
      if (Array.isArray(parsed)) {
        parsed.forEach((q) => {
          if (q?.question) recentTexts.push(q.question.trim());
        });
      }
    } catch {
      // skip malformed entries silently
    }
  }
  return recentTexts;
};

const isUnique = (question, recentTexts, acceptedTexts, threshold = 0.75) => {
  if (!question?.question) return false;
  const newText = question.question.trim();

  for (const oldText of recentTexts) {
    if (diceCoefficient(newText, oldText) >= threshold) return false;
  }
  for (const acceptedText of acceptedTexts) {
    if (diceCoefficient(newText, acceptedText) >= threshold) return false;
  }
  return true;
};

// ─── Prompt Builder ───────────────────────────────────────────────────────────

const buildPrompt = (date, topicsWithDifficulty, avoidTexts) => {
  const count = topicsWithDifficulty.length;

  const avoidBlock =
    avoidTexts.length > 0
      ? `\nCRITICAL: Do NOT repeat or closely rephrase ANY of these ${avoidTexts.length} questions:\n${avoidTexts
          .map((q, i) => `${i + 1}. ${q}`)
          .join("\n")}\n`
      : "";

  const topicInstructions = topicsWithDifficulty
    .map((t, i) => `Question ${i + 1}: Topic="${t.topic}", Difficulty="${t.difficulty}"`)
    .join("\n");

  return `You are an expert technical interviewer for software engineering placement preparation.
Generate exactly ${count} interview/aptitude question${count > 1 ? "s" : ""} for daily practice on ${date}.

Assigned topics and difficulties (FOLLOW EXACTLY):
${topicInstructions}
${avoidBlock}
Rules:
1. Aptitude questions MUST be hard level with multi-step calculations or complex logical reasoning.
2. Each question must be unique, non-trivial, and not a rephrasing of a common example.
3. Question type selection:
   - Use "mcq" for: Aptitude, OOPs, DBMS, Networking, Operating Systems
   - Use "text" for: HR, System Design, DSA, Node.js, Express.js, React, JavaScript
4. For "mcq": include "options" (array of 4 strings like ["A) ...", "B) ...", "C) ...", "D) ..."]) and "correctAnswer" (e.g. "B) ...").
5. For "text": omit "options" and "correctAnswer" fields entirely.
6. "answer" field must always be present with a detailed explanation.

Return ONLY a raw JSON array. No markdown, no code fences, no explanation. Start directly with [

[
  {
    "id": 1,
    "topic": "DSA",
    "difficulty": "medium",
    "type": "text",
    "question": "Explain the difference between BFS and DFS with their time complexities.",
    "answer": "BFS uses a queue, explores level by level, O(V+E) time. DFS uses stack/recursion, explores depth first, O(V+E) time. BFS finds shortest path in unweighted graphs; DFS is used for cycle detection, topological sort."
  }
]`;
};

// ─── Core: Greedy Question Generation ────────────────────────────────────────

const generateDailyQuestions = async (date) => {
  const recentTexts = await getRecentQuestionTexts();
  const acceptedQuestions = [];
  const acceptedTexts     = [];
  const TARGET             = 5;
  const MAX_STRICT_ATTEMPTS = 5;

  for (let attempt = 1; attempt <= MAX_STRICT_ATTEMPTS; attempt++) {
    if (acceptedQuestions.length >= TARGET) break;

    const needed = TARGET - acceptedQuestions.length;
    console.log(`🎯 [Attempt ${attempt}] Need ${needed} more unique question${needed > 1 ? "s" : ""}...`);

    const topics = pickRandomTopics(needed);
    const topicsWithDifficulty = topics.map((topic) => ({
      topic,
      difficulty: pickDifficulty(topic),
    }));

    const avoidTexts = [...recentTexts, ...acceptedTexts];
    const prompt     = buildPrompt(date, topicsWithDifficulty, avoidTexts);

    let questions;
    try {
      const rawText = await callOllama(prompt, 180000);
      questions = parseJSON(rawText);
    } catch (err) {
      console.warn(`⚠️ [Attempt ${attempt}] Failed: ${err.message} — retrying...`);
      continue;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.warn(`⚠️ [Attempt ${attempt}] Empty or invalid response — retrying...`);
      continue;
    }

    for (const q of questions) {
      if (acceptedQuestions.length >= TARGET) break;
      if (isUnique(q, recentTexts, acceptedTexts, 0.75)) {
        acceptedQuestions.push({ ...q, id: acceptedQuestions.length + 1 });
        acceptedTexts.push(q.question.trim());
        console.log(`  ✅ Accepted [${q.topic} / ${q.difficulty}]: ${q.question.slice(0, 70)}...`);
      } else {
        console.warn(`  ❌ Duplicate skipped: ${q.question.slice(0, 70)}...`);
      }
    }

    console.log(`  📊 Progress after attempt ${attempt}: ${acceptedQuestions.length}/${TARGET}`);
  }

  if (acceptedQuestions.length < TARGET) {
    const needed = TARGET - acceptedQuestions.length;
    console.warn(`⚠️ Only ${acceptedQuestions.length}/${TARGET} after strict attempts. Fallback round for ${needed} more...`);

    const topics = pickRandomTopics(needed);
    const topicsWithDifficulty = topics.map((topic) => ({
      topic,
      difficulty: pickDifficulty(topic),
    }));

    try {
      const rawText = await callOllama(
        buildPrompt(date, topicsWithDifficulty, [...recentTexts, ...acceptedTexts]),
        180000
      );
      const fallbackQuestions = parseJSON(rawText);

      if (Array.isArray(fallbackQuestions)) {
        for (const q of fallbackQuestions) {
          if (acceptedQuestions.length >= TARGET) break;
          if (isUnique(q, recentTexts, acceptedTexts, 0.95)) {
            acceptedQuestions.push({ ...q, id: acceptedQuestions.length + 1 });
            acceptedTexts.push(q.question.trim());
            console.log(`  🆘 Fallback accepted [${q.topic}]: ${q.question.slice(0, 70)}...`);
          }
        }
      }
    } catch (err) {
      console.error(`❌ Fallback round failed: ${err.message}`);
    }
  }

  if (acceptedQuestions.length === 0) {
    throw new Error("Could not generate any valid questions after all attempts.");
  }

  console.log(`🏁 Done! ${acceptedQuestions.length}/${TARGET} questions ready for ${date}`);
  return acceptedQuestions;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

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
        return res.status(503).json({ message: "AI service error: " + err.message });
      }

      dailyQ = await prisma.dailyQuestion.upsert({
        where:  { date: today },
        update: {},
        create: { date: today, questions: JSON.stringify(questions) },
      });
    }

    let userStreak = await prisma.userStreak.findUnique({
      where: { userId_streakDate: { userId, streakDate: today } },
    });

    if (!userStreak) {
      userStreak = await prisma.userStreak.upsert({
        where:  { userId_streakDate: { userId, streakDate: today } },
        update: {},
        create: {
          userId,
          streakDate:      today,
          dailyQuestionId: dailyQ.id,
          isCompleted:     false,
        },
      });
    }

    const streakInfo = await getStreakInfo(userId);

    return res.json({
      success:     true,
      date:        today,
      isCompleted: userStreak.isCompleted,
      questions:   JSON.parse(dailyQ.questions).map((q) => {
        if (!userStreak.isCompleted) {
          const { answer, correctAnswer, ...safeQ } = q;
          return safeQ;
        }
        return q;
      }),
      streak:      streakInfo,
      userAnswers: userStreak.answers ? JSON.parse(userStreak.answers) : [],
    });
  } catch (error) {
    console.error("GET TODAY ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const submitDailyAnswers = async (req, res) => {
  try {
    const userId      = req.user.id;
    const today       = getTodayDate();
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0)
      return res.status(400).json({ message: "answers array is required" });

    const dailyQ = await prisma.dailyQuestion.findUnique({ where: { date: today } });
    if (!dailyQ)
      return res.status(404).json({ message: "Today's questions not found. Call /today first." });

    const existing = await prisma.userStreak.findUnique({
      where: { userId_streakDate: { userId, streakDate: today } },
    });

    if (existing?.isCompleted)
      return res.status(400).json({ message: "Already completed today's questions!" });

    await prisma.userStreak.upsert({
      where:  { userId_streakDate: { userId, streakDate: today } },
      update: { answers: JSON.stringify(answers), isCompleted: true, completedAt: new Date() },
      create: {
        userId,
        streakDate:      today,
        dailyQuestionId: dailyQ.id,
        answers:         JSON.stringify(answers),
        isCompleted:     true,
        completedAt:     new Date(),
      },
    });

    const streakInfo = await getStreakInfo(userId);
    const gifts      = await checkAndAwardGifts(userId, streakInfo.currentStreak);

    return res.json({
      success:   true,
      message:   "Daily questions completed! 🎉",
      streak:    streakInfo,
      gifts,
      questions: JSON.parse(dailyQ.questions),
    });
  } catch (error) {
    console.error("SUBMIT DAILY ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getStreakDashboard = async (req, res) => {
  try {
    const userId     = req.user.id;
    const streakInfo = await getStreakInfo(userId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.userStreak.findMany({
      where:   { userId, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { streakDate: "desc" },
      take:    30,
    });

    const gifts = await prisma.gift.findMany({
      where:   { userId },
      orderBy: { claimedAt: "desc" },
    });

    return res.json({
      success:        true,
      streak:         streakInfo,
      recentActivity: recentActivity.map((a) => ({
        date:        a.streakDate,
        isCompleted: a.isCompleted,
      })),
      gifts,
    });
  } catch (error) {
    console.error("STREAK DASHBOARD ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getDayQuestions = async (req, res) => {
  try {
    const userId   = req.user.id;
    const { date } = req.params;

    const dailyQ = await prisma.dailyQuestion.findUnique({ where: { date } });
    if (!dailyQ)
      return res.status(404).json({ message: "No questions found for this date" });

    const userStreak = await prisma.userStreak.findUnique({
      where: { userId_streakDate: { userId, streakDate: date } },
    });

    return res.json({
      success:     true,
      date,
      isCompleted: userStreak?.isCompleted || false,
      questions:   JSON.parse(dailyQ.questions),
      userAnswers: userStreak?.answers ? JSON.parse(userStreak.answers) : [],
    });
  } catch (error) {
    console.error("GET DAY QUESTIONS ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const sendReminders = async (req, res) => {
  try {
    const { count } = await sendReminderToAllPending();
    return res.json({ success: true, remindersSent: count });
  } catch (error) {
    console.error("SEND REMINDERS ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Shared Reminder Logic ────────────────────────────────────────────────────

const sendReminderToAllPending = async () => {
  const today = getTodayDate();

  const allUsers = await prisma.user.findMany({
    where:  { isVerified: true },
    select: { id: true, email: true, name: true },
  });

  const completedUserIds = await prisma.userStreak.findMany({
    where:  { streakDate: today, isCompleted: true },
    select: { userId: true },
  });
  const completedIds = new Set(completedUserIds.map((u) => u.userId));

  let reminderCount = 0;

  for (const user of allUsers) {
    if (completedIds.has(user.id)) continue;

    try {
      await sendReminderEmail(user.email, user.name);
      reminderCount++;

      await prisma.userStreak.upsert({
        where:  { userId_streakDate: { userId: user.id, streakDate: today } },
        update: { reminderSent: true },
        create: {
          userId:       user.id,
          streakDate:   today,
          reminderSent: true,
          isCompleted:  false,
        },
      });
    } catch (err) {
      console.error(`Reminder failed for ${user.email}:`, err.message);
    }
  }

  return { count: reminderCount };
};

// ─── Cron Job — 8:00 PM IST ──────────────────────────────────────────────────

cron.schedule(
  "0 20 * * *",
  async () => {
    console.log("⏰ [CRON] 8 PM IST — Running daily streak reminder...");
    try {
      const { count } = await sendReminderToAllPending();
      console.log(`✅ [CRON] Reminder emails sent to ${count} user(s).`);
    } catch (err) {
      console.error("❌ [CRON] Reminder cron job failed:", err.message);
    }
  },
  { timezone: "Asia/Kolkata" }
);

// ─── Streak Info ──────────────────────────────────────────────────────────────

export const getStreakInfo = async (userId) => {
  const streaks = await prisma.userStreak.findMany({
    where:   { userId, isCompleted: true },
    orderBy: { streakDate: "desc" },
  });

  const yearAgo = new Date();
  yearAgo.setDate(yearAgo.getDate() - 365);

  const completedDates = streaks
    .filter((s) => new Date(s.streakDate) >= yearAgo)
    .map((s) => s.streakDate);

  if (streaks.length === 0)
    return {
      currentStreak:     0,
      longestStreak:     0,
      totalCompleted:    0,
      lastCompletedDate: null,
      completedDates:    [],
    };

  let currentStreak = 0;
  const today       = getTodayDate();
  const yesterday   = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let checkDate =
    streaks[0].streakDate === today || streaks[0].streakDate === yesterdayStr
      ? streaks[0].streakDate
      : null;

  if (checkDate) {
    for (const streak of streaks) {
      if (streak.streakDate === checkDate) {
        currentStreak++;
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = prev.toISOString().split("T")[0];
      } else {
        break;
      }
    }
  }

  let longestStreak = 0;
  let tempStreak    = 1;
  for (let i = 1; i < streaks.length; i++) {
    const curr = new Date(streaks[i - 1].streakDate);
    const prev = new Date(streaks[i].streakDate);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    totalCompleted:    streaks.length,
    lastCompletedDate: streaks[0]?.streakDate || null,
    completedDates,
  };
};

// ─── Gift Awards ──────────────────────────────────────────────────────────────

const checkAndAwardGifts = async (userId, currentStreak) => {
  const awarded = [];

  const checkMilestones = async (type, milestones) => {
    for (const [days, message] of Object.entries(milestones)) {
      if (currentStreak === parseInt(days)) {
        const existing = await prisma.gift.findFirst({
          where: { userId, type, milestone: parseInt(days) },
        });
        if (!existing) {
          const gift = await prisma.gift.create({
            data: { userId, type, milestone: parseInt(days), message },
          });
          awarded.push(gift);
        }
      }
    }
  };

  await checkMilestones("weekly",  GIFT_MESSAGES.weekly);
  await checkMilestones("monthly", GIFT_MESSAGES.monthly);
  await checkMilestones("yearly",  GIFT_MESSAGES.yearly);

  return awarded;
};

// ─── Reminder Email Template ──────────────────────────────────────────────────

const sendReminderEmail = async (email, name) => {
  const subject = "⏰ Don't break your streak! Daily questions await";
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
      <h2 style="color: #0ea5e9; margin-bottom: 8px;">Hey ${name}! 🔥</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        You still haven't completed today's <strong>5 daily questions</strong>.<br/>
        Don't let your streak die tonight — you've worked too hard for this!
      </p>
      
        href="${process.env.FRONTEND_URL || "https://place-mentor-iota.vercel.app"}/streak"
        style="
          display: inline-block;
          margin-top: 16px;
          background: #0ea5e9;
          color: white;
          padding: 12px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          font-size: 15px;
        "
      >
        Complete Today's Questions →
      </a>
      <p style="margin-top: 24px; color: #9ca3af; font-size: 13px;">
        Consistency is what separates good from great. Keep going 💪
      </p>
    </div>
  `;
  await sendEmail(email, subject, html); // ✅ sendEmail use karo
};