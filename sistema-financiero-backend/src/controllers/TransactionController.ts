import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Transaction, TransactionType, TransactionStatus } from "../entity/Transaction";
import { Account, AccountType } from "../entity/Account";
import { User } from "../entity/User";
import { Branch } from "../entity/Branch";

export class TransactionController {

    // ========================================
    // 1. OPERACIONES CON CLIENTES (Depósitos y Retiros)
    // ========================================
    static createOperation = async (req: Request, res: Response) => {
        const { userId, branchId, accountId, type, amount, commission, description, cashAccountId } = req.body;

        // ✅ VALIDACIÓN ROBUSTA DE ENTRADA
        if (!userId || !accountId || !type) {
            return res.status(400).json({
                success: false,
                message: "Faltan datos requeridos: userId, accountId, type"
            });
        }

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "El monto debe ser un número positivo válido"
            });
        }

        if (commission && (isNaN(commission) || Number(commission) < 0)) {
            return res.status(400).json({
                success: false,
                message: "La comisión no puede ser negativa"
            });
        }

        try {
            return await AppDataSource.manager.transaction(async (manager) => {

                // --- PASO 1: BUSCAR Y VALIDAR ENTIDADES BÁSICAS ---
                const user = await manager.findOne(User, {
                    where: { id: userId },
                    select: ['id', 'username', 'role', 'status']
                });

                if (!user) throw new Error("Usuario no encontrado");
                if (user.status === 'inactive') throw new Error("Usuario inactivo. Contacta al administrador");

                const branch = branchId ? await manager.findOneBy(Branch, { id: branchId }) : null;

                // --- PASO 2: BUSCAR CUENTA BANCARIA ---
                const bankAccount = await manager.findOne(Account, {
                    where: { id: accountId },
                    lock: { mode: "pessimistic_write" }
                });

                if (!bankAccount) throw new Error("Cuenta bancaria no encontrada");

                if (bankAccount.type !== AccountType.BANK && bankAccount.type !== AccountType.PLATFORM) {
                    throw new Error("La cuenta seleccionada no es válida para esta operación");
                }

                if (bankAccount.status === 'inactive') throw new Error("Cuenta bancaria inactiva");

                // --- PASO 3: BUSCAR CAJA FÍSICA (Lógica Inteligente) ---
                let cashAccount: Account | null = null;

                // 🔍 NIVEL 1: ID explícito
                if (cashAccountId) {
                    cashAccount = await manager.findOne(Account, {
                        where: { id: cashAccountId, type: AccountType.PHYSICAL },
                        lock: { mode: "pessimistic_write" }
                    });
                }

                // 🔍 NIVEL 2: Caja asignada al usuario
                if (!cashAccount) {
                    const userAccounts = await manager.find(Account, {
                        where: {
                            user: { id: userId },
                            type: AccountType.PHYSICAL,
                            status: 'active'
                        },
                        lock: { mode: "pessimistic_write" }
                    });

                    if (userAccounts.length > 0) {
                        // Filtramos para NO usar la Bóveda automáticamente
                        const operationalBox = userAccounts.find(acc =>
                            !acc.name.toLowerCase().includes('bóveda') &&
                            !acc.name.toLowerCase().includes('reserva')
                        );
                        cashAccount = operationalBox || userAccounts[0];
                    }
                }

                // 🔍 NIVEL 3: Caja de Sucursal
                if (!cashAccount && branch) {
                    cashAccount = await manager.findOne(Account, {
                        where: {
                            branch: { id: branch.id },
                            type: AccountType.PHYSICAL,
                            status: 'active'
                        },
                        lock: { mode: "pessimistic_write" }
                    });
                }

                if (!cashAccount) {
                    throw new Error("No se encontró caja física disponible para operar.");
                }

                if (bankAccount.id === cashAccount.id) {
                    throw new Error("No puedes operar una cuenta contra sí misma.");
                }

                // --- PASO 5: CÁLCULOS ---
                const amountNum = Number(amount);
                const commissionNum = Number(commission || 0);
                const totalAmount = amountNum + commissionNum;

                const previousBankBalance = Number(bankAccount.balance);
                const previousCashBalance = Number(cashAccount.balance);

                if (type === TransactionType.DEPOSIT || type === TransactionType.SERVICE_PAYMENT)  {
                    if (previousBankBalance < amountNum) {
                        throw new Error(`Saldo bancario insuficiente. ${bankAccount.name}.\\n\` + Disp: $${previousBankBalance.toFixed(2)}`);
                    }
                    cashAccount.balance = previousCashBalance + totalAmount;
                    bankAccount.balance = previousBankBalance - amountNum;

                } else if (type === TransactionType.WITHDRAWAL) {
                    if (previousCashBalance < amountNum) {
                        throw new Error(`Efectivo insuficiente. Disp: $${previousCashBalance.toFixed(2)}`);
                    }
                    cashAccount.balance = previousCashBalance - amountNum;
                    bankAccount.balance = previousBankBalance + amountNum;

                    if (commissionNum > 0) {
                        cashAccount.balance = Number(cashAccount.balance) + commissionNum;
                    }
                } else {
                    throw new Error("Tipo de operación no válido");
                }

                await manager.save([cashAccount, bankAccount]);

                // --- REGISTRO ---
                const transaction = new Transaction();
                transaction.type = type;
                transaction.amount = amountNum;
                transaction.commission = commissionNum;
                transaction.description = description || `${type} en ${bankAccount.name}`;
                transaction.user = user;
                transaction.branch = branch;
                transaction.account = bankAccount;
                transaction.destinationAccount = cashAccount;
                transaction.status = TransactionStatus.COMPLETED;
                transaction.date = new Date();

                transaction.metadata = JSON.stringify({
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });

                await manager.save(transaction);

                return res.status(200).json({
                    success: true,
                    message: "✅ Operación completada",
                    transaction: { id: transaction.id, amount: transaction.amount },
                    balances: {
                        banco: { current: bankAccount.balance },
                        caja: { current: cashAccount.balance }
                    }
                });
            });

        } catch (error: any) {
            console.error("❌ Error en createOperation:", error);
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    // ========================================
    // 2. REBALANCEO
    // ========================================
    static rebalance = async (req: Request, res: Response) => {
        const { userId, branchId, sourceAccountId, destinationAccountId, amount, description } = req.body;

        if (!sourceAccountId || !destinationAccountId || !amount) {
            return res.status(400).json({ success: false, message: "Faltan datos" });
        }
        if (Number(amount) <= 0) return res.status(400).json({ message: "Monto inválido" });
        if (sourceAccountId === destinationAccountId) return res.status(400).json({ message: "Cuentas iguales" });

        try {
            return await AppDataSource.manager.transaction(async (manager) => {
                const sourceAcc = await manager.findOne(Account, { where: { id: sourceAccountId }, lock: { mode: "pessimistic_write" } });
                const destAcc = await manager.findOne(Account, { where: { id: destinationAccountId }, lock: { mode: "pessimistic_write" } });
                const user = await manager.findOneBy(User, { id: userId });
                const branch = branchId ? await manager.findOneBy(Branch, { id: branchId }) : null;

                if (!sourceAcc || !destAcc || !user) throw new Error("Datos inválidos");

                if (Number(sourceAcc.balance) < Number(amount)) {
                    throw new Error("Saldo insuficiente en origen");
                }

                sourceAcc.balance = Number(sourceAcc.balance) - Number(amount);
                destAcc.balance = Number(destAcc.balance) + Number(amount);

                await manager.save([sourceAcc, destAcc]);

                const tx = new Transaction();
                tx.type = TransactionType.INTERNAL_TRANSFER;
                tx.amount = Number(amount);
                tx.description = description || `Transferencia interna`;
                tx.user = user;
                tx.branch = branch;
                tx.account = sourceAcc;
                tx.destinationAccount = destAcc;
                tx.status = TransactionStatus.COMPLETED;
                tx.date = new Date();

                await manager.save(tx);

                return res.json({ success: true, message: "Transferencia exitosa" });
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    // ========================================
    // 3. INYECCIÓN DE CAPITAL
    // ========================================
    static injectCapital = async (req: Request, res: Response) => {
        const { userId, branchId, destinationAccountId, amount, description, fundSource } = req.body;

        if (!amount || Number(amount) <= 0) return res.status(400).json({ message: "Monto inválido" });

        try {
            return await AppDataSource.manager.transaction(async (manager) => {
                const destAccount = await manager.findOne(Account, { where: { id: destinationAccountId }, lock: { mode: "pessimistic_write" } });
                const user = await manager.findOneBy(User, { id: userId });
                const branch = branchId ? await manager.findOneBy(Branch, { id: branchId }) : null;

                if (!destAccount || !user) throw new Error("Datos inválidos");

                destAccount.balance = Number(destAccount.balance) + Number(amount);
                await manager.save(destAccount);

                const tx = new Transaction();
                tx.type = TransactionType.CAPITAL_INJECTION;
                tx.amount = Number(amount);
                tx.description = description || "Inyección de Capital";
                tx.user = user;
                tx.branch = branch;
                tx.account = destAccount;
                tx.status = TransactionStatus.COMPLETED;
                tx.date = new Date();
                tx.metadata = JSON.stringify({ fundSource });

                await manager.save(tx);

                return res.json({ success: true, message: "Capital inyectado" });
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    // ========================================
    // 4. REGISTRAR GASTOS
    // ========================================
    static registerExpense = async (req: Request, res: Response) => {
        const { userId, branchId, sourceAccountId, amount, type, description, category } = req.body;

        try {
            return await AppDataSource.manager.transaction(async (manager) => {
                const sourceAcc = await manager.findOne(Account, { where: { id: sourceAccountId }, lock: { mode: "pessimistic_write" } });
                const user = await manager.findOneBy(User, { id: userId });
                const branch = branchId ? await manager.findOneBy(Branch, { id: branchId }) : null;

                if (!sourceAcc || !user) throw new Error("Datos inválidos");
                if (Number(sourceAcc.balance) < Number(amount)) throw new Error("Saldo insuficiente");

                sourceAcc.balance = Number(sourceAcc.balance) - Number(amount);
                await manager.save(sourceAcc);

                const tx = new Transaction();
                tx.type = type || TransactionType.EXPENSE;
                tx.amount = Number(amount);
                tx.description = description || "Gasto registrado";
                tx.user = user;
                tx.branch = branch;
                tx.account = sourceAcc;
                tx.status = TransactionStatus.COMPLETED;
                tx.date = new Date();
                if (category) tx.metadata = JSON.stringify({ category });

                await manager.save(tx);

                return res.json({ success: true, message: "Gasto registrado" });
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    // ========================================
    // 5. OBTENER HISTORIAL (CORREGIDO)
    // ========================================
    static getHistory = async (req: Request, res: Response) => {
        try {
            const { userId, branchId, limit = 50, offset = 0 } = req.query;
            const where: any = {};

            if (userId) where.user = { id: userId };

            // ✅ CORRECCIÓN 1: Ahora usamos branchId si viene en la petición
            if (branchId) where.branch = { id: branchId };

            const [transactions, total] = await AppDataSource.manager.findAndCount(Transaction, {
                where,
                relations: ["user", "branch", "account", "destinationAccount"],
                order: { date: "DESC" },
                take: Number(limit),
                skip: Number(offset)
            });

            return res.json({
                success: true,
                data: {
                    transactions,
                    pagination: { total, limit, offset }
                }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    // ========================================
    // 6. ANULAR TRANSACCIÓN (CORREGIDO)
    // ========================================
    static annulTransaction = async (req: Request, res: Response) => {
        const { transactionId, userId, reason } = req.body;

        try {
            return await AppDataSource.manager.transaction(async (manager) => {
                const originalTx = await manager.findOne(Transaction, {
                    where: { id: transactionId },
                    relations: ["account", "destinationAccount"]
                });

                if (!originalTx) throw new Error("Transacción no encontrada");
                if (originalTx.status === TransactionStatus.ANNULLED) throw new Error("Ya está anulada");

                const mainAcc = await manager.findOne(Account, { where: { id: originalTx.account.id } });
                let destAcc = null;
                if (originalTx.destinationAccount) {
                    destAcc = await manager.findOne(Account, { where: { id: originalTx.destinationAccount.id } });
                }

                // LÓGICA DE REVERSIÓN
                if (originalTx.type === TransactionType.DEPOSIT) {
                    mainAcc!.balance = Number(mainAcc!.balance) + Number(originalTx.amount);
                    if (destAcc) destAcc.balance = Number(destAcc.balance) - (Number(originalTx.amount) + Number(originalTx.commission));
                } else if (originalTx.type === TransactionType.WITHDRAWAL) {
                    mainAcc!.balance = Number(mainAcc!.balance) - Number(originalTx.amount);
                    if (destAcc) destAcc.balance = Number(destAcc.balance) + Number(originalTx.amount) - Number(originalTx.commission);
                }

                if (mainAcc) await manager.save(mainAcc);
                if (destAcc) await manager.save(destAcc);

                originalTx.status = TransactionStatus.ANNULLED;

                // ✅ CORRECCIÓN 2: Usamos userId en la descripción para que TypeScript no se queje
                originalTx.description += ` | ANULADO (User ID: ${userId}): ${reason}`;

                await manager.save(originalTx);

                return res.json({ success: true, message: "Anulada correctamente" });
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };
}