"use client";
// Notificações do usuário: curtidas, comentários, respostas e moderação.
// Regras de criação e leitura em src/lib/notificacoes.js e firestore.rules.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MenuMobile from "../../components/MenuMobile";
import SeletorIdioma from "../../components/SeletorIdioma";
import { useNotificacoes } from "../../components/SinoNotificacoes";
import { useI18n } from "../../i18n/I18nProvider";
import {
    marcarLida,
    marcarTodasLidas,
    excluirNotificacao,
    linkDaNotificacao
} from "../../lib/notificacoes";

const ICONES = {
    curtida: { cor: "bg-red-100 text-red-600", d: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    comentario: { cor: "bg-blue-100 text-blue-600", d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    resposta: { cor: "bg-green-100 text-green-700", d: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" },
    moderacao: { cor: "bg-yellow-100 text-yellow-700", d: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" }
};

function mensagem(n, t) {
    const nome = n.autorNome || t("notificacoes.alguem");
    if (n.tipo === "moderacao") {
        return t(`notificacoes.moderacao.${n.acao}`, { alvo: t(`notificacoes.alvos.${n.alvoTipo}`) });
    }
    return t(`notificacoes.mensagens.${n.tipo}`, { nome });
}

export default function Notificacoes() {
    const { t, formatarRelativo, formatarDataHora } = useI18n();
    const router = useRouter();
    const { user, notificacoes, erro } = useNotificacoes();
    const [falhaAcao, setFalhaAcao] = useState("");

    const naoLidas = (notificacoes || []).filter((n) => !n.lida);

    const agir = async (acao) => {
        setFalhaAcao("");
        try {
            await acao();
        } catch (err) {
            console.error("Erro ao atualizar notificação:", err);
            setFalhaAcao(t("notificacoes.erroAcao"));
        }
    };

    const abrir = async (n) => {
        if (!n.lida) await agir(() => marcarLida(n.id));
        const link = linkDaNotificacao(n);
        if (link) router.push(link);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 px-4 md:px-6 py-4">
                    <Link href="/" className="flex items-center gap-3 text-gray-700 hover:text-gray-900 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span className="font-bold text-lg">{t("notificacoes.voltar")}</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600" aria-label={t("menu.navPrincipal")}>
                        <Link href="/forum" className="hover:text-blue-600 transition-colors">{t("menu.forum")}</Link>
                        <Link href="/perfil" className="hover:text-blue-600 transition-colors">{t("menu.perfil")}</Link>
                        <SeletorIdioma />
                    </nav>
                    <MenuMobile />
                </div>
            </header>

            <main id="conteudo" className="max-w-3xl mx-auto px-4 md:px-6 py-10">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t("notificacoes.titulo")}</h1>
                        {user && notificacoes && (
                            <p className="text-gray-600 mt-1" role="status">
                                {naoLidas.length === 0
                                    ? t("notificacoes.todasLidas")
                                    : t(naoLidas.length === 1 ? "notificacoes.naoLidasUma" : "notificacoes.naoLidas", { n: naoLidas.length })}
                            </p>
                        )}
                    </div>
                    {naoLidas.length > 0 && (
                        <button
                            type="button"
                            onClick={() => agir(() => marcarTodasLidas(notificacoes))}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                        >
                            {t("notificacoes.marcarTodas")}
                        </button>
                    )}
                </div>

                {falhaAcao && (
                    <p role="alert" className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">{falhaAcao}</p>
                )}

                {user === null ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                        <p className="text-gray-700 mb-6">{t("notificacoes.facaLogin")}</p>
                        <Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold">
                            {t("notificacoes.entrar")}
                        </Link>
                    </div>
                ) : erro ? (
                    <p role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">{t("notificacoes.erro")}</p>
                ) : notificacoes === null ? (
                    <p role="status" className="text-gray-600 text-center py-12">{t("notificacoes.carregando")}</p>
                ) : notificacoes.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center text-gray-600">
                        {t("notificacoes.vazio")}
                    </div>
                ) : (
                    <ul className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
                        {notificacoes.map((n) => {
                            const icone = ICONES[n.tipo] || ICONES.comentario;
                            const link = linkDaNotificacao(n);
                            return (
                                <li key={n.id} className={`flex items-start gap-3 p-4 ${n.lida ? "" : "bg-blue-50/60"}`}>
                                    <div aria-hidden="true" className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${icone.cor}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icone.d} />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900">
                                            {!n.lida && <span className="sr-only">{t("notificacoes.novaSr")} </span>}
                                            <span className={n.lida ? "" : "font-semibold"}>{mensagem(n, t)}</span>
                                        </p>
                                        {n.trecho && <p className="text-sm text-gray-600 mt-0.5 break-words">“{n.trecho}”</p>}
                                        <p className="text-xs text-gray-600 mt-1">
                                            <time dateTime={n.criadoEm?.toDate?.().toISOString()} title={formatarDataHora(n.criadoEm)}>
                                                {formatarRelativo(n.criadoEm)}
                                            </time>
                                        </p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                                            {link && (
                                                <button type="button" onClick={() => abrir(n)} className="font-semibold text-blue-700 hover:underline rounded">
                                                    {t("notificacoes.verPost")}
                                                </button>
                                            )}
                                            {!n.lida && (
                                                <button type="button" onClick={() => agir(() => marcarLida(n.id))} className="text-gray-700 hover:underline rounded">
                                                    {t("notificacoes.marcarLida")}
                                                </button>
                                            )}
                                            <button type="button" onClick={() => agir(() => excluirNotificacao(n.id))} className="text-gray-700 hover:text-red-700 hover:underline rounded">
                                                {t("notificacoes.excluir")}
                                            </button>
                                        </div>
                                    </div>
                                    {!n.lida && <span aria-hidden="true" className="w-2.5 h-2.5 mt-2 rounded-full bg-blue-600 shrink-0"></span>}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </main>
        </div>
    );
}
