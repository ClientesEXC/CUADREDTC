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

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globales
app.use(cors()); // Permite conexiones desde el Frontend
app.use(helmet()); // Añade cabeceras de seguridad HTTP
app.use(express.json()); // Permite recibir JSON en las peticiones
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
// Ruta de prueba
app.get("/", (_req, res) => {
    res.json({ message: "API Sistema Financiero Operativa 🚀" });
});

app.use("/api/transactions", transactionRoutes);
app.use("/api/debts", debtRoutes);
app.use("/api/closing", cashCountRoutes);

// Inicializar Base de Datos y Arrancar Servidor
AppDataSource.initialize()
    .then(() => {
        console.log("📦 Base de Datos PostgreSQL conectada correctamente");

        app.listen(PORT, () => {
            console.log(`⚡ Servidor corriendo en http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("❌ Error al conectar con la Base de Datos:", error);
    });