import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { Account } from "./Account";
import { Branch } from "./Branch";

@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true })
    username: string;

    @Column()
    password: string;

    // --- CAMBIO 1: ROL FLEXIBLE ---
    // Cambiamos de Enum a String para evitar errores con 'supervisor' o 'admin'
    // y eliminamos la dependencia del Enum que causaba el conflicto de tipos.
    @Column({ default: 'cashier' })
    role: string;

    // --- CAMBIO 2: ESTADO COMPATIBLE ---
    // El nuevo controlador busca user.status === 'inactive'.
    // Agregamos esta columna para que no falle.
    @Column({ default: 'active' })
    status: string;

    // (Opcional) Dejamos isActive por si alguna parte vieja del código lo usa,
    // pero el controlador nuevo usará 'status'.
    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relación Sucursal
    @ManyToOne(() => Branch, (branch) => branch.users)
    @JoinColumn({ name: "branchId" }) // Es buena práctica poner esto
    branch: Branch;

    @Column({ nullable: true })
    branchId: string;

    // Relación Cuentas (Cajas)
    @OneToMany(() => Account, (account) => account.user)
    accounts: Account[];
}