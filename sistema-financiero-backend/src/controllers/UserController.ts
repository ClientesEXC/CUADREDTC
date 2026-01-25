import { Request, Response } from "express";
import * as bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { Branch } from "../entity/Branch";

export class UserController {
    static async listCashiers(req: Request, res: Response) {
        const { branchId } = req.query;

        const repo = AppDataSource.getRepository(User);
        const where: any = { role: "cashier" };

        if (branchId && typeof branchId === "string") {
            where.branchId = branchId;
        }

        const users = await repo.find({
            where,
            order: { username: "ASC" },
            relations: ["branch"],
        });

        const safe = users.map(u => ({
            id: u.id,
            username: u.username,
            role: u.role,
            status: u.status,
            branchId: u.branchId,
            branchName: u.branch?.name ?? "",
        }));

        res.json({ success: true, data: safe });
    }

    static async createCashier(req: Request, res: Response) {
        const { username, password, branchId } = req.body;

        if (!username || typeof username !== "string" || username.trim().length < 3) {
            res.status(400).json({ success: false, message: "Username inválido" });
            return;
        }

        if (!password || typeof password !== "string" || password.length < 6) {
            res.status(400).json({ success: false, message: "Password muy corta (mínimo 6)" });
            return;
        }

        if (!branchId || typeof branchId !== "string") {
            res.status(400).json({ success: false, message: "branchId requerido" });
            return;
        }

        const userRepo = AppDataSource.getRepository(User);
        const branchRepo = AppDataSource.getRepository(Branch);

        const branch = await branchRepo.findOne({ where: { id: branchId } });
        if (!branch) {
            res.status(404).json({ success: false, message: "Local no existe" });
            return;
        }

        const exists = await userRepo.findOne({ where: { username: username.trim() } });
        if (exists) {
            res.status(409).json({ success: false, message: "Ese username ya existe" });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = userRepo.create({
            username: username.trim(),
            password: passwordHash,
            role: "cashier",
            status: "active",
            branchId: branch.id,
            branch,
        });

        await userRepo.save(user);

        res.status(201).json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                role: user.role,
                status: user.status,
                branchId: user.branchId,
                branchName: branch.name,
            },
        });
    }
}
