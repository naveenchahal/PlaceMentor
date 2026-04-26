import axios from "axios";
import prisma from "../config/prisma.js";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOPICS = {
  dsa: "Data Structures & Algorithms (arrays, linked lists, trees, graphs, sorting, dynamic programming)",
  backend: "Backend Development (REST APIs, databases, authentication, caching, system design)",
  react: "React.js (hooks, state management, component lifecycle, performance, Redux)",
  aptitude: "Aptitude (quantitative, logical reasoning, verbal ability, puzzles)",
  hr: "HR Round (tell me about yourself, strengths & weaknesses, why this company, teamwork, conflict resolution, career goals, salary expectations, situational questions)"
};

const TIME_LIMITS = {
  "30": 30,
  "60": 60,
  "90": 90
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fixJSON = (str) => {
  str = str.replace(/:(\s*)(\d+)"/g, ':$1$2');
  str = str.replace(/,(\s*[}\]])/g, '$1');
  return str;
};

const parseJSON = (rawText) => {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/) || rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON found");
  let jsonStr = jsonMatch[0];
  try {
    return JSON.parse(jsonStr);
  } catch {
    return JSON.parse(fixJSON(jsonStr));
  }
};

const callOllama = async (prompt, timeout = 120000) => {
  const res = await axios.post(OLLAMA_URL, {
    model: OLLAMA_MODEL,
    prompt,
    stream: false
  }, { timeout });
  return res.data.response.trim();
};

// ─── START INTERVIEW SESSION ──────────────────────────────────────────────────

// POST /api/interview/start
// Body: { topic, duration, numQuestions }
// topic: "dsa" | "backend" | "react" | "aptitude"
// duration: "30" | "60" | "90" (minutes)
// numQuestions: 5-20
export const startInterview = async (req, res) => {
  try {
    const { topic, duration, numQuestions } = req.body;
    const userId = req.user.id;

    if (!topic || !duration || !numQuestions) {
      return res.status(400).json({ message: "topic, duration and numQuestions are required" });
    }

    if (!TOPICS[topic]) {
      return res.status(400).json({ message: `Invalid topic. Choose from: ${Object.keys(TOPICS).join(", ")}` });
    }

    const num = parseInt(numQuestions);
    if (isNaN(num) || num < 3 || num > 20) {
      return res.status(400).json({ message: "numQuestions must be between 3 and 20" });
    }

    const timeLimitMin = TIME_LIMITS[String(duration)] || 60;
    const topicDescription = TOPICS[topic];

    // Generate all questions upfront
    const prompt = `You are an expert interviewer conducting a ${timeLimitMin}-minute technical interview on: ${topicDescription}.

${topic === "hr" ? `Generate exactly ${num} HR interview questions. All must be type "text" — no MCQ or code. Focus on behavioral, situational, and personality questions.` : `Generate exactly ${num} interview questions. Mix different types for a real interview feel.`}

Return ONLY a raw JSON array. No markdown, no explanation.

[
  {
    "id": 1,
    "type": "mcq",
    "topic": "Arrays",
    "difficulty": "easy",
    "question": "Question text here",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correctAnswer": "A) option1",
    "explanation": "Why this is correct"
  },
  {
    "id": 2,
    "type": "text",
    "topic": "Linked Lists",
    "difficulty": "medium",
    "question": "Explain how you would reverse a linked list",
    "correctAnswer": "Expected key points in the answer",
    "explanation": "Full explanation"
  },
  {
    "id": 3,
    "type": "code",
    "topic": "Dynamic Programming",
    "difficulty": "hard",
    "question": "Write a function to find the longest common subsequence",
    "correctAnswer": "def lcs(s1, s2): ...",
    "explanation": "Approach explanation"
  }
]

Rules:
- id must be plain integer
- type must be: "mcq", "text", or "code"
- difficulty must be: "easy", "medium", or "hard"
- For MCQ: always include options array and correctAnswer must match one option exactly
- For text/code: correctAnswer should be key points expected
- Mix difficulties: 30% easy, 50% medium, 20% hard
- All questions must be specifically about: ${topicDescription}`;

    let questions;
    try {
      const rawText = await callOllama(prompt, 180000);
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      try {
        questions = JSON.parse(jsonMatch[0]);
      } catch {
        questions = JSON.parse(fixJSON(jsonMatch[0]));
      }
    } catch (err) {
      return res.status(500).json({ message: "Failed to generate questions: " + err.message });
    }

    // Save session to DB
    const session = await prisma.interviewSession.create({
      data: {
        userId,
        topic,
        duration: timeLimitMin,
        numQuestions: num,
        questions: JSON.stringify(questions),
        answers: JSON.stringify([]),
        status: "active",
        startedAt: new Date(),
        endsAt: new Date(Date.now() + timeLimitMin * 60 * 1000)
      }
    });

    // Return session info + first question (without correct answer)
    const firstQuestion = sanitizeQuestion(questions[0]);

    return res.status(201).json({
      success: true,
      sessionId: session.id,
      topic,
      duration: timeLimitMin,
      totalQuestions: questions.length,
      endsAt: session.endsAt,
      currentQuestion: {
        ...firstQuestion,
        questionNumber: 1,
        totalQuestions: questions.length
      }
    });

  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({ message: "Ollama is not running. Start with: ollama serve" });
    }
    console.error("START INTERVIEW ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── SUBMIT ANSWER & GET NEXT QUESTION ───────────────────────────────────────

// POST /api/interview/next
// Body: { sessionId, questionId, answer, timeTaken }
export const nextQuestion = async (req, res) => {
  try {
    const { sessionId, questionId, answer, timeTaken } = req.body;
    const userId = req.user.id;

    if (!sessionId || questionId === undefined || !answer) {
      return res.status(400).json({ message: "sessionId, questionId and answer are required" });
    }

    // Get session
    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.status !== "active") {
      return res.status(400).json({ message: "Session is already completed" });
    }

    // Check time limit
    if (new Date() > new Date(session.endsAt)) {
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { status: "timeout" }
      });
      return res.status(400).json({ message: "Time limit exceeded! Session ended." });
    }

    const questions = JSON.parse(session.questions);
    const answers = JSON.parse(session.answers);

    // Find current question
    const currentQuestion = questions.find(q => q.id === questionId);
    if (!currentQuestion) {
      return res.status(400).json({ message: "Invalid questionId" });
    }

    // Quick evaluation for MCQ
    let isCorrect = null;
    if (currentQuestion.type === "mcq") {
      isCorrect = answer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    }

    // Save answer
    answers.push({
      questionId,
      question: currentQuestion.question,
      type: currentQuestion.type,
      topic: currentQuestion.topic,
      difficulty: currentQuestion.difficulty,
      userAnswer: answer,
      correctAnswer: currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
      isCorrect,
      timeTaken: timeTaken || 0
    });

    // Find next question
    const currentIndex = questions.findIndex(q => q.id === questionId);
    const nextIndex = currentIndex + 1;
    const isLastQuestion = nextIndex >= questions.length;

    // Update session
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        answers: JSON.stringify(answers),
        status: isLastQuestion ? "completed" : "active"
      }
    });

    if (isLastQuestion) {
      return res.json({
        success: true,
        message: "Interview completed! Call /finish to get your analysis.",
        sessionId,
        isCompleted: true,
        totalAnswered: answers.length
      });
    }

    const nextQ = sanitizeQuestion(questions[nextIndex]);

    return res.json({
      success: true,
      isCompleted: false,
      currentQuestion: {
        ...nextQ,
        questionNumber: nextIndex + 1,
        totalQuestions: questions.length
      },
      timeRemaining: Math.max(0, Math.floor((new Date(session.endsAt) - new Date()) / 1000)),
      answeredSoFar: answers.length
    });

  } catch (error) {
    console.error("NEXT QUESTION ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── FINISH & GET ANALYSIS ────────────────────────────────────────────────────

// POST /api/interview/finish
// Body: { sessionId }
// ─────────────────────────────────────────────────────────────────────────────
// PATCH: Replace the entire finishInterview function in your interviewController.js
// with this version. Everything else in the file stays the same.
// ─────────────────────────────────────────────────────────────────────────────

export const finishInterview = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const answers = JSON.parse(session.answers);

    if (answers.length === 0) {
      return res.status(400).json({ message: "No answers found to analyze" });
    }

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status: "completed", completedAt: new Date() }
    });

    // ── Build detailed per-question summary for AI ───────────────────────────
    const answersSummary = answers.map((a, i) =>
      `--- Question ${i + 1} ---
Type: ${a.type.toUpperCase()}
Topic: ${a.topic}
Difficulty: ${a.difficulty}
Question: ${a.question}
User's Answer: ${a.userAnswer}
Expected Answer / Key Points: ${a.correctAnswer}
${a.isCorrect !== null ? `MCQ Auto-result: ${a.isCorrect ? "CORRECT" : "WRONG"}` : ""}
Time Taken: ${a.timeTaken || 0} seconds`
    ).join("\n\n");

    // ── Deep analysis prompt ─────────────────────────────────────────────────
    const analysisPrompt = `You are a senior technical interviewer giving a thorough, honest post-interview debrief.

Interview Details:
- Topic: ${TOPICS[session.topic]}
- Duration allowed: ${session.duration} minutes
- Total questions: ${answers.length}

Full Q&A transcript:
${answersSummary}

Return ONLY a raw JSON object (no markdown, no backticks, no explanation).

{
  "overallScore": 72,
  "grade": "B",
  "totalQuestions": ${answers.length},
  "correctAnswers": 5,
  "wrongAnswers": 3,
  "partialAnswers": 2,

  "questionAnalysis": [
    {
      "questionId": 1,
      "questionNumber": 1,
      "question": "exact question text",
      "topic": "Arrays",
      "type": "mcq",
      "difficulty": "easy",

      "result": "correct",
      "accuracyPercent": 100,

      "userAnswerSummary": "what the user actually said/wrote — summarized if long",
      "whatWasRight": "specific things the user got correct in their answer",
      "whatWasMissing": "specific concepts, edge cases, or details the user missed",
      "whatWasWrong": "any incorrect statements or misconceptions in the answer",

      "modelAnswer": "A complete, ideal answer to this question that a top candidate would give. Be thorough for text/code questions — include approach, complexity, edge cases. For MCQ just confirm the correct option and why.",
      "codeExample": "// only include this field for 'code' type questions\n// provide clean working code that solves the problem\nfunction example() { return 'solution'; }",

      "conceptsToStudy": ["specific concept 1", "specific concept 2"],
      "studyResources": ["LeetCode problem: Two Sum", "Read about: time complexity", "Topic: dynamic programming memoization"],

      "timeTaken": 45,
      "timeVerdict": "good"
    }
  ],

  "topicBreakdown": [
    {
      "topic": "Arrays",
      "questionsCount": 3,
      "correctCount": 2,
      "score": 80,
      "status": "strong",
      "summary": "Good grasp of basic operations but struggled with 2D arrays"
    }
  ],

  "difficultyBreakdown": {
    "easy":   { "total": 3, "correct": 3, "score": 100 },
    "medium": { "total": 4, "correct": 2, "score": 50 },
    "hard":   { "total": 3, "correct": 0, "score": 0 }
  },

  "skillsAssessment": {
    "problemSolving":      { "score": 70, "feedback": "Approaches problems systematically but misses edge cases" },
    "technicalKnowledge":  { "score": 65, "feedback": "Strong on fundamentals, weak on advanced patterns" },
    "codeQuality":         { "score": 60, "feedback": "Code works but lacks comments and could be cleaner" },
    "communicationClarity":{ "score": 75, "feedback": "Explains ideas clearly with good structure" },
    "timeManagement":      { "score": 80, "feedback": "Paced well, no questions left unanswered" }
  },

  "strongTopics": ["Arrays", "REST APIs"],
  "weakTopics": ["Dynamic Programming", "System Design"],

  "top3Improvements": [
    "Practice DP with memoization on LeetCode — start with Climbing Stairs, Coin Change",
    "Study Big-O analysis more deeply — every answer should include time & space complexity",
    "When answering design questions, always cover scalability and failure handling"
  ],

  "studyPlan": {
    "week1": ["Topic to study", "Practice problems"],
    "week2": ["Topic to study", "Practice problems"],
    "week3": ["Topic to study", "Practice problems"]
  },

  "readinessVerdict": "Not ready for senior roles yet, but strong junior candidate. Focus on DP and system design for next 4-6 weeks.",

  "estimatedLevel": "junior",

  "overallFeedback": "2-3 sentence honest overall summary of this candidate's performance and potential"
}

STRICT RULES for questionAnalysis:
- accuracyPercent: 0-100. For MCQ: 100 if correct, 0 if wrong. For text/code: estimate % of key concepts covered (0=completely off, 50=got main idea but missed details, 80=good but minor gaps, 100=excellent).
- result must be: "correct", "partial", or "wrong"
- modelAnswer must be genuinely complete and educational — this is what the user will learn from. Do NOT be lazy here. Write the answer a senior engineer would be proud of.
- codeExample: only add for type "code". If it's type "text" or "mcq" do NOT include this field.
- whatWasRight/whatWasMissing/whatWasWrong: be specific to THIS user's answer, not generic.
- timeVerdict must be: "too fast" (under 20s for non-trivial), "good", or "too slow" (over 3x expected)
- estimatedLevel must be: "intern", "junior", "mid", or "senior"`;

    let analysis;
    try {
      const rawText = await callOllama(analysisPrompt, 300000); // 5 min for deep analysis
      analysis = parseJSON(rawText);
    } catch (err) {
      // Fallback: basic stats if AI fails
      const mcqAnswers = answers.filter(a => a.isCorrect !== null);
      const correctCount = mcqAnswers.filter(a => a.isCorrect === true).length;
      const score = mcqAnswers.length > 0 ? Math.round((correctCount / mcqAnswers.length) * 100) : 50;

      analysis = {
        overallScore: score,
        grade: score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "F",
        totalQuestions: answers.length,
        correctAnswers: correctCount,
        wrongAnswers: mcqAnswers.length - correctCount,
        partialAnswers: answers.length - mcqAnswers.length,
        questionAnalysis: answers.map((a, i) => ({
          questionId: a.questionId,
          questionNumber: i + 1,
          question: a.question,
          topic: a.topic,
          type: a.type,
          difficulty: a.difficulty,
          result: a.isCorrect === true ? "correct" : a.isCorrect === false ? "wrong" : "partial",
          accuracyPercent: a.isCorrect === true ? 100 : a.isCorrect === false ? 0 : 50,
          userAnswerSummary: a.userAnswer,
          whatWasRight: "",
          whatWasMissing: "",
          whatWasWrong: "",
          modelAnswer: a.correctAnswer,
          conceptsToStudy: [],
          studyResources: [],
          timeTaken: a.timeTaken || 0,
          timeVerdict: "good"
        })),
        top3Improvements: ["Review incorrect answers", "Practice more problems", "Study weak topics"],
        overallFeedback: "AI analysis failed — showing basic stats only.",
        error: err.message
      };
    }

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { analysis: JSON.stringify(analysis) }
    });

    return res.json({
      success: true,
      sessionId,
      topic: session.topic,
      duration: session.duration,
      analysis
    });

  } catch (error) {
    console.error("FINISH INTERVIEW ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
// ─── GET SESSION HISTORY ──────────────────────────────────────────────────────

// GET /api/interview/history
export const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await prisma.interviewSession.findMany({
      where: { userId },
      select: {
        id: true,
        topic: true,
        duration: true,
        numQuestions: true,
        status: true,
        startedAt: true,
        completedAt: true,
        analysis: true
      },
      orderBy: { startedAt: "desc" },
      take: 20
    });

    const history = sessions.map(s => ({
      ...s,
      analysis: s.analysis ? JSON.parse(s.analysis) : null
    }));

    return res.json({ success: true, history });

  } catch (error) {
    console.error("GET HISTORY ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Helper: Remove correct answer before sending to user ────────────────────

const sanitizeQuestion = (q) => {
  const { correctAnswer, explanation, ...safeQ } = q;
  return safeQ;
};


// ─── GET SINGLE SESSION DETAIL ────────────────────────────────────────────────

// GET /api/interview/session/:id
export const getSessionDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await prisma.interviewSession.findFirst({
      where: { id, userId }
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    return res.json({
      success: true,
      session: {
        id: session.id,
        topic: session.topic,
        duration: session.duration,
        numQuestions: session.numQuestions,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        endsAt: session.endsAt,
        answers: JSON.parse(session.answers),   // full Q&A
        analysis: session.analysis ? JSON.parse(session.analysis) : null
      }
    });

  } catch (error) {
    console.error("GET SESSION DETAIL ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
