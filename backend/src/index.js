import express from "express";
import dotenv from "dotenv";
import cors from "cors";
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

app.use(cors({
  origin: '*',  
  credentials: false, 
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.use('/api/dsa',            dsaRoutes);
app.use("/api/auth",           authRoutes);
app.use("/api/questions",      questionRoutes);
app.use("/api/resume",         resumeRoutes);
app.use("/api/interview",      interviewRoutes);
app.use("/api/company",        companyRoutes);
app.use("/api/admin",          adminRoutes);
app.use("/api/streak",         streakRoutes);
app.use('/api/voice-interview', voiceInterviewRoutes);

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

cron.schedule('0 20 * * *', async () => {
  console.log('Sending streak reminders...')
  await fetch(`${process.env.FRONTEND_URL?.replace('vercel.app', 'railway.app') || 'http://localhost:5000'}/api/streak/send-reminders`, { method: 'POST' })
})

app.listen(5000, () => {
  console.log("Server running on port 5000");
});