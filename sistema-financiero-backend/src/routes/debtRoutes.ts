import { Router } from "express";
import { DebtController } from "../controllers/DebtController";

const router = Router();

// POST http://localhost:3000/api/debts/loan (Prestar)
router.post("/loan", DebtController.createLoan);

// POST http://localhost:3000/api/debts/pay (Abonar)
router.post("/pay", DebtController.payDebt);

// GET http://localhost:3000/api/debts/pending (Ver lista de morosos)
router.get("/pending", DebtController.getPendingDebts);

export default router;