// src/config/groq.js
// Ollama ki jagah Groq use karo — same interface, cloud par kaam karta hai

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Drop-in replacement for callOllama — same function signature
export const callOllama = async (prompt, timeout = 120000) => {
  const completion = await groq.chat.completions.create({
    model: "llama3-8b-8192",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 4000,
  });
  return completion.choices[0].message.content.trim();
};

// SSE streaming version — dsaController ke liye
export const streamOllama = async (prompt, res) => {
  const stream = await groq.chat.completions.create({
    model: "llama3-8b-8192",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 4000,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || "";
    if (text) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
};

export default groq;