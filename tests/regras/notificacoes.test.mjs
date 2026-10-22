import { describe, it, before, beforeEach } from "node:test";
import {
    doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, orderBy, getDocs,
    writeBatch, arrayUnion, serverTimestamp, runTransaction
} from "firebase/firestore";
import { criarAmbiente, assertSucceeds, assertFails } from "./ambiente.mjs";

const { env, usuario, moderador, semear } = await criarAmbiente();

const ana = () => usuario("ana").firestore();    // autora do post p1
const bia = () => usuario("bia").firestore();    // comenta / curte
const caio = () => usuario("caio").firestore();  // autor do primeiro comentário

const CHAVE_CAIO = `caio-${Date.parse("2026-10-01T10:00:00.000Z")}`;

const notif = (dest, tipo, extra = {}) => ({
    destinatarioUid: dest, tipo, autorUid: "bia", autorNome: "Bia", postId: "p1", trecho: "oi",
    lida: false, criadoEm: serverTimestamp(), ...extra
});
const comentario = (extra = {}) => ({
    autorUid: "bia", autorNome: "Bia", texto: "oi", criadoEm: new Date().toISOString(), ...extra
});

const semente = async () => {
    await env.clearFirestore();
    await semear((db) => setDoc(doc(db, "forumPosts", "p1"), {
        conteudo: "post da ana", autor: { uid: "ana", nome: "Ana" }, curtidas: [], moderado: false,
        comentarios: [{ autorUid: "caio", autorNome: "Caio", texto: "primeiro", criadoEm: "2026-10-01T10:00:00.000Z" }]
    }));
};

// Comentário e notificações no mesmo batch, como em comentarENotificar()
function comentarComNotificacoes(db, comentarioNovo, notificacoes) {
    const b = writeBatch(db);
    b.update(doc(db, "forumPosts", "p1"), { comentarios: arrayUnion(comentarioNovo) });
    notificacoes.forEach((n) => b.set(doc(collection(db, "notificacoes")), n));
    return b.commit();
}

describe("notificações de comentário", () => {
    beforeEach(semente);

    it("comentário + aviso à autora do post", () =>
        assertSucceeds(comentarComNotificacoes(bia(), comentario(), [notif("ana", "comentario")])));

    it("resposta + avisos ao respondido e à autora do post", () =>
        assertSucceeds(comentarComNotificacoes(bia(), comentario({ respostaA: CHAVE_CAIO }),
            [notif("caio", "resposta"), notif("ana", "comentario")])));

    it("transação com contadores, como em comentarENotificar()", () => {
        const db = bia();
        return assertSucceeds(runTransaction(db, async (tx) => {
            const ref = doc(db, "forumPosts", "p1");
            const atual = (await tx.get(ref)).data();
            const comentarios = [...atual.comentarios, comentario({ respostaA: CHAVE_CAIO })];
            tx.update(ref, { comentarios, totalCurtidas: atual.curtidas.length, totalComentarios: comentarios.length });
            tx.set(doc(collection(db, "notificacoes")), notif("caio", "resposta"));
            tx.set(doc(collection(db, "notificacoes")), notif("ana", "comentario"));
        }));
    });

    it("notificação sem comentário (forjada) negada", () =>
        assertFails(setDoc(doc(collection(bia(), "notificacoes")), notif("ana", "comentario"))));

    it("aviso de comentário a quem não é autor do post negado", () =>
        assertFails(comentarComNotificacoes(bia(), comentario(), [notif("caio", "comentario")])));

    it("aviso de resposta a quem não foi respondido negado", () =>
        assertFails(comentarComNotificacoes(bia(), comentario({ respostaA: CHAVE_CAIO }), [notif("ana", "resposta")])));

    it("notificar a si mesmo negado", () =>
        assertFails(comentarComNotificacoes(ana(), comentario({ autorUid: "ana" }),
            [{ ...notif("ana", "comentario"), autorUid: "ana" }])));

    it("autorUid de outra pessoa negado", () =>
        assertFails(comentarComNotificacoes(bia(), comentario(), [{ ...notif("ana", "comentario"), autorUid: "caio" }])));

    it("campo desconhecido negado", () =>
        assertFails(comentarComNotificacoes(bia(), comentario(), [{ ...notif("ana", "comentario"), extra: 1 }])));

    it("já lida ao nascer negada", () =>
        assertFails(comentarComNotificacoes(bia(), comentario(), [notif("ana", "comentario", { lida: true })])));

    it("trecho com mais de 140 caracteres negado", () =>
        assertFails(comentarComNotificacoes(bia(), comentario(), [notif("ana", "comentario", { trecho: "a".repeat(141) })])));
});

describe("notificações de curtida", () => {
    before(semente);
    const idCurtida = () => doc(bia(), "notificacoes", "curtida_p1_bia");

    it("sem ter curtido, negada", () =>
        assertFails(setDoc(idCurtida(), notif("ana", "curtida"))));

    it("depois de curtir, aceita", async () => {
        await updateDoc(doc(bia(), "forumPosts", "p1"), { curtidas: arrayUnion("bia") });
        await assertSucceeds(setDoc(idCurtida(), notif("ana", "curtida")));
    });

    it("a mesma curtida não notifica de novo", () =>
        assertFails(setDoc(idCurtida(), notif("ana", "curtida"))));

    it("id de outra pessoa negado", () =>
        assertFails(setDoc(doc(bia(), "notificacoes", "curtida_p1_caio"), notif("ana", "curtida"))));

    it("aviso a quem não é autor do post negado", () =>
        assertFails(setDoc(doc(bia(), "notificacoes", "curtida_p1_bia_x"), notif("caio", "curtida"))));
});

describe("notificações de moderação", () => {
    before(semente);
    const notifMod = {
        destinatarioUid: "ana", tipo: "moderacao", autorUid: "mod", alvoTipo: "post", acao: "ocultado",
        postId: "p1", trecho: "x", lida: false, criadoEm: serverTimestamp()
    };

    it("moderador notifica", () =>
        assertSucceeds(setDoc(doc(collection(moderador().firestore(), "notificacoes")), notifMod)));

    it("usuário comum não notifica moderação", () =>
        assertFails(setDoc(doc(collection(bia(), "notificacoes")), { ...notifMod, autorUid: "bia" })));

    it("ação fora da lista negada", () =>
        assertFails(setDoc(doc(collection(moderador().firestore(), "notificacoes")), { ...notifMod, acao: "banido" })));
});

describe("leitura e atualização", () => {
    before(async () => {
        await semente();
        await semear((db) => setDoc(doc(db, "notificacoes", "n1"), { ...notif("ana", "comentario"), criadoEm: new Date() }));
    });

    it("destinatária lista as suas (consulta do sino)", () =>
        assertSucceeds(getDocs(query(collection(ana(), "notificacoes"),
            where("destinatarioUid", "==", "ana"), orderBy("criadoEm", "desc")))));

    it("outra pessoa não lista as da destinatária", () =>
        assertFails(getDocs(query(collection(bia(), "notificacoes"), where("destinatarioUid", "==", "ana")))));

    it("quem causou a notificação não a lê", () =>
        assertFails(getDoc(doc(bia(), "notificacoes", "n1"))));

    it("destinatária marca como lida, mas não altera outros campos", async () => {
        await assertSucceeds(updateDoc(doc(ana(), "notificacoes", "n1"), { lida: true }));
        await assertFails(updateDoc(doc(ana(), "notificacoes", "n1"), { trecho: "editado" }));
    });

    it("outra pessoa não marca como lida nem apaga", async () => {
        await assertFails(updateDoc(doc(caio(), "notificacoes", "n1"), { lida: true }));
        await assertFails(deleteDoc(doc(caio(), "notificacoes", "n1")));
    });

    it("destinatária apaga", () =>
        assertSucceeds(deleteDoc(doc(ana(), "notificacoes", "n1"))));
});
