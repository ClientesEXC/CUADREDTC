import axios from 'axios';

// Creamos una instancia de Axios pre-configurada
const api = axios.create({
    // Aquí apuntamos a tu Backend (que corre en el puerto 3000)
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("financiero_token");
        if (token) {
            config.headers = {
                ...(config.headers as any),
                Authorization: `Bearer ${token}`,
            };
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor de RESPONSE: log + limpieza si expira token
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (status === 401 || status === 403) {
            // 👉 Si el token murió, limpiamos sesión y mandamos al login
            localStorage.removeItem("financiero_user");
            localStorage.removeItem("financiero_token");
            window.location.href = "/login";
        }

        console.error("Error en la API:", error.response?.data?.message || error.message);
        return Promise.reject(error);
    }
);

export default api;