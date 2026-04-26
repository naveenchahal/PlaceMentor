// src/controllers/dsaController.js
// ⚠️ Questions are NEVER saved to DB — pure stateless AI call via Ollama

import axios from 'axios'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3'

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(platform, questionNumber, solveLevel, language) {
  const platformNames = {
    leetcode:   'LeetCode',
    gfg:        'GeeksForGeeks',
    codeforces: 'Codeforces',
    hackerrank: 'HackerRank',
    atcoder:    'AtCoder',
  }
  const pName = platformNames[platform] || platform

  if (solveLevel === 'explain') {
    return `You are an expert competitive programmer and DSA teacher.
The user is asking about Problem #${questionNumber} from ${pName}.
Do NOT save or store this question anywhere.

Provide a DETAILED EXPLANATION with this exact structure:

1. Problem Statement
   Restate what the problem asks clearly.

2. Understanding Inputs and Outputs
   Break down constraints, input/output format, edge cases.

3. Core DSA Concepts Involved
   List every relevant concept (arrays, trees, DP, graphs, etc.) and explain EACH concept in depth with examples and analogies. Assume the reader is a complete beginner.

4. Approach and Intuition
   Explain how to think about this problem. Give multiple approaches from brute force to optimized.

5. Step-by-Step Walkthrough
   Walk through with a concrete example, step by step.

6. Time and Space Complexity
   For each approach separately.

7. Edge Cases to Watch
   List all tricky edge cases.

Be exhaustive. Teach every concept from scratch.`
  }

  if (solveLevel === 'hints') {
    return `You are an expert DSA mentor helping someone solve Problem #${questionNumber} from ${pName} in ${language}.
Do NOT save or store this question anywhere.

Give PROGRESSIVE HINTS from gentle to almost-answer. Never give the full solution code.

Hint 1 - Gentle Nudge:
Just point in the right conceptual direction.

Hint 2 - Approach Hint:
Suggest the algorithm or data structure category to use.

Hint 3 - Key Insight:
The critical observation needed to crack this problem.

Hint 4 - Almost There:
Pseudocode-level hint, just before full code.

Concepts to Review:
2 to 3 DSA topics to study if still stuck, each with a brief explanation.

Similar Problems:
2 to 3 related problems that use the same pattern.

Explain the WHY behind every hint.`
  }

  // solveLevel === 'code'
  return `You are an expert competitive programmer.
The user wants a full solution for Problem #${questionNumber} from ${pName} in ${language}.
Do NOT save or store this question or solution anywhere.

Provide a COMPLETE SOLUTION with this structure:

1. Problem Recap
   One-line restatement.

2. Algorithm Choice
   Which algorithm or data structure, and why it is optimal.

3. Complete ${language} Code
   Write full, clean, well-commented ${language} code inside a code block.

4. Code Walkthrough
   Explain every non-obvious line or block.

5. Dry Run
   Trace through with a sample input showing each step.

6. Complexity Analysis
   Time and Space complexity with clear reasoning.

7. Alternative Approaches
   Other valid solutions and their trade-offs.

8. Common Mistakes
   What bugs beginners typically introduce.

Write idiomatic, clean ${language} code. Every comment should teach something.`
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const solveDSA = async (req, res) => {
  const { platform, questionNumber, solveLevel, language } = req.body

  if (!platform || !questionNumber || !solveLevel || !language) {
    return res.status(400).json({
      error: 'Missing fields: platform, questionNumber, solveLevel, language',
    })
  }

  const prompt = buildPrompt(platform, questionNumber, solveLevel, language)

  // SSE headers — stream response to frontend
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')

  try {
    const ollamaRes = await axios({
      method: 'post',
      url:    `${OLLAMA_URL}/api/generate`,
      data: {
        model:  OLLAMA_MODEL,
        prompt: prompt,
        stream: true,
      },
      responseType: 'stream',
    })

    ollamaRes.data.on('data', (chunk) => {
      try {
        const lines = chunk.toString().split('\n').filter(Boolean)
        for (const line of lines) {
          const parsed = JSON.parse(line)
          if (parsed.response) {
            res.write(`data: ${JSON.stringify({ text: parsed.response })}\n\n`)
          }
          if (parsed.done) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
          }
        }
      } catch (_) {
        // skip malformed chunk
      }
    })

    ollamaRes.data.on('end', () => {
      res.end()
    })

    ollamaRes.data.on('error', (err) => {
      console.error('Ollama stream error:', err.message)
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    })

  } catch (err) {
    console.error('DSA Controller error:', err.message)

    const hint = err.code === 'ECONNREFUSED'
      ? 'Ollama chal nahi raha — terminal mein "ollama serve" run karo.'
      : err.message

    if (!res.headersSent) {
      res.status(500).json({ error: hint })
    } else {
      res.write(`data: ${JSON.stringify({ error: hint })}\n\n`)
      res.end()
    }
  }
}
