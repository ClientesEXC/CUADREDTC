import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';

// Actualizamos la interfaz para que coincida con tu nuevo Backend
interface Transaction {
    id: string;
    date: string;
    amount: number;
    type: string;
    description: string;
    status: string;
    // Usamos '?' porque con el nuevo sistema pueden venir nulos
    account?: { name: string };
    destinationAccount?: { name: string }; // ¡Nueva columna importante!
    user?: { username: string };
}

interface Props {
    refreshTrigger: number;
}

export default function TransactionList({ refreshTrigger }: Props) {
    const { user } = useAuth();
    // Iniciamos siempre como array vacío para evitar el crash inicial
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await api.get('/transactions/history');

            console.log("📡 ESTRUCTURA RECIBIDA:", res.data);

            // 👇 AQUÍ ESTÁ EL TRUCO: Buscamos el array en varios lugares posibles
            let transactionsArray = [];

            if (Array.isArray(res.data)) {
                // Caso A: El backend devuelve la lista directa (Formato viejo)
                transactionsArray = res.data;
            } else if (res.data?.transactions && Array.isArray(res.data.transactions)) {
                // Caso B: Devuelve { transactions: [...] }
                transactionsArray = res.data.transactions;
            } else if (res.data?.data?.transactions && Array.isArray(res.data.data.transactions)) {
                // Caso C: Devuelve { data: { transactions: [...] } } (TU CASO ACTUAL)
                transactionsArray = res.data.data.transactions;
            } else if (res.data?.data && Array.isArray(res.data.data)) {
                // Caso D: Devuelve { data: [...] }
                transactionsArray = res.data.data;
            }

            // Guardamos lo que encontramos
            if (transactionsArray.length > 0 || Array.isArray(transactionsArray)) {
                setTransactions(transactionsArray);
                setErrorMsg(null);
            } else {
                console.error("❌ No encontré la lista de transacciones en la respuesta.");
                setTransactions([]);
                // Si hay un mensaje de error específico del backend, lo usamos
                setErrorMsg(res.data?.message || "Formato desconocido del servidor");
            }

        } catch (error: any) {
            console.error("Error de red:", error);
            setErrorMsg(error.response?.data?.message || "No se pudo cargar el historial.");
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchHistory();
    }, [refreshTrigger]);

    const handleAnnul = async (id: string) => {
        if (!confirm("¿Estás seguro de ANULAR esta transacción? Se revertirá el saldo.")) return;

        const reason = prompt("Escribe el motivo de la anulación:");
        if (!reason) return;

        try {
            await api.post('/transactions/annul', {
                userId: user?.id,
                transactionId: id,
                reason: reason
            });
            alert("✅ Transacción anulada correctamente");
            fetchHistory();
        } catch (err: any) {
            alert("Error: " + (err.response?.data?.message || err.message));
        }
    };

    // Renderizado de Carga
    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando historial...</div>;

    // Renderizado de Error (si la DB falló)
    if (errorMsg) return (
        <div className="p-4 m-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center">
            <p>⚠️ <b>Error:</b> {errorMsg}</p>
            <button onClick={fetchHistory} className="text-sm underline mt-2">Reintentar</button>
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">📋 Últimos Movimientos</h3>
                <span className="text-xs text-gray-400">Mostrando últimos 50</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3">Detalle</th>
                        <th className="px-6 py-3">Descripción</th>
                        <th className="px-6 py-3">Usuario</th>
                        <th className="px-6 py-3 text-right">Monto</th>
                        <th className="px-6 py-3 text-center">Acción</th>
                    </tr>
                    </thead>
                    <tbody>
                    {transactions.map((tx) => {
                        // Protección contra nulos dentro del map
                        const type = tx.type || 'UNKNOWN';
                        const isIncome = ['DEPOSITO', 'VENTA', 'ABONO_DEUDA', 'INYECCION_CAPITAL'].includes(type);
                        const isExpense = ['RETIRO', 'GASTO_GENERAL', 'PAGO_NOMINA', 'COMPRA_INVENTARIO', 'RETIRO_UTILIDAD'].includes(type);
                        const isAnnulled = tx.status === 'ANULADO';

                        return (
                            <tr key={tx.id || Math.random()} className={`border-b hover:bg-gray-50 transition ${isAnnulled ? 'bg-gray-100 opacity-60 grayscale' : ''}`}>
                                {/* FECHA */}
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                    {tx.date ? new Date(tx.date).toLocaleDateString() : '-'}
                                    <div className="text-xs text-gray-400">
                                        {tx.date ? new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                    </div>
                                </td>

                                {/* TIPO Y CUENTAS */}
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`w-fit px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                                            isAnnulled ? 'bg-gray-300 text-gray-700' :
                                                isIncome ? 'bg-emerald-100 text-emerald-800' :
                                                    isExpense ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {isAnnulled ? 'ANULADO' : type}
                                        </span>

                                        {/* Lógica Visual: Origen -> Destino */}
                                        <div className="text-xs text-gray-600 mt-1">
                                            {tx.destinationAccount ? (
                                                <div className="flex flex-col">
                                                    <span>🏦 {tx.account?.name || 'Sistema'}</span>
                                                    <span className="text-gray-400 text-[10px]">⬇️ hacia</span>
                                                    <span>📦 {tx.destinationAccount?.name}</span>
                                                </div>
                                            ) : (
                                                <span>{tx.account?.name || 'Cuenta General'}</span>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={tx.description}>
                                    {tx.description || '-'}
                                </td>

                                <td className="px-6 py-4 text-gray-400 text-xs">
                                    {tx.user?.username || 'Sistema'}
                                </td>

                                <td className={`px-6 py-4 text-right font-bold font-mono text-base ${
                                    isAnnulled ? 'text-gray-400 line-through' :
                                        isIncome ? 'text-emerald-600' :
                                            isExpense ? 'text-red-600' : 'text-blue-600'
                                }`}>
                                    {isIncome ? '+' : isExpense ? '-' : ''} $ {Number(tx.amount).toFixed(2)}
                                </td>

                                <td className="px-6 py-4 text-center">
                                    {!isAnnulled ? (
                                        <button
                                            onClick={() => handleAnnul(tx.id)}
                                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                                            title="Anular Transacción"
                                        >
                                            ✖
                                        </button>
                                    ) : (
                                        <span className="text-[10px] font-bold text-red-500 border border-red-200 px-2 py-1 rounded">
                                            ANULADO
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {(!transactions || transactions.length === 0) && (
                        <tr>
                            <td colSpan={6} className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 m-4 rounded-lg">
                                No hay movimientos recientes.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}