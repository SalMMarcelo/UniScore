"use client";
// Botão "Denunciar" + diálogo acessível (RF07).
// Uso: <BotaoDenunciar user={user} tipo="post" alvoId={post.id} autorUid={post.autor.uid} />
//      <BotaoDenunciar user={user} tipo="comentario" alvoId={chave} alvoPostId={post.id} />
//      <BotaoDenunciar user={user} tipo="avaliacao" alvoId={av.id} autorUid={av.usuarioId} />

import { useState, useEffect, useRef, useId } from "react";
import Link from "next/link";
import {
    MOTIVOS,
    LIMITE_DETALHE,
    enviarDenuncia,
    idDenuncia,
    jaDenunciadoLocalmente,
    rotuloMotivo
} from "../lib/denuncias";
import { useI18n } from "../i18n/I18nProvider";

export default function BotaoDenunciar({ user, tipo, alvoId, alvoPostId, autorUid, className = "" }) {
    const { t } = useI18n();
    const [aberto, setAberto] = useState(false);
    const [motivo, setMotivo] = useState("");
    const [detalhe, setDetalhe] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState(null); // null | "enviada" | "duplicada"
    const [erro, setErro] = useState("");
    const [jaEnviada, setJaEnviada] = useState(false);

    const dialogoRef = useRef(null);
    const botaoRef = useRef(null);
    const tituloId = useId();
    const descricaoId = useId();

    useEffect(() => {
        if (user && alvoId) setJaEnviada(jaDenunciadoLocalmente(idDenuncia(tipo, alvoId, user.uid)));
    }, [user, tipo, alvoId]);

    // Foco no diálogo ao abrir; Esc fecha; Tab fica preso dentro do diálogo
    useEffect(() => {
        if (!aberto) return;
        const dialogo = dialogoRef.current;
        const focaveis = () => Array.from(dialogo?.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]'
        ) || []);
        const primeiro = dialogo?.querySelector('input[type="radio"]') || focaveis()[0];
        primeiro?.focus();

        const aoTeclar = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                fechar();
            } else if (e.key === "Tab") {
                const lista = focaveis();
                if (lista.length === 0) return;
                const inicio = lista[0];
                const fim = lista[lista.length - 1];
                if (e.shiftKey && document.activeElement === inicio) {
                    e.preventDefault();
                    fim.focus();
                } else if (!e.shiftKey && document.activeElement === fim) {
                    e.preventDefault();
                    inicio.focus();
                }
            }
        };
        document.addEventListener("keydown", aoTeclar);
        return () => document.removeEventListener("keydown", aoTeclar);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aberto, resultado]);

    // Não mostra o botão para o próprio autor do conteúdo
    if (user && autorUid && user.uid === autorUid) return null;
    if (!alvoId) return null;

    function abrir() {
        setMotivo("");
        setDetalhe("");
        setErro("");
        setResultado(jaEnviada ? "duplicada" : null);
        setAberto(true);
    }

    function fechar() {
        setAberto(false);
        // Devolve o foco ao botão que abriu o diálogo
        setTimeout(() => botaoRef.current?.focus(), 0);
    }

    async function enviar(e) {
        e.preventDefault();
        if (!motivo) {
            setErro(t("denuncia.escolhaMotivo"));
            return;
        }
        setEnviando(true);
        setErro("");
        try {
            const r = await enviarDenuncia({ uid: user.uid, tipo, alvoId, alvoPostId, motivo, detalhe });
            setResultado(r);
            setJaEnviada(true);
        } catch (err) {
            console.error("Erro ao enviar denúncia:", err);
            setErro(err?.chaveI18n ? t(err.chaveI18n) : t("denuncia.erroEnviar"));
        }
        setEnviando(false);
    }

    return (
        <>
            <button
                ref={botaoRef}
                type="button"
                onClick={abrir}
                aria-haspopup="dialog"
                title={jaEnviada ? t("denuncia.jaDenunciouTitulo") : t("denuncia.denunciarConteudo")}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                    jaEnviada ? "text-gray-600" : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                } ${className}`}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
                </svg>
                {jaEnviada ? t("denuncia.denunciado") : t("denuncia.denunciar")}
            </button>

            {aberto && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}
                >
                    <div
                        ref={dialogoRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={tituloId}
                        aria-describedby={descricaoId}
                        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 text-left"
                    >
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <h2 id={tituloId} className="text-xl font-bold text-gray-900">{t("denuncia.denunciarConteudo")}</h2>
                            <button
                                type="button"
                                onClick={fechar}
                                aria-label={t("denuncia.fechar")}
                                className="text-gray-600 hover:text-gray-900 rounded-lg p-1"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {!user ? (
                            <div id={descricaoId}>
                                <p className="text-gray-600 mb-6">{t("denuncia.facaLogin")}</p>
                                <Link href="/login" className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                                    {t("denuncia.fazerLogin")}
                                </Link>
                            </div>
                        ) : resultado ? (
                            <div id={descricaoId} role="status">
                                <p className={`mb-6 font-medium ${resultado === "enviada" ? "text-green-700" : "text-gray-700"}`}>
                                    {resultado === "enviada"
                                        ? t("denuncia.enviada")
                                        : t("denuncia.duplicada")}
                                </p>
                                <button
                                    type="button"
                                    onClick={fechar}
                                    className="bg-gray-800 text-white px-5 py-2 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
                                >
                                    {t("denuncia.fechar")}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={enviar}>
                                <p id={descricaoId} className="text-gray-600 text-sm mb-4">
                                    {t("denuncia.anonima")}
                                </p>
                                <fieldset className="mb-4">
                                    <legend className="font-semibold text-gray-800 mb-2">{t("denuncia.motivo")}</legend>
                                    <div className="space-y-2">
                                        {MOTIVOS.map(m => (
                                            <label key={m.valor} className="flex items-center gap-3 text-gray-700 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="motivo"
                                                    value={m.valor}
                                                    checked={motivo === m.valor}
                                                    onChange={() => setMotivo(m.valor)}
                                                    className="w-4 h-4 accent-red-600"
                                                />
                                                {rotuloMotivo(m.valor, t)}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>

                                <label className="block font-semibold text-gray-800 mb-1" htmlFor={`${tituloId}-detalhe`}>
                                    {t("denuncia.detalhes")} <span className="font-normal text-gray-600">{t("denuncia.opcional")}</span>
                                </label>
                                <textarea
                                    id={`${tituloId}-detalhe`}
                                    value={detalhe}
                                    onChange={(e) => setDetalhe(e.target.value.slice(0, LIMITE_DETALHE))}
                                    maxLength={LIMITE_DETALHE}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200"
                                    placeholder={t("denuncia.placeholderDetalhe")}
                                />
                                <div className="text-right text-xs text-gray-600 mb-3">{detalhe.length}/{LIMITE_DETALHE}</div>

                                {erro && <p role="alert" className="text-red-700 text-sm mb-3">{erro}</p>}

                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={fechar}
                                        className="px-5 py-2 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                        {t("denuncia.cancelar")}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={enviando || !motivo}
                                        className="px-5 py-2 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                                    >
                                        {enviando ? t("denuncia.enviando") : t("denuncia.enviar")}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
