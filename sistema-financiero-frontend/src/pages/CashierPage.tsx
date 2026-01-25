import { useAuth } from "../context/AuthContext";

export default function CashierPage() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-brand-blue">Panel Cajero</h1>
                    <span className="text-xs text-gray-500">Sucursal: {user?.branchName}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-700">{user?.username}</span>
                    <button onClick={logout} className="text-sm text-red-600 font-medium">Salir</button>
                </div>
            </nav>

            <main className="p-6 max-w-4xl mx-auto">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h2 className="font-bold text-gray-900">📌 Próximo paso</h2>
                    <p className="text-gray-600 mt-2">
                        Aquí irá el formulario simple de <b>Apertura</b> y el botón <b>Hacer cierre</b>.
                    </p>
                </div>
            </main>
        </div>
    );
}
