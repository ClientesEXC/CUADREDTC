import type { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";

type JwtPayload = {
    userId: string;
    username: string;
    iat: number;
    exp: number;
};

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        // 👉 Si no viene el header Authorization, no pasas (seguridad básica)
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "No autenticado: falta token" });
            return;
        }

        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET || "secreto";

        // 👉 Validamos firma y expiración del token
        const decoded = jwt.verify(token, secret) as JwtPayload;

        // 👉 Confirmamos que el usuario exista y esté activo (no confiamos solo en el token)
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({
            where: { id: decoded.userId },
            relations: ["branch"],
        });

        if (!user) {
            res.status(401).json({ message: "Token válido, pero usuario no existe" });
            return;
        }

        if (user.status === "inactive") {
            res.status(403).json({ message: "Usuario inactivo" });
            return;
        }

        // 👉 Guardamos datos mínimos en el request para uso futuro (roles, branch, etc.)
        (req as any).auth = {
            userId: user.id,
            username: user.username,
            role: user.role,
            branchId: user.branchId,
        };

        next();
        return;
    } catch (error) {
        res.status(401).json({ message: "Token inválido o expirado" });
        return;
    }
}
