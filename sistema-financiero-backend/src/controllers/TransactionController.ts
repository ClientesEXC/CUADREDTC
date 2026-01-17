import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Transaction, TransactionType, TransactionStatus } from "../entity/Transaction";
import { Account, AccountType } from "../entity/Account";
import { User } from "../entity/User";
import { Branch } from "../entity/Branch";
import { In } from "typeorm";

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
            // INICIO DE TRANSACCIÓN ACID (Todo o Nada)
            return await AppDataSource.manager.transaction(async (manager) => {

                // --- PASO 1: BUSCAR Y VALIDAR ENTIDADES BÁSICAS ---
                const user = await manager.findOne(User, {
                    where: { id: userId },
                    select: ['id', 'username', 'role', 'status']
                });

                if (!user) {
                    throw new Error("Usuario no encontrado");
                }

                if (user.status === 'inactive') {
                    throw new Error("Usuario inactivo. Contacta al administrador");
                }

                const branch = branchId ? await manager.findOneBy(Branch, { id: branchId }) : null;

                // --- PASO 2: BUSCAR CUENTA BANCARIA CON BLOQUEO ---
                // ✅ MEJORA: Usamos bloqueo pesimista para evitar condiciones de carrera
                const bankAccount = await manager.findOne(Account, {
                    where: { id: accountId },
                    lock: { mode: "pessimistic_write" } // Bloquea el registro
                });

                if (!bankAccount) {
                    throw new Error("Cuenta bancaria no encontrada");
                }

                if (bankAccount.type !== AccountType.BANK) {
                    throw new Error("La cuenta seleccionada no es una cuenta bancaria válida");
                }

                if (bankAccount.status === 'inactive') {
                    throw new Error("Cuenta bancaria inactiva");
                }

                // --- PASO 3: BUSCAR CAJA FÍSICA (Sistema en Cascada Mejorado) ---
                let cashAccount: Account | null = null;

                // 🔍 NIVEL 1: ID explícito del frontend (si se proporcionó)
                if (cashAccountId) {
                    cashAccount = await manager.findOne(Account, {
                        where: {
                            id: cashAccountId,
                            type: AccountType.PHYSICAL
                        },
                        lock: { mode: "pessimistic_write" }
                    });
                }

                // 🔍 NIVEL 2: Caja asignada al usuario
                if (!cashAccount) {
                    cashAccount = await manager.findOne(Account, {
                        where: {
                            user: { id: userId },
                            type: AccountType.PHYSICAL,
                            status: 'active'
                        },
                        lock: { mode: "pessimistic_write" }
                    });
                }

                // 🔍 NIVEL 3: Caja asignada a la sucursal (si existe)
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

                // 🔍 NIVEL 4: Caja general por NOMBRE EXACTO (Lista blanca)
                if (!cashAccount) {
                    cashAccount = await manager.findOne(Account, {
                        where: {
                            name: In(['Caja General', 'Efectivo', 'Bóveda Principal', 'Caja Matriz']),
                            type: AccountType.PHYSICAL,
                            status: 'active'
                        },
                        lock: { mode: "pessimistic_write" }
                    });
                }

                // ❌ ERROR FINAL: No encontramos ninguna caja
                if (!cashAccount) {
                    throw new Error(
                        "No se encontró caja física disponible. Verifica:\n" +
                        "1. Que tengas una caja asignada\n" +
                        "2. Que exista 'Caja General' en el sistema\n" +
                        "3. Contacta al administrador"
                    );
                }

                // --- PASO 4: VALIDACIONES DE SEGURIDAD ---
                if (bankAccount.id === cashAccount.id) {
                    throw new Error(
                        "No puedes operar una cuenta contra sí misma. " +
                        "Selecciona una cuenta bancaria diferente"
                    );
                }

                // --- PASO 5: CÁLCULOS FINANCIEROS ---
                const amountNum = Number(amount);
                const commissionNum = Number(commission || 0);
                const totalAmount = amountNum + commissionNum;

                // Guardamos saldos anteriores para auditoría
                const previousBankBalance = Number(bankAccount.balance);
                const previousCashBalance = Number(cashAccount.balance);

                // 💰 LÓGICA SEGÚN TIPO DE OPERACIÓN
                if (type === TransactionType.DEPOSIT) {
                    // DEPÓSITO: Cliente entrega efectivo → Nosotros transferimos por banco
                    // Caja SUBE (+efectivo +comisión) | Banco BAJA (-transferencia)

                    if (previousBankBalance < amountNum) {
                        throw new Error(
                            `Saldo bancario insuficiente para realizar el depósito.\n` +
                            `Necesitas: $${amountNum.toFixed(2)}\n` +
                            `Disponible: $${previousBankBalance.toFixed(2)}`
                        );
                    }

                    cashAccount.balance = previousCashBalance + totalAmount;
                    bankAccount.balance = previousBankBalance - amountNum;

                } else if (type === TransactionType.WITHDRAWAL) {
                    // RETIRO: Cliente pide efectivo → Nosotros recibimos transferencia
                    // Caja BAJA (-efectivo) | Banco SUBE (+transferencia +comisión)

                    if (previousCashBalance < amountNum) {
                        throw new Error(
                            `Efectivo insuficiente en caja para el retiro.\n` +
                            `Necesitas: $${amountNum.toFixed(2)}\n` +
                            `Disponible: $${previousCashBalance.toFixed(2)}`
                        );
                    }

                    cashAccount.balance = previousCashBalance - amountNum;
                    bankAccount.balance = previousBankBalance + amountNum;
                    // La comisión entra a caja (efectivo adicional)
                    if (commissionNum > 0) {
                        cashAccount.balance = Number(cashAccount.balance) + commissionNum;
                    }

                } else if (type === TransactionType.SALE) {
                    // VENTA: Similar a depósito (entra efectivo, sale banco)
                    if (previousBankBalance < amountNum) {
                        throw new Error(`Saldo bancario insuficiente para la venta`);
                    }
                    cashAccount.balance = previousCashBalance + totalAmount;
                    bankAccount.balance = previousBankBalance - amountNum;

                } else {
                    throw new Error(
                        `Tipo de operación '${type}' no válido para createOperation. ` +
                        `Usa: DEPOSIT, WITHDRAWAL o SALE`
                    );
                }

                // --- PASO 6: GUARDAR CAMBIOS EN BASE DE DATOS ---
                await manager.save([cashAccount, bankAccount]);

                // --- PASO 7: REGISTRAR EN HISTORIAL ---
                const transaction = new Transaction();
                transaction.type = type;
                transaction.amount = amountNum;
                transaction.commission = commissionNum;
                transaction.description = description || `${type} de $${amountNum} en ${bankAccount.name}`;
                transaction.user = user;
                transaction.branch = branch;
                transaction.account = bankAccount;
                transaction.destinationAccount = cashAccount;
                transaction.status = TransactionStatus.COMPLETED;
                transaction.date = new Date();

                // ✅ AUDITORÍA: Guardamos estado antes/después
                transaction.metadata = JSON.stringify({
                    previousBalances: {
                        bank: previousBankBalance,
                        cash: previousCashBalance
                    },
                    newBalances: {
                        bank: bankAccount.balance,
                        cash: cashAccount.balance
                    },
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });

                await manager.save(transaction);

                // --- PASO 8: RESPUESTA EXITOSA ---
                return res.status(200).json({
                    success: true,
                    message: "✅ Operación completada exitosamente",
                    transaction: {
                        id: transaction.id,
                        type: transaction.type,
                        amount: transaction.amount,
                        commission: transaction.commission,
                        date: transaction.date
                    },
                    balances: {
                        banco: {
                            name: bankAccount.name,
                            previous: previousBankBalance,
                            current: bankAccount.balance,
                            change: Number(bankAccount.balance) - previousBankBalance
                        },
                        caja: {
                            name: cashAccount.name,
                            previous: previousCashBalance,
                            current: cashAccount.balance,
                            change: Number(cashAccount.balance) - previousCashBalance
                        }
                    }
                });

            }); // Fin de transacción

        } catch (error: any) {
            console.error("❌ Error en createOperation:", error);
            return res.status(500).json({
                success: false,
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    };

    // ========================================
    // 2. REBALANCEO DE LIQUIDEZ
    // ========================================
    static rebalance = async (req: Request, res: Response) => {
        const { userId, branchId, sourceAccountId, destinationAccountId, amount, description } = req.body;

        // Validaciones
        if (!sourceAccountId || !destinationAccountId || !amount) {
            return res.status(400).json({
                success: false,
                message: "Faltan datos: sourceAccountId, destinationAccountId, amount"
            });
        }

        if (Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "El monto debe ser mayor a 0"
            });
        }

        if (sourceAccountId === destinationAccountId) {
            return res.status(400).json({
                success: false,
                message: "No puedes transferir a la misma cuenta"
            });
        }

        try {
            return await AppDataSource.manager.transaction(async (manager) => {

                // Buscar cuentas con bloqueo
                const sourceAcc = await manager.findOne(Account, {
                    where: { id: sourceAccountId },
                    lock: { mode: "pessimistic_write" }
                });

                const destAcc = await manager.findOne(Account, {
                    where: { id: destinationAccountId },
                    lock: { mode: "pessimistic_write" }
                });

                const user = await manager.findOneBy(User, { id: userId });
                const branch = branchId ? await manager.findOneBy(Branch, { id: branchId }) : null;

                if (!sourceAcc || !destAcc) {
                    throw new Error("Una o ambas cuentas no existen");
                }

                if (!user) {
                    throw new Error("Usuario no encontrado");
                }

                // Validar saldo
                const amountNum = Number(amount);
                const previousSourceBalance = Number(sourceAcc.balance);

                if (previousSourceBalance < amountNum) {
                    throw new Error(
                        `Saldo insuficiente en cuenta origen.\n` +
                        `Necesitas: $${amountNum.toFixed(2)}\n` +
                        `Disponible: $${previousSourceBalance.toFixed(2)}`
                    );
                }

                // Realizar transferencia
                const previousDestBalance = Number(destAcc.balance);
                sourceAcc.balance = previousSourceBalance - amountNum;
                destAcc.balance = previousDestBalance + amountNum;

                await manager.save([sourceAcc, destAcc]);

                // Registrar transacción
                const tx = new Transaction();
                tx.type = TransactionType.INTERNAL_TRANSFER;
                tx.amount = amountNum;
                tx.description = description || `Rebalanceo: ${sourceAcc.name} → ${destAcc.name}`;
                tx.user = user;
                tx.branch = branch;
                tx.account = sourceAcc;
                tx.destinationAccount = destAcc;
                tx.status = TransactionStatus.COMPLETED;
                tx.date = new Date();

                await manager.save(tx);

                return res.status(200).json({
                    success: true,
                    message: "✅ Rebalanceo exitoso",
                    transaction: { id: tx.id, amount: tx.amount },
                    balances: {
                        origen: {
                            name: sourceAcc.name,
                            previous: previousSourceBalance,
                            current: sourceAcc.balance
                        },
                        destino: {
                            name: destAcc.name,
                            previous: previousDestBalance,
                            current: destAcc.balance
                        }
                    }
                });

            });
        } catch (error: any) {
            console.error("❌ Error en rebalance:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };

    // ========================================
    // 3. INYECCIÓN DE CAPITAL EXTERNO
    // ========================================
    static injectCapital = async (req: Request, res: Response) => {
        const { userId, branchId, destinationAccountId, amount, description, fundSource } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "El monto debe ser positivo"
            });
        }

        if (!fundSource) {
            return res.status(400).json({
                success: false,
                message: "Debes especificar la fuente de los fondos (fundSource)"
            });
        }

        try {
            return await AppDataSource.manager.transaction(async (manager) => {

                const destAccount = await manager.findOne(Account, {
                    where: { id: destinationAccountId },
                    lock: { mode: "pessimistic_write" }
                });

                const user = await manager.findOneBy(User, { id: userId });
                const branch = branchId ? await manager.findOneBy(Branch, { id: branchId }) : null;

                if (!destAccount || !user) {
                    throw new Error("Cuenta o usuario no encontrado");
                }

                // Aumentar saldo (solo entra dinero)
                const previousBalance = Number(destAccount.balance);
                const amountNum = Number(amount);
                destAccount.balance = previousBalance + amountNum;

                await manager.save(destAccount);

                // Registrar con trazabilidad
                const tx = new Transaction();
                tx.type = TransactionType.CAPITAL_INJECTION;
                tx.amount = amountNum;
                tx.description = `${description || 'Inyección de capital'} | Fuente: ${fundSource}`;
                tx.user = user;
                tx.branch = branch;
                tx.account = destAccount;
                tx.status = TransactionStatus.COMPLETED;
                tx.date = new Date();
                tx.metadata = JSON.stringify({ fundSource, previousBalance });

                await manager.save(tx);

                return res.status(200).json({
                    success: true,
                    message: "✅ Capital inyectado correctamente",
                    transaction: { id: tx.id, amount: tx.amount, source: fundSource },
                    balance: {
                        previous: previousBalance,
                        current: destAccount.balance,
                        change: amountNum
                    }
                });

            });
        } catch (error: any) {
            console.error("❌ Error en injectCapital:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };

    // ========================================
    // 4. REGISTRAR GASTOS
    // ========================================
    static registerExpense = async (req: Request, res: Response) => {
        const { userId, branchId, sourceAccountId, amount, type, description, category } = req.body;

        // Validar tipo
        const allowedTypes = [
            TransactionType.EXPENSE,
            TransactionType.PAYROLL,
            TransactionType.PURCHASE
        ];

        if (!allowedTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Tipo inválido. Usa: ${allowedTypes.join(', ')}`
            });
        }

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "El monto debe ser positivo"
            });
        }

        try {
            return await AppDataSource.manager.transaction(async (manager) => {

                const sourceAcc = await manager.findOne(Account, {
                    where: { id: sourceAccountId },
                    lock: { mode: "pessimistic_write" }
                });

                const user = await manager.findOneBy(User, { id: userId });
                const branch = branchId ? await manager.findOneBy(Branch, { id: branchId }) : null;

                if (!sourceAcc || !user) {
                    throw new Error("Cuenta o usuario no encontrado");
                }

                // Validar saldo
                const amountNum = Number(amount);
                const previousBalance = Number(sourceAcc.balance);

                if (previousBalance < amountNum) {
                    throw new Error(
                        `Saldo insuficiente para este gasto.\n` +
                        `Necesitas: $${amountNum.toFixed(2)}\n` +
                        `Disponible: $${previousBalance.toFixed(2)}`
                    );
                }

                // Restar dinero
                sourceAcc.balance = previousBalance - amountNum;
                await manager.save(sourceAcc);

                // Registrar gasto
                const tx = new Transaction();
                tx.type = type;
                tx.amount = amountNum;
                tx.description = description || `Gasto: ${type}`;
                tx.user = user;
                tx.branch = branch;
                tx.account = sourceAcc;
                tx.status = TransactionStatus.COMPLETED;
                tx.date = new Date();

                if (category) {
                    tx.metadata = JSON.stringify({ category, previousBalance });
                }

                await manager.save(tx);

                return res.status(200).json({
                    success: true,
                    message: "✅ Gasto registrado correctamente",
                    transaction: {
                        id: tx.id,
                        type: tx.type,
                        amount: tx.amount,
                        category: category || 'Sin categoría'
                    },
                    balance: {
                        previous: previousBalance,
                        current: sourceAcc.balance,
                        change: -amountNum
                    }
                });

            });
        } catch (error: any) {
            console.error("❌ Error en registerExpense:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };

    // ========================================
    // 5. OBTENER HISTORIAL DE TRANSACCIONES
    // ========================================
    static getHistory = async (req: Request, res: Response) => {
        try {
            const {
                userId,
                branchId,
                accountId,
                type,
                startDate,
                endDate,
                status,
                limit = 50,
                offset = 0
            } = req.query;

            // Construir filtros dinámicos
            const where: any = {};

            if (userId) where.user = { id: userId };
            if (branchId) where.branch = { id: branchId };
            if (accountId) {
                where.account = { id: accountId };
            }
            if (type) where.type = type;
            if (status) where.status = status;

            // Filtro por rango de fechas
            if (startDate || endDate) {
                where.date = {};
                if (startDate) where.date.gte = new Date(startDate as string);
                if (endDate) where.date.lte = new Date(endDate as string);
            }

            // Buscar transacciones
            const [transactions, total] = await AppDataSource.manager.findAndCount(Transaction, {
                where,
                relations: ["user", "branch", "account", "destinationAccount"],
                order: { date: "DESC" },
                take: Number(limit),
                skip: Number(offset)
            });

            return res.status(200).json({
                success: true,
                data: {
                    transactions,
                    pagination: {
                        total,
                        limit: Number(limit),
                        offset: Number(offset),
                        pages: Math.ceil(total / Number(limit))
                    }
                }
            });

        } catch (error: any) {
            console.error("❌ Error en getHistory:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };

    // ========================================
    // 6. ANULAR TRANSACCIÓN (Solo Administradores)
    // ========================================
    static annulTransaction = async (req: Request, res: Response) => {
        const { transactionId, userId, reason } = req.body;

        if (!transactionId || !userId || !reason) {
            return res.status(400).json({
                success: false,
                message: "Faltan datos: transactionId, userId, reason"
            });
        }

        try {
            return await AppDataSource.manager.transaction(async (manager) => {

                // --- VERIFICAR PERMISOS ---
                const requestingUser = await manager.findOneBy(User, { id: userId });

                if (!requestingUser) {
                    throw new Error("Usuario no identificado");
                }

                if (requestingUser.role !== 'admin' && requestingUser.role !== 'supervisor') {
                    throw new Error(
                        "⛔ ACCESO DENEGADO: Solo supervisores/administradores " +
                        "pueden anular transacciones"
                    );
                }

                // --- BUSCAR TRANSACCIÓN ORIGINAL ---
                const originalTx = await manager.findOne(Transaction, {
                    where: { id: transactionId },
                    relations: ["account", "destinationAccount", "user"]
                });

                if (!originalTx) {
                    throw new Error("Transacción no encontrada");
                }

                if (originalTx.status === TransactionStatus.ANNULLED) {
                    throw new Error("Esta transacción ya fue anulada previamente");
                }

                // --- BUSCAR CUENTAS CON BLOQUEO ---
                // mainAccount = Cuenta Bancaria del Agente
                // destAccount = Caja Física del Agente
                const mainAccount = await manager.findOne(Account, {
                    where: { id: originalTx.account.id },
                    lock: { mode: "pessimistic_write" }
                });

                let destAccount: Account | null = null;
                if (originalTx.destinationAccount) {
                    destAccount = await manager.findOne(Account, {
                        where: { id: originalTx.destinationAccount.id },
                        lock: { mode: "pessimistic_write" }
                    });
                }

                if (!mainAccount) {
                    throw new Error("Cuenta principal no encontrada");
                }

                // --- REVERTIR SALDOS ---
                const amount = Number(originalTx.amount);
                const commission = Number(originalTx.commission || 0);
                const totalAmount = amount + commission;

                // Guardamos estado antes de revertir
                const beforeMainBalance = Number(mainAccount.balance);
                const beforeDestBalance = destAccount ? Number(destAccount.balance) : null;

                // 🎯 LÓGICA DE REVERSIÓN CORRECTA PARA AGENTE BANCARIO
                switch (originalTx.type) {
                    case TransactionType.DEPOSIT:
                    case TransactionType.SALE:
                        // 📝 QUÉ PASÓ ORIGINALMENTE:
                        // - Cliente dio efectivo → Caja SUBIÓ (+amount +commission)
                        // - Agente transfirió → Banco BAJÓ (-amount)
                        //
                        // 🔄 REVERSIÓN (Hacer todo al revés):
                        // - Banco debe SUBIR (recuperar lo que salió)
                        // - Caja debe BAJAR (devolver lo que entró)

                        if (!destAccount) {
                            throw new Error("Caja física no encontrada para anular depósito");
                        }

                        if (beforeDestBalance! < totalAmount) {
                            throw new Error(
                                `Caja física no tiene suficiente efectivo para anular.\n` +
                                `Necesitas: ${totalAmount.toFixed(2)}\n` +
                                `Disponible: ${beforeDestBalance!.toFixed(2)}\n` +
                                `(El efectivo ya se usó)`
                            );
                        }

                        // Revertir Banco (recupera lo que salió)
                        mainAccount.balance = beforeMainBalance + amount;
                        // Revertir Caja (devuelve lo que entró)
                        destAccount.balance = beforeDestBalance! - totalAmount;

                        await manager.save(destAccount);
                        break;

                    case TransactionType.WITHDRAWAL:
                        // 📝 QUÉ PASÓ ORIGINALMENTE:
                        // - Cliente transfirió → Banco SUBIÓ (+amount)
                        // - Agente dio efectivo → Caja BAJÓ (-amount)
                        // - Comisión cobrada → Caja SUBIÓ (+commission)
                        //
                        // 🔄 REVERSIÓN:
                        // - Banco debe BAJAR (devolver lo que entró)
                        // - Caja debe SUBIR (recuperar efectivo dado)
                        // - Caja debe BAJAR (devolver comisión cobrada)

                        if (!destAccount) {
                            throw new Error("Caja física no encontrada para anular retiro");
                        }

                        if (beforeMainBalance < amount) {
                            throw new Error(
                                `Banco no tiene saldo suficiente para anular retiro.\n` +
                                `Necesitas: ${amount.toFixed(2)}\n` +
                                `Disponible: ${beforeMainBalance.toFixed(2)}`
                            );
                        }

                        // Revertir Banco (devuelve lo que recibió)
                        mainAccount.balance = beforeMainBalance - amount;
                        // Revertir Caja (recupera efectivo + devuelve comisión)
                        destAccount.balance = beforeDestBalance! + amount - commission;

                        await manager.save(destAccount);
                        break;

                    case TransactionType.CAPITAL_INJECTION:
                        // 📝 QUÉ PASÓ: Solo ENTRÓ dinero externo
                        // 🔄 REVERSIÓN: Debe SALIR
                        if (beforeMainBalance < amount) {
                            throw new Error(
                                "Saldo insuficiente para anular inyección de capital " +
                                "(el dinero ya se usó)"
                            );
                        }
                        mainAccount.balance = beforeMainBalance - amount;
                        break;

                    case TransactionType.EXPENSE:
                    case TransactionType.PAYROLL:
                    case TransactionType.PURCHASE:
                    case TransactionType.LOAN_GIVEN:
                        // 📝 QUÉ PASÓ: SALIÓ dinero (gastos)
                        // 🔄 REVERSIÓN: Debe ENTRAR (devolución)
                        mainAccount.balance = beforeMainBalance + amount;
                        break;

                    case TransactionType.INTERNAL_TRANSFER:
                        // 📝 QUÉ PASÓ: Salió de A → Entró en B
                        // 🔄 REVERSIÓN: Entra en A → Sale de B
                        if (!destAccount) {
                            throw new Error("Cuenta destino no encontrada para reversión");
                        }
                        if (beforeDestBalance! < amount) {
                            throw new Error(
                                "La cuenta destino no tiene saldo suficiente " +
                                "para devolver la transferencia"
                            );
                        }
                        mainAccount.balance = beforeMainBalance + amount;
                        destAccount.balance = beforeDestBalance! - amount;
                        await manager.save(destAccount);
                        break;

                    default:
                        throw new Error(
                            `Tipo de transacción '${originalTx.type}' no soportado para anulación`
                        );
                }

                // Guardar cuenta principal
                await manager.save(mainAccount);

                // --- MARCAR COMO ANULADA ---
                originalTx.status = TransactionStatus.ANNULLED;
                originalTx.description =
                    `${originalTx.description} | ` +
                    `[ANULADO el ${new Date().toLocaleString()} por ${requestingUser.username}] | ` +
                    `Razón: ${reason}`;

                originalTx.metadata = JSON.stringify({
                    ...JSON.parse(originalTx.metadata || '{}'),
                    annulment: {
                        date: new Date(),
                        by: requestingUser.username,
                        reason: reason,
                        balancesBeforeAnnulment: {
                            main: beforeMainBalance,
                            destination: beforeDestBalance
                        },
                        balancesAfterAnnulment: {
                            main: mainAccount.balance,
                            destination: destAccount?.balance
                        }
                    }
                });

                await manager.save(originalTx);

                return res.status(200).json({
                    success: true,
                    message: "✅ Transacción anulada correctamente",
                    annulment: {
                        transactionId: originalTx.id,
                        originalType: originalTx.type,
                        originalAmount: originalTx.amount,
                        annulledBy: requestingUser.username,
                        reason: reason,
                        date: new Date()
                    },
                    balances: {
                        mainAccount: {
                            name: mainAccount.name,
                            before: beforeMainBalance,
                            after: mainAccount.balance,
                            change: Number(mainAccount.balance) - beforeMainBalance
                        },
                        destinationAccount: destAccount ? {
                            name: destAccount.name,
                            before: beforeDestBalance,
                            after: destAccount.balance,
                            change: Number(destAccount.balance) - beforeDestBalance!
                        } : null
                    }
                });

            });
        } catch (error: any) {
            console.error("❌ Error en annulTransaction:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };
}