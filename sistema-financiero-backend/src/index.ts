import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import * as dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import { AppDataSource } from "./data-source";
import transactionRoutes from "./routes/transactionRoutes";
import debtRoutes from "./routes/debtRoutes";
import cashCountRoutes from "./routes/cashCountRoutes";
import accountRoutes from "./routes/accountRoutes";
import closureRoutes from "./routes/closureRoutes";

import { Account, AccountType } from "./entity/Account";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globales
app.use(cors()); // Permite conexiones desde el Frontend
app.use(helmet()); // Añade cabeceras de seguridad HTTP
app.use(express.json()); // Permite recibir JSON en las peticiones

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/debts", debtRoutes);
app.use("/api/closing", cashCountRoutes);
app.use("/api/closure", closureRoutes);

// Ruta de prueba
app.get("/", (_req, res) => {
    res.json({ message: "API Sistema Financiero Operativa 🚀" });
});

// Inicializar Base de Datos y Arrancar Servidor
AppDataSource.initialize()
    .then(async () => {
        console.log("📦 Base de Datos PostgreSQL conectada correctamente");

        // ==============================================================
        // 🛠️ MIGRACIÓN Y LIMPIEZA DE DATOS (EJECUTAR UNA VEZ)
        // ==============================================================
        try {
            const accountRepo = AppDataSource.getRepository(Account);

            // 1. BORRAR LA CAJA AUTOMÁTICA VACÍA (La que se creó por error)
            const basura = await accountRepo.findOne({
                where: { name: "Bóveda Principal (Admin)", balance: 0 }
            });

            if (basura) {
                await accountRepo.remove(basura);
                console.log("🗑️ Caja duplicada de $0.00 eliminada.");
            }

            // 2. RECUPERAR TU BÓVEDA ORIGINAL ($1111.00)
            const miBoveda = await accountRepo.findOne({
                where: { name: "Bóveda Central" }
            });

            if (miBoveda) {
                console.log("🔧 Reparando configuración de 'Bóveda Central'...");
                // La forzamos a ser PHYSICAL para que el sistema la reconozca
                miBoveda.type = AccountType.PHYSICAL;
                // Le ponemos un número de cuenta si no lo tiene
                if (!miBoveda.accountNumber) {
                    miBoveda.accountNumber = "BOVEDA-MATRIZ-01";
                }

                await accountRepo.save(miBoveda);
                console.log("✅ ¡Bóveda Central recuperada y actualizada correctamente!");
            }

            // 3. RECUPERAR TU CAJA DE EFECTIVO ($2546.50)
            const miCaja = await accountRepo.findOne({
                where: { name: "Caja Efectivo - Admin" }
            });

            if (miCaja) {
                miCaja.type = AccountType.PHYSICAL;
                if (!miCaja.accountNumber) {
                    miCaja.accountNumber = "CAJA-ADMIN-01";
                }
                await accountRepo.save(miCaja);
                console.log("✅ ¡Caja Efectivo Admin actualizada!");
            }
        } catch (error) {
            console.error("⚠️ Error en migración:", error);
        }
        // ==============================================================

        app.listen(PORT, () => {
            console.log(`⚡ Servidor corriendo en http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("❌ Error al conectar con la Base de Datos:", error);
    });