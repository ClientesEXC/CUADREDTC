import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

export class AuthController {
    static login = async (req: Request, res: Response) => {
        const { username, password } = req.body;

        if (!username || !password) return res.status(400).json({ message: "Usuario y contraseña requeridos" });

        const userRepo = AppDataSource.getRepository(User);

        try {
            // 1. Buscar usuario (incluyendo la relación con sucursal)
            const user = await userRepo.findOne({
                where: { username },
                relations: ["branch"]
            });

            if (!user) return res.status(401).json({ message: "Credenciales incorrectas" });

            // 2. Verificar contraseña
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) return res.status(401).json({ message: "Credenciales incorrectas" });

            // 3. Generar Token (Opcional, pero buena práctica) o devolver datos clave
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                process.env.JWT_SECRET || "secreto",
                { expiresIn: "8h" }
            );

            // 4. Responder al Frontend con los datos que necesita para operar
            return res.json({
                message: "Login exitoso",
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    branchId: user.branch.id,
                    branchName: user.branch.name
                }
            });

        } catch (error) {
            return res.status(500).json({ message: "Error en login", error });
        }
    }
}