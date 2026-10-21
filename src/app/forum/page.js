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
import { chaveComentario } from "../../lib/denuncias";
import BotaoDenunciar from "../../components/BotaoDenunciar";

// ─── Utilitário de timestamp ───────────────────────────────────────────────
function formatTimestamp(timestamp) {
    if (!timestamp) return "Agora";
    const now = new Date();
    const postTime = timestamp.toDate();
    const diffInMinutes = Math.floor((now - postTime) / (1000 * 60));
    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
}

// ─── Card de post ─────────────────────────────────────────────────────────
function PostCard({ post, user, onLike, onComment }) {
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [submitting, setSubmitting] = useState(false);

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
                            await navigator.share({ title: "UniScore – Fórum", text: post.conteudo, files: [file] });
                            return;
                        }
                    } catch (_) {}
                }
                // Fallback: compartilha só texto + link
                await navigator.share({ title: "UniScore – Fórum", text: post.conteudo, url });
            } catch (_) {}
        } else {
            await navigator.clipboard.writeText(url);
            alert("Link copiado para a área de transferência!");
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !user) return;
        setSubmitting(true);
        const ok = await onComment(post.id, commentText.trim());
        // Só limpa o campo se o comentário foi salvo, para não perder o texto digitado
        if (ok) setCommentText("");
        setSubmitting(false);
    };

    return (
        <div id={post.id} className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {post.autor.foto ? (
                        <img src={post.autor.foto} alt={post.autor.nome} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        post.autor.nome?.charAt(0)?.toUpperCase() || "A"
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900 truncate">{post.autor.nome}</span>
                        <span className="text-gray-500 text-sm">@{post.autor.email?.split('@')[0]}</span>
                        <span className="text-gray-400 text-sm">·</span>
                        <span className="text-gray-500 text-sm">{formatTimestamp(post.criadoEm)}</span>
                    </div>

                    {post.moderado && (
                        <div className="mb-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-3 py-2">
                            Este post foi removido pela moderação e não aparece para os demais usuários.
                        </div>
                    )}

                    <p className="text-gray-700 text-base leading-relaxed mb-4 whitespace-pre-wrap">
                        {post.conteudo}
                    </p>

                    {post.mediaUrl && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-gray-200">
                            {post.mediaType === "image" ? (
                                <img src={post.mediaUrl} alt="Imagem do post" className="w-full max-h-96 object-cover" />
                            ) : post.mediaType === "video" ? (
                                <video src={post.mediaUrl} controls className="w-full max-h-96" />
                            ) : null}
                        </div>
                    )}

                    {/* Ações */}
                    <div className="flex items-center gap-6 pt-3 border-t border-gray-200">
                        {/* Curtir */}
                        <button
                            onClick={() => onLike(post.id, post.curtidas || [])}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                                user && post.curtidas?.includes(user.uid)
                                    ? "text-red-500 bg-red-50"
                                    : "text-gray-600 hover:text-red-500 hover:bg-red-50"
                            }`}
                        >
                            <svg aria-hidden="true" className="w-5 h-5" fill={user && post.curtidas?.includes(user.uid) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className="text-sm font-medium">{post.curtidas?.length || 0}</span>
                        </button>

                        {/* Comentários */}
                        <button
                            onClick={() => setShowComments((v) => !v)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                                showComments ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            }`}
                        >
                            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="text-sm font-medium">{post.comentarios?.length || 0}</span>
                        </button>

                        {/* Compartilhar */}
                        <button
                            onClick={handleShare}
                            title="Compartilhar"
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
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                            {post.comentarios?.length > 0 ? (
                                post.comentarios.map((c, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {c.autorNome?.charAt(0)?.toUpperCase() || "?"}
                                        </div>
                                        <div className="bg-gray-50 rounded-xl px-4 py-2 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-gray-800 text-sm">{c.autorNome}</span>
                                                <BotaoDenunciar
                                                    user={user}
                                                    tipo="comentario"
                                                    alvoId={chaveComentario(c, i)}
                                                    alvoPostId={post.id}
                                                    autorUid={c.autorUid}
                                                />
                                            </div>
                                            <p className="text-gray-700 text-sm mt-0.5">{c.texto}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm text-center">Nenhum comentário ainda.</p>
                            )}

                            {user && (
                                <form onSubmit={handleSubmitComment} className="flex gap-2 mt-2">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Escreva um comentário..."
                                        className="flex-1 bg-gray-50 border border-gray-300 rounded-full px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                                        maxLength={280}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!commentText.trim() || submitting}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                                    >
                                        {submitting ? "..." : "Enviar"}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Formulário de novo post ───────────────────────────────────────────────
function CreatePostForm({ user, onSubmit, loading }) {
    const [newPost, setNewPost] = useState("");
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaType, setMediaType] = useState("none");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newPost.trim()) return;
        const ok = await onSubmit(newPost, mediaFile, mediaType);
        if (ok) {
            setNewPost("");
            setMediaFile(null);
            setMediaPreview(null);
            setMediaType("none");
        }
    };

    const toggleMedia = (type) => {
        const next = mediaType === type ? "none" : type;
        setMediaType(next);
        if (next === "none") { setMediaFile(null); setMediaPreview(null); }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
            <form onSubmit={handleSubmit}>
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <svg aria-hidden="true" className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        )}
                    </div>

                    <div className="flex-1">
                        <textarea
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            placeholder="Cada evento é uma história: poste a sua"
                            className="w-full bg-transparent border-none outline-none text-gray-900 text-lg placeholder-gray-500 resize-none min-h-[120px] p-0"
                            maxLength={280}
                        />

                        {mediaType !== "none" && (
                            <div className="mt-4">
                                <label className="flex items-center justify-center gap-2 bg-gray-50 border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-600 hover:text-blue-600 px-4 py-3 rounded-lg cursor-pointer transition-colors">
                                    <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-sm font-medium">
                                        {mediaFile ? mediaFile.name : (mediaType === "image" ? "Escolher imagem" : "Escolher vídeo")}
                                    </span>
                                    <input
                                        type="file"
                                        accept={mediaType === "image" ? "image/*" : "video/*"}
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setMediaFile(file);
                                                setMediaPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </label>
                                {mediaPreview && (
                                    <div className="mt-3 relative">
                                        {mediaType === "image" ? (
                                            <img src={mediaPreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg border border-gray-200" />
                                        ) : (
                                            <video src={mediaPreview} controls className="w-full max-h-48 rounded-lg border border-gray-200" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => toggleMedia("image")}
                                    className={`p-2 rounded-lg transition-all duration-200 ${mediaType === "image" ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}`}
                                >
                                    <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </button>

                                <button type="button" onClick={() => toggleMedia("video")}
                                    className={`p-2 rounded-lg transition-all duration-200 ${mediaType === "video" ? "bg-green-100 text-green-600" : "text-gray-600 hover:text-green-600 hover:bg-green-50"}`}
                                >
                                    <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>

                                <span className="text-gray-500 text-sm ml-4">{newPost.length}/280</span>
                            </div>

                            <button
                                type="submit"
                                disabled={!newPost.trim() || loading || newPost.length > 280 || (mediaType !== "none" && !mediaFile)}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                                {loading ? "Publicando..." : "Publicar"}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function Forum() {
    const [user, setUser] = useState(undefined);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);

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

    const handleSubmitPost = useCallback(async (text, mediaFile, mediaType) => {
        if (!user) return false;
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
            alert("Erro ao publicar: " + error.message);
            setLoading(false);
            return false;
        }
    }, [user]);

    const handleLike = useCallback(async (postId, curtidas) => {
        if (!user) return;
        const postRef = doc(db, "forumPosts", postId);
        const userLiked = curtidas.includes(user.uid);
        try {
            await updateDoc(postRef, {
                curtidas: userLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
            });
        } catch (error) {
            console.error("Erro ao curtir:", error);
            alert("Erro ao curtir: " + error.message);
        }
    }, [user]);

    const handleComment = useCallback(async (postId, texto) => {
        if (!user) return false;
        const postRef = doc(db, "forumPosts", postId);
        try {
            await updateDoc(postRef, {
                comentarios: arrayUnion({
                    autorUid: user.uid,
                    autorNome: user.displayName || user.email,
                    texto,
                    criadoEm: new Date().toISOString(),
                }),
            });
            return true;
        } catch (error) {
            console.error("Erro ao comentar:", error);
            alert("Erro ao comentar: " + error.message);
            return false;
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
                    <Link href="/" className="flex items-center gap-3 text-gray-900 hover:text-gray-600 transition-colors">
                        <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="font-bold text-lg">Voltar</span>
                    </Link>

                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <svg aria-hidden="true" className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                        Fórum universitário
                    </h1>

                    <div className="w-20 flex justify-end">
                        {user && isAdminEmail(user.email) && (
                            <Link href="/admin" title="Painel Admin">
                                <button className="bg-gray-800 hover:bg-gray-900 text-white p-2 rounded-lg transition-all">
                                    <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </button>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {user === undefined ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
                        <div className="text-gray-600 text-lg">Carregando...</div>
                    </div>
                ) : !user ? (
                    <div className="text-center py-12">
                        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 max-w-md mx-auto">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg aria-hidden="true" className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Entre na conversa</h3>
                            <p className="text-gray-600 mb-8 text-base leading-relaxed">
                                Faça login para participar das discussões sobre eventos universitários e conectar-se com outros estudantes.
                            </p>
                            <Link href="/login">
                                <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg">
                                    Fazer login
                                </button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-4xl font-bold text-gray-900 mb-4">
                                Conecte-se com <span className="text-green-600">a comunidade acadêmica</span>
                            </h2>
                            <p className="text-xl text-gray-600">
                                Compartilhe experiências, fotos e vídeos de eventos universitários
                            </p>
                        </div>

                        <CreatePostForm user={user} onSubmit={handleSubmitPost} loading={loading} />

                        <div className="space-y-4">
                            {postsVisiveis.map((post) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    user={user}
                                    onLike={handleLike}
                                    onComment={handleComment}
                                />
                            ))}

                            {postsVisiveis.length === 0 && (
                                <div className="text-center py-12 bg-white rounded-2xl shadow-md border border-gray-200">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg aria-hidden="true" className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-600 text-lg">
                                        Nenhuma discussão ainda. Seja o primeiro a compartilhar!
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