import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosConfig";

type Branch = {
    id: string;
    name: string;
    address: string;
    isActive?: boolean;
};

export default function AdminBranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const loadBranches = async () => {
        setError("");
        const res = await api.get("/admin/branches");
        setBranches(res.data.data || []);
    };

    useEffect(() => {
        loadBranches();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.post("/admin/branches", { name, address });
            setName("");
            setAddress("");
            await loadBranches();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Error creando local");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold text-brand-blue">🏪 Locales</h1>
                    <Link to="/dashboard" className="text-sm text-gray-700 underline">
                        ← Volver al Dashboard
                    </Link>
                </div>

                <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Crear nuevo local</h2>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Nombre</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                                placeholder="Ej: Local F - Norte"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Dirección</label>
                            <input
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                                placeholder="Ej: Av. X #123"
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        className="mt-4 px-4 py-2 bg-brand-blue text-white font-bold rounded hover:bg-slate-800 transition disabled:opacity-60"
                    >
                        {loading ? "Creando..." : "Crear Local"}
                    </button>
                </form>

                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h2 className="font-semibold text-gray-900 mb-4">Listado</h2>
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="text-left text-gray-500 border-b">
                                <th className="py-2">Nombre</th>
                                <th className="py-2">Dirección</th>
                                <th className="py-2">ID</th>
                            </tr>
                            </thead>
                            <tbody>
                            {branches.map((b) => (
                                <tr key={b.id} className="border-b">
                                    <td className="py-2 font-medium">{b.name}</td>
                                    <td className="py-2">{b.address}</td>
                                    <td className="py-2 text-gray-500">{b.id}</td>
                                </tr>
                            ))}
                            {branches.length === 0 && (
                                <tr>
                                    <td className="py-4 text-gray-500" colSpan={3}>
                                        No hay locales aún.
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
