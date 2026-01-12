import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

export enum DebtStatus {
    PENDING = "PENDIENTE",
    PAID = "PAGADO"
}

@Entity()
export class Debt {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    // ¿A quién le prestamos? (Puede ser un empleado registrado o un externo)
    // Si es externo, usamos el campo "debtorName". Si es interno, podríamos relacionarlo con User.
    // Para simplificar tu MVP, usaremos nombre y descripción.
    @Column()
    debtorName: string;

    @Column()
    description: string; // Ej: "Adelanto de sueldo", "Vale de almuerzo"

    // Monto original de la deuda
    @Column({ type: "decimal", precision: 12, scale: 2 })
    originalAmount: number;

    // Saldo actual (Irrelevante al inicio, bajará con los pagos)
    @Column({ type: "decimal", precision: 12, scale: 2 })
    currentBalance: number;

    @Column({ type: "enum", enum: DebtStatus, default: DebtStatus.PENDING })
    status: DebtStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // ¿Quién autorizó/registró la deuda?
    @ManyToOne(() => User)
    createdBy: User;
}