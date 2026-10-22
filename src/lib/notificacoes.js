// Notificações (curtidas, comentários, respostas e moderação).
//
// Coleção "notificacoes" (regras em firestore.rules, bloco /notificacoes):
// { destinatarioUid, tipo: 'curtida' | 'comentario' | 'resposta' | 'moderacao',
//   autorUid (quem causou), autorNome, postId, avaliacaoId,
//   alvoTipo: 'post' | 'comentario' | 'avaliacao' (moderação),
//   acao: 'ocultado' | 'restaurado' | 'removido' (moderação),
//   trecho (até 140), lida, criadoEm (serverTimestamp) }
//
// As regras só aceitam notificações que correspondem a uma ação real:
//  - curtida: id `curtida_${postId}_${uid}` e o post já contém a curtida
//    (a mesma curtida não notifica de novo ao descurtir e curtir);
//  - comentario/resposta: gravadas no MESMO batch que acrescenta o comentário
//    (as regras comparam o post antes e depois com get/getAfter);
//  - moderacao: só moderadores.
// Ninguém notifica a si mesmo.

import { db } from "../firebase";
import {
    collection,
    doc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    arrayUnion,
    serverTimestamp
} from "firebase/firestore";

export const LIMITE_TRECHO = 140;
const LIMITE_LISTA = 50;

function trecho(texto) {
    const limpo = String(texto || "").replace(/\s+/g, " ").trim();
    return limpo.length > LIMITE_TRECHO ? `${limpo.slice(0, LIMITE_TRECHO - 1)}…` : limpo;
}

function nomeDe(user) {
    return String(user.displayName || user.email || "").slice(0, 100);
}

function base(user, destinatarioUid, tipo, extras) {
    return {
        destinatarioUid,
        tipo,
        autorUid: user.uid,
        autorNome: nomeDe(user),
        ...extras,
        lida: false,
        criadoEm: serverTimestamp()
    };
}

// Quem deve ser avisado de um comentário novo (função pura, sem Firestore).
// `pai`: comentário de primeiro nível respondido (ou null). A chave da
// resposta (`respostaA`) começa pelo uid do autor do pai, e é isso que as
// regras conferem; se não começar (chave antiga por índice), não notifica.
export function notificacoesDoComentario(user, post, comentario, pai = null) {
    const lista = [];
    const autorPost = post?.autor?.uid;
    const autorPai = pai?.autorUid;
    const extras = { postId: post.id, trecho: trecho(comentario.texto) };

    if (comentario.respostaA && autorPai && autorPai !== user.uid
        && comentario.respostaA.startsWith(`${autorPai}-`)) {
        lista.push(base(user, autorPai, "resposta", extras));
    }
    if (autorPost && autorPost !== user.uid && autorPost !== autorPai) {
        lista.push(base(user, autorPost, "comentario", extras));
    }
    return lista;
}

// Acrescenta o comentário ao post e cria as notificações no mesmo batch
export async function comentarENotificar(user, post, comentario, pai = null) {
    const batch = writeBatch(db);
    batch.update(doc(db, "forumPosts", post.id), { comentarios: arrayUnion(comentario) });
    notificacoesDoComentario(user, post, comentario, pai).forEach(dados => {
        batch.set(doc(collection(db, "notificacoes")), dados);
    });
    await batch.commit();
}

// Depois de curtir. Falhas não atrapalham a curtida (ex.: já notificado).
export async function notificarCurtida(user, post) {
    const destinatario = post?.autor?.uid;
    if (!destinatario || destinatario === user.uid) return;
    try {
        await setDoc(
            doc(db, "notificacoes", `curtida_${post.id}_${user.uid}`),
            base(user, destinatario, "curtida", { postId: post.id, trecho: trecho(post.conteudo) })
        );
    } catch (err) {
        if (err?.code !== "permission-denied") console.error("Erro ao notificar curtida:", err);
    }
}

// Moderadores: avisa o autor de um conteúdo ocultado, restaurado ou removido.
// alvo: { tipo: 'post' | 'comentario' | 'avaliacao', autorUid, postId?, avaliacaoId?, texto? }
// O nome do moderador não é gravado: a notificação aparece como "Moderação".
export async function notificarModeracao(moderador, alvo, acao) {
    if (!alvo?.autorUid || alvo.autorUid === moderador.uid) return;
    const dados = {
        destinatarioUid: alvo.autorUid,
        tipo: "moderacao",
        autorUid: moderador.uid,
        alvoTipo: alvo.tipo,
        acao,
        trecho: trecho(alvo.texto),
        lida: false,
        criadoEm: serverTimestamp()
    };
    if (alvo.postId) dados.postId = alvo.postId;
    if (alvo.avaliacaoId) dados.avaliacaoId = alvo.avaliacaoId;
    try {
        await setDoc(doc(collection(db, "notificacoes")), dados);
    } catch (err) {
        console.error("Erro ao notificar moderação:", err);
    }
}

// Últimas notificações do usuário, em tempo real. Devolve a função de cancelar.
export function ouvirNotificacoes(uid, aoMudar, aoFalhar) {
    const q = query(
        collection(db, "notificacoes"),
        where("destinatarioUid", "==", uid),
        orderBy("criadoEm", "desc"),
        limit(LIMITE_LISTA)
    );
    return onSnapshot(
        q,
        snap => aoMudar(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => {
            console.error("Erro ao carregar notificações:", err);
            aoFalhar?.(err);
        }
    );
}

export function marcarLida(id) {
    return updateDoc(doc(db, "notificacoes", id), { lida: true });
}

export async function marcarTodasLidas(notificacoes) {
    const pendentes = notificacoes.filter(n => !n.lida);
    if (pendentes.length === 0) return;
    const batch = writeBatch(db);
    pendentes.forEach(n => batch.update(doc(db, "notificacoes", n.id), { lida: true }));
    await batch.commit();
}

export function excluirNotificacao(id) {
    return deleteDoc(doc(db, "notificacoes", id));
}

// Link do conteúdo relacionado (ou null)
export function linkDaNotificacao(n) {
    if (n.postId && !(n.tipo === "moderacao" && n.acao === "removido" && n.alvoTipo === "post")) {
        return `/forum#${n.postId}`;
    }
    return null;
}
