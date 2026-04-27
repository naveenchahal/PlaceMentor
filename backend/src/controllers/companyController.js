// src/controllers/companyController.js
import prisma from "../config/prisma.js";
import { callOllama } from "../config/groq.js";

const COMPANIES = {
  google: {
    name: "Google",
    rounds: ["Online Assessment", "Technical Round 1 (DSA)", "Technical Round 2 (System Design)", "Googliness Round (HR)"],
    focusTopics: ["Arrays", "Trees", "Graphs", "Dynamic Programming", "System Design", "OS Concepts"]
  },
  amazon: {
    name: "Amazon",
    rounds: ["Online Assessment", "Technical Round (DSA)", "System Design Round", "Bar Raiser (HR + Leadership Principles)"],
    focusTopics: ["Arrays", "Trees", "DP", "System Design", "Leadership Principles", "OOPs"]
  },
  microsoft: {
    name: "Microsoft",
    rounds: ["Online Assessment", "Technical Round 1", "Technical Round 2", "HR Round"],
    focusTopics: ["Arrays", "Linked Lists", "Trees", "System Design", "OOPs", "Behavioral"]
  },
  flipkart: {
    name: "Flipkart",
    rounds: ["Online Assessment", "Machine Coding Round", "Technical Round", "HR Round"],
    focusTopics: ["DSA", "Machine Coding", "System Design", "Backend Concepts"]
  },
  uber: {
    name: "Uber",
    rounds: ["Phone Screen", "Technical Round 1 (DSA)", "Technical Round 2 (System Design)", "HR Round"],
    focusTopics: ["Graphs", "Maps", "System Design", "Distributed Systems", "DSA"]
  },
  adobe: {
    name: "Adobe",
    rounds: ["Online Assessment", "Technical Round 1", "Technical Round 2", "HR Round"],
    focusTopics: ["DSA", "OOPs", "System Design", "Data Structures"]
  },
  infosys: {
    name: "Infosys",
    rounds: ["Online Test (Aptitude + Coding)", "Technical Interview", "HR Interview"],
    focusTopics: ["Aptitude", "Basic DSA", "OOPs", "DBMS", "OS", "Networking"]
  },
  tcs: {
    name: "TCS",
    rounds: ["TCS NQT (Aptitude + Coding)", "Technical Interview", "HR Interview"],
    focusTopics: ["Aptitude", "Basic Programming", "OOPs", "DBMS", "HR Questions"]
  },
  wipro: {
    name: "Wipro",
    rounds: ["Online Test", "Technical Interview", "HR Interview"],
    focusTopics: ["Aptitude", "Basic DSA", "OOPs", "DBMS", "Networking"]
  },
  goldman: {
    name: "Goldman Sachs",
    rounds: ["HackerRank Test", "Technical Round 1 (DSA)", "Technical Round 2", "HR Round"],
    focusTopics: ["Advanced DSA", "System Design", "Algorithms", "Problem Solving"]
  }
};

const TOPICS = ["DSA", "System Design", "HR", "OOPs", "DBMS", "OS", "Networking", "Machine Coding", "Aptitude"];
const DIFFICULTIES = ["easy", "medium", "hard"];

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

export const getCompanies = async (req, res) => {
  try {
    const list = Object.entries(COMPANIES).map(([key, val]) => ({
      key, name: val.name, rounds: val.rounds, focusTopics: val.focusTopics
    }));
    return res.json({ success: true, companies: list });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const generateCompanyQuestions = async (req, res) => {
  try {
    const { company, topic, difficulty, numQuestions, round } = req.body;
    const userId = req.user.id;

    if (!company || !topic || !difficulty || !numQuestions)
      return res.status(400).json({ message: "company, topic, difficulty and numQuestions are required" });

    const companyData = COMPANIES[company.toLowerCase()];
    if (!companyData)
      return res.status(400).json({ message: `Invalid company. Choose from: ${Object.keys(COMPANIES).join(", ")}` });

    const num = parseInt(numQuestions);
    if (isNaN(num) || num < 1 || num > 20)
      return res.status(400).json({ message: "numQuestions must be between 1 and 20" });

    const existing = await prisma.companyQuestion.findMany({
      where: { company: company.toLowerCase(), topic, difficulty, ...(round ? { round } : {}) },
      take: num
    });

    if (existing.length >= num) {
      return res.json({
        success: true, source: "database", company: companyData.name,
        topic, difficulty, round: round || "General",
        questions: existing.map(q => ({ id: q.id, question: q.question, answer: q.answer, difficulty: q.difficulty, topic: q.topic, round: q.round }))
      });
    }

    const roundInfo = round ? `for the ${round} round` : "";
    const prompt = `You are an expert interviewer at ${companyData.name}.
Generate exactly ${num} ${difficulty} level interview questions ${roundInfo} on the topic: "${topic}".

${companyData.name} focus: ${companyData.focusTopics.join(", ")}.

Return ONLY a raw JSON array. No markdown, no explanation.

[
  {
    "id": 1,
    "question": "Question text here",
    "answer": "Detailed expected answer with key points",
    "topic": "${topic}",
    "difficulty": "${difficulty}",
    "round": "${round || "General"}",
    "type": "technical"
  }
]

Rules:
- id must be plain integer
- Questions must be specific to ${companyData.name} interview style`;

    const rawText = await callOllama(prompt, 180000);
    let questions;
    try { questions = parseJSON(rawText); }
    catch (err) { return res.status(500).json({ message: "Failed to parse AI response" }); }

    const saved = await Promise.all(questions.map(q =>
      prisma.companyQuestion.create({
        data: {
          company: company.toLowerCase(), companyName: companyData.name,
          question: q.question, answer: q.answer, topic, difficulty,
          round: round || "General", type: q.type || "technical", generatedBy: userId
        }
      })
    ));

    return res.json({
      success: true, source: "ai", company: companyData.name,
      topic, difficulty, round: round || "General",
      questions: saved.map(q => ({ id: q.id, question: q.question, answer: q.answer, difficulty: q.difficulty, topic: q.topic, round: q.round }))
    });

  } catch (error) {
    console.error("COMPANY QUESTIONS ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getCompanyInfo = async (req, res) => {
  try {
    const { company } = req.params;
    const companyData = COMPANIES[company.toLowerCase()];
    if (!companyData) return res.status(404).json({ message: "Company not found" });

    const questionCount = await prisma.companyQuestion.count({ where: { company: company.toLowerCase() } });

    return res.json({
      success: true,
      company: { key: company.toLowerCase(), ...companyData, questionCount, availableTopics: TOPICS, availableDifficulties: DIFFICULTIES }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
