import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';

interface ClosurePreview {
    startDate: string;
    totalIncome: number;
    totalExpense: number;
    netResult: number;
    transactionsCount: number;
}

interface Account {
    id: string;
    name: string;
    type: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    accounts: Account[]; // Necesitamos las cuentas para saber de dónde sacar la plata si capitalizas
}

export default function ClosureModal({ isOpen, onClose, onSuccess, accounts }: Props) {
    const { user } = useAuth();
    const [preview, setPreview] = useState<ClosurePreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Resumen, 2: Capitalización

    // Formulario de Capitalización
    const [capitalizeAmount, setCapitalizeAmount] = useState('');
    const [sourceAccountId, setSourceAccountId] = useState('');
    const [destinationAccountId, setDestinationAccountId] = useState('');
    const [notes, setNotes] = useState('');

    // Cargar datos al abrir
    useEffect(() => {
        if (isOpen) {
            loadPreview();
            setStep(1);
            setCapitalizeAmount('');
        }
    }, [isOpen]);

    const loadPreview = async () => {
        try {
            const res = await api.get('/closure/preview');
            setPreview(res.data);
        } catch (error) {
            console.error(error);
            alert("Error cargando vista preliminar");
            onClose();
        }
    };

    const handleCloseCycle = async () => {
        if (!preview) return;

        // Validaciones si decide capitalizar
        if (Number(capitalizeAmount) > 0) {
            if (!sourceAccountId || !destinationAccountId) {
                alert("Debes seleccionar cuenta origen y destino para mover la ganancia.");
                return;
            }
        }

        if (!confirm("⚠️ ¿Estás seguro de CERRAR EL CICLO?\nEsta acción es irreversible y archivará los movimientos actuales.")) return;

        setLoading(true);
        try {
            await api.post('/closure/close', {
                userId: user?.id,
                notes: notes || "Cierre de Ciclo",
                capitalizeAmount: Number(capitalizeAmount) || 0,
                sourceAccountId: sourceAccountId || null,
                destinationAccountId: destinationAccountId || null
            });
            alert("✅ Ciclo cerrado correctamente. Empezamos de nuevo.");
            onSuccess();
        } catch (error: any) {
            alert("Error: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !preview) return null;

    const isProfit = preview.netResult > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">

                {/* CABECERA */}
                <div className="bg-gray-900 text-white p-6">
                    <h2 className="text-xl font-bold">🔐 Cierre de Ciclo Operativo</h2>
                    <p className="text-gray-400 text-sm">Desde {new Date(preview.startDate).toLocaleDateString()} hasta HOY</p>
                </div>

                {/* CUERPO */}
                <div className="p-6">
                    {/* RESUMEN FINANCIERO */}
                    <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                        <div className="p-3 bg-gray-50 rounded">
                            <div className="text-xs text-gray-500 uppercase">Ingresos</div>
                            <div className="font-bold text-emerald-600">+${Number(preview.totalIncome).toFixed(2)}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                            <div className="text-xs text-gray-500 uppercase">Gastos</div>
                            <div className="font-bold text-red-600">-${Number(preview.totalExpense).toFixed(2)}</div>
                        </div>
                        <div className={`p-3 rounded border-2 ${isProfit ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}>
                            <div className="text-xs font-bold uppercase text-gray-700">Resultado</div>
                            <div className={`font-bold text-lg ${isProfit ? 'text-emerald-700' : 'text-red-700'}`}>
                                $ {Number(preview.netResult).toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* LÓGICA DE CAPITALIZACIÓN */}
                    {isProfit ? (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                            <h4 className="font-bold text-blue-900 mb-2">💰 Distribución de Utilidad</h4>
                            <p className="text-sm text-blue-800 mb-4">
                                Tienes <b>${preview.netResult}</b> disponibles. ¿Cuánto quieres retirar y cuánto dejas para operar?
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Monto a Retirar / Ahorrar ($)</label>
                                    <input
                                        type="number"
                                        value={capitalizeAmount}
                                        onChange={e => setCapitalizeAmount(e.target.value)}
                                        className="w-full p-2 border rounded font-mono"
                                        placeholder="0.00"
                                        max={preview.netResult}
                                    />
                                </div>

                                {/* Si escribe algo mayor a 0, mostramos los selectores de cuenta */}
                                {Number(capitalizeAmount) > 0 && (
                                    <div className="grid grid-cols-2 gap-3 animate-fade-in">
                                        <div>
                                            <label className="block text-xs text-gray-600">Sacar de (Físico)</label>
                                            <select
                                                className="w-full p-1 border rounded text-sm"
                                                value={sourceAccountId}
                                                onChange={e => setSourceAccountId(e.target.value)}
                                            >
                                                <option value="">Selecciona...</option>
                                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600">Mover a (Ahorro)</label>
                                            <select
                                                className="w-full p-1 border rounded text-sm"
                                                value={destinationAccountId}
                                                onChange={e => setDestinationAccountId(e.target.value)}
                                            >
                                                <option value="">Selecciona...</option>
                                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="text-xs text-gray-500 pt-2 border-t border-blue-200">
                                    Se quedarán <b>$ {(preview.netResult - Number(capitalizeAmount)).toFixed(2)}</b> como presupuesto operativo.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6 flex items-center gap-3">
                            <span className="text-2xl">📉</span>
                            <div className="text-sm text-orange-800">
                                <b>No hay utilidad para capitalizar.</b><br/>
                                Este saldo negativo se arrastrará al siguiente periodo.
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas del Cierre</label>
                        <input
                            type="text" value={notes} onChange={e => setNotes(e.target.value)}
                            className="w-full p-2 border rounded" placeholder="Ej: Cierre Quincena 1"
                        />
                    </div>
                </div>

                {/* PIE DE PÁGINA */}
                <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button
                        onClick={handleCloseCycle}
                        disabled={loading}
                        className="px-6 py-2 bg-gray-900 text-white font-bold rounded hover:bg-black transition"
                    >
                        {loading ? 'Procesando...' : 'Confirmar Cierre'}
                    </button>
                </div>
            </div>
        </div>
    );
}