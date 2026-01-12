import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Account } from "../entity/Account";

export class AccountController {
    static getAll = async (_req: Request, res: Response) => {
        try {
            // En un sistema avanzado filtraríamos por sucursal/usuario.
            // Para tu MVP, traemos todas las cuentas para que tú (Admin) veas todo.
            const accounts = await AppDataSource.getRepository(Account).find({
                order: { type: "ASC", name: "ASC" }
            });
            return res.json(accounts);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener cuentas", error });
        }
    }
}