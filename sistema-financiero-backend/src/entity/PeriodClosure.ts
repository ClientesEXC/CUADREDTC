import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class PeriodClosure {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @CreateDateColumn()
    closingDate: Date; // Cuándo se hizo el clic (ej: 31 Ene 23:59)

    @Column()
    startDate: Date;   // Desde cuándo abarca (ej: 16 Ene)

    @Column({ type: "decimal", precision: 12, scale: 2 })
    totalIncome: number; // Todo lo que entró (Ventas + Depósitos)

    @Column({ type: "decimal", precision: 12, scale: 2 })
    totalExpense: number; // Todo lo que salió (Gastos + Nómina)

    @Column({ type: "decimal", precision: 12, scale: 2 })
    netResult: number;    // La Ganancia Neta (Income - Expense)

    // --- MANEJO DE LA GANANCIA ---

    @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
    capitalizedAmount: number; // Lo que el dueño se llevó (Inyección a Capital / Retiro)

    @Column({ type: "decimal", precision: 12, scale: 2 })
    carriedOverAmount: number; // Lo que se queda para gastar el siguiente mes (Capital de Trabajo)

    @Column({ nullable: true })
    notes: string; // "Cierre de Enero - Todo ok"
}