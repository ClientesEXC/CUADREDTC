import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Transaction, TransactionType, TransactionStatus } from "../entity/Transaction";
import { Account} from "../entity/Account";
import { User } from "../entity/User";
import { Branch } from "../entity/Branch";

export class TransactionController {

    // 1. OPERACIONES CON CLIENTES (Depósitos, Retiros, Pagos)
    static createOperation = async (req: Request, res: Response) => {
        // Obtenemos los datos que envía el cajero
        const { userId, branchId, accountId, type, amount, commission, description } = req.body;

        // Validaciones básicas
        if (!amount || amount <= 0) return res.status(400).json({ message: "El monto debe ser mayor a 0" });

        // INICIO DE LA TRANSACCIÓN DE BASE DE DATOS (ACID)
        // Todo lo que pase aquí dentro es "Todo o Nada"
        return await AppDataSource.manager.transaction(async (transactionalEntityManager) => {

            // a. Buscamos las entidades
            const user = await transactionalEntityManager.findOneBy(User, { id: userId });
            const branch = await transactionalEntityManager.findOneBy(Branch, { id: branchId });
            const bankAccount = await transactionalEntityManager.findOneBy(Account, { id: accountId });

            // Buscamos la CAJA FÍSICA del Usuario (Asumimos que tiene una asignada o usa la del local)
            // Para simplificar, buscaremos una cuenta tipo PHYSICAL vinculada a este usuario o nombre genérico
            // OJO: En un sistema real, el usuario debería tener su id de caja asignado.
            // Aquí buscaremos una cuenta que se llame igual que el usuario o sea su caja.
            // *Para este ejemplo, asumiremos que el frontend nos envía también el `cashAccountId` (ID de su caja física)*
            const cashAccount = await transactionalEntityManager.findOneBy(Account, { id: req.body.cashAccountId });

            if (!user || !branch || !bankAccount || !cashAccount) {
                throw new Error("Datos inválidos: Usuario, Local o Cuentas no existen");
            }

            // b. Calculamos los nuevos saldos según el tipo
            // Convertimos a numero flotante para operar (cuidado con decimales JS, en prod usar librería Decimal.js)
            const amountNum = parseFloat(amount);
            const commNum = parseFloat(commission || 0);

            if (type === TransactionType.DEPOSIT) {
                // CLIENTE ENTREGA EFECTIVO -> NOSOTROS TRANSFERIMOS BANCO
                // 1. Caja Física AUMENTA (Entra billete + comisión)
                cashAccount.balance = Number(cashAccount.balance) + amountNum + commNum;
                // 2. Banco DISMINUYE (Sale transferencia)
                if (Number(bankAccount.balance) < amountNum) throw new Error("Saldo insuficiente en Banco para realizar el depósito");
                bankAccount.balance = Number(bankAccount.balance) - amountNum;

            } else if (type === TransactionType.WITHDRAWAL) {
                // CLIENTE PIDE EFECTIVO -> NOSOTROS RECIBIMOS TRANSFERENCIA
                // 1. Caja Física DISMINUYE (Sale billete)
                if (Number(cashAccount.balance) < amountNum) throw new Error("No tienes suficiente efectivo en caja");
                cashAccount.balance = Number(cashAccount.balance) - amountNum;
                // 2. Banco AUMENTA (Entra transferencia + ganancia si cobramos ahí, pero usualmente ganancia es efectivo aparte)
                bankAccount.balance = Number(bankAccount.balance) + amountNum;
                // Asumimos comisión se cobra en efectivo aparte y entra a caja
                cashAccount.balance = Number(cashAccount.balance) + commNum;
            }

            // c. Guardamos los saldos actualizados
            await transactionalEntityManager.save(cashAccount);
            await transactionalEntityManager.save(bankAccount);

            // d. Registramos la transacción en el historial
            const newTx = new Transaction();
            newTx.type = type;
            newTx.amount = amountNum;
            newTx.commission = commNum;
            newTx.description = description;
            newTx.user = user;
            newTx.branch = branch;
            newTx.account = bankAccount; // Cuenta afectada principal

            await transactionalEntityManager.save(newTx);

            // Respuesta exitosa
            return res.status(200).json({
                message: "Operación Exitosa",
                txId: newTx.id,
                nuevoSaldoBanco: bankAccount.balance,
                nuevoSaldoCaja: cashAccount.balance
            });

        }).catch(error => {
            // Si algo falla, Express captura el error aquí
            return res.status(500).json({ message: "Error en transacción", error: error.message });
        });
    };

    // 2. REBALANCEO (Tu solución a "Muchos depósitos/Retiros")
    static rebalance = async (req: Request, res: Response) => {
        const { userId, branchId, sourceAccountId, destinationAccountId, amount, description } = req.body;

        return await AppDataSource.manager.transaction(async (manager) => {
            const sourceAcc = await manager.findOneBy(Account, { id: sourceAccountId });
            const destAcc = await manager.findOneBy(Account, { id: destinationAccountId });
            const user = await manager.findOneBy(User, { id: userId });
            const branch = await manager.findOneBy(Branch, { id: branchId });

            if (!sourceAcc || !destAcc) throw new Error("Cuentas no encontradas");
            if (Number(sourceAcc.balance) < amount) throw new Error("Saldo insuficiente en cuenta origen");

            // Mover el dinero
            sourceAcc.balance = Number(sourceAcc.balance) - Number(amount);
            destAcc.balance = Number(destAcc.balance) + Number(amount);

            await manager.save(sourceAcc);
            await manager.save(destAcc);

            // Registrar Log
            const tx = new Transaction();
            tx.type = TransactionType.INTERNAL_TRANSFER;
            tx.amount = amount;
            tx.description = description || "Rebalanceo de liquidez";
            tx.user = user!;
            tx.branch = branch!;
            tx.account = sourceAcc;       // De donde salió
            tx.destinationAccount = destAcc; // A donde fue

            await manager.save(tx);

            return res.status(200).json({ message: "Rebalanceo Exitoso" });
        }).catch(error => {
            return res.status(500).json({ message: "Error en rebalanceo", error: error.message });
        });
    }

    // 3. INYECCIÓN DE CAPITAL EXTERNO (Dueño o Prestamista pone dinero)
    static injectCapital = async (req: Request, res: Response) => {
        const { userId, branchId, destinationAccountId, amount, description, fundSource } = req.body;

        if (!amount || amount <= 0) return res.status(400).json({ message: "Monto inválido" });

        return await AppDataSource.manager.transaction(async (manager) => {
            // a. Validar destino
            const destAccount = await manager.findOneBy(Account, { id: destinationAccountId });
            const user = await manager.findOneBy(User, { id: userId });
            const branch = await manager.findOneBy(Branch, { id: branchId });

            if (!destAccount || !user || !branch) throw new Error("Datos inválidos");

            // b. Aumentar el saldo (Solo entra dinero)
            destAccount.balance = Number(destAccount.balance) + Number(amount);
            await manager.save(destAccount);

            // c. Registrar Trazabilidad
            const tx = new Transaction();
            tx.type = TransactionType.CAPITAL_INJECTION;
            tx.amount = Number(amount);
            // En descripción guardamos de dónde vino: "Préstamo de Juan", "Aporte Socio"
            tx.description = `${description} (Fuente: ${fundSource || 'Externo'})`;
            tx.user = user;
            tx.branch = branch;
            tx.account = destAccount; // Cuenta que recibió el dinero

            await manager.save(tx);

            return res.status(200).json({
                message: "Capital inyectado correctamente",
                nuevoSaldo: destAccount.balance
            });

        }).catch(error => {
            return res.status(500).json({ message: "Error al inyectar capital", error: error.message });
        });
    }

    // 4. REGISTRAR GASTOS (Nómina, Compras, Servicios Básicos)
    static registerExpense = async (req: Request, res: Response) => {
        const { userId, branchId, sourceAccountId, amount, type, description } = req.body;

        // Validamos que el tipo sea uno de gasto permitido
        const allowedTypes = [TransactionType.EXPENSE, TransactionType.PAYROLL, TransactionType.PURCHASE];
        if (!allowedTypes.includes(type)) {
            return res.status(400).json({ message: "Tipo de transacción no válido para un gasto" });
        }

        if (!amount || amount <= 0) return res.status(400).json({ message: "Monto inválido" });

        return await AppDataSource.manager.transaction(async (manager) => {
            // a. Buscar entidades
            const sourceAcc = await manager.findOneBy(Account, { id: sourceAccountId });
            const user = await manager.findOneBy(User, { id: userId });
            const branch = await manager.findOneBy(Branch, { id: branchId });

            if (!sourceAcc || !user || !branch) throw new Error("Datos inválidos");

            // b. Validar Saldo (No puedes gastar lo que no tienes)
            if (Number(sourceAcc.balance) < Number(amount)) {
                throw new Error("Saldo insuficiente en la cuenta para realizar este pago");
            }

            // c. Restar dinero (Sale de la cuenta)
            sourceAcc.balance = Number(sourceAcc.balance) - Number(amount);
            await manager.save(sourceAcc);

            // d. Registrar la Transacción
            const tx = new Transaction();
            tx.type = type; // Aquí guardamos si fue NOMINA, COMPRA o GASTO
            tx.amount = Number(amount);
            tx.description = description; // Ej: "Pago quincena María" o "Compra 100 fundas"
            tx.user = user;
            tx.branch = branch;
            tx.account = sourceAcc;

            await manager.save(tx);

            return res.status(200).json({
                message: "Gasto registrado correctamente",
                nuevoSaldo: sourceAcc.balance,
                tipo: type
            });

        }).catch(error => {
            return res.status(500).json({ message: "Error al registrar gasto", error: error.message });
        });
    }

    // 5. ANULAR UNA TRANSACCIÓN (Reversión)
    static annulTransaction = async (req: Request, res: Response) => {
        const { transactionId, userId, reason } = req.body; // userId es quien INTENTA anular

        return await AppDataSource.manager.transaction(async (manager) => {
            // --- 🛡️ CAPA DE SEGURIDAD (NUEVO) ---
            const requestingUser = await manager.findOneBy(User, { id: userId });
            if (!requestingUser) throw new Error("Usuario no identificado");

            // Si el usuario NO es admin, le prohibimos la acción
            if (requestingUser.role !== 'admin') {
                throw new Error("⛔ ACCESO DENEGADO: Solo un supervisor/admin puede anular transacciones.");
            }
            // a. Buscar la transacción original
            const originalTx = await manager.findOne(Transaction, {
                where: { id: transactionId },
                relations: ["account", "destinationAccount"]
            });

            if (!originalTx) throw new Error("Transacción no encontrada");
            if (originalTx.status === TransactionStatus.ANNULLED) throw new Error("Esta transacción ya fue anulada previamente");

            // b. Buscar usuario que anula
            const adminUser = await manager.findOneBy(User, { id: userId });
            if (!adminUser) throw new Error("Usuario no autorizado");

            // c. REVERTIR EL EFECTO EN LOS SALDOS
            // Lógica inversa matemática
            const amount = Number(originalTx.amount);

            // Cuentas involucradas
            const mainAccount = await manager.findOneBy(Account, { id: originalTx.account.id });
            // Si hubo destino (transferencia interna), también lo cargamos
            let destAccount = null;
            if (originalTx.destinationAccount) {
                destAccount = await manager.findOneBy(Account, { id: originalTx.destinationAccount.id });
            }

            if (!mainAccount) throw new Error("Cuenta original no encontrada");

            // --- APLICAR REVERSA SEGÚN TIPO ---

            // CASO 1: El dinero había ENTRADO (Depósito, Venta, Abono, Inyección)
            // -> Ahora debe SALIR
            if ([TransactionType.DEPOSIT, TransactionType.SALE, TransactionType.DEBT_PAYMENT, TransactionType.CAPITAL_INJECTION].includes(originalTx.type)) {
                if (Number(mainAccount.balance) < amount) throw new Error("Saldo insuficiente para anular este ingreso (el dinero ya se usó)");
                mainAccount.balance = Number(mainAccount.balance) - amount;
            }

                // CASO 2: El dinero había SALIDO (Retiro, Gasto, Préstamo)
            // -> Ahora debe ENTRAR (Devolución)
            else if ([TransactionType.WITHDRAWAL, TransactionType.EXPENSE, TransactionType.PAYROLL, TransactionType.PURCHASE, TransactionType.LOAN_GIVEN].includes(originalTx.type)) {
                mainAccount.balance = Number(mainAccount.balance) + amount;
            }

                // CASO 3: Transferencia Interna (Salió de A, Entró en B)
            // -> Debe Entrar en A, Salir de B
            else if (originalTx.type === TransactionType.INTERNAL_TRANSFER && destAccount) {
                // Revertir origen
                mainAccount.balance = Number(mainAccount.balance) + amount;
                // Revertir destino
                if (Number(destAccount.balance) < amount) throw new Error("La cuenta destino no tiene saldo para devolver la transferencia");
                destAccount.balance = Number(destAccount.balance) - amount;
                await manager.save(destAccount);
            }

            // d. Guardar saldo corregido
            await manager.save(mainAccount);

            // e. Marcar original como ANULADA
            originalTx.status = TransactionStatus.ANNULLED;
            originalTx.description = `${originalTx.description} [ANULADO por ${adminUser.username}: ${reason}]`;
            await manager.save(originalTx);

            return res.status(200).json({
                message: "Transacción anulada correctamente",
                nuevoSaldo: mainAccount.balance
            });

        }).catch(error => {
            return res.status(500).json({ message: "Error al anular", error: error.message });
        });
    }
}