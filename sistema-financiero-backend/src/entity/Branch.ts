import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { User } from "./User";
import { Account } from "./Account";

@Entity()
export class Branch {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true })
    name: string; // Ej: "Local Centro", "Local Norte"

    @Column()
    address: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relación: Una sucursal tiene muchos usuarios
    @OneToMany(() => User, (user) => user.branch)
    users: User[];
    //Relación: Una sucursal tiene muchas cuentas
    @OneToMany(() => Account, (account: Account) => account.branch)
    accounts: Account[];
}