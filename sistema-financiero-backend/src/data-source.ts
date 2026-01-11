import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true, // ¡OJO! En producción esto va en false. En desarrollo crea las tablas por ti.
    logging: false,
    entities: ["src/entity/**/*.ts"], // Aquí buscará tus tablas
    migrations: ["src/migration/**/*.ts"],
    subscribers: [],
});