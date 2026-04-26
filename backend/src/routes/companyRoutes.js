import express from "express";
import { getCompanies, generateCompanyQuestions, getCompanyInfo } from "../controllers/companyController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET  /api/company/list          — all companies
router.get("/list", authMiddleware, getCompanies);

// GET  /api/company/:company      — company info + rounds
router.get("/:company", authMiddleware, getCompanyInfo);

// POST /api/company/questions     — generate/fetch questions
router.post("/questions", authMiddleware, generateCompanyQuestions);

export default router;
