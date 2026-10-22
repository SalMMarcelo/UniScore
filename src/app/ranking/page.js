"use client";
// Ranking da comunidade (RF05). Os pontos são derivados na leitura a partir
// das últimas avaliações e posts do fórum (consultas limitadas, ver
// LIMITE_RANKING_AVALIACOES / LIMITE_RANKING_POSTS em src/lib/gamificacao.js).
// Por isso o ranking reflete a participação recente, não o histórico completo.
import { useState, useEffect } from "react";
import Link from "next/link";
import MenuMobile from "../../components/MenuMobile";
import SeletorIdioma from "../../components/SeletorIdioma";
import { useI18n } from "../../i18n/I18nProvider";
import {
    carregarRanking,
    LIMITE_RANKING_AVALIACOES,
    LIMITE_RANKING_POSTS,
    TAMANHO_RANKING
} from "../../lib/gamificacao";

const MEDALHAS = ["🥇", "🥈", "🥉"];

// Ordinal em inglês para o rótulo de posição (1st, 2nd, 3rd, 4th...)
function ordinalIngles(n) {
    const resto100 = n % 100;
    if (resto100 >= 11 && resto100 <= 13) return `${n}th`;
    return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

function Estrelas({ quantidade }) {
    const { t } = useI18n();
    return (
        <div className="flex items-center gap-0.5" role="img" aria-label={t("ranking.nivelEstrelas", { n: quantidade })}>
            {Array.from({ length: 5 }, (_, i) => (
                <svg
                    key={i}
                    aria-hidden="true"
                    className={`w-4 h-4 ${i < quantidade ? "text-yellow-400" : "text-gray-300"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

export default function Ranking() {
    const { t, idioma } = useI18n();
    const lugar = (n) => t("ranking.lugar", { n: idioma === "en-US" ? ordinalIngles(n) : n });
    const [ranking, setRanking] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        let ativo = true;
        carregarRanking()
            .then(lista => {
                if (ativo) setRanking(lista);
            })
            .catch(err => {
                console.error("Erro ao carregar ranking:", err);
                // Guarda a chave; o texto é traduzido na renderização
                if (ativo) setErro("ranking.erro");
            })
            .finally(() => {
                if (ativo) setCarregando(false);
            });
        return () => {
            ativo = false;
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto flex items-center justify-between gap-3 px-4 md:px-6 py-4">
                    <Link href="/" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span className="font-bold text-lg">{t("ranking.voltar")}</span>
                    </Link>

                    <img src="/uniscore_star_logo.png" alt="UniScore" className="h-10 sm:h-16 w-auto max-w-[140px] sm:max-w-[220px]" />

                    <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600" aria-label={t("menu.navPrincipal")}>
                        <Link href="/forum" className="hover:text-blue-600 transition-colors">{t("menu.forum")}</Link>
                        <Link href="/perfil" className="hover:text-blue-600 transition-colors">{t("ranking.meuPerfil")}</Link>
                        <SeletorIdioma />
                    </nav>
                    <MenuMobile />
                </div>
            </header>

            <main id="conteudo" className="container mx-auto px-4 py-12">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                            {t("ranking.tituloAntes")} <span className="bg-gradient-to-r from-yellow-300 to-green-400 bg-clip-text text-transparent">{t("ranking.tituloDestaque")}</span>
                        </h1>
                        <p className="text-gray-600">
                            {t("ranking.subtitulo")}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm">
                        {carregando ? (
                            <div className="flex flex-col items-center gap-4 py-8" aria-busy="true" role="status">
                                <div aria-hidden="true" className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-600">{t("ranking.carregando")}</p>
                            </div>
                        ) : erro ? (
                            <p role="alert" className="text-center text-red-700 py-8">{t(erro)}</p>
                        ) : ranking.length === 0 ? (
                            <div className="text-center text-gray-600 py-8">
                                <p className="mb-4">{t("ranking.vazio")}</p>
                                <Link
                                    href="/avaliar"
                                    className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md"
                                >
                                    {t("ranking.avaliarEvento")}
                                </Link>
                            </div>
                        ) : (
                            <ol className="divide-y divide-gray-100" aria-label={t("ranking.top", { n: TAMANHO_RANKING })}>
                                {ranking.map((u, i) => {
                                    const nomeExibido = u.nomeOculto ? t("comum.participante") : u.nome;
                                    const nomeSelo = (s) => t(`gamificacao.selos.${s.id}.nome`);
                                    return (
                                    <li key={u.uid} className="flex items-center gap-2 sm:gap-4 py-4">
                                        <span className="w-8 text-center text-lg font-bold text-gray-600 flex-shrink-0" role="img" aria-label={lugar(i + 1)}>
                                            {MEDALHAS[i] || t("ranking.posicao", { n: i + 1 })}
                                        </span>
                                        {u.foto ? (
                                            <img src={u.foto} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 flex-shrink-0" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-green-400 text-white font-bold flex items-center justify-center flex-shrink-0" aria-hidden="true">
                                                {nomeExibido.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-gray-900 truncate">{nomeExibido}</p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                                                <Estrelas quantidade={u.estrelas} />
                                                <span>{t(u.totalSelos === 1 ? "ranking.seloUm" : "ranking.selosN", { n: u.totalSelos })}</span>
                                                {u.selos.length > 0 && (
                                                    <span role="img" aria-label={t("ranking.selosLista", { lista: u.selos.map(nomeSelo).join(", ") })}>
                                                        {u.selos.map(s => (
                                                            <span key={s.id} title={nomeSelo(s)} aria-hidden="true">{s.emoji}</span>
                                                        ))}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xl font-bold text-blue-600">{u.pontos}</p>
                                            <p className="text-xs text-gray-600">{t("ranking.pontos")}</p>
                                        </div>
                                    </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>

                    <p className="text-xs text-gray-600 text-center mt-6">
                        {t("ranking.rodape", { avaliacoes: LIMITE_RANKING_AVALIACOES, posts: LIMITE_RANKING_POSTS })}
                    </p>
                </div>
            </main>
        </div>
    );
}
