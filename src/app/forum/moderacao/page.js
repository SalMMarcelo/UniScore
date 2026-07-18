"use client";
import { useState, useEffect } from "react";
import { auth, db } from "../../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    where
} from "firebase/firestore";
import Link from "next/link";
import { isAdminEmail } from "../../../lib/admin";

export default function ModeradorForum() {
    const [user, setUser] = useState(undefined);
    const [posts, setPosts] = useState([]);
    const [filtro, setFiltro] = useState("todos");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let q;
        if (filtro === "reportados") {
            q = query(
                collection(db, "forumPosts"),
                where("reportado", "==", true),
                orderBy("criadoEm", "desc")
            );
        } else if (filtro === "moderados") {
            q = query(
                collection(db, "forumPosts"),
                where("moderado", "==", true),
                orderBy("criadoEm", "desc")
            );
        } else {
            q = query(collection(db, "forumPosts"), orderBy("criadoEm", "desc"));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = [];
            snapshot.forEach((doc) => {
                postsData.push({ id: doc.id, ...doc.data() });
            });
            setPosts(postsData);
        });
        return () => unsubscribe();
    }, [filtro]);

    const isModerator = user && isAdminEmail(user.email);

    const handleDeletePost = async (postId) => {
        if (!isModerator || !confirm("Tem certeza que deseja excluir este post?")) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, "forumPosts", postId));
            alert("Post excluído com sucesso!");
        } catch (error) {
            alert("Erro ao excluir post: " + error.message);
        }
        setLoading(false);
    };

    const handleModeratePost = async (postId, moderado) => {
        if (!isModerator) return;

        setLoading(true);
        try {
            await updateDoc(doc(db, "forumPosts", postId), {
                moderado: !moderado,
                moderadoPor: user.email,
                moderadoEm: new Date()
            });
        } catch (error) {
            alert("Erro ao moderar post: " + error.message);
        }
        setLoading(false);
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "Agora";
        return timestamp.toDate().toLocaleString("pt-BR");
    };

    if (user === undefined) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] flex items-center justify-center">
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                    <div className="text-white/90 text-lg">Carregando...</div>
                </div>
            </div>
        );
    }

    if (!user || !isModerator) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] flex items-center justify-center">
                <div className="text-center py-12">
                    <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl max-w-md mx-auto">
                        <div className="text-6xl mb-6">🔒</div>
                        <h3 className="text-2xl font-bold text-white mb-4">Acesso Restrito</h3>
                        <p className="text-white/90 mb-8 text-lg leading-relaxed">
                            Esta área é exclusiva para moderadores da plataforma.
                        </p>
                        <Link href="/forum">
                            <button className="bg-white text-[#667eea] px-8 py-3 rounded-full font-bold text-lg hover:bg-gray-100 transition-all duration-300 shadow-lg">
                                Voltar ao Fórum
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] relative overflow-hidden">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
                    <Link href="/forum" className="flex items-center gap-4 text-white hover:text-white/80 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span className="font-bold text-lg">Voltar ao Fórum</span>
                    </Link>

                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Painel de Moderação
                    </h1>

                    <div className="text-white text-sm">
                        {user.email}
                    </div>
                </div>
            </header>

            {/* Filtros */}
            <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => setFiltro("todos")}
                            className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${filtro === "todos"
                                    ? "bg-white text-[#667eea]"
                                    : "bg-white/20 text-white hover:bg-white/30"
                                }`}
                        >
                            Todos os Posts ({posts.length})
                        </button>
                        <button
                            onClick={() => setFiltro("reportados")}
                            className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${filtro === "reportados"
                                    ? "bg-red-500 text-white"
                                    : "bg-red-500/20 text-white hover:bg-red-500/30"
                                }`}
                        >
                            Reportados
                        </button>
                        <button
                            onClick={() => setFiltro("moderados")}
                            className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${filtro === "moderados"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-yellow-500/20 text-white hover:bg-yellow-500/30"
                                }`}
                        >
                            Moderados
                        </button>
                    </div>
                </div>

                {/* Lista de Posts */}
                <div className="space-y-4">
                    {posts.map((post) => (
                        <div key={post.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                    {post.autor.foto ? (
                                        <img src={post.autor.foto} alt={post.autor.nome} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        post.autor.nome?.charAt(0)?.toUpperCase() || "A"
                                    )}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-white">{post.autor.nome}</span>
                                        <span className="text-white/60 text-sm">({post.autor.email})</span>
                                        <span className="text-white/60 text-sm">·</span>
                                        <span className="text-white/60 text-sm">{formatTimestamp(post.criadoEm)}</span>

                                        {post.moderado && (
                                            <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-bold">
                                                MODERADO
                                            </span>
                                        )}
                                        {post.reportado && (
                                            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-bold">
                                                REPORTADO
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-white/90 mb-4 whitespace-pre-wrap">
                                        {post.conteudo}
                                    </p>

                                    {post.mediaUrl && (
                                        <div className="mb-4 rounded-xl overflow-hidden max-w-md">
                                            {post.mediaType === "image" ? (
                                                <img
                                                    src={post.mediaUrl}
                                                    alt="Imagem do post"
                                                    className="w-full max-h-48 object-cover"
                                                />
                                            ) : post.mediaType === "video" ? (
                                                <video
                                                    src={post.mediaUrl}
                                                    controls
                                                    className="w-full max-h-48"
                                                />
                                            ) : null}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 pt-4 border-t border-white/20">
                                        <span className="text-white/60 text-sm">
                                            {post.curtidas?.length || 0} curtidas
                                        </span>
                                        <span className="text-white/60 text-sm">
                                            {post.comentarios?.length || 0} comentários
                                        </span>
                                    </div>
                                </div>

                                {/* Ações de Moderação */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => handleModeratePost(post.id, post.moderado)}
                                        disabled={loading}
                                        className={`px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 ${post.moderado
                                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                                : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                                            }`}
                                    >
                                        {post.moderado ? "Desmoderar" : "Moderar"}
                                    </button>

                                    <button
                                        onClick={() => handleDeletePost(post.id)}
                                        disabled={loading}
                                        className="px-4 py-2 rounded-full font-bold text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-300"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {posts.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-white/60 text-lg">
                                Nenhum post encontrado para este filtro.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}