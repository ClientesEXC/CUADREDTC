import { Router } from "express";
import { CashCountController } from "../controllers/CashCountController";

const router = Router();

// POST http://localhost:3000/api/closing/perform
router.post("/perform", CashCountController.performClosing);

// GET http://localhost:3000/api/closing/history
router.get("/history", CashCountController.getHistory);

export default router;