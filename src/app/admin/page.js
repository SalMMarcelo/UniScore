"use client";
// Painel administrativo (RF07 / RF08) - exclusivo para moderadores da plataforma.
// A verificação abaixo (isAdminEmail) serve só para a interface: quem garante o
// acesso são as regras do Firestore (isModerator(): lista de e-mails + e-mail
// verificado). Sem isso, todas as leituras/gravações desta página são negadas.
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { isAdminEmail } from "../../lib/admin";
import AbaDenuncias from "./AbaDenuncias";
import AbaForum from "./AbaForum";
import AbaUniversidades from "./AbaUniversidades";
import AbaAvaliacoes from "./AbaAvaliacoes";
import AbaEventos from "./AbaEventos";
import AbaExportar from "./AbaExportar";
import Estatisticas from "./Estatisticas";
import { carregarEstatisticas } from "./dados";
import { Botao, Carregando, Erro, mensagemErro } from "./ui";

const ABAS = [
    { id: "denuncias", rotulo: "Denúncias" },
    { id: "universidades", rotulo: "Universidades" },
    { id: "avaliacoes", rotulo: "Avaliações" },
    { id: "forum", rotulo: "Fórum" },
    { id: "eventos", rotulo: "Eventos" },
    { id: "estatisticas", rotulo: "Estatísticas" },
    { id: "exportar", rotulo: "Exportar" }
];

function AbaEstatisticas() {
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState("");

    const carregar = useCallback(async () => {
        setErro("");
        setDados(null);
        try {
            setDados(await carregarEstatisticas());
        } catch (err) {
            console.error("Erro ao carregar estatísticas:", err);
            setErro(mensagemErro(err));
        }
    }, []);

    useEffect(() => { carregar(); }, [carregar]);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Botao cor="cinza" onClick={carregar} disabled={!dados && !erro}>Atualizar</Botao>
            </div>
            <Erro>{erro}</Erro>
            {!dados && !erro ? <Carregando texto="Calculando estatísticas..." /> : <Estatisticas dados={dados} />}
        </div>
    );
}

export default function PainelAdmin() {
    const [user, setUser] = useState(undefined);
    const [aba, setAba] = useState("denuncias");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsubscribe();
    }, []);

    // Aba inicial pela URL (?aba=forum), sem useSearchParams para não exigir Suspense
    useEffect(() => {
        const inicial = new URLSearchParams(window.location.search).get("aba");
        if (ABAS.some(a => a.id === inicial)) setAba(inicial);
    }, []);

    function trocarAba(id) {
        setAba(id);
        try {
            const url = new URL(window.location.href);
            url.searchParams.set("aba", id);
            window.history.replaceState(null, "", url);
        } catch (_) {}
    }

    // Setas esquerda/direita navegam entre as abas (padrão WAI-ARIA de tabs)
    function aoTeclarAba(e, indice) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const proximo = (indice + (e.key === "ArrowRight" ? 1 : -1) + ABAS.length) % ABAS.length;
        trocarAba(ABAS[proximo].id);
        document.getElementById(`aba-${ABAS[proximo].id}`)?.focus();
    }

    if (user === undefined) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Carregando />
            </div>
        );
    }

    if (!user || !isAdminEmail(user.email)) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 text-center max-w-md">
                    <div className="text-5xl mb-4">🔒</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">Acesso restrito</h1>
                    <p className="text-gray-600 mb-6">Esta área é exclusiva para moderadores da plataforma.</p>
                    <Link href={user ? "/" : "/login"} className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all">
                        {user ? "Ir para Home" : "Fazer login"}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-4">
                    <Link href="/" className="flex items-center gap-3 text-gray-900 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="font-bold text-lg">Voltar</span>
                    </Link>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <svg className="w-7 h-7 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Painel administrativo
                    </h1>
                    <div className="hidden md:block text-sm text-gray-500 truncate max-w-[200px]">{user.email}</div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-6">
                {!user.emailVerified && (
                    <div role="alert" className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-3 mb-4 text-sm">
                        Seu e-mail ainda não foi verificado. As regras do Firestore exigem e-mail verificado para moderadores,
                        então as ações deste painel serão negadas até a verificação.
                    </div>
                )}

                <div role="tablist" aria-label="Seções do painel" className="flex gap-1 overflow-x-auto bg-white border border-gray-200 rounded-xl p-1 mb-6">
                    {ABAS.map((a, i) => (
                        <button
                            key={a.id}
                            id={`aba-${a.id}`}
                            role="tab"
                            type="button"
                            aria-selected={aba === a.id}
                            aria-controls={`painel-${a.id}`}
                            tabIndex={aba === a.id ? 0 : -1}
                            onClick={() => trocarAba(a.id)}
                            onKeyDown={(e) => aoTeclarAba(e, i)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                                aba === a.id ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            {a.rotulo}
                        </button>
                    ))}
                </div>

                <section id={`painel-${aba}`} role="tabpanel" aria-labelledby={`aba-${aba}`} tabIndex={0} className="focus:outline-none">
                    {aba === "denuncias" && <AbaDenuncias user={user} />}
                    {aba === "universidades" && <AbaUniversidades user={user} />}
                    {aba === "avaliacoes" && <AbaAvaliacoes user={user} />}
                    {aba === "forum" && <AbaForum user={user} />}
                    {aba === "eventos" && <AbaEventos />}
                    {aba === "estatisticas" && <AbaEstatisticas />}
                    {aba === "exportar" && <AbaExportar />}
                </section>
            </main>
        </div>
    );
}
