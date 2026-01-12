import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { Branch } from "./Branch";
import { Account } from "./Account";

@Entity()
export class CashCount {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @CreateDateColumn()
    date: Date; // Fecha y hora del arqueo

    // El saldo que el SISTEMA dice que debe haber
    @Column({ type: "decimal", precision: 12, scale: 2 })
    expectedBalance: number;

    // El saldo que el CAJERO contó físicamente (Billetes + Monedas)
    @Column({ type: "decimal", precision: 12, scale: 2 })
    reportedBalance: number;

    // La diferencia (Reportado - Esperado).
    // Si es 0: Perfecto. Negativo: Falta dinero. Positivo: Sobra dinero.
    @Column({ type: "decimal", precision: 12, scale: 2 })
    difference: number;

    // Observaciones del cajero (Ej: "Me faltó un recibo de luz")
    @Column({ nullable: true })
    comments: string;

    // --- RELACIONES ---
    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;

    @ManyToOne(() => Branch)
    @JoinColumn({ name: "branch_id" })
    branch: Branch;

    @ManyToOne(() => Account)
    @JoinColumn({ name: "account_id" })
    account: Account; // Qué caja se está cerrando
}