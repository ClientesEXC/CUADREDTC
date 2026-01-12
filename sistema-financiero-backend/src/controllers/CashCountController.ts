import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { CashCount } from "../entity/CashCount";
import { Account } from "../entity/Account";
import { User } from "../entity/User";
import { Branch } from "../entity/Branch";

export class CashCountController {

    static performClosing = async (req: Request, res: Response) => {
        const { userId, branchId, accountId, reportedAmount, comments } = req.body;

        // Validamos que el cajero haya contado algo (incluso 0 es válido, pero null no)
        if (reportedAmount === undefined || reportedAmount === null) {
            return res.status(400).json({ message: "Debes enviar el monto contado" });
        }

        return await AppDataSource.manager.transaction(async (manager) => {
            // 1. Obtener datos
            const account = await manager.findOneBy(Account, { id: accountId });
            const user = await manager.findOneBy(User, { id: userId });
            const branch = await manager.findOneBy(Branch, { id: branchId });

            if (!account || !user || !branch) throw new Error("Datos inválidos");

            // 2. EL MOMENTO DE LA VERDAD
            // Tomamos el saldo actual de la base de datos (Sistema)
            const expectedBalance = Number(account.balance);
            const countedBalance = Number(reportedAmount);

            // Calculamos diferencia: (Lo que tengo - Lo que debería tener)
            // Ejemplo: Tengo 90, Debería tener 100. Diferencia = -10 (Faltante)
            const difference = countedBalance - expectedBalance;

            // 3. Guardar el registro del Arqueo
            const arqueo = new CashCount();
            arqueo.expectedBalance = expectedBalance;
            arqueo.reportedBalance = countedBalance;
            arqueo.difference = difference;
            arqueo.comments = comments;
            arqueo.user = user;
            arqueo.branch = branch;
            arqueo.account = account;

            await manager.save(arqueo);

            // 4. Analizar resultado para responder
            let statusMessage = "Cuadre Perfecto ✅";
            if (difference < 0) statusMessage = `FALTANTE DE DINERO 🚨 ($${difference})`;
            if (difference > 0) statusMessage = `SOBRANTE DE DINERO 🤔 (+$${difference})`;

            return res.status(200).json({
                message: "Cierre de caja registrado",
                status: statusMessage,
                detalles: {
                    sistema: expectedBalance,
                    fisico: countedBalance,
                    diferencia: difference
                },
                arqueoId: arqueo.id
            });

        }).catch(error => {
            return res.status(500).json({ message: "Error en el cierre", error: error.message });
        });
    }

    // Ver historial de cierres
    static getHistory = async (_req: Request, res: Response) => {
        const repo = AppDataSource.getRepository(CashCount);
        // Traemos los últimos 10 cierres con las relaciones para ver nombres
        const history = await repo.find({
            order: { date: "DESC" },
            take: 10,
            relations: ["user", "account"]
        });
        return res.json(history);
    }
}