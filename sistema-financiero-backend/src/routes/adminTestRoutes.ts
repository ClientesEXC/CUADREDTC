import { Router } from "express";

const router = Router();

router.get("/ping", (req, res) => {
    const auth = (req as any).auth;
    res.json({ ok: true, message: "Admin route OK", auth });
});

export default router;
