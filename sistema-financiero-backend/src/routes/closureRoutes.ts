import { Router } from "express";
import { ClosureController } from "../controllers/ClosureController";

const router = Router();

// GET http://localhost:3000/api/closure/preview
router.get("/preview", ClosureController.getPreview);

// POST http://localhost:3000/api/closure/close
router.post("/close", ClosureController.performClosure);

export default router;