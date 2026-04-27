// src/controllers/dsaController.js
import { streamOllama } from "../config/groq.js";

// ─── Allowed Values ───────────────────────────────────────────────────────────

const VALID_PLATFORMS = ['leetcode', 'gfg', 'codeforces', 'hackerrank', 'atcoder'];
const VALID_SOLVE_LEVELS = ['explain', 'hints', 'solve'];
const VALID_LANGUAGES = [
  'c++', 'cpp', 'c', 'java', 'python', 'python3',
  'javascript', 'typescript', 'go', 'rust', 'kotlin', 'swift',
];

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(platform, questionNumber, solveLevel, language) {
  const platformNames = {
    leetcode:   'LeetCode',
    gfg:        'GeeksForGeeks',
    codeforces: 'Codeforces',
    hackerrank: 'HackerRank',
    atcoder:    'AtCoder',
  };
  const pName = platformNames[platform] || platform;

  if (solveLevel === 'explain') {
    return `You are an expert competitive programmer and DSA teacher.
The user is asking about Problem #${questionNumber} from ${pName}.

Provide a DETAILED EXPLANATION with this exact structure:

1. Problem Statement - Restate what the problem asks clearly.
2. Understanding Inputs and Outputs - Break down constraints, input/output format, edge cases.
3. Core DSA Concepts Involved - List every relevant concept and explain EACH in depth with examples.
4. Approach and Intuition - Explain how to think about this problem. Give multiple approaches.
5. Step-by-Step Walkthrough - Walk through with a concrete example.
6. Time and Space Complexity - For each approach separately.
7. Edge Cases to Watch - List all tricky edge cases.

Be exhaustive. Teach every concept from scratch.`;
  }

  if (solveLevel === 'hints') {
    return `You are an expert DSA mentor helping someone solve Problem #${questionNumber} from ${pName} in ${language}.

Give PROGRESSIVE HINTS from gentle to almost-answer. Never give the full solution code.

Hint 1 - Gentle Nudge: Just point in the right conceptual direction.
Hint 2 - Approach Hint: Suggest the algorithm or data structure category.
Hint 3 - Key Insight: The critical observation needed to crack this problem.
Hint 4 - Almost There: Pseudocode-level hint, just before full code.

Concepts to Review: 2-3 DSA topics to study if still stuck.
Similar Problems: 2-3 related problems that use the same pattern.`;
  }

  return `You are an expert competitive programmer.
The user wants a full solution for Problem #${questionNumber} from ${pName} in ${language}.

Provide a COMPLETE SOLUTION with this structure:

1. Problem Recap - One-line restatement.
2. Algorithm Choice - Which algorithm and why it is optimal.
3. Complete ${language} Code - Full, clean, well-commented code.
4. Code Walkthrough - Explain every non-obvious line.
5. Dry Run - Trace through with a sample input.
6. Complexity Analysis - Time and Space complexity.
7. Alternative Approaches - Other valid solutions and trade-offs.
8. Common Mistakes - What bugs beginners typically introduce.`;
}

// ─── Input Validator ─────────────────────────────────────────────────────────

function validateInput(platform, questionNumber, solveLevel, language) {
  const errors = [];

  // ── 1. Missing fields ──────────────────────────────────────────────────────
  if (!platform)      errors.push('platform is required');
  if (!questionNumber) errors.push('questionNumber is required');
  if (!solveLevel)    errors.push('solveLevel is required');
  if (!language)      errors.push('language is required');

  // Agar kuch bhi missing hai toh aage validate karna bekaar hai
  if (errors.length) return errors;

  // ── 2. Platform valid hai? ─────────────────────────────────────────────────
  if (!VALID_PLATFORMS.includes(platform.toLowerCase())) {
    errors.push(`Invalid platform "${platform}". Allowed: ${VALID_PLATFORMS.join(', ')}`);
  }

  // ── 3. Question number valid hai? ─────────────────────────────────────────
  const qNum = Number(questionNumber);
  if (!Number.isInteger(qNum) || qNum <= 0 || qNum > 9999) {
    errors.push(`questionNumber must be a positive integer between 1 and 9999, got "${questionNumber}"`);
  }

  // ── 4. solveLevel valid hai? ───────────────────────────────────────────────
  if (!VALID_SOLVE_LEVELS.includes(solveLevel.toLowerCase())) {
    errors.push(`Invalid solveLevel "${solveLevel}". Allowed: ${VALID_SOLVE_LEVELS.join(', ')}`);
  }

  // ── 5. Language valid hai? ─────────────────────────────────────────────────
  if (!VALID_LANGUAGES.includes(language.toLowerCase())) {
    errors.push(`Invalid language "${language}". Allowed: ${VALID_LANGUAGES.join(', ')}`);
  }

  // ── 6. Vague / garbage input detection ────────────────────────────────────
  // Question number jo sirf random letters ya symbols ho
  if (/[^0-9]/.test(String(questionNumber).trim())) {
    errors.push(`questionNumber "${questionNumber}" looks invalid — only digits allowed`);
  }

  return errors;
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const solveDSA = async (req, res) => {
  const { platform, questionNumber, solveLevel, language } = req.body;

  // ── Validate all inputs ────────────────────────────────────────────────────
  const validationErrors = validateInput(platform, questionNumber, solveLevel, language);
  if (validationErrors.length) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationErrors,
    });
  }

  // Normalize karo — lowercase mein rakho consistency ke liye
  const normalizedPlatform  = platform.toLowerCase();
  const normalizedLevel     = solveLevel.toLowerCase();
  const normalizedLanguage  = language.toLowerCase();
  const qNum                = Number(questionNumber);

  const prompt = buildPrompt(normalizedPlatform, qNum, normalizedLevel, normalizedLanguage);

  // ── SSE headers ──────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // CORS ke liye zaroori hai agar frontend alag port par hai
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Flush headers immediately so client knows stream has started
  res.flushHeaders();

  // ── Client disconnect handle karo ────────────────────────────────────────
  req.on('close', () => {
    // Client ne connection tod diya — koi action nahi chahiye,
    // Groq stream apne aap garbage collected ho jaayega
    console.log('Client disconnected from SSE stream');
  });

  try {
    await streamOllama(prompt, res);
  } catch (err) {
    console.error('DSA Controller error:', err.message);

    if (!res.headersSent) {
      // Headers abhi nahi gaye — normal JSON error bhej sakte hain
      res.status(500).json({ error: err.message });
    } else {
      // SSE stream already shuru ho gayi — error event ki tarah bhejo
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
};