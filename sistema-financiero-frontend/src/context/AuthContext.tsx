import { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
interface User {
    id: string;
    username: string;
    role: string;
    branchId: string;
    branchName: string;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('financiero_user');
        if (stored) setUser(JSON.parse(stored));
    }, []);

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem('financiero_user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('financiero_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth error");
    return context;
};