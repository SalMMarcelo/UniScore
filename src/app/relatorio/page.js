"use client";
import Link from "next/link";
import MenuMobile from "../../components/MenuMobile";
import SeletorIdioma from "../../components/SeletorIdioma";
import { useI18n } from "../../i18n/I18nProvider";
import { carregarRelatorioPublico } from "../../lib/estatisticas";
import { useState, useEffect, useMemo } from "react";

const CORES = [
    { barra: "from-pink-500 to-pink-600", texto: "text-pink-600", fundo: "bg-pink-100" },
    { barra: "from-cyan-500 to-cyan-600", texto: "text-cyan-600", fundo: "bg-cyan-100" },
    { barra: "from-green-500 to-green-600", texto: "text-green-600", fundo: "bg-green-100" },
    { barra: "from-yellow-500 to-orange-500", texto: "text-yellow-700", fundo: "bg-yellow-100" },
    { barra: "from-purple-500 to-purple-600", texto: "text-purple-600", fundo: "bg-purple-100" },
    { barra: "from-blue-500 to-blue-600", texto: "text-blue-600", fundo: "bg-blue-100" }
];

const MAXIMO_LINHAS = 6;

// Conta de 0 até os valores finais (sem animação com movimento reduzido)
function useContagemAnimada(alvos) {
    const [valores, setValores] = useState(alvos);

    useEffect(() => {
        if (!alvos) return;
        if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
            setValores(alvos);
            return;
        }

        const passos = 60;
        let passo = 0;
        const timer = setInterval(() => {
            passo++;
            const progresso = 1 - Math.pow(1 - passo / passos, 3);
            setValores(Object.fromEntries(Object.entries(alvos).map(([chave, valor]) => [
                chave,
                valor === null ? null : Math.floor(valor * progresso)
            ])));
            if (passo >= passos) {
                clearInterval(timer);
                setValores(alvos);
            }
        }, 2000 / passos);

        return () => clearInterval(timer);
    }, [alvos]);

    return valores;
}

function CardMetrica({ rotulo, valor, detalhe, cor, icone }) {
    return (
        <div className={`bg-gradient-to-br ${cor} rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 duration-300`}>
            <div className="flex items-start justify-between">
                <div className="text-white">
                    <div className="text-sm font-medium opacity-90 mb-2">{rotulo}</div>
                    <div className="text-4xl font-bold mb-1">{valor}</div>
                    <div className="text-xs opacity-90">{detalhe}</div>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icone} />
                    </svg>
                </div>
            </div>
        </div>
    );
}

function Painel({ titulo, descricao, children }) {
    return (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
            {descricao && <p className="text-xs text-gray-600 mt-1">{descricao}</p>}
            <div className="mt-6">{children}</div>
        </section>
    );
}

const ICONES = {
    estrela: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    grafico: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    calendario: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    forum: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
};

export default function RelatorioPublico() {
    const { t, rotulo, formatarNumero, formatarData, formatarRelativo } = useI18n();
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState(false);

    useEffect(() => {
        let ativo = true;
        carregarRelatorioPublico()
            .then(d => { if (ativo) setDados(d); })
            .catch(err => {
                console.error("Erro ao carregar relatório:", err);
                if (ativo) setErro(true);
            });
        return () => { ativo = false; };
    }, []);

    const alvos = useMemo(
        () => (dados ? { avaliacoes: dados.avaliacoes, eventos: dados.eventos, posts: dados.posts } : null),
        [dados]
    );
    const contagem = useContagemAnimada(alvos);

    const numero = (valor) => (valor === null || valor === undefined ? "—" : formatarNumero(valor));
    const media = (valor) => (valor === null || valor === undefined
        ? "—"
        : formatarNumero(valor, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 md:px-6 py-4">
                    <Link href="/" className="flex items-center gap-3 text-gray-900 hover:text-gray-600 transition-colors">
                        <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span className="font-bold text-xl">UniScore</span>
                    </Link>

                    <nav className="hidden md:flex gap-8 text-sm font-medium" aria-label={t("menu.navPrincipal")}>
                        <Link href="/forum" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-2">
                            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                            </svg>
                            {t("menu.forum")}
                        </Link>
                        <Link href="/o-que-fazemos" className="text-gray-600 hover:text-blue-600 transition-colors">{t("relatorio.oQueFazemos")}</Link>
                    </nav>

                    <div className="flex items-center gap-2">
                        <SeletorIdioma className="hidden md:inline-flex" />
                        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                            <div aria-hidden="true" className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-green-700 text-sm font-medium">{t("relatorio.dadosReais")}</span>
                        </div>
                        <MenuMobile />
                    </div>
                </div>
            </header>

            <main id="conteudo">

            {/* Page Title */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("relatorio.titulo")}</h1>
                    <p className="text-gray-600">{t("relatorio.subtitulo")}</p>
                </div>
            </div>


            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {erro && (
                    <p role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">{t("relatorio.erro")}</p>
                )}

                {!erro && !dados && (
                    <p role="status" className="text-gray-600 py-12 text-center">{t("relatorio.carregando")}</p>
                )}

                {dados && (
                    <>
                        {/* Principais métricas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <CardMetrica
                                rotulo={t("relatorio.avaliacoes")}
                                valor={numero(contagem?.avaliacoes)}
                                detalhe={t("relatorio.noMes", { n: numero(dados.avaliacoesNoMes) })}
                                cor="from-pink-500 to-pink-600"
                                icone={ICONES.estrela}
                            />
                            <CardMetrica
                                rotulo={t("relatorio.notaMedia")}
                                valor={media(dados.mediaGeral)}
                                detalhe={t("relatorio.deCinco")}
                                cor="from-cyan-600 to-cyan-700"
                                icone={ICONES.grafico}
                            />
                            <CardMetrica
                                rotulo={t("relatorio.eventos")}
                                valor={numero(contagem?.eventos)}
                                detalhe={t("relatorio.eventosDetalhe", {
                                    futuros: numero(dados.eventosFuturos),
                                    universidades: numero(dados.universidadesComEventos)
                                })}
                                cor="from-green-600 to-green-700"
                                icone={ICONES.calendario}
                            />
                            <CardMetrica
                                rotulo={t("relatorio.posts")}
                                valor={numero(contagem?.posts)}
                                detalhe={t("relatorio.postsDetalhe")}
                                cor="from-orange-500 to-orange-600"
                                icone={ICONES.forum}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <GraficoMensal dados={dados.porMes} numero={numero} formatarData={formatarData} t={t} />

                            <Painel titulo={t("relatorio.impacto")} descricao={t("relatorio.impactoDescricao")}>
                                <ul className="space-y-5">
                                    {dados.impacto.map((item, i) => {
                                        const cor = CORES[i % CORES.length];
                                        const nome = t(`relatorio.aspectos.${item.id}`);
                                        return (
                                            <li key={item.id}>
                                                <div className="flex justify-between items-center mb-2 gap-3">
                                                    <span className="text-sm font-medium text-gray-700">{nome}</span>
                                                    <span className={`text-sm font-bold ${cor.texto} ${cor.fundo} px-2 py-1 rounded whitespace-nowrap`}>
                                                        {item.media === null ? t("relatorio.semRespostas") : `${media(item.media)} / 5`}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner" aria-hidden="true">
                                                    <div
                                                        className={`h-3 bg-gradient-to-r ${cor.barra} rounded-full transition-all duration-1000`}
                                                        style={{ width: `${((item.media || 0) / 5) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Painel>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <Painel titulo={t("relatorio.temasTitulo")}>
                                <ListaBarras
                                    linhas={dados.porTema
                                        .filter(l => l.avaliacoes)
                                        .map(l => ({
                                            chave: l.tema,
                                            nome: rotulo("valores.temas", l.tema),
                                            total: l.avaliacoes,
                                            extra: l.media === null ? null : t("relatorio.mediaNota", { media: media(l.media) })
                                        }))}
                                    numero={numero}
                                    vazio={t("relatorio.semDados")}
                                />
                            </Painel>

                            <Painel titulo={t("relatorio.tiposTitulo")}>
                                <ListaBarras
                                    linhas={dados.porTipo.map(l => ({ chave: l.valor, nome: rotulo("valores.tipos", l.valor), total: l.total }))}
                                    numero={numero}
                                    vazio={t("relatorio.semDados")}
                                />
                            </Painel>
                        </div>

                        <Painel titulo={t("relatorio.recentes")}>
                            {dados.recentes.length === 0 ? (
                                <p className="text-sm text-gray-600">{t("relatorio.semAvaliacoes")}</p>
                            ) : (
                                <ul className="space-y-1">
                                    {dados.recentes.map(av => {
                                        const evento = dados.eventosPorId[av.eventoId];
                                        const nome = av.usuario || t("relatorio.anonimo");
                                        return (
                                            <li key={av.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div aria-hidden="true" className="w-10 h-10 shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                                        {nome.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium text-gray-900 truncate">{nome}</div>
                                                        <div className="text-xs text-gray-600 truncate">
                                                            {evento
                                                                ? [evento.universidadeNome, evento.nome].filter(Boolean).join(" • ")
                                                                : t("relatorio.eventoRemovido")}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1" role="img" aria-label={t("geral.estrelas", { n: av.nota })}>
                                                        {[...Array(5)].map((_, i) => (
                                                            <svg aria-hidden="true" key={i} className={`w-4 h-4 ${i < av.nota ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                            </svg>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-gray-600 whitespace-nowrap">{formatarRelativo(av.criadoEm)}</span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Painel>
                    </>
                )}
            </div>
            </main>
        </div>
    );
}

function GraficoMensal({ dados, numero, formatarData, t }) {
    const maior = Math.max(1, ...dados.map(m => m.total || 0));
    return (
        <Painel titulo={t("relatorio.crescimento")} descricao={t("relatorio.ultimos12")}>
            <div className="h-64 relative">
                <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map(i => <div key={i} className="border-t border-gray-100"></div>)}
                </div>
                <ul className="relative h-full flex items-end justify-between gap-1 sm:gap-2 px-1">
                    {dados.map(item => {
                        const mes = formatarData(item.inicio, { month: "short" }).replace(".", "");
                        const rotuloCompleto = t("relatorio.avaliacoesNoMesRotulo", {
                            mes: formatarData(item.inicio, { month: "long", year: "numeric" }),
                            n: numero(item.total)
                        });
                        return (
                            <li key={item.inicio.toISOString()} className="flex-1 h-full flex flex-col justify-end items-center group" aria-label={rotuloCompleto}>
                                <div className="relative w-full mb-2" aria-hidden="true">
                                    <div
                                        className="w-full bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-t-lg transition-all duration-500 group-hover:from-cyan-600 group-hover:to-cyan-400"
                                        style={{ height: `${Math.max(((item.total || 0) / maior) * 200, 4)}px` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {numero(item.total)}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] sm:text-xs text-gray-600 font-medium" aria-hidden="true">{mes}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </Painel>
    );
}

function ListaBarras({ linhas, numero, vazio }) {
    if (linhas.length === 0) return <p className="text-sm text-gray-600">{vazio}</p>;
    const visiveis = linhas.slice(0, MAXIMO_LINHAS);
    const maior = Math.max(1, ...visiveis.map(l => l.total));
    return (
        <ul className="space-y-4">
            {visiveis.map((linha, i) => {
                const cor = CORES[i % CORES.length];
                return (
                    <li key={linha.chave}>
                        <div className="flex justify-between items-baseline gap-3 mb-1">
                            <span className="text-sm font-medium text-gray-700">{linha.nome}</span>
                            <span className="text-sm text-gray-900 whitespace-nowrap">
                                <span className="font-bold">{numero(linha.total)}</span>
                                {linha.extra && <span className="text-xs text-gray-600 ml-2">{linha.extra}</span>}
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden" aria-hidden="true">
                            <div className={`h-2 bg-gradient-to-r ${cor.barra} rounded-full transition-all duration-700`} style={{ width: `${(linha.total / maior) * 100}%` }}></div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
