import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { PeriodClosure } from "../entity/PeriodClosure";
import { Transaction, TransactionType } from "../entity/Transaction";
import { Account } from "../entity/Account";
import { User } from "../entity/User";
//import { Branch } from "../entity/Branch";
import { MoreThan } from "typeorm";

export class ClosureController {

    // A. VER PRELIMINAR (¿Cómo voy hasta ahora?)
    static getPreview = async (_req: Request, res: Response) => {
        try {
            const closureRepo = AppDataSource.getRepository(PeriodClosure);
            const txRepo = AppDataSource.getRepository(Transaction);

            // 1. CORRECCIÓN: Usamos find + take:1 en lugar de findOne
            const lastClosures = await closureRepo.find({
                order: { closingDate: "DESC" },
                take: 1
            });
            const lastClosure = lastClosures[0]; // Tomamos el primero (o undefined si no hay)

            // Si nunca hemos cerrado, empezamos desde el inicio de los tiempos
            const startDate = lastClosure ? lastClosure.closingDate : new Date(0);

            // 2. Sumamos todo lo que ha pasado DESDE esa fecha hasta HOY
            const transactions = await txRepo.find({
                where: { date: MoreThan(startDate) }
            });

            let income = 0;
            let expense = 0;

            transactions.forEach(tx => {
                // SUMAN
                if ([TransactionType.DEPOSIT, TransactionType.SALE, TransactionType.DEBT_PAYMENT].includes(tx.type as TransactionType)) {
                    income += Number(tx.amount);
                }
                // RESTAN
                else if ([TransactionType.EXPENSE, TransactionType.PAYROLL, TransactionType.PURCHASE].includes(tx.type as TransactionType)) {
                    expense += Number(tx.amount);
                }
            });

            const netResult = income - expense;

            return res.json({
                startDate,
                transactionsCount: transactions.length,
                totalIncome: income,
                totalExpense: expense,
                netResult: netResult,
                message: "Vista preliminar generada"
            });

        } catch (error: any) {
            console.error("ERROR PREVIEW:", error);
            return res.status(500).json({ message: "Error al calcular cierre", error: error.message });
        }
    }

    // B. EJECUTAR CIERRE (El botón de pánico/corte)
    static performClosure = async (req: Request, res: Response) => {
        const { userId, notes, capitalizeAmount, sourceAccountId, destinationAccountId } = req.body;

        return await AppDataSource.manager.transaction(async (manager) => {
            // 1. CORRECCIÓN AQUÍ TAMBIÉN: Usamos find + take:1
            const lastClosures = await manager.find(PeriodClosure, {
                order: { closingDate: "DESC" },
                take: 1
            });
            const lastClosure = lastClosures[0];

            const startDate = lastClosure ? lastClosure.closingDate : new Date(0);

            const transactions = await manager.find(Transaction, { where: { date: MoreThan(startDate) } });

            let income = 0;
            let expense = 0;
            transactions.forEach(tx => {
                if ([TransactionType.DEPOSIT, TransactionType.SALE, TransactionType.DEBT_PAYMENT].includes(tx.type as TransactionType)) income += Number(tx.amount);
                else if ([TransactionType.EXPENSE, TransactionType.PAYROLL, TransactionType.PURCHASE].includes(tx.type as TransactionType)) expense += Number(tx.amount);
            });

            const netResult = income - expense;

            // 2. VALIDAR LA CAPITALIZACIÓN
            const capitalToExtract = Number(capitalizeAmount || 0);

            if (capitalToExtract > 0 && capitalToExtract > netResult) {
                throw new Error(`No puedes capitalizar $${capitalToExtract} porque tu ganancia fue solo de $${netResult}`);
            }

            // 3. MOVER EL DINERO FÍSICO
            if (capitalToExtract > 0) {
                if (!sourceAccountId || !destinationAccountId) throw new Error("Debes elegir cuenta de origen y destino para capitalizar");

                const sourceAcc = await manager.findOneBy(Account, { id: sourceAccountId });
                const destAcc = await manager.findOneBy(Account, { id: destinationAccountId });
                const user = await manager.findOneBy(User, { id: userId });
                // const branch = await manager.findOneBy(Branch, { id: user?.branchId }); // COMENTADO SI DA ERROR

                if (!sourceAcc || !destAcc) throw new Error("Cuentas inválidas");
                if (Number(sourceAcc.balance) < capitalToExtract) throw new Error("Saldo físico insuficiente en origen");

                sourceAcc.balance = Number(sourceAcc.balance) - capitalToExtract;
                destAcc.balance = Number(destAcc.balance) + capitalToExtract;

                await manager.save(sourceAcc);
                await manager.save(destAcc);

                const tx = new Transaction();
                tx.type = TransactionType.UTILITY_WITHDRAWAL;
                tx.amount = capitalToExtract;
                tx.description = `CAPITALIZACIÓN DE UTILIDAD - CIERRE ${new Date().toLocaleDateString()}`;
                tx.account = sourceAcc;
                tx.destinationAccount = destAcc;
                tx.user = user!;
                // tx.branch = branch!; // COMENTADO SI DA ERROR, PUEDES USAR user.branch SI ESTÁ CARGADA
                await manager.save(tx);
            }

            // 4. GUARDAR EL CIERRE
            const closure = new PeriodClosure();
            closure.startDate = startDate;
            closure.totalIncome = income;
            closure.totalExpense = expense;
            closure.netResult = netResult;
            closure.capitalizedAmount = capitalToExtract;
            closure.carriedOverAmount = netResult - capitalToExtract;
            closure.notes = notes;

            await manager.save(closure);

            return res.json({
                message: "Ciclo cerrado correctamente",
                resumen: {
                    gananciaTotal: netResult,
                    capitalizado: capitalToExtract,
                    presupuestoParaSiguienteMes: closure.carriedOverAmount
                }
            });

        }).catch(error => {
            console.error(error);
            return res.status(500).json({ message: error.message });
        });
    }
}