import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import * as dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import { requireAuth } from "./middlewares/requireAuth";
import { AppDataSource } from "./data-source";
import transactionRoutes from "./routes/transactionRoutes";
import debtRoutes from "./routes/debtRoutes";
import cashCountRoutes from "./routes/cashCountRoutes";
import accountRoutes from "./routes/accountRoutes";
import closureRoutes from "./routes/closureRoutes";
import adminTestRoutes from "./routes/adminTestRoutes";
import { requireRole } from "./middlewares/requireRole";
import adminBranchRoutes from "./routes/adminBranchRoutes";
import adminUserRoutes from "./routes/adminUserRoutes";


import { Account, AccountType } from "./entity/Account";
import { User } from "./entity/User";
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

app.use("/api/accounts", requireAuth, accountRoutes);
app.use("/api/transactions", requireAuth, transactionRoutes);
app.use("/api/debts", requireAuth, debtRoutes);
app.use("/api/closing", requireAuth, cashCountRoutes);
app.use("/api/closure", requireAuth, closureRoutes);
app.use("/api/admin", requireAuth, requireRole("admin"), adminTestRoutes);
app.use("/api/admin/branches", requireAuth, requireRole("admin"), adminBranchRoutes);
app.use("/api/admin/users", requireAuth, requireRole("admin"), adminUserRoutes);

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
            const userRepo = AppDataSource.getRepository(User);
            const accountRepo = AppDataSource.getRepository(Account);

            // 1. Buscamos al usuario 'admin' (asegúrate que tu usuario se llame así o 'user')
            // Si no estás seguro, busca el primero que encuentres.
            const adminUser = await userRepo.findOne({ where: { username: "admin" } })
                || await userRepo.findOne({ where: {} });

            if (adminUser) {
                console.log(`👤 Usuario detectado para asignar cajas: ${adminUser.username}`);

                // 2. Buscamos tus cajas físicas existentes
                const cajasFisicas = await accountRepo.find({
                    where: [
                        { name: "Bóveda Central" },
                        { name: "Caja Efectivo - Admin" }
                    ]
                });

                // 3. Las actualizamos una por una
                for (const caja of cajasFisicas) {
                    // Corrección de tipo
                    caja.type = AccountType.PHYSICAL;
                    // Corrección de dueño (CRUCIAL para que te deje operar)
                    caja.user = adminUser;
                    // Corrección de número de cuenta
                    if (!caja.accountNumber) caja.accountNumber = `FISICA-${caja.id.substring(0,4)}`;

                    await accountRepo.save(caja);
                    console.log(`✅ Caja '${caja.name}' asignada correctamente a ${adminUser.username}`);
                }
            }
        } catch (error) {
            console.error("⚠️ Error en reparación de cajas:", error);
        }
        // ==============================================================

        app.listen(PORT, () => {
            console.log(`⚡ Servidor corriendo en http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("❌ Error al conectar con la Base de Datos:", error);
    });