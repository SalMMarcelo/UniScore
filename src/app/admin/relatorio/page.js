"use client";
// Relatório geral para impressão / "Salvar como PDF" (RF08).
// Aberto pela aba "Exportar" do /admin com ?imprimir=1, que chama window.print()
// assim que os dados terminam de carregar. Sem dependências: o PDF é gerado
// pelo próprio navegador, com os estilos de @media print abaixo.
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { auth } from "../../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { isAdminEmail } from "../../../lib/admin";
import { listarEventos } from "../../../lib/eventos";
import { rotuloMotivo, rotuloTipoDenuncia } from "../../../lib/denuncias";
import { useI18n } from "../../../i18n/I18nProvider";
import Estatisticas from "../Estatisticas";
import {
    carregarEstatisticas,
    carregarAvaliacoes,
    carregarDenuncias,
    nomesDosEventos
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
    const { t, rotulo, formatarData, formatarDataHora } = useI18n();
    // Ref para usar t no efeito de carga sem recarregar ao trocar de idioma
    const tRef = useRef(t);
    tRef.current = t;
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
                if (!cancelado) setErro(mensagemErro(err, tRef.current));
            }
        })();
        return () => { cancelado = true; };
    }, [user]);

    // Abre a janela de impressão quando os dados estiverem prontos
    useEffect(() => {
        if (!dados) return;
        if (new URLSearchParams(window.location.search).get("imprimir") !== "1") return;
        const timer = setTimeout(() => window.print(), 400);
        return () => clearTimeout(timer);
    }, [dados]);

    if (user === undefined) {
        return <div className="min-h-screen bg-white flex items-center justify-center"><Carregando /></div>;
    }

    if (!user || !isAdminEmail(user.email)) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">{t("admin.relatorio.acessoRestrito")}</h1>
                    <p className="text-gray-600 mb-6">{t("admin.relatorio.exclusivo")}</p>
                    <Link href="/admin" className="text-blue-600 hover:underline">{t("admin.relatorio.voltarPainel")}</Link>
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
                        {t("admin.relatorio.voltarPainelSeta")}
                    </Link>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        disabled={!dados}
                        className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                        {t("admin.relatorio.imprimir")}
                    </button>
                </div>
            </div>

            <main id="conteudo" className="max-w-5xl mx-auto px-4 md:px-6 py-8">
                <header className="flex items-center justify-between gap-4 border-b border-gray-200 pb-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">{t("admin.relatorio.titulo")}</h1>
                        <p className="text-sm text-gray-500">
                            {t("admin.relatorio.geradoEm", { data: formatarDataHora(new Date()), email: user.email })}
                        </p>
                    </div>
                    <img src="/uniscore_star_logo.png" alt="UniScore" className="h-14 w-auto" />
                </header>

                <Erro>{erro}</Erro>

                {!dados && !erro ? (
                    <Carregando texto={t("admin.relatorio.montando")} />
                ) : dados && (
                    <div className="space-y-10">
                        <section className="relatorio-secao">
                            <h2 className="text-xl font-bold mb-4">{t("admin.relatorio.indicadores")}</h2>
                            <Estatisticas dados={dados.estatisticas} />
                        </section>

                        <section className="relatorio-secao">
                            <h2 className="text-xl font-bold mb-4">{t("admin.relatorio.denunciasAbertas", { n: dados.denuncias.length })}</h2>
                            {dados.denuncias.length === 0 ? (
                                <p className="text-sm text-gray-500">{t("admin.relatorio.nenhumaDenuncia")}</p>
                            ) : (
                                <Tabela
                                    colunas={[t("admin.relatorio.colData"), t("admin.relatorio.colTipo"), t("admin.relatorio.colMotivo"), t("admin.relatorio.colDetalhe"), t("admin.relatorio.colConteudo")]}
                                    linhas={dados.denuncias.map(d => [
                                        formatarDataHora(d.criadoEm),
                                        rotuloTipoDenuncia(d.tipo, t),
                                        rotuloMotivo(d.motivo, t),
                                        d.detalhe || "—",
                                        d.tipo === "comentario" ? `${d.alvoPostId} / ${d.alvoId}` : d.alvoId
                                    ])}
                                />
                            )}
                        </section>

                        <section className="relatorio-secao">
                            <h2 className="text-xl font-bold mb-4">{t("admin.relatorio.eventos", { n: dados.eventos.length })}</h2>
                            <Tabela
                                colunas={[t("admin.relatorio.colEvento"), t("admin.relatorio.colData"), t("admin.relatorio.colUniversidade"), t("admin.relatorio.colTema"), t("admin.relatorio.colTipo")]}
                                linhas={dados.eventos.map(ev => [
                                    ev.nome + (ev.legado ? t("admin.relatorio.legadoSufixo") : ""),
                                    formatarData(ev.data) || ev.data || "—",
                                    ev.universidadeNome || "—",
                                    rotulo("valores.temas", ev.tema) || "—",
                                    rotulo("valores.tipos", ev.tipo) || "—"
                                ])}
                            />
                        </section>

                        <section className="relatorio-secao">
                            <h2 className="text-xl font-bold mb-4">
                                {t("admin.relatorio.avaliacoesRecentes", {
                                    n: dados.avaliacoes.length,
                                    ultimas: dados.avaliacoes.length >= LIMITE_AVALIACOES ? t("admin.relatorio.ultimas", { n: LIMITE_AVALIACOES }) : ""
                                })}
                            </h2>
                            <Tabela
                                colunas={[t("admin.relatorio.colData"), t("admin.relatorio.colEvento"), t("admin.relatorio.colUsuario"), t("admin.relatorio.colNota"), t("admin.relatorio.colTitulo"), t("admin.relatorio.colSituacao")]}
                                linhas={dados.avaliacoes.map(av => [
                                    formatarDataHora(av.criadoEm),
                                    nomes[av.eventoId] || (av.eventoId ? `#${av.eventoId}` : "—"),
                                    av.usuario || "—",
                                    av.nota ?? "—",
                                    av.titulo || "—",
                                    av.moderado ? t("admin.relatorio.oculta") : t("admin.relatorio.visivel")
                                ])}
                            />
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
