import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import * as dotenv from "dotenv";
import { AppDataSource } from "./data-source";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globales
app.use(cors()); // Permite conexiones desde el Frontend
app.use(helmet()); // Añade cabeceras de seguridad HTTP
app.use(express.json()); // Permite recibir JSON en las peticiones

// Ruta de prueba
app.get("/", (_req, res) => {
    res.json({ message: "API Sistema Financiero Operativa 🚀" });
});

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