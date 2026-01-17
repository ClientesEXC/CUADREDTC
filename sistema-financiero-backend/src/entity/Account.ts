import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User"; // 👇 Asegúrate de importar User
import { Branch } from "./Branch"; // (Si usas sucursales)

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

    @Column({ default: 'active' })
    status: string;

    @ManyToOne(() => User, (user) => user.accounts)
    @JoinColumn({ name: "userId" })
    user: User;

    // 👇 2. AGREGA ESTA COLUMNA PARA PODER USAR 'userId' DIRECTAMENTE
    @Column({ nullable: true })
    userId: string;

    // ... (Tu relación con Branch puede estar aquí abajo, déjala como esté)
    @ManyToOne(() => Branch, (branch) => branch.accounts)
    branch: Branch;


    @Column({ nullable: true })
    bankName: string; // Solo si es tipo BANK

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}