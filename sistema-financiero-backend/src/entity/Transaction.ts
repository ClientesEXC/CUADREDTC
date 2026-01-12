import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { Branch } from "./Branch";
import { Account } from "./Account";

export enum TransactionType {
    // Operaciones Bancarias (Con Clientes)
    DEPOSIT = "DEPOSITO",
    WITHDRAWAL = "RETIRO",
    SERVICE_PAYMENT = "PAGO_SERV",
    SALE = "VENTA",

    // Operaciones Internas

    EXPENSE = "GASTO",
    PAYROLL = "PAGO_NOMINA",        // Sueldos, Quincenas (NUEVO)
    PURCHASE = "COMPRA_INVENTARIO",

    // Deudas
    LOAN_GIVEN = "PRESTAMO_DAR",
    DEBT_PAYMENT = "ABONO_DEUDA",

    // --- NUEVO: GESTIÓN DE TESORERÍA ---
    INTERNAL_TRANSFER = "TRANSFERENCIA_INTERNA",

    CAPITAL_INJECTION = "INYECCION_CAPITAL"
}

export enum TransactionStatus {
    VALID = "VALIDO",
    ANNULLED = "ANULADO"
}

@Entity()
export class Transaction {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: "enum", enum: TransactionType })
    type: TransactionType;

    @Column({ type: "decimal", precision: 12, scale: 2 })
    amount: number;

    @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
    commission: number; // Generalmente 0 en transferencias internas, pero por si el banco cobra.

    @Column({ nullable: true })
    description: string;

    // NUEVO CAMPO: Estado
    @Column({
        type: "enum",
        enum: TransactionStatus,
        default: TransactionStatus.VALID
    })
    status: TransactionStatus;

    // Opcional: Relación con la transacción que anuló a esta (Auditoría)
    @Column({ nullable: true })
    relatedTransactionId: string;

    // --- RELACIONES ---

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: "user_id" })
    user: User;

    @ManyToOne(() => Branch, { nullable: false })
    @JoinColumn({ name: "branch_id" })
    branch: Branch;

    // CUENTA ORIGEN (De donde sale el dinero)
    @ManyToOne(() => Account, { nullable: true })
    @JoinColumn({ name: "account_id" })
    account: Account;

    // --- NUEVO CAMPO: CUENTA DESTINO ---
    // Solo se usa cuando type === INTERNAL_TRANSFER
    @ManyToOne(() => Account, { nullable: true })
    @JoinColumn({ name: "destination_account_id" })
    destinationAccount: Account;
}