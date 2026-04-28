import express from "express";
import dotenv from "dotenv";
import cors from "cors";  // ← ADD
import passport from "passport";

import "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import streakRoutes from "./routes/streakRoutes.js";
import cron from 'node-cron'
import voiceInterviewRoutes from './routes/voiceInterviewRoutes.js'
import dsaRoutes from './routes/dsaRoutes.js'
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

// ← ADD THESE LINES
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://place-mentor-iota.vercel.app", // production URL
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      // Allow karo production URL + saari Vercel preview URLs
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/place-mentor.*\.vercel\.app$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        console.error(`❌ CORS blocked: ${origin}`);
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use('/api/dsa', dsaRoutes)
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/streak", streakRoutes);
app.use('/api/voice-interview', voiceInterviewRoutes)

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

cron.schedule('0 20 * * *', async () => {
  console.log('Sending streak reminders...')
  await fetch('http://localhost:5000/api/streak/send-reminders', { method: 'POST' })
})

app.listen(5000, () => {
  console.log("Server running on port 5000");
});