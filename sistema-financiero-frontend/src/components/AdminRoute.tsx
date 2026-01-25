import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, user, isReady } = useAuth();

    // 👉 Mientras se carga localStorage, NO redirijas
    if (!isReady) return null; // o un loader si quieres

    // 👉 Si no está logueado, fuera
    if (!isAuthenticated) return <Navigate to="/login" />;

    // 👉 Si está logueado pero NO es admin, lo mandamos a su panel de cajero
    if (user?.role !== "admin") return <Navigate to="/cashier" />;

    return <>{children}</>;
}
