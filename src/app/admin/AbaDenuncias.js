"use client";
// Aba "Denúncias": revisa as denúncias (RF07) agrupadas por conteúdo.
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import {
    rotuloTipoDenuncia,
    rotuloMotivo,
    fecharDenuncias,
    indiceComentario,
    chaveComentario
} from "../../lib/denuncias";
import { carregarDenuncias } from "./dados";
import { notificarModeracao } from "../../lib/notificacoes";
import { useI18n } from "../../i18n/I18nProvider";
import { Botao, Selo, Cartao, Carregando, Erro, Vazio, Filtros, mensagemErro } from "./ui";

const FILTROS = [
    { valor: "aberta", chave: "admin.denuncias.abertas" },
    { valor: "resolvida", chave: "admin.denuncias.resolvidas" },
    { valor: "descartada", chave: "admin.denuncias.descartadas" }
];

function chaveGrupo(d) {
    return d.tipo === "comentario" ? `${d.tipo}_${d.alvoPostId}_${d.alvoId}` : `${d.tipo}_${d.alvoId}`;
}

// Dados do conteúdo denunciado para avisar o autor (notificarModeracao)
function alvoParaNotificar(grupo) {
    const { alvo } = grupo;
    if (!alvo) return null;
    if (grupo.tipo === "post") {
        return { tipo: "post", autorUid: alvo.autor?.uid, postId: grupo.alvoId, texto: alvo.conteudo };
    }
    if (grupo.tipo === "avaliacao") {
        return { tipo: "avaliacao", autorUid: alvo.usuarioId, avaliacaoId: grupo.alvoId, texto: alvo.titulo || alvo.comentario };
    }
    return { tipo: "comentario", autorUid: alvo.autorUid, postId: grupo.alvoPostId, texto: alvo.texto };
}

// Busca o conteúdo denunciado para pré-visualização (null = não existe mais)
async function carregarAlvo(d) {
    if (d.tipo === "post") {
        const snap = await getDoc(doc(db, "forumPosts", d.alvoId));
        return snap.exists() ? { tipo: "post", ...snap.data() } : null;
    }
    if (d.tipo === "avaliacao") {
        const snap = await getDoc(doc(db, "avaliacoes", d.alvoId));
        return snap.exists() ? { tipo: "avaliacao", ...snap.data() } : null;
    }
    if (d.tipo === "comentario" && d.alvoPostId) {
        const snap = await getDoc(doc(db, "forumPosts", d.alvoPostId));
        if (!snap.exists()) return null;
        const comentarios = snap.data().comentarios || [];
        const i = indiceComentario(comentarios, d.alvoId);
        return i >= 0 ? { tipo: "comentario", ...comentarios[i], postConteudo: snap.data().conteudo } : null;
    }
    return null;
}

function Previa({ grupo }) {
    const { t, formatarDataHora } = useI18n();
    const { alvo, tipo } = grupo;
    if (alvo === undefined) return <p className="text-gray-600 text-sm">{t("admin.denuncias.carregandoConteudo")}</p>;
    if (alvo === null) {
        return <p className="text-gray-500 text-sm italic">{t("admin.denuncias.naoEncontrado")}</p>;
    }
    if (tipo === "post") {
        return (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">
                    {alvo.autor?.nome} ({alvo.autor?.email}) · {formatarDataHora(alvo.criadoEm)}
                    {alvo.moderado && <span className="ml-2"><Selo cor="amarelo">{t("admin.ocultoSelo")}</Selo></span>}
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">{alvo.conteudo}</p>
                {alvo.mediaUrl && alvo.mediaType === "image" && (
                    <img src={alvo.mediaUrl} alt={t("admin.imagemPostDe", { nome: alvo.autor?.nome || t("admin.usuarioMinusculo") })} className="mt-2 max-h-40 rounded-lg border border-gray-200" />
                )}
                {alvo.mediaUrl && alvo.mediaType === "video" && (
                    <video src={alvo.mediaUrl} controls className="mt-2 max-h-40 rounded-lg" />
                )}
            </div>
        );
    }
    if (tipo === "comentario") {
        return (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-sm text-gray-500 mb-1">
                    {t("admin.denuncias.comentarioDe", { nome: alvo.autorNome, data: formatarDataHora(alvo.criadoEm) })}
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">{alvo.texto}</p>
                {alvo.postConteudo && (
                    <p className="text-xs text-gray-600 mt-2 truncate">{t("admin.denuncias.noPost", { conteudo: alvo.postConteudo })}</p>
                )}
            </div>
        );
    }
    return (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">
                {t("admin.denuncias.notaData", { usuario: alvo.usuario, nota: alvo.nota, data: formatarDataHora(alvo.criadoEm) })}
                {alvo.moderado && <span className="ml-2"><Selo cor="amarelo">{t("admin.ocultaSelo")}</Selo></span>}
            </div>
            {alvo.titulo && <p className="font-semibold text-gray-900">{alvo.titulo}</p>}
            {alvo.comentario && <p className="text-gray-800 whitespace-pre-wrap">{alvo.comentario}</p>}
            {alvo.eventoId && (
                <Link href={`/evento/${alvo.eventoId}/detalhes`} className="text-xs text-blue-600 hover:underline">
                    {t("admin.denuncias.verEvento")}
                </Link>
            )}
        </div>
    );
}

export default function AbaDenuncias({ user }) {
    const { t, formatarDataHora } = useI18n();
    const [status, setStatus] = useState("aberta");
    const [grupos, setGrupos] = useState(null);
    const [erro, setErro] = useState("");
    const [ocupado, setOcupado] = useState(null);

    const carregar = useCallback(async () => {
        setErro("");
        setGrupos(null);
        try {
            const lista = await carregarDenuncias({ status, maximo: 300 });
            const mapa = new Map();
            lista.forEach(d => {
                const k = chaveGrupo(d);
                if (!mapa.has(k)) {
                    mapa.set(k, { chave: k, tipo: d.tipo, alvoId: d.alvoId, alvoPostId: d.alvoPostId, denuncias: [], alvo: undefined });
                }
                mapa.get(k).denuncias.push(d);
            });
            const lista2 = Array.from(mapa.values());
            setGrupos(lista2);
            const alvos = await Promise.all(lista2.map(g => carregarAlvo(g).catch(() => null)));
            setGrupos(lista2.map((g, i) => ({ ...g, alvo: alvos[i] })));
        } catch (err) {
            console.error("Erro ao carregar denúncias:", err);
            setErro(mensagemErro(err, t));
            setGrupos([]);
        }
    }, [status, t]);

    useEffect(() => { carregar(); }, [carregar]);

    async function executar(grupo, acao) {
        const ids = grupo.denuncias.filter(d => d.status === "aberta").map(d => d.id);
        if (!confirm(t(`admin.denuncias.confirmar.${acao}`))) return;

        setOcupado(grupo.chave);
        setErro("");
        try {
            const colecao = grupo.tipo === "avaliacao" ? "avaliacoes" : "forumPosts";
            if (acao === "ocultar") {
                await updateDoc(doc(db, colecao, grupo.alvoId), {
                    moderado: true,
                    moderadoPor: user.email,
                    moderadoEm: serverTimestamp()
                });
            } else if (acao === "excluir") {
                await deleteDoc(doc(db, colecao, grupo.alvoId));
            } else if (acao === "remover") {
                // Lê a versão atual do post e grava a lista sem o comentário
                const ref = doc(db, "forumPosts", grupo.alvoPostId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const comentarios = snap.data().comentarios || [];
                    const filtrados = comentarios.filter((c, i) => chaveComentario(c, i) !== grupo.alvoId);
                    if (filtrados.length !== comentarios.length) {
                        await updateDoc(ref, { comentarios: filtrados, totalComentarios: filtrados.length });
                    }
                }
            }
            await fecharDenuncias(ids, acao === "descartar" ? "descartada" : "resolvida", user.email);
            if (["ocultar", "excluir", "remover"].includes(acao)) {
                notificarModeracao(user, alvoParaNotificar(grupo), acao === "ocultar" ? "ocultado" : "removido");
            }
            await carregar();
        } catch (err) {
            console.error("Erro na ação de moderação:", err);
            setErro(mensagemErro(err, t));
        }
        setOcupado(null);
    }

    return (
        <div>
            <Filtros opcoes={FILTROS.map(f => ({ ...f, rotulo: t(f.chave) }))} valor={status} onChange={setStatus} rotulo={t("admin.denuncias.statusRotulo")} />
            <Erro>{erro}</Erro>

            {grupos === null ? (
                <Carregando texto={t("admin.denuncias.carregando")} />
            ) : grupos.length === 0 ? (
                <Vazio>{t("admin.denuncias.nenhuma", { status: t(`admin.denuncias.vaziosStatus.${status}`) })}</Vazio>
            ) : (
                <div className="space-y-4">
                    {grupos.map(g => {
                        const abertas = g.denuncias.filter(d => d.status === "aberta").length;
                        const ocupadoAqui = ocupado === g.chave;
                        return (
                            <Cartao key={g.chave}>
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <Selo cor="azul">{rotuloTipoDenuncia(g.tipo, t)}</Selo>
                                    <Selo cor={abertas ? "vermelho" : "cinza"}>
                                        {t(g.denuncias.length === 1 ? "admin.denuncias.contagemUm" : "admin.denuncias.contagemN", { n: g.denuncias.length })}
                                    </Selo>
                                    <span className="text-xs text-gray-600">{t("admin.denuncias.id", { id: g.alvoId })}</span>
                                </div>

                                <Previa grupo={g} />

                                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                                    {g.denuncias.map(d => (
                                        <li key={d.id}>
                                            <span className="font-semibold">{rotuloMotivo(d.motivo, t)}</span>
                                            <span className="text-gray-600"> · {formatarDataHora(d.criadoEm)}</span>
                                            {d.detalhe && <span className="text-gray-600"> — “{d.detalhe}”</span>}
                                            {d.status !== "aberta" && (
                                                <span className="text-gray-600">{t("admin.denuncias.statusPor", { status: t(`admin.denuncias.statusNomes.${d.status}`), quem: d.resolvidoPor || "?", data: formatarDataHora(d.resolvidoEm) })}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                {abertas > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                                        {g.alvo && g.tipo !== "comentario" && !g.alvo.moderado && (
                                            <Botao cor="amarelo" disabled={ocupadoAqui} onClick={() => executar(g, "ocultar")}>
                                                {t("admin.denuncias.ocultarConteudo")}
                                            </Botao>
                                        )}
                                        {g.alvo && g.tipo !== "comentario" && (
                                            <Botao cor="vermelho" disabled={ocupadoAqui} onClick={() => executar(g, "excluir")}>
                                                {t("admin.denuncias.excluirConteudo")}
                                            </Botao>
                                        )}
                                        {g.alvo && g.tipo === "comentario" && (
                                            <Botao cor="vermelho" disabled={ocupadoAqui} onClick={() => executar(g, "remover")}>
                                                {t("admin.denuncias.removerComentario")}
                                            </Botao>
                                        )}
                                        {(!g.alvo || g.alvo.moderado) && (
                                            <Botao cor="verde" disabled={ocupadoAqui} onClick={() => executar(g, "resolver")}>
                                                {t("admin.denuncias.marcarResolvida")}
                                            </Botao>
                                        )}
                                        <Botao cor="cinza" disabled={ocupadoAqui} onClick={() => executar(g, "descartar")}>
                                            {t("admin.denuncias.descartar")}
                                        </Botao>
                                    </div>
                                )}
                            </Cartao>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
