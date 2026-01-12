/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-blue': '#0f172a', // Azul oscuro (Banco)
                'brand-green': '#10b981', // Verde (Ingresos)
                'brand-red': '#ef4444',   // Rojo (Gastos)
            }
        },
    },
    plugins: [],
}