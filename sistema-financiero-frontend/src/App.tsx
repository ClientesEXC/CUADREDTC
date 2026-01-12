import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';

import { useEffect, useState } from 'react';
import api from './api/axiosConfig';
import BalanceCard from './components/BalanceCard';
// 1. IMPORTAMOS EL TIPO NECESARIO
import type { ReactNode } from 'react';

// Definimos qué forma tiene una cuenta
interface Account {
    id: string;
    name: string;
    balance: number;
    type: 'bank' | 'physical' | 'platform' | 'virtual';
}
// Dashboard temporal para probar
const Dashboard = () => {
    const { user, logout } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    // Función para cargar datos frescos
    const fetchAccounts = async () => {
        try {
            const res = await api.get('/accounts');
            setAccounts(res.data);
        } catch (error) {
            console.error("Error cargando cuentas", error);
        } finally {
            setLoading(false);
        }
    };

    // Cargar al iniciar la pantalla
    useEffect(() => {
        fetchAccounts();
    }, []);

    // Separamos las cuentas para visualizarlas mejor
    const cashAccounts = accounts.filter(a => a.type === 'physical');
    const bankAccounts = accounts.filter(a => a.type === 'bank' || a.type === 'platform');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* 1. Navbar Superior */}
            <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-brand-blue">Financiero PRO</h1>
                    <span className="text-xs text-gray-500">Sucursal: {user?.branchName}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-700">{user?.username}</span>
                    <button
                        onClick={logout}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                        Salir
                    </button>
                </div>
            </nav>

            {/* 2. Contenido Principal */}
            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">

                {/* Sección A: Efectivo (Lo más importante) */}
                <h2 className="text-gray-500 font-medium mb-4 uppercase text-sm">💰 Mi Caja (Efectivo)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {loading ? <p>Cargando saldos...</p> : cashAccounts.map(acc => (
                        <BalanceCard
                            key={acc.id}
                            title={acc.name}
                            amount={acc.balance}
                            type="cash"
                        />
                    ))}
                    {/* Tarjeta resumen si no hay cajas (solo ejemplo) */}
                    {!loading && cashAccounts.length === 0 && (
                        <p className="text-gray-400 italic">No tienes cajas asignadas.</p>
                    )}
                </div>

                {/* Sección B: Bancos y Plataformas */}
                <h2 className="text-gray-500 font-medium mb-4 uppercase text-sm">🏦 Bancos y Plataformas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {bankAccounts.map(acc => (
                        <BalanceCard
                            key={acc.id}
                            title={acc.name}
                            amount={acc.balance}
                            type={acc.type === 'bank' ? 'bank' : 'platform'}
                        />
                    ))}
                </div>

                {/* Sección C: Operaciones Rápidas (Solo botones visuales por ahora) */}
                <h2 className="text-gray-500 font-medium mb-4 uppercase text-sm">⚡ Acciones Rápidas</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 text-brand-blue font-semibold transition flex flex-col items-center gap-2">
                        <span>📥</span> Depósito
                    </button>
                    <button className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 text-brand-blue font-semibold transition flex flex-col items-center gap-2">
                        <span>📤</span> Retiro
                    </button>
                    <button className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 text-brand-blue font-semibold transition flex flex-col items-center gap-2">
                        <span>🔄</span> Transferencia
                    </button>
                    <button className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 text-brand-blue font-semibold transition flex flex-col items-center gap-2">
                        <span>🧾</span> Pagar Servicio
                    </button>
                </div>
            </main>
        </div>
    );
};

// 2. CORREGIMOS EL TIPO AQUÍ (De JSX.Element a ReactNode)
const PrivateRoute = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();
    // Si está autenticado muestra el hijo, si no, redirige al login
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App