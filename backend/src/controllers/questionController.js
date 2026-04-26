import axios from "axios";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3";

// ─── GitHub Scraper ───────────────────────────────────────────────────────────

const scrapeGitHub = async (url) => {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) throw new Error("Invalid GitHub URL");

    const [, owner, repo] = match;

    const headers = process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {};

    const [repoRes, readmeRes] = await Promise.allSettled([
      axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
      axios.get(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers })
    ]);

    let content = "";

    if (repoRes.status === "fulfilled") {
      const r = repoRes.value.data;
      content += `Project: ${r.name}\nDescription: ${r.description || "N/A"}\nLanguage: ${r.language || "N/A"}\nTopics: ${(r.topics || []).join(", ") || "N/A"}\n\n`;
    }

    if (readmeRes.status === "fulfilled") {
      const readme = Buffer.from(readmeRes.value.data.content, "base64").toString("utf-8");
      content += `README:\n${readme.slice(0, 6000)}`;
    }

    if (!content) throw new Error("Could not fetch GitHub repo data");

    return content;
  } catch (err) {
    throw new Error(`GitHub scrape failed: ${err.message}`);
  }
};

// ─── Fix broken JSON from llama3 ─────────────────────────────────────────────

const fixJSON = (str) => {
  str = str.replace(/:(\s*)(\d+)"/g, ':$1$2');
  str = str.replace(/,(\s*[}\]])/g, '$1');
  return str;
};

const parseJSON = (rawText) => {
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found");

  let jsonStr = jsonMatch[0];

  try {
    return JSON.parse(jsonStr);
  } catch {
    jsonStr = fixJSON(jsonStr);
    return JSON.parse(jsonStr);
  }
};

// ─── GENERATE QUESTIONS ───────────────────────────────────────────────────────

// POST /api/questions/generate
// Body: { projectUrl, numQuestions, topic }
export const generateQuestions = async (req, res) => {
  try {
    const { projectUrl, numQuestions, topic } = req.body;

    if (!projectUrl || !numQuestions || !topic) {
      return res.status(400).json({ message: "projectUrl, numQuestions, and topic are required" });
    }

    const num = parseInt(numQuestions);
    if (isNaN(num) || num < 1 || num > 20) {
      return res.status(400).json({ message: "numQuestions must be between 1 and 20" });
    }

    let projectContent;
    try {
      projectContent = await scrapeGitHub(projectUrl);
    } catch (scrapeErr) {
      return res.status(422).json({ message: scrapeErr.message });
    }

    const prompt = `You are an expert technical interviewer. Based on the project below, generate exactly ${num} technical interview questions about: "${topic}".

PROJECT:
${projectContent}

Rules:
- Return ONLY a raw JSON array
- No markdown, no code blocks, no explanation
- id must be a plain integer, NO quotes around it
- Every field must be properly quoted

Example format:
[
  {
    "id": 1,
    "question": "Question here",
    "answer": "Answer here",
    "difficulty": "easy"
  }
]`;

    const ollamaRes = await axios.post(OLLAMA_URL, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false
    }, { timeout: 120000 });

    const rawText = ollamaRes.data.response.trim();

    let questions;
    try {
      questions = parseJSON(rawText);
    } catch (parseErr) {
      console.error("PARSE ERROR:", parseErr.message);
      return res.status(500).json({ message: "Failed to parse AI response", raw: rawText });
    }

    return res.json({
      success: true,
      projectUrl,
      topic,
      numQuestions: questions.length,
      questions
    });

  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({ message: "Ollama is not running. Start with: ollama serve" });
    }
    console.error("GENERATE QUESTIONS ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// ─── EVALUATE ANSWERS ─────────────────────────────────────────────────────────

// POST /api/questions/evaluate
// Body: {
//   topic: "authentication",
//   answers: [
//     { id: 1, question: "...", correctAnswer: "...", userAnswer: "..." },
//     { id: 2, question: "...", correctAnswer: "...", userAnswer: "..." }
//   ]
// }
export const evaluateAnswers = async (req, res) => {
  try {
    const { topic, answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "answers array is required" });
    }

    // Validate each answer has required fields
    for (const a of answers) {
      if (!a.question || !a.userAnswer || !a.correctAnswer) {
        return res.status(400).json({
          message: "Each answer must have: question, userAnswer, correctAnswer"
        });
      }
    }

    const answersText = answers.map((a, i) =>
      `Question ${i + 1}: ${a.question}
Correct Answer: ${a.correctAnswer}
User Answer: ${a.userAnswer}`
    ).join("\n\n");

    const prompt = `You are an expert technical interviewer evaluating answers.

Topic: ${topic || "General"}

Here are the questions with correct answers and the user's answers:

${answersText}

Evaluate each answer and return ONLY a raw JSON array. No markdown, no code blocks.
Score each answer from 0 to 10.

Example format:
[
  {
    "id": 1,
    "score": 7,
    "mistakes": "Missed mentioning salting in password hashing",
    "correctAnswer": "Full correct answer here",
    "improvements": "You should also mention bcrypt salting rounds and why they matter"
  }
]

Rules:
- id must be plain integer
- score must be plain integer 0-10
- Be specific about mistakes, do not be vague
- correctAnswer should be a complete ideal answer
- improvements should be actionable tips`;

    const ollamaRes = await axios.post(OLLAMA_URL, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false
    }, { timeout: 120000 });

    const rawText = ollamaRes.data.response.trim();

    let evaluations;
    try {
      evaluations = parseJSON(rawText);
    } catch (parseErr) {
      console.error("EVAL PARSE ERROR:", parseErr.message);
      return res.status(500).json({ message: "Failed to parse AI response", raw: rawText });
    }

    // Calculate overall score
    const totalScore = evaluations.reduce((sum, e) => sum + (e.score || 0), 0);
    const maxScore = evaluations.length * 10;
    const percentage = Math.round((totalScore / maxScore) * 100);

    let grade;
    if (percentage >= 80) grade = "Excellent";
    else if (percentage >= 60) grade = "Good";
    else if (percentage >= 40) grade = "Average";
    else grade = "Needs Improvement";

    return res.json({
      success: true,
      topic,
      totalScore,
      maxScore,
      percentage,
      grade,
      evaluations
    });

  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({ message: "Ollama is not running. Start with: ollama serve" });
    }
    console.error("EVALUATE ANSWERS ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};