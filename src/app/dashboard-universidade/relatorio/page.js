"use client";
// Relatório da universidade para imprimir / salvar em PDF (docs/relatorio-universidade.md).
// Aberto numa aba nova pelo botão "Gerar relatório" do dashboard. Os dados vêm de carregarDashboard,
// a mesma fonte do dashboard; o período filtra só as avaliações (agregarRelatorio).
// A parte visual fica em RelatorioImpressao.js, que recebe os dados prontos.
import { useState, useEffect, useMemo } from "react";
import { auth, db } from "../../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { carregarDashboard, agregarRelatorio, PERIODOS_RELATORIO } from "../../../lib/dashboardUniversidade";
import { useI18n } from "../../../i18n/I18nProvider";
import RelatorioImpressao from "./RelatorioImpressao";

export default function RelatorioUniversidade() {
    const { t, formatarData } = useI18n();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [conta, setConta] = useState(null);
    const [erroAcesso, setErroAcesso] = useState("");
    const [dados, setDados] = useState(null);
    const [erroDados, setErroDados] = useState(false);
    const [geradoEm, setGeradoEm] = useState(null);
    const [periodo, setPeriodo] = useState("tudo");
    const [urlSite, setUrlSite] = useState("");

    useEffect(() => {
        setUrlSite(window.location.origin);
    }, []);

    // Mesmo controle de acesso do dashboard: sem login vai para o login de universidades;
    // conta sem universidades/{uid} volta para o início.
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (!u) {
                router.push("/login-universidades");
                return;
            }
            setUser(u);
            try {
                const snap = await getDoc(doc(db, "universidades", u.uid));
                if (snap.exists()) {
                    setConta(snap.data());
                } else {
                    setErroAcesso("dashboard.acessoNegadoMsg");
                    setTimeout(() => router.push("/"), 3000);
                }
            } catch (err) {
                console.error("Erro ao buscar dados da universidade:", err);
                setErroAcesso(err?.code === "permission-denied" ? "dashboard.acessoNegadoMsg" : "dashboard.erroCarregar");
                setTimeout(() => router.push("/"), 3000);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const aprovada = conta?.status === "aprovado";
    const universidadeId = conta?.universidadeId ? String(conta.universidadeId) : null;

    useEffect(() => {
        if (!user || !conta) return;
        let cancelado = false;
        setErroDados(false);
        carregarDashboard({ uid: user.uid, universidadeId, contarPresencasDosEventos: aprovada })
            .then(resultado => {
                if (cancelado) return;
                setDados(resultado);
                setGeradoEm(new Date());
            })
            .catch(err => {
                console.error("Erro ao carregar os dados do relatório:", err);
                if (!cancelado) setErroDados(true);
            });
        return () => { cancelado = true; };
    }, [user, conta, universidadeId, aprovada]);

    const relatorio = useMemo(
        () => (dados && geradoEm ? agregarRelatorio(dados, periodo, geradoEm) : null),
        [dados, periodo, geradoEm]
    );

    const datasEventos = useMemo(
        () => Object.fromEntries((dados?.eventosConta || []).filter(ev => ev.data).map(ev => [String(ev.id), ev.data])),
        [dados]
    );

    const nomeUniversidade = conta?.nomeUniversidade || "";

    // Título do documento = nome sugerido do PDF
    useEffect(() => {
        if (!conta || !geradoEm) return;
        document.title = t("relatorioUniversidade.tituloDocumento", {
            universidade: nomeUniversidade || t("dashboard.universidade"),
            data: formatarData(geradoEm)
        });
    }, [conta, geradoEm, nomeUniversidade, t, formatarData]);

    if (erroAcesso) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">{t("dashboard.acessoNegado")}</h1>
                    <p role="alert" className="text-gray-600 mb-6">{t(erroAcesso)}</p>
                    <Link href="/" className="text-blue-700 hover:underline">{t("dashboard.irHome")}</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Barra da tela (não sai na impressão) */}
            <div className="relatorio-sem-impressao print:hidden sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
                    <Link href="/dashboard-universidade" className="text-sm font-semibold text-gray-700 hover:text-gray-900 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-800">
                        <span aria-hidden="true">← </span>{t("relatorioUniversidade.voltarPainel")}
                    </Link>
                    <div className="flex flex-wrap items-center gap-3">
                        <label htmlFor="relatorio-periodo" className="text-sm font-medium text-gray-700">
                            {t("relatorioUniversidade.periodoRotulo")}
                        </label>
                        <select
                            id="relatorio-periodo"
                            value={periodo}
                            onChange={e => setPeriodo(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-800"
                        >
                            {PERIODOS_RELATORIO.map(p => (
                                <option key={p} value={p}>{t(`relatorioUniversidade.periodos.${p}`)}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            disabled={!relatorio}
                            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-800"
                        >
                            {t("relatorioUniversidade.imprimir")}
                        </button>
                    </div>
                </div>
            </div>

            <main id="conteudo">
                {erroDados ? (
                    <p role="alert" className="max-w-4xl mx-auto px-4 md:px-8 py-8 text-red-800">{t("relatorioUniversidade.erroDados")}</p>
                ) : !relatorio ? (
                    <div role="status" className="max-w-4xl mx-auto px-4 md:px-8 py-16 text-center text-gray-700">
                        <div aria-hidden="true" className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mb-3"></div>
                        <div>{t("relatorioUniversidade.carregando")}</div>
                    </div>
                ) : (
                    <RelatorioImpressao
                        nomeUniversidade={nomeUniversidade}
                        periodo={periodo}
                        geradoEm={geradoEm}
                        relatorio={relatorio}
                        nomesEventos={dados.nomesEventos}
                        datasEventos={datasEventos}
                        urlSite={urlSite}
                    />
                )}
            </main>
        </div>
    );
}
