import express from "express";
import  protect  from "../middleware/authMiddleware.js";
import {
  startVoiceInterview,
  nextVoiceQuestion,
  finishVoiceInterview,
  getVoiceHistory,
} from "../controllers/voiceInterviewController.js";
 
const router = express.Router();
 
router.use(protect); // all routes protected
 
router.post("/start",   startVoiceInterview);
router.post("/next",    nextVoiceQuestion);
router.post("/finish",  finishVoiceInterview);
router.get("/history",  getVoiceHistory);
 
export default router;