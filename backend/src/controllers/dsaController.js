// src/controllers/dsaController.js
import { streamOllama } from "../config/groq.js";

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

// ─── Controller ───────────────────────────────────────────────────────────────

export const solveDSA = async (req, res) => {
  const { platform, questionNumber, solveLevel, language } = req.body;

  if (!platform || !questionNumber || !solveLevel || !language) {
    return res.status(400).json({
      error: 'Missing fields: platform, questionNumber, solveLevel, language',
    });
  }

  const prompt = buildPrompt(platform, questionNumber, solveLevel, language);

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

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
