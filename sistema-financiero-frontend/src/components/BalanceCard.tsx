

interface Props {
    title: string;
    amount: number;
    type: 'bank' | 'cash' | 'platform';
}

export default function BalanceCard({ title, amount, type }: Props) {
    // Definimos colores según el tipo de cuenta
    const colors = {
        bank: "bg-blue-600",     // Azul para bancos
        cash: "bg-emerald-600",  // Verde para efectivo
        platform: "bg-purple-600" // Morado para plataformas
    };

    return (
        <div className={`${colors[type] || 'bg-gray-600'} text-white rounded-xl p-6 shadow-lg transform hover:scale-105 transition-transform duration-200`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-bold mt-2">
                        $ {Number(amount).toFixed(2)}
                    </h3>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                    {/* Icono simple dependiendo del tipo */}
                    {type === 'cash' ? '💵' : type === 'bank' ? '🏦' : '📱'}
                </div>
            </div>
        </div>
    );
}