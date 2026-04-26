import axios from "axios";
import prisma from "../config/prisma.js";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3";

// ─── Same topics as interviewController ───────────────────────────────────────
const TOPICS = {
  dsa:          "Data Structures & Algorithms (arrays, linked lists, trees, graphs, sorting, dynamic programming)",
  backend:      "Backend Development (REST APIs, databases, authentication, caching, system design)",
  react:        "React.js (hooks, state management, component lifecycle, performance, Redux)",
  aptitude:     "Aptitude (quantitative, logical reasoning, verbal ability, puzzles)",
  hr:           "HR Round (tell me about yourself, strengths & weaknesses, why this company, teamwork, conflict resolution)",
  genai:        "Generative AI & LLMs (prompt engineering, RAG, vector databases, LangChain, agents, fine-tuning, embeddings, hallucinations)",
  devops:       "DevOps & Cloud (Docker, Kubernetes, CI/CD pipelines, GitHub Actions, AWS/GCP, monitoring, infrastructure as code)",
  dbms:         "Database Management Systems (SQL queries, joins, indexing, normalization, transactions, ACID, NoSQL vs SQL, Redis, MongoDB)",
  os:           "Operating Systems (processes vs threads, memory management, virtual memory, scheduling, deadlocks, semaphores)",
  networking:   "Computer Networking (OSI model, TCP/IP, HTTP/HTTPS, DNS, load balancing, WebSockets, REST vs GraphQL)",
  frontend:     "Frontend Development (HTML5, CSS3, JavaScript ES6+, browser rendering, web performance, accessibility, TypeScript)",
  systemdesign: "System Design (scalability, load balancing, caching, database sharding, microservices, message queues, CAP theorem)",
};

const TIME_LIMITS = { "30": 30, "60": 60, "90": 90 };

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
  try { return JSON.parse(jsonStr); }
  catch { return JSON.parse(fixJSON(jsonStr)); }
};

const callOllama = async (prompt, timeout = 120000) => {
  const res = await axios.post(OLLAMA_URL, {
    model: OLLAMA_MODEL,
    prompt,
    stream: false
  }, { timeout });
  return res.data.response.trim();
};

// Count filler words in transcript
const analyzeFillerWords = (text) => {
  const fillers = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally',
    'so', 'right', 'okay', 'hmm', 'err', 'ah', 'well'];
  const lower = text.toLowerCase();
  const found = {};
  let total = 0;
  fillers.forEach(f => {
    const regex = new RegExp(`\\b${f}\\b`, 'gi');
    const count = (lower.match(regex) || []).length;
    if (count > 0) { found[f] = count; total += count; }
  });
  return { found, total };
};

// Estimate words per minute (pace)
const estimatePace = (text, timeTakenSeconds) => {
  if (!timeTakenSeconds || timeTakenSeconds < 5) return null;
  const words = text.trim().split(/\s+/).length;
  const wpm = Math.round((words / timeTakenSeconds) * 60);
  let verdict = 'good';
  if (wpm < 100) verdict = 'too slow';
  else if (wpm > 180) verdict = 'too fast';
  return { wpm, verdict };
};

const sanitizeQuestion = (q) => {
  const { correctAnswer, explanation, ...safeQ } = q;
  return safeQ;
};

// ─── START VOICE INTERVIEW ────────────────────────────────────────────────────
// POST /api/voice-interview/start
// Body: { topic, duration, numQuestions }
export const startVoiceInterview = async (req, res) => {
  try {
    const { topic, duration, numQuestions } = req.body;
    const userId = req.user.id;

    if (!topic || !duration || !numQuestions)
      return res.status(400).json({ message: "topic, duration and numQuestions are required" });

    if (!TOPICS[topic])
      return res.status(400).json({ message: `Invalid topic. Choose from: ${Object.keys(TOPICS).join(", ")}` });

    const num = parseInt(numQuestions);
    if (isNaN(num) || num < 3 || num > 15)
      return res.status(400).json({ message: "numQuestions must be between 3 and 15" });

    const timeLimitMin = TIME_LIMITS[String(duration)] || 60;
    const topicDescription = TOPICS[topic];

    // Voice interviews: only text questions (no MCQ, no code — hard to answer verbally)
    const prompt = `You are an expert interviewer conducting a ${timeLimitMin}-minute VOICE interview on: ${topicDescription}.

Generate exactly ${num} interview questions suitable for a spoken voice interview.
- All questions must be type "text" — NO MCQ, NO code questions
- Questions should be answerable verbally in 1-3 minutes
- Mix conceptual, behavioral, and scenario-based questions
- Keep questions clear and concise — they will be read aloud

Return ONLY a raw JSON array. No markdown, no explanation.

[
  {
    "id": 1,
    "type": "text",
    "topic": "topic name",
    "difficulty": "easy",
    "question": "Clear concise question suitable for verbal answer",
    "correctAnswer": "Key points expected in a good verbal answer",
    "explanation": "Why these points matter"
  }
]

Rules:
- id must be plain integer
- difficulty: "easy", "medium", or "hard"
- Mix: 30% easy, 50% medium, 20% hard
- All about: ${topicDescription}
- Questions must be conversational — no "write code" or "pick the correct option"`;

    let questions;
    try {
      const rawText = await callOllama(prompt, 180000);
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      try { questions = JSON.parse(jsonMatch[0]); }
      catch { questions = JSON.parse(fixJSON(jsonMatch[0])); }
    } catch (err) {
      return res.status(500).json({ message: "Failed to generate questions: " + err.message });
    }

    // ✅ FIX 4: Ensure all question IDs are integers (in case LLM returns strings)
    questions = questions.map((q, index) => ({
      ...q,
      id: Number(q.id) || (index + 1)
    }));

    const session = await prisma.voiceInterviewSession.create({
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
    if (error.code === "ECONNREFUSED")
      return res.status(503).json({ message: "Ollama is not running. Start with: ollama serve" });
    console.error("START VOICE INTERVIEW ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── SUBMIT VOICE ANSWER & GET NEXT ──────────────────────────────────────────
// POST /api/voice-interview/next
// Body: { sessionId, questionId, transcript, timeTaken }
export const nextVoiceQuestion = async (req, res) => {
  try {
    const { sessionId, questionId, transcript, timeTaken } = req.body;
    const userId = req.user.id;

    if (!sessionId || questionId === undefined || !transcript)
      return res.status(400).json({ message: "sessionId, questionId and transcript are required" });

    const session = await prisma.voiceInterviewSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.status !== "active") return res.status(400).json({ message: "Session already completed" });

    if (new Date() > new Date(session.endsAt)) {
      await prisma.voiceInterviewSession.update({ where: { id: sessionId }, data: { status: "timeout" } });
      return res.status(400).json({ message: "Time limit exceeded! Session ended." });
    }

    const questions = JSON.parse(session.questions);
    const answers   = JSON.parse(session.answers);

    // ✅ FIX 5: THE MAIN BUG — questionId ko Number mein convert karo
    // Frontend se string aa sakta tha, DB mein integer hai → .find() fail hota tha
    // → currentQuestion = undefined → backend 400 error → frontend crash → BLACK SCREEN
    const numericQuestionId = Number(questionId);
    const currentQuestion = questions.find(q => Number(q.id) === numericQuestionId);
    if (!currentQuestion) return res.status(400).json({ message: "Invalid questionId" });

    // Analyze voice-specific metrics from transcript
    const fillerAnalysis = analyzeFillerWords(transcript);
    const paceAnalysis   = estimatePace(transcript, timeTaken);
    const wordCount      = transcript.trim().split(/\s+/).length;

    answers.push({
      questionId: numericQuestionId,
      question:        currentQuestion.question,
      topic:           currentQuestion.topic,
      difficulty:      currentQuestion.difficulty,
      transcript,
      correctAnswer:   currentQuestion.correctAnswer,
      explanation:     currentQuestion.explanation,
      timeTaken:       timeTaken || 0,
      wordCount,
      fillerWords:     fillerAnalysis,
      pace:            paceAnalysis,
    });

    const currentIndex  = questions.findIndex(q => Number(q.id) === numericQuestionId);
    const nextIndex     = currentIndex + 1;
    const isLastQuestion = nextIndex >= questions.length;

    await prisma.voiceInterviewSession.update({
      where: { id: sessionId },
      data: {
        answers: JSON.stringify(answers),
        status: isLastQuestion ? "completed" : "active"
      }
    });

    if (isLastQuestion) {
      return res.json({
        success: true,
        message: "Voice interview completed!",
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
    console.error("NEXT VOICE QUESTION ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── FINISH & DEEP ANALYSIS ───────────────────────────────────────────────────
// POST /api/voice-interview/finish
// Body: { sessionId }
export const finishVoiceInterview = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) return res.status(400).json({ message: "sessionId is required" });

    const session = await prisma.voiceInterviewSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) return res.status(404).json({ message: "Session not found" });

    const answers = JSON.parse(session.answers);
    if (answers.length === 0) return res.status(400).json({ message: "No answers to analyze" });

    await prisma.voiceInterviewSession.update({
      where: { id: sessionId },
      data: { status: "completed", completedAt: new Date() }
    });

    // Aggregate voice stats across all answers
    const totalFillers = answers.reduce((sum, a) => sum + (a.fillerWords?.total || 0), 0);
    const avgWPM = answers
      .filter(a => a.pace?.wpm)
      .reduce((sum, a, _, arr) => sum + a.pace.wpm / arr.length, 0);
    const totalWords = answers.reduce((sum, a) => sum + (a.wordCount || 0), 0);

    // Build transcript summary for AI
    const transcriptSummary = answers.map((a, i) =>
      `--- Question ${i + 1} [${a.topic}] [${a.difficulty}] ---
Question: ${a.question}
Spoken Answer (transcript): ${a.transcript}
Expected Key Points: ${a.correctAnswer}
Time Taken: ${a.timeTaken}s | Words Spoken: ${a.wordCount} | Filler Words: ${a.fillerWords?.total || 0} (${JSON.stringify(a.fillerWords?.found || {})}) | Pace: ${a.pace?.wpm || 'N/A'} WPM`
    ).join("\n\n");

    const analysisPrompt = `You are an expert communication coach and technical interviewer analyzing a VOICE mock interview.

Topic: ${TOPICS[session.topic]}
Duration: ${session.duration} minutes
Total Questions: ${answers.length}
Overall Stats: ${totalWords} total words spoken, avg pace ~${Math.round(avgWPM || 0)} WPM, ${totalFillers} filler words used

Full transcript:
${transcriptSummary}

Analyze both TECHNICAL CONTENT and COMMUNICATION SKILLS. Return ONLY raw JSON. No markdown.

{
  "overallScore": 72,
  "grade": "B",
  "totalQuestions": ${answers.length},

  "communicationScore": 68,
  "technicalScore": 75,

  "voiceMetrics": {
    "totalWordCount": ${totalWords},
    "avgWordsPerMinute": ${Math.round(avgWPM || 0)},
    "paceVerdict": "good",
    "totalFillerWords": ${totalFillers},
    "fillerWordImpact": "moderate",
    "topFillerWords": ["um", "like"],
    "clarityScore": 70,
    "clarityFeedback": "Answers were mostly clear but some sentences trailed off",
    "confidenceScore": 65,
    "confidenceFeedback": "Hesitations detected on harder questions, speak more assertively",
    "structureScore": 75,
    "structureFeedback": "Good use of examples but answers lacked clear conclusions"
  },

  "questionAnalysis": [
    {
      "questionId": 1,
      "questionNumber": 1,
      "question": "exact question text",
      "topic": "topic",
      "difficulty": "easy",

      "accuracyPercent": 80,
      "result": "partial",

      "transcriptSummary": "what the candidate said — paraphrased concisely",
      "whatWasRight": "specific things covered correctly",
      "whatWasMissing": "key concepts not mentioned",
      "whatWasWrong": "any incorrect statements",

      "modelAnswer": "Complete ideal spoken answer — written as if said aloud, conversational tone. Include all key points a top candidate would mention.",

      "voiceFeedback": {
        "fillerCount": 3,
        "mainFillers": ["um", "uh"],
        "pace": "good",
        "wpm": 140,
        "lengthVerdict": "too short",
        "lengthNote": "Answer was only 45 words — should be 100-150 words for this question",
        "tip": "Pause instead of saying 'um'. Use the STAR method for this type of question."
      },

      "conceptsToStudy": ["specific concept"],
      "timeTaken": 45
    }
  ],

  "communicationBreakdown": {
    "clarity":      { "score": 70, "feedback": "Generally clear but some technical terms were used incorrectly" },
    "confidence":   { "score": 60, "feedback": "Many filler words suggest nervousness — practice more mock interviews" },
    "structure":    { "score": 75, "feedback": "Good intro but answers need stronger conclusions" },
    "vocabulary":   { "score": 80, "feedback": "Good use of technical terms overall" },
    "conciseness":  { "score": 65, "feedback": "Some answers were too brief, others too rambling" },
    "engagement":   { "score": 70, "feedback": "Tone was mostly professional" }
  },

  "topicBreakdown": [
    {
      "topic": "Arrays",
      "score": 80,
      "status": "strong",
      "summary": "Good conceptual understanding"
    }
  ],

  "strongAreas": ["Technical vocabulary", "Problem approach"],
  "improvementAreas": ["Reduce filler words", "Add more structure", "Give concrete examples"],

  "top3CommunicationTips": [
    "Replace 'um/uh' with a 2-second pause — silence sounds more confident than fillers",
    "Use the STAR method (Situation, Task, Action, Result) for behavioral questions",
    "End every answer with a clear 1-sentence summary of your main point"
  ],

  "top3TechnicalTips": [
    "Study specific topic",
    "Practice explaining X out loud",
    "Review concept Y"
  ],

  "studyPlan": {
    "week1": ["Focus area 1", "Practice tip 1"],
    "week2": ["Focus area 2", "Practice tip 2"],
    "week3": ["Focus area 3", "Practice tip 3"]
  },

  "estimatedLevel": "junior",
  "interviewReadiness": "Almost ready — work on communication confidence and DP topics",
  "overallFeedback": "2-3 sentence honest summary of this candidate's voice interview performance"
}

RULES:
- paceVerdict: "too slow" (<100 WPM), "good" (100-180 WPM), "too fast" (>180 WPM)
- fillerWordImpact: "none", "minor", "moderate", or "severe"
- lengthVerdict: "too short" (<60 words), "good" (60-200), "too long" (>200)
- result: "correct", "partial", or "wrong"
- estimatedLevel: "intern", "junior", "mid", or "senior"
- modelAnswer should be CONVERSATIONAL — written as if spoken aloud
- Be specific about which filler words were used most
- voiceFeedback.tip must be ACTIONABLE and SPECIFIC to that question`;

    let analysis;
    try {
      const rawText = await callOllama(analysisPrompt, 300000);
      analysis = parseJSON(rawText);
    } catch (err) {
      // Fallback
      analysis = {
        overallScore: 50,
        grade: "C",
        totalQuestions: answers.length,
        communicationScore: 50,
        technicalScore: 50,
        voiceMetrics: {
          totalWordCount: totalWords,
          avgWordsPerMinute: Math.round(avgWPM || 0),
          totalFillerWords: totalFillers,
        },
        questionAnalysis: answers.map((a, i) => ({
          questionId: a.questionId,
          questionNumber: i + 1,
          question: a.question,
          topic: a.topic,
          difficulty: a.difficulty,
          result: "partial",
          accuracyPercent: 50,
          transcriptSummary: a.transcript,
          modelAnswer: a.correctAnswer,
          voiceFeedback: {
            fillerCount: a.fillerWords?.total || 0,
            pace: a.pace?.verdict || "good",
            wpm: a.pace?.wpm || 0,
          }
        })),
        error: err.message
      };
    }

    await prisma.voiceInterviewSession.update({
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
    console.error("FINISH VOICE INTERVIEW ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── GET VOICE INTERVIEW HISTORY ─────────────────────────────────────────────
// GET /api/voice-interview/history
export const getVoiceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await prisma.voiceInterviewSession.findMany({
      where: { userId },
      select: {
        id: true, topic: true, duration: true, numQuestions: true,
        status: true, startedAt: true, completedAt: true, analysis: true
      },
      orderBy: { startedAt: "desc" },
      take: 20
    });

    return res.json({
      success: true,
      history: sessions.map(s => ({
        ...s,
        analysis: s.analysis ? JSON.parse(s.analysis) : null
      }))
    });
  } catch (error) {
    console.error("VOICE HISTORY ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
