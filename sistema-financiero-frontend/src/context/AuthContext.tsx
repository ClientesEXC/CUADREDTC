import { createContext, useState, useContext, useEffect } from "react";
import type { ReactNode } from "react";

interface User {
    id: string;
    username: string;
    role: string;
    branchId: string;
    branchName: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isReady: boolean;
    login: (userData: User, token: string) => void; // 👉 ahora recibe token
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("financiero_user");
        const storedToken = localStorage.getItem("financiero_token");

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
        }
        setIsReady(true);
    }, []);

    const login = (userData: User, tokenValue: string) => {
        setUser(userData);
        setToken(tokenValue);

        localStorage.setItem("financiero_user", JSON.stringify(userData));
        localStorage.setItem("financiero_token", tokenValue); // 👉 guardamos token
    };

    const logout = () => {
        setUser(null);
        setToken(null);

        localStorage.removeItem("financiero_user");
        localStorage.removeItem("financiero_token"); // 👉 borramos token
    };

    return (
        <AuthContext.Provider value={{ user, token,isReady ,login, logout, isAuthenticated: !!user && !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth error");
    return context;
};
