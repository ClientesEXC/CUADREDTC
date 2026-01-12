import { Router } from "express";
import { AccountController } from "../controllers/AccountController";
const router = Router();
router.get("/", AccountController.getAll); // GET /api/accounts
export default router;