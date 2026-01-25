import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosConfig";

type Branch = { id: string; name: string };
type Cashier = {
    id: string;
    username: string;
    role: string;
    status: string;
    branchId: string;
    branchName: string;
};

export default function AdminCashiersPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [cashiers, setCashiers] = useState<Cashier[]>([]);
    const [branchId, setBranchId] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const loadBranches = async () => {
        const res = await api.get("/admin/branches");
        setBranches(res.data.data || []);
    };

    const loadCashiers = async (branchFilter?: string) => {
        const qs = branchFilter ? `?branchId=${branchFilter}` : "";
        const res = await api.get(`/admin/users/cashiers${qs}`);
        setCashiers(res.data.data || []);
    };

    useEffect(() => {
        (async () => {
            await loadBranches();
            await loadCashiers();
        })();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!branchId) {
            setError("Selecciona un local para el cajero");
            return;
        }

        setLoading(true);
        try {
            await api.post("/admin/users/cashiers", { username, password, branchId });
            setUsername("");
            setPassword("");
            await loadCashiers(branchId);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Error creando cajero");
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = async (newBranchId: string) => {
        setBranchId(newBranchId);
        await loadCashiers(newBranchId || undefined);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold text-brand-blue">👤 Cajeros</h1>
                    <Link to="/dashboard" className="text-sm text-gray-700 underline">
                        ← Volver al Dashboard
                    </Link>
                </div>

                <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Crear cajero</h2>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Local</label>
                            <select
                                value={branchId}
                                onChange={(e) => handleFilter(e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                            >
                                <option value="">— Todos / Seleccionar —</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Para crear, debes elegir un local.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Username</label>
                            <input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                                placeholder="Ej: cajero1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Password</label>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                                placeholder="mínimo 6"
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        className="mt-4 px-4 py-2 bg-brand-blue text-white font-bold rounded hover:bg-slate-800 transition disabled:opacity-60"
                    >
                        {loading ? "Creando..." : "Crear Cajero"}
                    </button>
                </form>

                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h2 className="font-semibold text-gray-900 mb-4">Listado</h2>

                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="text-left text-gray-500 border-b">
                                <th className="py-2">Usuario</th>
                                <th className="py-2">Local</th>
                                <th className="py-2">Estado</th>
                                <th className="py-2">ID</th>
                            </tr>
                            </thead>
                            <tbody>
                            {cashiers.map((c) => (
                                <tr key={c.id} className="border-b">
                                    <td className="py-2 font-medium">{c.username}</td>
                                    <td className="py-2">{c.branchName}</td>
                                    <td className="py-2">{c.status}</td>
                                    <td className="py-2 text-gray-500">{c.id}</td>
                                </tr>
                            ))}
                            {cashiers.length === 0 && (
                                <tr>
                                    <td className="py-4 text-gray-500" colSpan={4}>
                                        No hay cajeros aún.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                </div>

            </div>
        </div>
    );
}
