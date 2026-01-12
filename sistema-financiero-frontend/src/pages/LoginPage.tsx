import { useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const response = await api.post('/auth/login', { username, password });
            login(response.data.user);
            navigate('/dashboard');
        } catch (err: any) {
            setError('Credenciales incorrectas o error de servidor');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border-t-4 border-brand-blue">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-brand-blue">Financiero PRO</h1>
                    <p className="text-gray-500 text-sm mt-2">Sistema de Control de Caja</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition"
                            placeholder="Ej: admin"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition"
                            placeholder="••••••"
                        />
                    </div>
                    <button type="submit" className="w-full py-2 px-4 bg-brand-blue text-white font-bold rounded hover:bg-slate-800 transition shadow-lg">
                        Ingresar
                    </button>
                </form>
            </div>
        </div>
    );
}