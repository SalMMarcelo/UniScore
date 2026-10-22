"use client";
import { useState, useEffect, useCallback } from "react";
import { auth, db, storage } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    doc,
    arrayUnion,
    arrayRemove,
} from "firebase/firestore";
import Link from "next/link";
import { isAdminEmail } from "../../lib/admin";
import { TEMAS } from "../../lib/eventos";
import {
    LIMITE_TEXTO,
    ORDENS,
    filtrarPosts,
    temasUsados,
    organizarComentarios,
    validarMidia
} from "../../lib/forum";
import BotaoDenunciar from "../../components/BotaoDenunciar";
import MenuMobile from "../../components/MenuMobile";
import SinoNotificacoes from "../../components/SinoNotificacoes";
import SeletorIdioma from "../../components/SeletorIdioma";
import { useI18n } from "../../i18n/I18nProvider";
import { comentarENotificar, notificarCurtida } from "../../lib/notificacoes";

// ─── Utilitário de timestamp ───────────────────────────────────────────────
function formatTimestamp(timestamp, t) {
    if (!timestamp) return t("forum.agora");
    const now = new Date();
    const postTime = timestamp.toDate();
    const diffInMinutes = Math.floor((now - postTime) / (1000 * 60));
    if (diffInMinutes < 1) return t("forum.agora");
    if (diffInMinutes < 60) return t("forum.minutos", { n: diffInMinutes });
    if (diffInMinutes < 1440) return t("forum.horas", { n: Math.floor(diffInMinutes / 60) });
    return t("forum.dias", { n: Math.floor(diffInMinutes / 1440) });
}

// ─── Formulário de comentário (ou de resposta) ────────────────────────────
function FormComentario({ id, rotulo, placeholder, textoInicial = "", onEnviar, onCancelar, autoFocus }) {
    const { t } = useI18n();
    const [texto, setTexto] = useState(textoInicial);
    const [enviando, setEnviando] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!texto.trim()) return;
        setEnviando(true);
        const ok = await onEnviar(texto.trim());
        setEnviando(false);
        // Só limpa o campo se o comentário foi salvo, para não perder o texto digitado
        if (ok) setTexto("");
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
            <label htmlFor={id} className="sr-only">{rotulo}</label>
            <input
                id={id}
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape" && onCancelar) onCancelar(); }}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className="flex-1 min-w-0 bg-gray-50 border border-gray-300 rounded-full px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                maxLength={LIMITE_TEXTO}
            />
            {onCancelar && (
                <button type="button" onClick={onCancelar} className="px-3 py-2 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100">
                    {t("forum.cancelar")}
                </button>
            )}
            <button
                type="submit"
                disabled={!texto.trim() || enviando}
                className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
                {enviando ? "..." : t("forum.enviar")}
            </button>
        </form>
    );
}

// ─── Comentário (com botão Responder) ─────────────────────────────────────
function Comentario({ item, post, user, resposta, onResponder }) {
    const { t } = useI18n();
    const c = item.comentario;
    return (
        <div className="flex gap-3">
            <div aria-hidden="true" className={`${resposta ? "w-7 h-7" : "w-8 h-8"} bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                {c.autorNome?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-xl px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-800 text-sm truncate">{c.autorNome}</span>
                        <BotaoDenunciar
                            user={user}
                            tipo="comentario"
                            alvoId={item.chave}
                            alvoPostId={post.id}
                            autorUid={c.autorUid}
                        />
                    </div>
                    <p className="text-gray-700 text-sm mt-0.5 break-words">{c.texto}</p>
                </div>
                {user && (
                    <button
                        type="button"
                        onClick={() => onResponder(item)}
                        aria-label={t("forum.responderA", { nome: c.autorNome })}
                        className="mt-1 ml-3 text-xs font-semibold text-gray-600 hover:text-blue-700 rounded px-1"
                    >
                        {t("forum.responder")}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Card de post ─────────────────────────────────────────────────────────
function PostCard({ post, user, onLike, onComment }) {
    const { t, rotulo } = useI18n();
    const [showComments, setShowComments] = useState(false);
    // Resposta em andamento: { fio: item de 1º nível (organizarComentarios), nome: autor respondido }
    const [respondendo, setRespondendo] = useState(null);
    const fios = organizarComentarios(post.comentarios);

    const handleShare = async () => {
        const url = `${window.location.origin}/forum#${post.id}`;
        if (navigator.share) {
            try {
                // Tenta compartilhar com a imagem (Web Share API Level 2)
                if (post.mediaUrl && post.mediaType === "image" && navigator.canShare) {
                    try {
                        const response = await fetch(post.mediaUrl);
                        const blob = await response.blob();
                        const ext = blob.type.split("/")[1] || "jpg";
                        const file = new File([blob], `imagem.${ext}`, { type: blob.type });
                        if (navigator.canShare({ files: [file] })) {
                            await navigator.share({ title: t("forum.tituloCompartilhar"), text: post.conteudo, files: [file] });
                            return;
                        }
                    } catch (_) {}
                }
                // Fallback: compartilha só texto + link
                await navigator.share({ title: t("forum.tituloCompartilhar"), text: post.conteudo, url });
            } catch (_) {}
        } else {
            await navigator.clipboard.writeText(url);
            alert(t("forum.linkCopiado"));
        }
    };

    // Responder a uma resposta continua no fio do comentário original
    const iniciarResposta = (fio, item) => {
        setRespondendo({ fio, nome: item.comentario.autorNome || "" });
    };

    const enviarResposta = async (texto) => {
        const ok = await onComment(post, texto, respondendo.fio);
        if (ok) setRespondendo(null);
        return ok;
    };

    return (
        <div id={post.id} className="bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-3 sm:gap-4">
                <div aria-hidden="true" className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {post.autor.foto ? (
                        <img src={post.autor.foto} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        post.autor.nome?.charAt(0)?.toUpperCase() || "A"
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2">
                        <span className="font-bold text-gray-900 truncate">{post.autor.nome}</span>
                        <span className="text-gray-600 text-sm break-all">@{post.autor.email?.split('@')[0]}</span>
                        <span className="text-gray-600 text-sm" aria-hidden="true">·</span>
                        <span className="text-gray-600 text-sm">{formatTimestamp(post.criadoEm, t)}</span>
                    </div>

                    {post.tema && (
                        <span className="inline-block mb-2 bg-green-50 text-green-800 border border-green-200 text-xs font-semibold rounded-full px-3 py-1">
                            {rotulo("valores.temas", post.tema)}
                        </span>
                    )}

                    {post.moderado && (
                        <div className="mb-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-3 py-2">
                            {t("forum.removidoModeracao")}
                        </div>
                    )}

                    <p className="text-gray-700 text-base leading-relaxed mb-4 whitespace-pre-wrap">
                        {post.conteudo}
                    </p>

                    {post.mediaUrl && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-gray-200">
                            {post.mediaType === "image" ? (
                                <img src={post.mediaUrl} alt={t("forum.imagemPublicada", { nome: post.autor.nome })} className="w-full max-h-96 object-cover" />
                            ) : post.mediaType === "video" ? (
                                <video src={post.mediaUrl} controls className="w-full max-h-96" />
                            ) : null}
                        </div>
                    )}

                    {/* Ações */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-6 pt-3 border-t border-gray-200">
                        {/* Curtir */}
                        <button
                            type="button"
                            onClick={() => onLike(post)}
                            aria-pressed={!!(user && post.curtidas?.includes(user.uid))}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                                user && post.curtidas?.includes(user.uid)
                                    ? "text-red-600 bg-red-50"
                                    : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                            }`}
                        >
                            <svg aria-hidden="true" className="w-5 h-5" fill={user && post.curtidas?.includes(user.uid) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className="sr-only">{t("forum.curtidas")}</span>
                            <span className="text-sm font-medium">{post.curtidas?.length || 0}</span>
                        </button>

                        {/* Comentários */}
                        <button
                            type="button"
                            onClick={() => setShowComments((v) => !v)}
                            aria-expanded={showComments}
                            aria-controls={`comentarios-${post.id}`}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                                showComments ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            }`}
                        >
                            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="sr-only">{t("forum.comentarios")}</span>
                            <span className="text-sm font-medium">{post.comentarios?.length || 0}</span>
                        </button>

                        {/* Compartilhar */}
                        <button
                            type="button"
                            onClick={handleShare}
                            title={t("forum.compartilhar")}
                            aria-label={t("forum.compartilhar")}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:text-green-600 hover:bg-green-50 transition-all duration-200"
                        >
                            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                            </svg>
                        </button>

                        {/* Denunciar (RF07) */}
                        <div className="ml-auto">
                            <BotaoDenunciar user={user} tipo="post" alvoId={post.id} autorUid={post.autor?.uid} />
                        </div>
                    </div>

                    {/* Seção de comentários expandível */}
                    {showComments && (
                        <div id={`comentarios-${post.id}`} className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                            {fios.length > 0 ? (
                                <ul className="space-y-3">
                                    {fios.map((fio) => (
                                        <li key={`${fio.chave}-${fio.indice}`}>
                                            <Comentario item={fio} post={post} user={user} onResponder={(item) => iniciarResposta(fio, item)} />
                                            {(fio.respostas.length > 0 || respondendo?.fio.chave === fio.chave) && (
                                                <div className="ml-11 mt-2 pl-3 border-l-2 border-gray-200 space-y-2">
                                                    {fio.respostas.length > 0 && (
                                                        <ul className="space-y-2" aria-label={t("forum.respostasA", { nome: fio.comentario.autorNome })}>
                                                            {fio.respostas.map((r) => (
                                                                <li key={`${r.chave}-${r.indice}`}>
                                                                    <Comentario item={r} post={post} user={user} resposta onResponder={(item) => iniciarResposta(fio, item)} />
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    {user && respondendo?.fio.chave === fio.chave && (
                                                        <FormComentario
                                                            key={respondendo.nome}
                                                            id={`resposta-${post.id}-${fio.indice}`}
                                                            rotulo={t("forum.responderA", { nome: respondendo.nome })}
                                                            placeholder={t("forum.placeholderResposta")}
                                                            textoInicial={respondendo.nome ? `@${respondendo.nome} ` : ""}
                                                            onEnviar={enviarResposta}
                                                            onCancelar={() => setRespondendo(null)}
                                                            autoFocus
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-600 text-sm text-center">{t("forum.nenhumComentario")}</p>
                            )}

                            {user && (
                                <FormComentario
                                    id={`comentario-${post.id}`}
                                    rotulo={t("forum.escrevaComentario")}
                                    placeholder={t("forum.placeholderComentario")}
                                    onEnviar={(texto) => onComment(post, texto)}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Formulário de novo post ───────────────────────────────────────────────
function CreatePostForm({ user, onSubmit, loading, erro }) {
    const { t, rotulo } = useI18n();
    const [newPost, setNewPost] = useState("");
    const [tema, setTema] = useState("");
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaType, setMediaType] = useState("none");
    const [erroMidia, setErroMidia] = useState("");

    // Libera a URL temporária da prévia quando ela é trocada ou removida
    useEffect(() => {
        if (!mediaPreview) return;
        return () => URL.revokeObjectURL(mediaPreview);
    }, [mediaPreview]);

    const limparMidia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setErroMidia("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newPost.trim()) return;
        const ok = await onSubmit(newPost, mediaFile, mediaType, tema);
        if (ok) {
            setNewPost("");
            setTema("");
            limparMidia();
            setMediaType("none");
        }
    };

    const toggleMedia = (type) => {
        const next = mediaType === type ? "none" : type;
        setMediaType(next);
        limparMidia();
    };

    const escolherArquivo = (file) => {
        if (!file) return;
        const problema = validarMidia(file, mediaType);
        if (problema) {
            limparMidia();
            setErroMidia(t(problema.chave, problema.vars));
            return;
        }
        setErroMidia("");
        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
    };

    return (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-gray-200">
            <form onSubmit={handleSubmit}>
                <div className="flex gap-3 sm:gap-4">
                    <div aria-hidden="true" className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <svg aria-hidden="true" className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <label htmlFor="forum-novo-post" className="sr-only">{t("forum.escrevaPublicacao")}</label>
                        <textarea
                            id="forum-novo-post"
                            aria-describedby="forum-novo-post-contador"
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            placeholder={t("forum.placeholderPost")}
                            className="w-full bg-transparent border-none outline-none text-gray-900 text-lg placeholder-gray-500 resize-none min-h-[120px] p-1 rounded-lg focus:ring-2 focus:ring-blue-500"
                            maxLength={LIMITE_TEXTO}
                        />

                        <div className="mt-3">
                            <label htmlFor="forum-novo-tema" className="block text-sm font-medium text-gray-700 mb-1">
                                {t("forum.temaOpcional")}
                            </label>
                            <select
                                id="forum-novo-tema"
                                value={tema}
                                onChange={(e) => setTema(e.target.value)}
                                className="w-full sm:w-auto bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                            >
                                <option value="">{t("forum.semTema")}</option>
                                {TEMAS.map((valor) => (
                                    <option key={valor} value={valor}>{rotulo("valores.temas", valor)}</option>
                                ))}
                            </select>
                        </div>

                        {mediaType !== "none" && (
                            <div className="mt-4">
                                <label htmlFor="forum-midia" className="flex items-center justify-center gap-2 bg-gray-50 border-2 border-dashed border-gray-300 hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-300 text-gray-600 hover:text-blue-600 px-4 py-3 rounded-lg cursor-pointer transition-colors">
                                    <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-sm font-medium">
                                        {mediaFile ? mediaFile.name : (mediaType === "image" ? t("forum.escolherImagem") : t("forum.escolherVideo"))}
                                    </span>
                                    <input
                                        id="forum-midia"
                                        type="file"
                                        accept={mediaType === "image" ? "image/*" : "video/*"}
                                        className="sr-only"
                                        aria-describedby="forum-midia-limite"
                                        onChange={(e) => {
                                            escolherArquivo(e.target.files?.[0]);
                                            e.target.value = "";
                                        }}
                                    />
                                </label>
                                <p id="forum-midia-limite" className="mt-1 text-xs text-gray-600">
                                    {t(mediaType === "image" ? "forum.limiteImagem" : "forum.limiteVideo")}
                                </p>
                                {erroMidia && (
                                    <p role="alert" className="mt-2 text-sm text-red-700">{erroMidia}</p>
                                )}
                                {mediaPreview && (
                                    <div className="mt-3 relative">
                                        {mediaType === "image" ? (
                                            <img src={mediaPreview} alt={t("forum.previaImagem")} className="w-full max-h-48 object-cover rounded-lg border border-gray-200" />
                                        ) : (
                                            <video src={mediaPreview} controls className="w-full max-h-48 rounded-lg border border-gray-200" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={limparMidia}
                                            aria-label={t("forum.removerArquivo")}
                                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-700"
                                        >
                                            <span aria-hidden="true">×</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {erro && (
                            <div role="alert" className="mt-4 bg-red-50 border border-red-300 text-red-800 rounded-lg px-4 py-3 text-sm">
                                {erro}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => toggleMedia("image")}
                                    aria-label={t("forum.anexarImagem")}
                                    aria-pressed={mediaType === "image"}
                                    className={`p-2 rounded-lg transition-all duration-200 ${mediaType === "image" ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}`}
                                >
                                    <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </button>

                                <button type="button" onClick={() => toggleMedia("video")}
                                    aria-label={t("forum.anexarVideo")}
                                    aria-pressed={mediaType === "video"}
                                    className={`p-2 rounded-lg transition-all duration-200 ${mediaType === "video" ? "bg-green-100 text-green-600" : "text-gray-600 hover:text-green-600 hover:bg-green-50"}`}
                                >
                                    <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>

                                <span id="forum-novo-post-contador" className="text-gray-600 text-sm ml-2 sm:ml-4">{newPost.length}/{LIMITE_TEXTO}</span>
                            </div>

                            <button
                                type="submit"
                                disabled={!newPost.trim() || loading || newPost.length > LIMITE_TEXTO || (mediaType !== "none" && !mediaFile)}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                                {loading ? t("forum.publicando") : t("forum.publicar")}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

// ─── Busca e filtros ──────────────────────────────────────────────────────
const FILTROS_INICIAIS = { busca: "", tema: "", ordem: "recentes", comMidia: false, meus: false };

function BarraFiltros({ filtros, onChange, temas, total }) {
    const { t, rotulo, formatarNumero } = useI18n();
    const alterar = (campo, valor) => onChange({ ...filtros, [campo]: valor });
    const ativos = filtros.busca.trim() || filtros.tema || filtros.comMidia || filtros.meus || filtros.ordem !== "recentes";
    const campo = "bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200";

    return (
        <section aria-labelledby="forum-filtros-titulo" className="bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-gray-200">
            <h2 id="forum-filtros-titulo" className="sr-only">{t("forum.filtrosTitulo")}</h2>
            <form role="search" onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
                <div>
                    <label htmlFor="forum-busca" className="sr-only">{t("forum.buscar")}</label>
                    <input
                        id="forum-busca"
                        type="search"
                        value={filtros.busca}
                        onChange={(e) => alterar("busca", e.target.value)}
                        placeholder={t("forum.placeholderBusca")}
                        className={`w-full ${campo}`}
                    />
                </div>
                <div>
                    <label htmlFor="forum-filtro-tema" className="sr-only">{t("forum.filtrarTema")}</label>
                    <select id="forum-filtro-tema" value={filtros.tema} onChange={(e) => alterar("tema", e.target.value)} className={`w-full ${campo}`}>
                        <option value="">{t("forum.todosTemas")}</option>
                        {temas.map((valor) => (
                            <option key={valor} value={valor}>{rotulo("valores.temas", valor)}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="forum-ordem" className="sr-only">{t("forum.ordenar")}</label>
                    <select id="forum-ordem" value={filtros.ordem} onChange={(e) => alterar("ordem", e.target.value)} className={`w-full ${campo}`}>
                        {ORDENS.map((ordem) => (
                            <option key={ordem} value={ordem}>{t(`forum.ordens.${ordem}`)}</option>
                        ))}
                    </select>
                </div>
            </form>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-gray-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filtros.comMidia} onChange={(e) => alterar("comMidia", e.target.checked)} className="w-4 h-4 accent-blue-600" />
                    {t("forum.comMidia")}
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filtros.meus} onChange={(e) => alterar("meus", e.target.checked)} className="w-4 h-4 accent-blue-600" />
                    {t("forum.meusPosts")}
                </label>
                <span role="status" className="text-gray-600 sm:ml-auto">
                    {t(total === 1 ? "forum.resultadoUm" : "forum.resultados", { n: formatarNumero(total) })}
                </span>
                {ativos && (
                    <button type="button" onClick={() => onChange(FILTROS_INICIAIS)} className="font-semibold text-blue-700 hover:underline rounded px-1">
                        {t("forum.limparFiltros")}
                    </button>
                )}
            </div>
        </section>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function Forum() {
    const { t } = useI18n();
    const [user, setUser] = useState(undefined);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    // Erro ao publicar, exibido no formulário (substitui alert())
    const [erroPost, setErroPost] = useState("");
    const [filtros, setFiltros] = useState(FILTROS_INICIAIS);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const q = query(collection(db, "forumPosts"), orderBy("criadoEm", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPosts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribe();
    }, []);

    // Posts ocultados pela moderação (moderado == true) saem do feed público;
    // o autor (e os moderadores) continuam vendo, com um aviso no card.
    const ehModerador = !!user && isAdminEmail(user.email);
    const postsVisiveis = posts.filter(
        (p) => !p.moderado || ehModerador || (user && p.autor?.uid === user.uid)
    );
    const postsFiltrados = filtrarPosts(postsVisiveis, filtros, user?.uid);

    const handleSubmitPost = useCallback(async (text, mediaFile, mediaType, tema) => {
        if (!user) return false;
        setErroPost("");
        setLoading(true);
        try {
            let uploadedUrl = null;
            let finalMediaType = null;
            if (mediaFile && mediaType !== "none") {
                const ext = mediaFile.name.split(".").pop();
                const storageRef = ref(storage, `forum/${user.uid}/${Date.now()}.${ext}`);
                await uploadBytes(storageRef, mediaFile);
                uploadedUrl = await getDownloadURL(storageRef);
                finalMediaType = mediaType;
            }
            await addDoc(collection(db, "forumPosts"), {
                conteudo: text,
                tema: tema || null,
                autor: { uid: user.uid, nome: user.displayName || user.email, email: user.email, foto: user.photoURL || null },
                mediaUrl: uploadedUrl,
                mediaType: finalMediaType,
                curtidas: [],
                comentarios: [],
                criadoEm: serverTimestamp(),
                moderado: false,
            });
            setLoading(false);
            return true;
        } catch (error) {
            setErroPost(t("forum.erroPublicar", { mensagem: error.message }));
            setLoading(false);
            return false;
        }
    }, [user, t]);

    const handleLike = useCallback(async (post) => {
        if (!user) return;
        const postRef = doc(db, "forumPosts", post.id);
        const userLiked = (post.curtidas || []).includes(user.uid);
        try {
            await updateDoc(postRef, {
                curtidas: userLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
            });
            if (!userLiked) notificarCurtida(user, post);
        } catch (error) {
            console.error("Erro ao curtir:", error);
            alert(t("forum.erroCurtir", { mensagem: error.message }));
        }
    }, [user, t]);

    // fio: comentário de primeiro nível respondido (item de organizarComentarios), opcional
    const handleComment = useCallback(async (post, texto, fio = null) => {
        if (!user) return false;
        const comentario = {
            autorUid: user.uid,
            autorNome: user.displayName || user.email,
            texto,
            criadoEm: new Date().toISOString(),
        };
        if (fio) comentario.respostaA = fio.chave;
        try {
            await comentarENotificar(user, post, comentario, fio?.comentario || null);
            return true;
        } catch (error) {
            console.error("Erro ao comentar:", error);
            alert(t("forum.erroComentar", { mensagem: error.message }));
            return false;
        }
    }, [user, t]);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 px-4 sm:px-6 py-4">
                    <Link href="/" className="flex items-center gap-3 text-gray-900 hover:text-gray-600 transition-colors">
                        <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="font-bold text-lg sr-only sm:not-sr-only">{t("forum.voltar")}</span>
                    </Link>

                    <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-3 text-center">
                        <svg aria-hidden="true" className="hidden sm:block w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                        {t("forum.titulo")}
                    </h1>

                    <div className="flex justify-end items-center gap-2">
                        <SeletorIdioma className="hidden md:inline-flex" />
                        {user && isAdminEmail(user.email) && (
                            <Link href="/admin" title={t("forum.painelAdmin")} aria-label={t("forum.painelAdmin")} className="bg-gray-800 hover:bg-gray-900 text-white p-2 rounded-lg transition-all">
                                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </Link>
                        )}
                        <SinoNotificacoes />
                        <MenuMobile />
                    </div>
                </div>
            </header>

            <main id="conteudo" className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                {user === undefined ? (
                    <div className="text-center py-12" role="status">
                        <div aria-hidden="true" className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
                        <div className="text-gray-600 text-lg">{t("forum.carregando")}</div>
                    </div>
                ) : !user ? (
                    <div className="text-center py-12">
                        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-200 max-w-md mx-auto">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg aria-hidden="true" className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("forum.entreConversa")}</h2>
                            <p className="text-gray-600 mb-8 text-base leading-relaxed">
                                {t("forum.facaLogin")}
                            </p>
                            <Link href="/login" className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg">
                                {t("forum.fazerLogin")}
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                                {t("forum.conecteAntes")} <span className="text-green-600">{t("forum.conecteDestaque")}</span>
                            </h2>
                            <p className="text-xl text-gray-600">
                                {t("forum.compartilheTexto")}
                            </p>
                        </div>

                        <CreatePostForm user={user} onSubmit={handleSubmitPost} loading={loading} erro={erroPost} />

                        {postsVisiveis.length > 0 && (
                            <BarraFiltros filtros={filtros} onChange={setFiltros} temas={temasUsados(postsVisiveis)} total={postsFiltrados.length} />
                        )}

                        <div className="space-y-4">
                            {postsFiltrados.map((post) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    user={user}
                                    onLike={handleLike}
                                    onComment={handleComment}
                                />
                            ))}

                            {postsVisiveis.length > 0 && postsFiltrados.length === 0 && (
                                <div className="text-center py-10 bg-white rounded-2xl shadow-md border border-gray-200">
                                    <p className="text-gray-600 text-lg mb-4">{t("forum.nenhumResultado")}</p>
                                    <button type="button" onClick={() => setFiltros(FILTROS_INICIAIS)} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700">
                                        {t("forum.limparFiltros")}
                                    </button>
                                </div>
                            )}

                            {postsVisiveis.length === 0 && (
                                <div className="text-center py-12 bg-white rounded-2xl shadow-md border border-gray-200">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg aria-hidden="true" className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-600 text-lg">
                                        {t("forum.nenhumaDiscussao")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}