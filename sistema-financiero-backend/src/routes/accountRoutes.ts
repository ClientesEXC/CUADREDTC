import { Router } from "express";
import { AccountController } from "../controllers/AccountController";
const router = Router();
router.get("/", AccountController.getAll);
router.post("/", AccountController.create);// GET /api/accounts
export default router;