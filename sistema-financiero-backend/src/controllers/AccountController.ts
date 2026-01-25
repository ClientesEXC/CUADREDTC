import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Account } from "../entity/Account";

export class AccountController {
    // Usamos '_req' con guion bajo para que TypeScript no se queje de que no lo usamos
    static getAll = async (_req: Request, res: Response) => {
        try {
            const accounts = await AppDataSource.getRepository(Account).find({
                order: { type: "ASC", name: "ASC" },
                relations: ["user"]
            });
            return res.json(accounts);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener cuentas", error });
        }
    }
    static create = async (req: Request, res: Response) => {
        const { name, type, balance, accountNumber, bankName } = req.body;
        if (!name || !type) {
            return res.status(400).json({ message: "Nombre y Tipo son obligatorios" });
        }
        try {
            const accountRepo = AppDataSource.getRepository(Account);
            // Verificar duplicados
            const exists = await accountRepo.findOneBy({ name });
            if (exists) return res.status(400).json({ message: "Ya existe una cuenta con este nombre" });
            const newAccount = new Account();
            newAccount.name = name;
            newAccount.type = type; // 'bank' o 'platform'
            newAccount.balance = Number(balance) || 0;
            newAccount.accountNumber = accountNumber || "S/N";
            newAccount.bankName = bankName || name;
            newAccount.status = 'active';

            await accountRepo.save(newAccount);

            return res.status(201).json({ message: "✅ Cuenta creada correctamente", account: newAccount });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Error al crear cuenta" });
        }
    }
}