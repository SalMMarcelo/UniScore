"use client";
// Aba "Fórum": posts recentes com ocultar/reexibir/excluir
// (substitui o antigo /forum/moderacao, que agora redireciona para cá).
import { useState, useEffect, useCallback } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useI18n } from "../../i18n/I18nProvider";
import { notificarModeracao } from "../../lib/notificacoes";
import { Botao, Selo, Cartao, Carregando, Erro, Vazio, Filtros, mensagemErro } from "./ui";

const LIMITE = 100;

const FILTROS = [
    { valor: "todos", chave: "admin.filtrosTodos" },
    { valor: "visiveis", chave: "admin.filtrosVisiveis" },
    { valor: "ocultos", chave: "admin.filtrosOcultos" }
];

function alvoDoPost(post) {
    return { tipo: "post", autorUid: post.autor?.uid, postId: post.id, texto: post.conteudo };
}

export default function AbaForum({ user }) {
    const { t, formatarDataHora } = useI18n();
    const [posts, setPosts] = useState(null);
    const [filtro, setFiltro] = useState("todos");
    const [erro, setErro] = useState("");
    const [ocupado, setOcupado] = useState(null);

    const carregar = useCallback(async () => {
        setErro("");
        try {
            const snap = await getDocs(query(collection(db, "forumPosts"), orderBy("criadoEm", "desc"), limit(LIMITE)));
            setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Erro ao carregar posts:", err);
            setErro(mensagemErro(err, t));
            setPosts([]);
        }
    }, [t]);

    useEffect(() => { carregar(); }, [carregar]);

    async function alternarOculto(post) {
        setOcupado(post.id);
        setErro("");
        try {
            await updateDoc(doc(db, "forumPosts", post.id), {
                moderado: !post.moderado,
                moderadoPor: user.email,
                moderadoEm: serverTimestamp()
            });
            setPosts(lista => lista.map(p => (p.id === post.id ? { ...p, moderado: !post.moderado } : p)));
            notificarModeracao(user, alvoDoPost(post), post.moderado ? "restaurado" : "ocultado");
        } catch (err) {
            setErro(mensagemErro(err, t));
        }
        setOcupado(null);
    }

    async function excluir(post) {
        if (!confirm(t("admin.forum.confirmarExcluir"))) return;
        setOcupado(post.id);
        setErro("");
        try {
            await deleteDoc(doc(db, "forumPosts", post.id));
            setPosts(lista => lista.filter(p => p.id !== post.id));
            notificarModeracao(user, alvoDoPost(post), "removido");
        } catch (err) {
            setErro(mensagemErro(err, t));
        }
        setOcupado(null);
    }

    const visiveis = (posts || []).filter(p =>
        filtro === "todos" ? true : filtro === "ocultos" ? p.moderado === true : p.moderado !== true
    );

    return (
        <div>
            <Filtros opcoes={FILTROS.map(f => ({ ...f, rotulo: t(f.chave) }))} valor={filtro} onChange={setFiltro} rotulo={t("admin.forum.filtrar")} />
            <p className="text-sm text-gray-500 mb-4">{t("admin.forum.mostrando", { n: LIMITE })}</p>
            <Erro>{erro}</Erro>

            {posts === null ? (
                <Carregando texto={t("admin.forum.carregando")} />
            ) : visiveis.length === 0 ? (
                <Vazio>{t("admin.forum.nenhum")}</Vazio>
            ) : (
                <div className="space-y-3">
                    {visiveis.map(post => (
                        <Cartao key={post.id}>
                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-1">
                                        <span className="font-semibold text-gray-900">{post.autor?.nome}</span>
                                        <span>({post.autor?.email})</span>
                                        <span>· {formatarDataHora(post.criadoEm)}</span>
                                        {post.moderado && <Selo cor="amarelo">{t("admin.ocultoSelo")}</Selo>}
                                    </div>
                                    <p className="text-gray-800 whitespace-pre-wrap break-words">{post.conteudo}</p>
                                    {post.mediaUrl && post.mediaType === "image" && (
                                        <img src={post.mediaUrl} alt={t("admin.imagemPostDe", { nome: post.autor?.nome || t("admin.usuarioMinusculo") })} className="mt-2 max-h-40 rounded-lg border border-gray-200" />
                                    )}
                                    <div className="text-xs text-gray-600 mt-2">
                                        {t("admin.forum.contagens", { curtidas: post.curtidas?.length || 0, comentarios: post.comentarios?.length || 0 })}
                                    </div>
                                </div>
                                <div className="flex md:flex-col gap-2">
                                    <Botao cor={post.moderado ? "verde" : "amarelo"} disabled={ocupado === post.id} onClick={() => alternarOculto(post)}>
                                        {post.moderado ? t("admin.reexibir") : t("admin.ocultar")}
                                    </Botao>
                                    <Botao cor="vermelho" disabled={ocupado === post.id} onClick={() => excluir(post)}>
                                        {t("admin.excluir")}
                                    </Botao>
                                </div>
                            </div>
                        </Cartao>
                    ))}
                </div>
            )}
        </div>
    );
}
