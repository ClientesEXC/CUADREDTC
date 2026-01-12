import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Debt, DebtStatus } from "../entity/Debt";
import { Transaction, TransactionType } from "../entity/Transaction";
import { Account } from "../entity/Account";
import { User } from "../entity/User";
import { Branch } from "../entity/Branch";

export class DebtController {

    // 1. REGISTRAR UN NUEVO PRÉSTAMO (Sale dinero de Caja)
    static createLoan = async (req: Request, res: Response) => {
        const { userId, branchId, cashAccountId, debtorName, amount, description } = req.body;

        if (!amount || amount <= 0) return res.status(400).json({ message: "Monto inválido" });

        return await AppDataSource.manager.transaction(async (manager) => {
            // a. Validar caja y usuario
            const cashAccount = await manager.findOneBy(Account, { id: cashAccountId });
            const user = await manager.findOneBy(User, { id: userId });
            const branch = await manager.findOneBy(Branch, { id: branchId });

            if (!cashAccount || !user || !branch) throw new Error("Datos inválidos");

            // b. Validar si hay dinero en caja para prestar
            if (Number(cashAccount.balance) < Number(amount)) {
                throw new Error("No hay suficiente efectivo en caja para este préstamo");
            }

            // c. Restar dinero de la caja
            cashAccount.balance = Number(cashAccount.balance) - Number(amount);
            await manager.save(cashAccount);

            // d. Crear el expediente de Deuda
            const newDebt = new Debt();
            newDebt.debtorName = debtorName;
            newDebt.description = description;
            newDebt.originalAmount = Number(amount);
            newDebt.currentBalance = Number(amount); // Al inicio debe todo
            newDebt.status = DebtStatus.PENDING;
            newDebt.createdBy = user;

            const savedDebt = await manager.save(newDebt);

            // e. Registrar la transacción en el historial (Log)
            const tx = new Transaction();
            tx.type = TransactionType.LOAN_GIVEN;
            tx.amount = Number(amount);
            tx.description = `Préstamo a: ${debtorName} - ${description}`;
            tx.user = user;
            tx.branch = branch;
            tx.account = cashAccount; // De aquí salió la plata

            await manager.save(tx);

            return res.status(200).json({
                message: "Préstamo registrado correctamente",
                debtId: savedDebt.id,
                nuevoSaldoCaja: cashAccount.balance
            });

        }).catch(error => {
            return res.status(500).json({ message: "Error al crear préstamo", error: error.message });
        });
    };

    // 2. REGISTRAR UN ABONO/PAGO (Entra dinero a Caja)
    static payDebt = async (req: Request, res: Response) => {
        const { userId, branchId, cashAccountId, debtId, amount } = req.body;

        if (!amount || amount <= 0) return res.status(400).json({ message: "Monto inválido" });

        return await AppDataSource.manager.transaction(async (manager) => {
            // a. Buscar la deuda
            const debt = await manager.findOneBy(Debt, { id: debtId });
            if (!debt) throw new Error("Deuda no encontrada");

            if (debt.status === DebtStatus.PAID) throw new Error("Esta deuda ya está pagada");
            if (Number(debt.currentBalance) < Number(amount)) throw new Error("El abono supera el saldo pendiente");

            // b. Buscar caja
            const cashAccount = await manager.findOneBy(Account, { id: cashAccountId });
            const user = await manager.findOneBy(User, { id: userId });
            const branch = await manager.findOneBy(Branch, { id: branchId });

            if (!cashAccount || !user || !branch) throw new Error("Datos de caja/usuario inválidos");

            // c. Sumar dinero a la caja (Entra el pago)
            cashAccount.balance = Number(cashAccount.balance) + Number(amount);
            await manager.save(cashAccount);

            // d. Actualizar la Deuda
            debt.currentBalance = Number(debt.currentBalance) - Number(amount);

            // Si el saldo llega a 0 (o menos por error de decimales), se marca PAGADO
            if (debt.currentBalance <= 0.009) { // Tolerancia pequeña para decimales
                debt.currentBalance = 0;
                debt.status = DebtStatus.PAID;
            }
            await manager.save(debt);

            // e. Registrar transacción
            const tx = new Transaction();
            tx.type = TransactionType.DEBT_PAYMENT;
            tx.amount = Number(amount);
            tx.description = `Abono de: ${debt.debtorName}`;
            tx.user = user;
            tx.branch = branch;
            tx.account = cashAccount; // Aquí entró la plata

            await manager.save(tx);

            return res.status(200).json({
                message: "Abono registrado",
                saldoPendiente: debt.currentBalance,
                estado: debt.status
            });

        }).catch(error => {
            return res.status(500).json({ message: "Error al abonar", error: error.message });
        });
    }

    // 3. VER DEUDAS PENDIENTES
    static getPendingDebts = async (_req: Request, res: Response) => {
        const debtRepo = AppDataSource.getRepository(Debt);
        const debts = await debtRepo.find({ where: { status: DebtStatus.PENDING } });
        return res.json(debts);
    }
}