import { Router } from "express";
import { BranchController } from "../controllers/BranchController";

const router = Router();

router.get("/", BranchController.list);
router.post("/", BranchController.create);

export default router;
