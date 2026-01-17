import React from 'react';
import { IoClose } from 'react-icons/io5'; // Asegúrate de tener react-icons instalado

interface Props {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in">
                {/* Cabecera del Modal */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition text-gray-500"
                    >
                        <IoClose size={24} />
                    </button>
                </div>

                {/* Cuerpo del Modal */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}