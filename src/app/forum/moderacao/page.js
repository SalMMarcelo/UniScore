"use client";
// A moderação do fórum agora fica no painel administrativo (/admin):
//  - aba "Denúncias": conteúdos denunciados pelos usuários (coleção `denuncias`);
//  - aba "Fórum": todos os posts, com ocultar/reexibir/excluir.
// Esta rota antiga continua existindo (o login de moderadores ainda aponta
// para cá) e apenas redireciona.
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ModeracaoForumRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/admin?aba=denuncias");
    }, [router]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="text-center" role="status">
                <div aria-hidden="true" className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-700">
                    Redirecionando para o <Link href="/admin?aba=denuncias" className="text-blue-600 hover:underline">painel administrativo</Link>...
                </p>
            </div>
        </div>
    );
}
