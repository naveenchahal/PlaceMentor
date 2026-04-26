import express from 'express'
import { solveDSA } from '../controllers/dsaController.js'

const router = express.Router()

// POST /api/dsa/solve
router.post('/solve', solveDSA)

export default router
