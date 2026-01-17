import { useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';

interface Account {
    id: string;
    name: string;
    type: string;
}

interface Props {
    // AGREGAMOS 'TRANSFERENCIA' A LOS TIPOS ACEPTADOS
    type: 'DEPOSITO' | 'RETIRO' | 'GASTO' | 'TRANSFERENCIA';
    accounts: Account[];
    onSuccess: () => void;
    onCancel: () => void;
}

export default function TransactionForm({ type, accounts, onSuccess, onCancel }: Props) {
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const [selectedAccountId, setSelectedAccountId] = useState(''); // Origen
    const [destinationAccountId, setDestinationAccountId] = useState(''); // Destino (Nuevo)
    const [expenseType, setExpenseType] = useState('GASTO_GENERAL');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!selectedAccountId) throw new Error("Selecciona una cuenta origen");
            if (Number(amount) <= 0) throw new Error("El monto debe ser mayor a 0");

            let endpoint = '/transactions/operation';
            let body: any = {
                userId: user?.id,
                branchId: user?.branchId,
                amount: Number(amount),
                description: description || "Sin descripción",
            };

            // LOGICA SEGUN TIPO
            if (type === 'GASTO') {
                endpoint = '/transactions/expense';
                body.sourceAccountId = selectedAccountId;
                body.type = expenseType;
            }
            else if (type === 'TRANSFERENCIA') {
                // AQUÍ USAMOS LA RUTA DE REBALANCEO QUE YA CREAMOS EN EL BACKEND
                if (!destinationAccountId) throw new Error("Selecciona la cuenta destino");
                if (selectedAccountId === destinationAccountId) throw new Error("La cuenta origen y destino no pueden ser la misma");

                endpoint = '/transactions/rebalance';
                body.sourceAccountId = selectedAccountId;
                body.destinationAccountId = destinationAccountId;
                // El backend de rebalance espera un 'type' interno, pero la ruta ya define la acción
            }
            else {
                // Depósito / Retiro
                body.accountId = selectedAccountId;
                body.type = type;
            }

            await api.post(endpoint, body);
            onSuccess();

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || err.message || "Error desconocido");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-200">
                    {error}
                </div>
            )}

            {/* 1. CUENTA ORIGEN (Siempre visible) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {type === 'DEPOSITO' ? 'Cuenta Destino (Donde entra)' : 'Cuenta Origen (De donde sale)'}
                </label>
                <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue outline-none"
                    required
                >
                    <option value="">-- Selecciona --</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.type})
                        </option>
                    ))}
                </select>
            </div>

            {/* 2. CUENTA DESTINO (Solo para Transferencias) */}
            {type === 'TRANSFERENCIA' && (
                <div className="bg-blue-50 p-3 rounded border border-blue-100 animate-fade-in">
                    <label className="block text-sm font-bold text-blue-800 mb-1">➡️ Hacia Cuenta Destino</label>
                    <select
                        value={destinationAccountId}
                        onChange={(e) => setDestinationAccountId(e.target.value)}
                        className="w-full p-2 border border-blue-200 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    >
                        <option value="">-- Selecciona Destino --</option>
                        {accounts.map(acc => (
                            // Evitamos mostrar la misma cuenta que ya seleccionó arriba
                            acc.id !== selectedAccountId && (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.type})
                                </option>
                            )
                        ))}
                    </select>
                </div>
            )}

            {/* 3. TIPO DE GASTO (Solo Gasto) */}
            {type === 'GASTO' && (
                <div className="bg-orange-50 p-3 rounded border border-orange-100">
                    <label className="block text-sm font-bold text-orange-800 mb-1">Tipo de Egreso</label>
                    <select
                        value={expenseType}
                        onChange={(e) => setExpenseType(e.target.value)}
                        className="w-full p-2 border border-orange-200 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                        <option value="GASTO_GENERAL">💡 Gasto General</option>
                        <option value="COMPRA_INVENTARIO">📦 Compra Mercadería</option>
                        <option value="PAGO_NOMINA">👷‍♂️ Nómina</option>
                    </select>
                </div>
            )}

            {/* MONTO y DESCRIPCION (Igual que antes) */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                    <input
                        type="number" step="0.01" value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded outline-none font-mono text-lg"
                        placeholder="0.00" required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nota</label>
                    <input
                        type="text" value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded outline-none"
                        placeholder="Detalle..." required
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCancel} className="flex-1 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 rounded text-white font-bold bg-brand-blue hover:bg-slate-800">
                    {loading ? '...' : 'Confirmar'}
                </button>
            </div>
        </form>
    );
}