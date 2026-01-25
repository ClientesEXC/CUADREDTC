import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Branch } from "../entity/Branch";

export class BranchController {
    static async list(_req: Request, res: Response) {
        const repo = AppDataSource.getRepository(Branch);
        const branches = await repo.find({ order: { name: "ASC" } });
        res.json({ success: true, data: branches });
    }

    static async create(req: Request, res: Response) {
        const { name, address } = req.body;

        if (!name || typeof name !== "string" || name.trim().length < 2) {
            res.status(400).json({ success: false, message: "Nombre de local inválido" });
            return;
        }

        const repo = AppDataSource.getRepository(Branch);

        const exists = await repo.findOne({ where: { name: name.trim() } });
        if (exists) {
            res.status(409).json({ success: false, message: "Ya existe un local con ese nombre" });
            return;
        }

        const branch = repo.create({
            name: name.trim(),
            address: typeof address === "string" ? address.trim() : "",
        });

        await repo.save(branch);

        res.status(201).json({ success: true, data: branch });
    }
}
