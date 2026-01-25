import type { Request, Response, NextFunction } from "express";

export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const auth = (req as any).auth;

        // 👉 requireAuth siempre debe correr antes; si no hay auth, denegamos
        if (!auth?.role) {
            res.status(401).json({ message: "No autenticado" });
            return;
        }

        // 👉 Si el rol no está permitido, 403
        if (!allowedRoles.includes(auth.role)) {
            res.status(403).json({ message: "No autorizado" });
            return;
        }

        next();
        return;
    };
}
