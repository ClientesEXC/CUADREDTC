import axios from 'axios';

// Creamos una instancia de Axios pre-configurada
const api = axios.create({
    // Aquí apuntamos a tu Backend (que corre en el puerto 3000)
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor: Si el backend devuelve un error, lo capturamos aquí
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error("Error en la API:", error.response?.data?.message || error.message);
        return Promise.reject(error);
    }
);

export default api;