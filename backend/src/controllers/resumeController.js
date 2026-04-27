// src/controllers/resumeController.js
import fs from "fs";
import { createRequire } from "module";
import { callOllama } from "../config/groq.js";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const fixJSON = (str) => {
  str = str.replace(/:(\s*)(\d+)"/g, ':$1$2');
  str = str.replace(/,(\s*[}\]])/g, '$1');
  return str;
};

const parseJSON = (rawText) => {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  let jsonStr = jsonMatch[0];
  try { return JSON.parse(jsonStr); }
  catch { return JSON.parse(fixJSON(jsonStr)); }
};

const extractTextFromPDF = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  const result = await parser.getText();
  if (result.text) return result.text;
  return result.pages.map(p => p.text).join("\n");
};

export const analyzeResume = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Resume PDF is required" });

    const { companyName, jobRole, requirements } = req.body;

    if (!companyName || !jobRole || !requirements)
      return res.status(400).json({ message: "companyName, jobRole and requirements are all required" });

    let resumeText;
    try {
      resumeText = await extractTextFromPDF(req.file.path);
      console.log("Extracted text length:", resumeText.length);
    } catch (err) {
      console.error("PDF PARSE ERROR:", err.message);
      return res.status(422).json({ message: "Could not read PDF: " + err.message });
    }

    if (!resumeText || resumeText.trim().length < 50)
      return res.status(422).json({ message: "Resume appears to be empty or unreadable." });

    const prompt = `You are an expert ATS system and career counselor at ${companyName}.

A candidate is applying for the role of "${jobRole}" at ${companyName}.

Company Requirements:
${requirements}

Candidate Resume:
${resumeText.slice(0, 5000)}

Return ONLY a raw JSON object. No markdown, no code blocks, no explanation.

{
  "atsScore": 75,
  "summary": "2-3 sentence assessment",
  "matchedRequirements": ["req 1", "req 2"],
  "missingRequirements": ["missing 1", "missing 2"],
  "wordsToAdd": [
    {
      "word": "Docker",
      "where": "Skills section",
      "reason": "Mentioned in JD but not in resume"
    }
  ],
  "improvements": ["improvement 1", "improvement 2"],
  "sections": {
    "experience": { "score": 8, "feedback": "feedback here" },
    "education": { "score": 7, "feedback": "feedback here" },
    "skills": { "score": 5, "feedback": "feedback here" },
    "projects": { "score": 6, "feedback": "feedback here" }
  },
  "overallVerdict": "Strong Match"
}

Rules:
- atsScore is integer 0-100
- section scores are integer 0-10
- overallVerdict must be: "Strong Match", "Moderate Match", or "Weak Match"`;

    const rawText = await callOllama(prompt, 180000);

    let analysis;
    try { analysis = parseJSON(rawText); }
    catch (parseErr) {
      console.error("PARSE ERROR:", parseErr.message);
      return res.status(500).json({ message: "Failed to parse AI response" });
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    return res.json({ success: true, companyName, jobRole, analysis });

  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error("ANALYZE RESUME ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
