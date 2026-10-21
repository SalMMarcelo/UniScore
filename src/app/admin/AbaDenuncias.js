"use client";
// Aba "Denúncias": revisa as denúncias (RF07) agrupadas por conteúdo.
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import {
    TIPOS_DENUNCIA,
    rotuloMotivo,
    fecharDenuncias,
    indiceComentario,
    chaveComentario
} from "../../lib/denuncias";
import { carregarDenuncias, formatarDataHora } from "./dados";
import { Botao, Selo, Cartao, Carregando, Erro, Vazio, Filtros, mensagemErro } from "./ui";

const FILTROS = [
    { valor: "aberta", rotulo: "Abertas" },
    { valor: "resolvida", rotulo: "Resolvidas" },
    { valor: "descartada", rotulo: "Descartadas" }
];

function chaveGrupo(d) {
    return d.tipo === "comentario" ? `${d.tipo}_${d.alvoPostId}_${d.alvoId}` : `${d.tipo}_${d.alvoId}`;
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
    const { alvo, tipo } = grupo;
    if (alvo === undefined) return <p className="text-gray-600 text-sm">Carregando conteúdo...</p>;
    if (alvo === null) {
        return <p className="text-gray-500 text-sm italic">Conteúdo não encontrado (provavelmente já foi excluído).</p>;
    }
    if (tipo === "post") {
        return (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">
                    {alvo.autor?.nome} ({alvo.autor?.email}) · {formatarDataHora(alvo.criadoEm)}
                    {alvo.moderado && <span className="ml-2"><Selo cor="amarelo">OCULTO</Selo></span>}
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">{alvo.conteudo}</p>
                {alvo.mediaUrl && alvo.mediaType === "image" && (
                    <img src={alvo.mediaUrl} alt={`Imagem do post de ${alvo.autor?.nome || "usuário"}`} className="mt-2 max-h-40 rounded-lg border border-gray-200" />
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
                    Comentário de {alvo.autorNome} · {formatarDataHora(alvo.criadoEm)}
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">{alvo.texto}</p>
                {alvo.postConteudo && (
                    <p className="text-xs text-gray-600 mt-2 truncate">No post: “{alvo.postConteudo}”</p>
                )}
            </div>
        );
    }
    return (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">
                {alvo.usuario} · nota {alvo.nota}/5 · {formatarDataHora(alvo.criadoEm)}
                {alvo.moderado && <span className="ml-2"><Selo cor="amarelo">OCULTA</Selo></span>}
            </div>
            {alvo.titulo && <p className="font-semibold text-gray-900">{alvo.titulo}</p>}
            {alvo.comentario && <p className="text-gray-800 whitespace-pre-wrap">{alvo.comentario}</p>}
            {alvo.eventoId && (
                <Link href={`/evento/${alvo.eventoId}/detalhes`} className="text-xs text-blue-600 hover:underline">
                    Ver evento
                </Link>
            )}
        </div>
    );
}

export default function AbaDenuncias({ user }) {
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
            setErro(mensagemErro(err));
            setGrupos([]);
        }
    }, [status]);

    useEffect(() => { carregar(); }, [carregar]);

    async function executar(grupo, acao) {
        const ids = grupo.denuncias.filter(d => d.status === "aberta").map(d => d.id);
        const mensagens = {
            ocultar: "Ocultar este conteúdo para o público?",
            excluir: "Excluir definitivamente este conteúdo? Esta ação não pode ser desfeita.",
            remover: "Remover este comentário do post? Esta ação não pode ser desfeita.",
            descartar: "Descartar estas denúncias (o conteúdo permanece)?",
            resolver: "Marcar estas denúncias como resolvidas?"
        };
        if (!confirm(mensagens[acao])) return;

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
                        await updateDoc(ref, { comentarios: filtrados });
                    }
                }
            }
            await fecharDenuncias(ids, acao === "descartar" ? "descartada" : "resolvida", user.email);
            await carregar();
        } catch (err) {
            console.error("Erro na ação de moderação:", err);
            setErro(mensagemErro(err));
        }
        setOcupado(null);
    }

    return (
        <div>
            <Filtros opcoes={FILTROS} valor={status} onChange={setStatus} rotulo="Status das denúncias" />
            <Erro>{erro}</Erro>

            {grupos === null ? (
                <Carregando texto="Carregando denúncias..." />
            ) : grupos.length === 0 ? (
                <Vazio>Nenhuma denúncia {FILTROS.find(f => f.valor === status)?.rotulo.toLowerCase()}.</Vazio>
            ) : (
                <div className="space-y-4">
                    {grupos.map(g => {
                        const abertas = g.denuncias.filter(d => d.status === "aberta").length;
                        const ocupadoAqui = ocupado === g.chave;
                        return (
                            <Cartao key={g.chave}>
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <Selo cor="azul">{TIPOS_DENUNCIA[g.tipo] || g.tipo}</Selo>
                                    <Selo cor={abertas ? "vermelho" : "cinza"}>
                                        {g.denuncias.length} {g.denuncias.length === 1 ? "denúncia" : "denúncias"}
                                    </Selo>
                                    <span className="text-xs text-gray-600">id: {g.alvoId}</span>
                                </div>

                                <Previa grupo={g} />

                                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                                    {g.denuncias.map(d => (
                                        <li key={d.id}>
                                            <span className="font-semibold">{rotuloMotivo(d.motivo)}</span>
                                            <span className="text-gray-600"> · {formatarDataHora(d.criadoEm)}</span>
                                            {d.detalhe && <span className="text-gray-600"> — “{d.detalhe}”</span>}
                                            {d.status !== "aberta" && (
                                                <span className="text-gray-600"> · {d.status} por {d.resolvidoPor || "?"} em {formatarDataHora(d.resolvidoEm)}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                {abertas > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                                        {g.alvo && g.tipo !== "comentario" && !g.alvo.moderado && (
                                            <Botao cor="amarelo" disabled={ocupadoAqui} onClick={() => executar(g, "ocultar")}>
                                                Ocultar conteúdo
                                            </Botao>
                                        )}
                                        {g.alvo && g.tipo !== "comentario" && (
                                            <Botao cor="vermelho" disabled={ocupadoAqui} onClick={() => executar(g, "excluir")}>
                                                Excluir conteúdo
                                            </Botao>
                                        )}
                                        {g.alvo && g.tipo === "comentario" && (
                                            <Botao cor="vermelho" disabled={ocupadoAqui} onClick={() => executar(g, "remover")}>
                                                Remover comentário
                                            </Botao>
                                        )}
                                        {(!g.alvo || g.alvo.moderado) && (
                                            <Botao cor="verde" disabled={ocupadoAqui} onClick={() => executar(g, "resolver")}>
                                                Marcar como resolvida
                                            </Botao>
                                        )}
                                        <Botao cor="cinza" disabled={ocupadoAqui} onClick={() => executar(g, "descartar")}>
                                            Descartar denúncia
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
