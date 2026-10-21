"use client";
// Relatório geral para impressão / "Salvar como PDF" (RF08).
// Aberto pela aba "Exportar" do /admin com ?imprimir=1, que chama window.print()
// assim que os dados terminam de carregar. Sem dependências: o PDF é gerado
// pelo próprio navegador, com os estilos de @media print abaixo.
import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "../../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { isAdminEmail } from "../../../lib/admin";
import { listarEventos } from "../../../lib/eventos";
import { rotuloMotivo, TIPOS_DENUNCIA } from "../../../lib/denuncias";
import Estatisticas from "../Estatisticas";
import {
    carregarEstatisticas,
    carregarAvaliacoes,
    carregarDenuncias,
    nomesDosEventos,
    formatarDataHora,
    formatarDataEvento
} from "../dados";
import { Carregando, Erro, mensagemErro } from "../ui";

const LIMITE_AVALIACOES = 100;

const ESTILO_IMPRESSAO = `
@media print {
    @page { size: A4; margin: 14mm; }
    html, body { background: #ffffff !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .fixed { display: none !important; } /* botão "Instalar app" (PwaInstall) */
    .relatorio-sem-impressao { display: none !important; }
    .relatorio-secao { break-inside: auto; }
    .relatorio-secao h2 { break-after: avoid; }
    .relatorio-raiz table { font-size: 10px; }
    .relatorio-raiz tr, .relatorio-raiz .break-inside-avoid { break-inside: avoid; }
    .relatorio-raiz thead { display: table-header-group; }
    .relatorio-raiz .shadow-sm { box-shadow: none !important; }
    .relatorio-raiz a { color: inherit; text-decoration: none; }
}
`;

function Tabela({ colunas, linhas }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                    <tr>
                        {colunas.map(c => <th key={c} scope="col" className="px-3 py-2 font-semibold">{c}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {linhas.map((linha, i) => (
                        <tr key={i} className="align-top">
                            {linha.map((cel, j) => <td key={j} className="px-3 py-2 text-gray-700">{cel}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function RelatorioAdmin() {
    const [user, setUser] = useState(undefined);
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !isAdminEmail(user.email)) return;
        let cancelado = false;
        (async () => {
            try {
                const [estatisticas, eventos, avaliacoes, denuncias] = await Promise.all([
                    carregarEstatisticas(),
                    listarEventos(),
                    carregarAvaliacoes(LIMITE_AVALIACOES),
                    carregarDenuncias({ status: "aberta" })
                ]);
                if (!cancelado) setDados({ estatisticas, eventos, avaliacoes, denuncias });
            } catch (err) {
                console.error("Erro ao montar relatório:", err);
                if (!cancelado) setErro(mensagemErro(err));
            }
        })();
        return () => { cancelado = true; };
    }, [user]);

    // Abre a janela de impressão quando os dados estiverem prontos
    useEffect(() => {
        if (!dados) return;
        if (new URLSearchParams(window.location.search).get("imprimir") !== "1") return;
        const t = setTimeout(() => window.print(), 400);
        return () => clearTimeout(t);
    }, [dados]);

    if (user === undefined) {
        return <div className="min-h-screen bg-white flex items-center justify-center"><Carregando /></div>;
    }

    if (!user || !isAdminEmail(user.email)) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">Acesso restrito</h1>
                    <p className="text-gray-600 mb-6">Este relatório é exclusivo para moderadores da plataforma.</p>
                    <Link href="/admin" className="text-blue-600 hover:underline">Voltar ao painel</Link>
                </div>
            </div>
        );
    }

    const nomes = dados ? nomesDosEventos(dados.eventos) : {};

    return (
        <div className="relatorio-raiz min-h-screen bg-white text-gray-900">
            <style>{ESTILO_IMPRESSAO}</style>

            <div className="relatorio-sem-impressao bg-gray-50 border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
                    <Link href="/admin?aba=exportar" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
                        ← Voltar ao painel
                    </Link>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        disabled={!dados}
                        className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                        Imprimir / salvar PDF
                    </button>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-6 py-8">
                <header className="flex items-center justify-between gap-4 border-b border-gray-200 pb-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Relatório UniScore</h1>
                        <p className="text-sm text-gray-500">
                            Gerado em {new Date().toLocaleString("pt-BR")} por {user.email}
                        </p>
                    </div>
                    <img src="/uniscore_star_logo.png" alt="UniScore" className="h-14 w-auto" />
                </header>

                <Erro>{erro}</Erro>

                {!dados && !erro ? (
                    <Carregando texto="Montando relatório..." />
                ) : dados && (
                    <div className="space-y-10">
                        <section className="relatorio-secao">
                            <h2 className="text-xl font-bold mb-4">Indicadores gerais</h2>
                            <Estatisticas dados={dados.estatisticas} />
                        </section>

                        <section className="relatorio-secao">
                            <h2 className="text-xl font-bold mb-4">Denúncias abertas ({dados.denuncias.length})</h2>
                            {dados.denuncias.length === 0 ? (
                                <p className="text-sm text-gray-500">Nenhuma denúncia aberta.</p>
                            ) : (
                                <Tabela
                                    colunas={["Data", "Tipo", "Motivo", "Detalhe", "Conteúdo (id)"]}
                                    linhas={dados.denuncias.map(d => [
                                        formatarDataHora(d.criadoEm),
                                        TIPOS_DENUNCIA[d.tipo] || d.tipo,
                                        rotuloMotivo(d.motivo),
                                        d.detalhe || "—",
                                        d.tipo === "comentario" ? `${d.alvoPostId} / ${d.alvoId}` : d.alvoId
                                    ])}
                                />
                            )}
                        </section>

                        <section className="relatorio-secao">
                            <h2 className="text-xl font-bold mb-4">Eventos ({dados.eventos.length})</h2>
                            <Tabela
                                colunas={["Evento", "Data", "Universidade", "Tema", "Tipo"]}
                                linhas={dados.eventos.map(ev => [
                                    ev.nome + (ev.legado ? " (legado)" : ""),
                                    formatarDataEvento(ev.data) || "—",
                                    ev.universidadeNome || "—",
                                    ev.tema || "—",
                                    ev.tipo || "—"
                                ])}
                            />
                        </section>

                        <section className="relatorio-secao">
                            <h2 className="text-xl font-bold mb-4">
                                Avaliações recentes ({dados.avaliacoes.length}{dados.avaliacoes.length >= LIMITE_AVALIACOES ? `, últimas ${LIMITE_AVALIACOES}` : ""})
                            </h2>
                            <Tabela
                                colunas={["Data", "Evento", "Usuário", "Nota", "Título", "Situação"]}
                                linhas={dados.avaliacoes.map(av => [
                                    formatarDataHora(av.criadoEm),
                                    nomes[av.eventoId] || (av.eventoId ? `#${av.eventoId}` : "—"),
                                    av.usuario || "—",
                                    av.nota ?? "—",
                                    av.titulo || "—",
                                    av.moderado ? "Oculta" : "Visível"
                                ])}
                            />
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
