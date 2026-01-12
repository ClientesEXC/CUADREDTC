import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { Branch } from "./Branch";

export enum UserRole {
    ADMIN = "admin",
    CASHIER = "cashier"
}

@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true })
    username: string;

    @Column()
    password: string; // Aquí guardaremos el HASH, nunca texto plano

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.CASHIER
    })
    role: UserRole;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relación: Un usuario pertenece a una sucursal
    @ManyToOne(() => Branch, (branch) => branch.users)
    branch: Branch;
}