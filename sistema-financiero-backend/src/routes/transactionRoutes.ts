import { Router } from "express";
import { TransactionController } from "../controllers/TransactionController";

const router = Router();

// Ruta para operaciones normales (Depósitos/Retiros)
// POST http://localhost:3000/api/transactions/operation
router.post("/operation", TransactionController.createOperation);


// Ruta para rebalanceo (Mover dinero interno)
// POST http://localhost:3000/api/transactions/rebalance
router.post("/rebalance", TransactionController.rebalance);

// POST http://localhost:3000/api/transactions/inject
router.post("/inject", TransactionController.injectCapital);

// POST http://localhost:3000/api/transactions/expense
router.post("/expense", TransactionController.registerExpense);

// POST http://localhost:3000/api/transactions/annul
router.post("/annul", TransactionController.annulTransaction);

// GET http://localhost:3000/api/transactions/history
router.get("/history", TransactionController.getHistory);

export default router;