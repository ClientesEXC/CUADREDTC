import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CashierRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, user, isReady } = useAuth();

    if (!isReady) return null;

    if (!isAuthenticated) return <Navigate to="/login" />;

    // 👉 Si no es cajero, lo mandamos al dashboard admin
    if (user?.role !== "cashier") return <Navigate to="/dashboard" />;

    return <>{children}</>;
}
