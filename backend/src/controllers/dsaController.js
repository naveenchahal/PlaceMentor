// src/controllers/dsaController.js
import { streamOllama } from "../config/groq.js";

// ─── Allowed Values ───────────────────────────────────────────────────────────

const VALID_PLATFORMS = ['leetcode', 'gfg', 'codeforces', 'hackerrank', 'atcoder'];
const VALID_SOLVE_LEVELS = ['explain', 'hints', 'solve'];
const VALID_LANGUAGES = [
  'c++', 'cpp', 'c', 'java', 'python', 'python3',
  'javascript', 'typescript', 'go', 'rust', 'kotlin', 'swift',
];

const PLATFORM_URLS = {
  leetcode:   'https://leetcode.com/problems/',
  gfg:        'https://www.geeksforgeeks.org/problems/',
  codeforces: 'https://codeforces.com/problemset/',
  hackerrank: 'https://www.hackerrank.com/challenges/',
  atcoder:    'https://atcoder.jp/tasks/',
};

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(platform, questionName, solveLevel, language) {
  const platformNames = {
    leetcode:   'LeetCode',
    gfg:        'GeeksForGeeks',
    codeforces: 'Codeforces',
    hackerrank: 'HackerRank',
    atcoder:    'AtCoder',
  };
  const pName = platformNames[platform] || platform;
  const platformUrl = PLATFORM_URLS[platform] || '';

  // ── Strict grounding instruction (har prompt ke upar lagega) ──────────────
  const groundingRule = `CRITICAL RULES — follow strictly, no exceptions:
1. You must only answer if you have CONFIDENT, SPECIFIC knowledge of the problem named "${questionName}" on ${pName}.
2. If you are not sure this exact problem exists on ${pName}, respond with EXACTLY:
   "I am not able to find the problem "${questionName}" on ${pName}. Please verify the problem name and check ${platformUrl}"
3. If the problem exists but is behind a paywall / premium / locked, respond with EXACTLY:
   "The problem "${questionName}" on ${pName} is not publicly available (premium/locked). Please check ${platformUrl}"
4. DO NOT guess, paraphrase, rename, or invent a similar problem. DO NOT say "I'll assume you mean...".
5. DO NOT generate any solution, hints, or explanation unless you are 100% certain of the exact problem.

`;

  if (solveLevel === 'explain') {
    return `${groundingRule}You are an expert competitive programmer and DSA teacher.
The user is asking about the problem "${questionName}" from ${pName}.

If and only if you know this problem with certainty, provide a DETAILED EXPLANATION with this exact structure:

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
    return `${groundingRule}You are an expert DSA mentor helping someone solve the problem "${questionName}" from ${pName} in ${language}.

If and only if you know this problem with certainty, give PROGRESSIVE HINTS from gentle to almost-answer. Never give the full solution code.

Hint 1 - Gentle Nudge: Just point in the right conceptual direction.
Hint 2 - Approach Hint: Suggest the algorithm or data structure category.
Hint 3 - Key Insight: The critical observation needed to crack this problem.
Hint 4 - Almost There: Pseudocode-level hint, just before full code.

Concepts to Review: 2-3 DSA topics to study if still stuck.
Similar Problems: 2-3 related problems that use the same pattern.`;
  }

  return `${groundingRule}You are an expert competitive programmer.
The user wants a full solution for the problem "${questionName}" from ${pName} in ${language}.

If and only if you know this problem with certainty, provide a COMPLETE SOLUTION with this structure:

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

function validateInput(platform, questionName, solveLevel, language) {
  const errors = [];

  // ── 1. Missing fields ──────────────────────────────────────────────────────
  if (!platform)     errors.push('platform is required');
  if (!questionName) errors.push('questionName is required');
  if (!solveLevel)   errors.push('solveLevel is required');
  if (!language)     errors.push('language is required');

  if (errors.length) return errors;

  // ── 2. Platform valid hai? ─────────────────────────────────────────────────
  if (!VALID_PLATFORMS.includes(platform.toLowerCase())) {
    errors.push(`Invalid platform "${platform}". Allowed: ${VALID_PLATFORMS.join(', ')}`);
  }

  // ── 3. questionName valid hai? ────────────────────────────────────────────
  const trimmed = questionName.trim();
  if (trimmed.length < 2) {
    errors.push('questionName is too short — provide the full problem name');
  }
  if (trimmed.length > 200) {
    errors.push('questionName is too long — max 200 characters');
  }
  // sirf special chars wala garbage input reject karo
  if (/^[^a-zA-Z0-9]+$/.test(trimmed)) {
    errors.push(`questionName "${questionName}" looks invalid — must contain letters or digits`);
  }

  // ── 4. solveLevel valid hai? ───────────────────────────────────────────────
  if (!VALID_SOLVE_LEVELS.includes(solveLevel.toLowerCase())) {
    errors.push(`Invalid solveLevel "${solveLevel}". Allowed: ${VALID_SOLVE_LEVELS.join(', ')}`);
  }

  // ── 5. Language valid hai? ─────────────────────────────────────────────────
  if (!VALID_LANGUAGES.includes(language.toLowerCase())) {
    errors.push(`Invalid language "${language}". Allowed: ${VALID_LANGUAGES.join(', ')}`);
  }

  return errors;
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const solveDSA = async (req, res) => {
  const { platform, questionName, solveLevel, language } = req.body;

  // ── Validate all inputs ────────────────────────────────────────────────────
  const validationErrors = validateInput(platform, questionName, solveLevel, language);
  if (validationErrors.length) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationErrors,
    });
  }

  const normalizedPlatform = platform.toLowerCase();
  const normalizedLevel    = solveLevel.toLowerCase();
  const normalizedLanguage = language.toLowerCase();
  const cleanName          = questionName.trim();

  const prompt = buildPrompt(normalizedPlatform, cleanName, normalizedLevel, normalizedLanguage);

  // ── SSE headers ───────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  req.on('close', () => {
    console.log('Client disconnected from SSE stream');
  });

  try {
    await streamOllama(prompt, res);
  } catch (err) {
    console.error('DSA Controller error:', err.message);

    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
};