import axios from "axios";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3";

// ─── Fix broken JSON from llama3 ─────────────────────────────────────────────

const fixJSON = (str) => {
  str = str.replace(/:(\s*)(\d+)"/g, ':$1$2');
  str = str.replace(/,(\s*[}\]])/g, '$1');
  return str;
};

const parseJSON = (rawText) => {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  let jsonStr = jsonMatch[0];
  try {
    return JSON.parse(jsonStr);
  } catch {
    jsonStr = fixJSON(jsonStr);
    return JSON.parse(jsonStr);
  }
};

// ─── Extract text from PDF ────────────────────────────────────────────────────

const extractTextFromPDF = async (filePath) => {
  const buffer = fs.readFileSync(filePath);

  // PDFParse is a class — needs options object with data
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  const result = await parser.getText();

  // result.text contains full text, or join pages
  if (result.text) return result.text;

  // fallback: join all pages
  return result.pages.map(p => p.text).join("\n");
};

// ─── ANALYZE RESUME ───────────────────────────────────────────────────────────

export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume PDF is required" });
    }

    const { companyName, jobRole, requirements } = req.body;

    if (!companyName || !jobRole || !requirements) {
      return res.status(400).json({
        message: "companyName, jobRole and requirements are all required"
      });
    }

    // Extract text from PDF
    let resumeText;
    try {
      resumeText = await extractTextFromPDF(req.file.path);
      console.log("Extracted text length:", resumeText.length);
    } catch (err) {
      console.error("PDF PARSE ERROR:", err.message);
      return res.status(422).json({ message: "Could not read PDF: " + err.message });
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(422).json({ message: "Resume appears to be empty or unreadable." });
    }

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

    const ollamaRes = await axios.post(OLLAMA_URL, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false
    }, { timeout: 180000 });

    const rawText = ollamaRes.data.response.trim();

    let analysis;
    try {
      analysis = parseJSON(rawText);
    } catch (parseErr) {
      console.error("PARSE ERROR:", parseErr.message);
      return res.status(500).json({ message: "Failed to parse AI response", raw: rawText });
    }

    // Cleanup uploaded file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    return res.json({
      success: true,
      companyName,
      jobRole,
      analysis
    });

  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({ message: "Ollama is not running. Start with: ollama serve" });
    }
    console.error("ANALYZE RESUME ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
