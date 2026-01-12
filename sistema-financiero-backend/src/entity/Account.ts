import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export enum AccountType {
    PHYSICAL = "physical", // Caja Fuerte / Caja Chica
    BANK = "bank",         // Bco Guayaquil, Pichincha...
    PLATFORM = "platform", // YaGanaste
    VIRTUAL = "virtual"    // Para ajustes contables
}

@Entity()
export class Account {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string; // Ej: "Caja Principal - Juan"

    @Column()
    accountNumber: string; // Nro de cuenta real o "EFECTIVO-JUAN"

    @Column({
        type: "enum",
        enum: AccountType
    })
    type: AccountType;

    // IMPORTANTE: Manejo de dinero
    // type: "decimal" es OBLIGATORIO. Nunca usar "float" o "double".
    // precision: 12 dígitos en total. scale: 2 decimales.
    @Column({ type: "decimal", precision: 12, scale: 2, default: 0.00 })
    balance: number;

    @Column({ nullable: true })
    bankName: string; // Solo si es tipo BANK

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}