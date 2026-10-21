"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// O fluxo de avaliação foi unificado em /avaliar (RF03).
// Esta rota continua existindo apenas para redirecionar links antigos.
export default function AvaliarEventoRedirect() {
    const { id } = useParams();
    const router = useRouter();

    useEffect(() => {
        if (id) router.replace('/avaliar?eventoId=' + encodeURIComponent(id));
    }, [id, router]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Redirecionando para a avaliação...</p>
            </div>
        </div>
    );
}
