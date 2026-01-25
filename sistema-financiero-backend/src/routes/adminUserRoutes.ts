import { Router } from "express";
import { UserController } from "../controllers/UserController";

const router = Router();

router.get("/cashiers", UserController.listCashiers);
router.post("/cashiers", UserController.createCashier);

export default router;
