import AdminRoute from "./components/AdminRoute";
import CashierRoute from "./components/CashierRoute";
import AdminBranchesPage from "./pages/AdminBranchesPage";
import AdminCashiersPage from "./pages/AdminCashiersPage";
import CashierPage from "./pages/CashierPage";


//import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';

import Modal from './components/Modal';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import ClosureModal from './components/ClosureModal';

import { useEffect, useState } from 'react';
import api from './api/axiosConfig';
import BalanceCard from './components/BalanceCard';
// 1. IMPORTAMOS EL TIPO NECESARIO
//import type { ReactNode } from 'react';

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
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Contador simple
    //const [loading, setLoading] = useState(true);

    // --- ESTADOS PARA EL MODAL ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'DEPOSITO' | 'RETIRO' | 'GASTO' | 'TRANSFERENCIA' | 'PAGO_SERVICIO'>('DEPOSITO');
    const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
    // -----------------------------

    const fetchAccounts = async () => {// Opcional: mostrar carga pequeña
        try {
            const res = await api.get('/accounts');
            setAccounts(res.data);
        } catch (error) {
            console.error("Error cargando cuentas", error);
        } finally {
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Función para abrir el modal con el tipo correcto
    const openModal = (type: 'DEPOSITO' | 'RETIRO' | 'GASTO' | 'TRANSFERENCIA'| 'PAGO_SERVICIO') => {
        setModalType(type);
        setIsModalOpen(true);
    };

    // Función que se ejecuta cuando la operación es exitosa
    const handleSuccess = () => {
        setIsModalOpen(false); // Cerrar modal
        fetchAccounts();       // RECARGAR SALDOS AUTOMÁTICAMENTE 🔄
        setRefreshTrigger(prev => prev + 1);
        alert('¡Operación realizada con éxito!'); // Feedback simple
    };

    const cashAccounts = accounts.filter(a => a.type === 'physical');
    const bankAccounts = accounts.filter(a => a.type === 'bank' || a.type === 'platform');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-brand-blue">Financiero PRO</h1>
                    <span className="text-xs text-gray-500">Sucursal: {user?.branchName}</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* 👉 Botones SOLO para Admin */}
                    {user?.role === "admin" && (
                        <>
                            <Link
                                to="/admin/branches"
                                className="px-3 py-1 bg-white border border-gray-300 text-xs font-bold rounded hover:bg-gray-100 transition"
                            >
                                🏪 Locales
                            </Link>

                            <Link
                                to="/admin/cashiers"
                                className="px-3 py-1 bg-white border border-gray-300 text-xs font-bold rounded hover:bg-gray-100 transition"
                            >
                                👤 Cajeros
                            </Link>
                        </>
                    )}

                    {/* 👉 Botón existente */}
                    <button
                        onClick={() => setIsClosureModalOpen(true)}
                        className="px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded hover:bg-gray-700 transition"
                    >
                        🔐 Cierre de Caja
                    </button>

                    <span className="font-medium text-gray-700">{user?.username}</span>
                    <button onClick={logout} className="text-sm text-red-600 font-medium">
                        Salir
                    </button>
                </div>
            </nav>

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">

                {/* --- TARJETAS (IGUAL QUE ANTES) --- */}
                <h2 className="text-gray-500 font-medium mb-4 uppercase text-sm">💰 Mi Caja (Efectivo)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {cashAccounts.map(acc => (
                        <BalanceCard key={acc.id} title={acc.name} amount={acc.balance} type="cash" />
                    ))}
                </div>

                <h2 className="text-gray-500 font-medium mb-4 uppercase text-sm">🏦 Bancos</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {bankAccounts.map(acc => (
                        <BalanceCard key={acc.id} title={acc.name} amount={acc.balance} type={acc.type === 'bank' ? 'bank' : 'platform'} />
                    ))}
                </div>

                {/* --- BOTONES DE ACCIÓN (AHORA FUNCIONALES) --- */}
                <h2 className="text-gray-500 font-medium mb-4 uppercase text-sm">⚡ Acciones Rápidas</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => openModal('DEPOSITO')}
                        className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-emerald-50 hover:border-emerald-200 text-brand-blue font-semibold transition flex flex-col items-center gap-2"
                    >
                        <span className="text-2xl">📥</span> Depósito (Ingreso)
                    </button>

                    <button
                        onClick={() => openModal('RETIRO')}
                        className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-red-50 hover:border-red-200 text-brand-blue font-semibold transition flex flex-col items-center gap-2"
                    >
                        <span className="text-2xl">📤</span> Retiro (Dueño)
                    </button>

                    <button
                        onClick={() => openModal('TRANSFERENCIA')}
                        className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 hover:border-blue-200 text-brand-blue font-semibold transition flex flex-col items-center gap-2"
                    >
                        <span className="text-2xl">🔄</span> Mover Dinero
                    </button>

                    <button
                        onClick={() => openModal('GASTO')}
                        className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-orange-50 hover:border-orange-200 text-brand-blue font-semibold transition flex flex-col items-center gap-2"
                    >
                        <span className="text-2xl">💸</span> Gasto / Compra
                    </button>

                    <button
                        onClick={() => openModal('PAGO_SERVICIO')} // 👈 AHORA SÍ ABRE MODAL
                        className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-purple-50 hover:border-purple-200 text-brand-blue font-semibold transition flex flex-col items-center gap-2"
                    >
                        <span className="text-2xl">📱</span> Pagar Servicio / App
                    </button>
                </div>
                <TransactionList refreshTrigger={refreshTrigger} />
            </main>

            {/* --- AQUÍ VIVE EL MODAL --- */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Registrar ${modalType}`}
            >
                <TransactionForm
                    type={modalType}
                    accounts={accounts}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>

            <ClosureModal
                isOpen={isClosureModalOpen}
                onClose={() => setIsClosureModalOpen(false)}
                onSuccess={handleSuccess} // Reutilizamos handleSuccess para que recargue todo
                accounts={accounts}
            />

        </div>
    );
};

// 2. CORREGIMOS EL TIPO AQUÍ (De JSX.Element a ReactNode)
//const PrivateRoute = ({ children }: { children: ReactNode }) => {
    //const { isAuthenticated } = useAuth();
    // Si está autenticado muestra el hijo, si no, redirige al login
    //return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
//};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
                    <Route path="/admin/branches" element={<AdminRoute><AdminBranchesPage /></AdminRoute>} />
                    <Route path="/admin/cashiers" element={<AdminRoute><AdminCashiersPage /></AdminRoute>} />

                    {/* Cajero */}
                    <Route path="/cashier" element={<CashierRoute><CashierPage /></CashierRoute>} />

                    {/* Default */}
                    <Route path="*" element={<Navigate to="/login" />} />

                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App;