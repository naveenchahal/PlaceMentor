// src/controllers/questionController.js
import axios from "axios";
import { callOllama } from "../config/groq.js";

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

const scrapeGitHub = async (url) => {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) throw new Error("Invalid GitHub URL");
    const [, owner, repo] = match;
    const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};

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

export const generateQuestions = async (req, res) => {
  try {
    const { projectUrl, numQuestions, topic } = req.body;

    if (!projectUrl || !numQuestions || !topic)
      return res.status(400).json({ message: "projectUrl, numQuestions, and topic are required" });

    const num = parseInt(numQuestions);
    if (isNaN(num) || num < 1 || num > 20)
      return res.status(400).json({ message: "numQuestions must be between 1 and 20" });

    let projectContent;
    try { projectContent = await scrapeGitHub(projectUrl); }
    catch (scrapeErr) { return res.status(422).json({ message: scrapeErr.message }); }

    const prompt = `You are an expert technical interviewer. Based on the project below, generate exactly ${num} technical interview questions about: "${topic}".

PROJECT:
${projectContent}

Return ONLY a raw JSON array. No markdown, no code blocks.

[
  {
    "id": 1,
    "question": "Question here",
    "answer": "Answer here",
    "difficulty": "easy"
  }
]`;

    const rawText = await callOllama(prompt, 120000);
    let questions;
    try { questions = parseJSON(rawText); }
    catch (parseErr) { return res.status(500).json({ message: "Failed to parse AI response" }); }

    return res.json({ success: true, projectUrl, topic, numQuestions: questions.length, questions });

  } catch (error) {
    console.error("GENERATE QUESTIONS ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const evaluateAnswers = async (req, res) => {
  try {
    const { topic, answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0)
      return res.status(400).json({ message: "answers array is required" });

    for (const a of answers) {
      if (!a.question || !a.userAnswer || !a.correctAnswer)
        return res.status(400).json({ message: "Each answer must have: question, userAnswer, correctAnswer" });
    }

    const answersText = answers.map((a, i) =>
      `Question ${i + 1}: ${a.question}\nCorrect Answer: ${a.correctAnswer}\nUser Answer: ${a.userAnswer}`
    ).join("\n\n");

    const prompt = `You are an expert technical interviewer evaluating answers.

Topic: ${topic || "General"}

${answersText}

Return ONLY a raw JSON array. No markdown.

[
  {
    "id": 1,
    "score": 7,
    "mistakes": "Missed mentioning salting",
    "correctAnswer": "Full correct answer here",
    "improvements": "Actionable tips"
  }
]`;

    const rawText = await callOllama(prompt, 120000);
    let evaluations;
    try { evaluations = parseJSON(rawText); }
    catch (parseErr) { return res.status(500).json({ message: "Failed to parse AI response" }); }

    const totalScore = evaluations.reduce((sum, e) => sum + (e.score || 0), 0);
    const maxScore = evaluations.length * 10;
    const percentage = Math.round((totalScore / maxScore) * 100);
    const grade = percentage >= 80 ? "Excellent" : percentage >= 60 ? "Good" : percentage >= 40 ? "Average" : "Needs Improvement";

    return res.json({ success: true, topic, totalScore, maxScore, percentage, grade, evaluations });

  } catch (error) {
    console.error("EVALUATE ANSWERS ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};