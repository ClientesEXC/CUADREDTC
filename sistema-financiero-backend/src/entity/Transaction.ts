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
    EXPENSE = "GASTO_GENERAL",
    PAYROLL = "PAGO_NOMINA",
    PURCHASE = "COMPRA_INVENTARIO",

    // Deudas
    LOAN_GIVEN = "PRESTAMO_DAR",
    DEBT_PAYMENT = "ABONO_DEUDA",

    // Gestión de Tesorería
    INTERNAL_TRANSFER = "TRANSFERENCIA_INTERNA",
    CAPITAL_INJECTION = "INYECCION_CAPITAL",
    UTILITY_WITHDRAWAL = "RETIRO_UTILIDAD"
}

export enum TransactionStatus {
    COMPLETED = "COMPLETADO",
    VALID = "VALIDO",
    ANNULLED = "ANULADO",
    PENDING = "PENDIENTE"
}

@Entity()
export class Transaction {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @CreateDateColumn()
    date: Date;

    @Column({ type: "text", nullable: true })
    metadata: string;

    @Column({
        type: "enum",
        enum: TransactionType
    })
    type: string; // Lo dejamos como string para flexibilidad con el controlador, o usa TransactionType

    @Column("decimal", { precision: 12, scale: 2 })
    amount: number;

    @Column("decimal", { precision: 12, scale: 2, default: 0 })
    commission: number;

    @Column({ nullable: true })
    description: string;

    // Estado
    @Column({
        type: "enum",
        enum: TransactionStatus,
        default: TransactionStatus.COMPLETED // Cambiado a COMPLETED para coincidir con el controlador
    })
    status: string;

    // Auditoría de anulación
    @Column({ nullable: true })
    relatedTransactionId: string;

    // --- RELACIONES ---

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: "user_id" })
    user: User;

    // CORRECCIÓN AQUÍ:
    // 1. Solo una definición de branch.
    // 2. nullable: true (porque el controlador puede mandar null).
    // 3. Tipo: Branch | null (para que TypeScript no se queje).
    @ManyToOne(() => Branch, { nullable: true })
    @JoinColumn({ name: "branch_id" })
    branch: Branch | null;

    // CUENTA ORIGEN (Principal)
    @ManyToOne(() => Account, { nullable: true })
    @JoinColumn({ name: "account_id" })
    account: Account;

    // CUENTA DESTINO (Para transferencias o caja física)
    @ManyToOne(() => Account, { nullable: true })
    @JoinColumn({ name: "destination_account_id" })
    destinationAccount: Account;
}