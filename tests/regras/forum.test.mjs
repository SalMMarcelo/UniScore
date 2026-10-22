import { describe, it, beforeEach } from "node:test";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, runTransaction } from "firebase/firestore";
import { criarAmbiente, assertSucceeds, assertFails } from "./ambiente.mjs";

const { env, usuario, moderador, anonimo, semear } = await criarAmbiente();

const ana = () => usuario("ana").firestore();   // autora do post p1
const bia = () => usuario("bia").firestore();

const post = (extra = {}) => ({
    conteudo: "Olá", autor: { uid: "bia", nome: "Bia" }, curtidas: [], comentarios: [],
    tema: null, criadoEm: serverTimestamp(), moderado: false, ...extra
});
const comentario = (extra = {}) => ({
    autorUid: "bia", autorNome: "Bia", texto: "oi", criadoEm: "2026-10-02T00:00:00.000Z", ...extra
});

beforeEach(async () => {
    await env.clearFirestore();
    await semear((db) => setDoc(doc(db, "forumPosts", "p1"), {
        conteudo: "post da ana", autor: { uid: "ana", nome: "Ana" }, curtidas: ["caio"], moderado: false,
        comentarios: [{ autorUid: "caio", autorNome: "Caio", texto: "primeiro", criadoEm: "2026-10-01T10:00:00.000Z" }]
    }));
});

describe("posts", () => {
    it("leitura pública", () =>
        assertSucceeds(getDoc(doc(anonimo().firestore(), "forumPosts", "p1"))));

    it("cria post com e sem tema", async () => {
        await assertSucceeds(setDoc(doc(bia(), "forumPosts", "n1"), post()));
        await assertSucceeds(setDoc(doc(bia(), "forumPosts", "n2"), post({ tema: "Tecnologia" })));
    });

    it("tema com mais de 60 caracteres negado", () =>
        assertFails(setDoc(doc(bia(), "forumPosts", "n1"), post({ tema: "a".repeat(61) }))));

    it("anônimo não publica", () =>
        assertFails(setDoc(doc(anonimo().firestore(), "forumPosts", "n1"), post())));

    it("post em nome de outra pessoa negado", () =>
        assertFails(setDoc(doc(bia(), "forumPosts", "n1"), post({ autor: { uid: "ana" } }))));

    it("post não nasce com curtidas, comentários ou moderado", async () => {
        await assertFails(setDoc(doc(bia(), "forumPosts", "n1"), post({ curtidas: ["bia"] })));
        await assertFails(setDoc(doc(bia(), "forumPosts", "n1"), post({ comentarios: [comentario()] })));
        await assertFails(setDoc(doc(bia(), "forumPosts", "n1"), post({ moderado: true })));
    });

    it("autora edita conteúdo e tema", () =>
        assertSucceeds(updateDoc(doc(ana(), "forumPosts", "p1"), { conteudo: "editado", tema: "Cultura" })));

    it("autora não troca o autor nem se modera", async () => {
        await assertFails(updateDoc(doc(ana(), "forumPosts", "p1"), { autor: { uid: "bia" } }));
        await assertFails(updateDoc(doc(ana(), "forumPosts", "p1"), { moderado: true }));
    });

    it("autora não forja curtidas", () =>
        assertFails(updateDoc(doc(ana(), "forumPosts", "p1"), { curtidas: ["caio", "x", "y"] })));

    it("outra pessoa não edita o conteúdo", () =>
        assertFails(updateDoc(doc(bia(), "forumPosts", "p1"), { conteudo: "hack" })));

    it("moderador oculta", () =>
        assertSucceeds(updateDoc(doc(moderador().firestore(), "forumPosts", "p1"), { moderado: true, moderadoPor: "mod" })));

    it("outra pessoa não apaga; autora apaga", async () => {
        await assertFails(deleteDoc(doc(bia(), "forumPosts", "p1")));
        await assertSucceeds(deleteDoc(doc(ana(), "forumPosts", "p1")));
    });
});

describe("curtidas", () => {
    it("curte e descurte com o próprio uid", async () => {
        await assertSucceeds(updateDoc(doc(bia(), "forumPosts", "p1"), { curtidas: arrayUnion("bia") }));
        await assertSucceeds(updateDoc(doc(bia(), "forumPosts", "p1"), { curtidas: arrayRemove("bia") }));
    });

    it("não curte em nome de outra pessoa", () =>
        assertFails(updateDoc(doc(bia(), "forumPosts", "p1"), { curtidas: arrayUnion("dani") })));

    it("não remove a curtida de outra pessoa", () =>
        assertFails(updateDoc(doc(bia(), "forumPosts", "p1"), { curtidas: arrayRemove("caio") })));
});

describe("comentários", () => {
    it("acrescenta um comentário próprio", () =>
        assertSucceeds(updateDoc(doc(bia(), "forumPosts", "p1"), { comentarios: arrayUnion(comentario()) })));

    it("acrescenta uma resposta", () =>
        assertSucceeds(updateDoc(doc(bia(), "forumPosts", "p1"), {
            comentarios: arrayUnion(comentario({ respostaA: `caio-${Date.parse("2026-10-01T10:00:00.000Z")}` }))
        })));

    it("comentário em nome de outra pessoa negado", () =>
        assertFails(updateDoc(doc(bia(), "forumPosts", "p1"), { comentarios: arrayUnion(comentario({ autorUid: "ana" })) })));

    it("apagar comentários existentes negado", () =>
        assertFails(updateDoc(doc(bia(), "forumPosts", "p1"), { comentarios: [comentario()] })));

    it("dois comentários de uma vez negado", () =>
        assertFails(updateDoc(doc(bia(), "forumPosts", "p1"), {
            comentarios: arrayUnion(comentario(), comentario({ criadoEm: "outro" }))
        })));

    it("texto com mais de 280 caracteres negado", () =>
        assertFails(updateDoc(doc(bia(), "forumPosts", "p1"), { comentarios: arrayUnion(comentario({ texto: "a".repeat(281) })) })));

    it("respostaA que não é texto negada", () =>
        assertFails(updateDoc(doc(bia(), "forumPosts", "p1"), { comentarios: arrayUnion(comentario({ respostaA: 5 })) })));

    it("anônimo não comenta", () =>
        assertFails(updateDoc(doc(anonimo().firestore(), "forumPosts", "p1"), { comentarios: arrayUnion(comentario()) })));
});

// Contadores usados na ordenação do feed (src/lib/forum.js, contadores())
describe("contadores", () => {
    // Como o fórum grava: transação que relê o post e grava lista + contadores
    const interagir = (db, alterar) => runTransaction(db, async (tx) => {
        const ref = doc(db, "forumPosts", "p1");
        const atual = (await tx.get(ref)).data();
        const novo = alterar(atual);
        tx.update(ref, { ...novo, totalCurtidas: (novo.curtidas ?? atual.curtidas).length,
            totalComentarios: (novo.comentarios ?? atual.comentarios).length });
    });

    it("post nasce com contadores zerados", async () => {
        await assertSucceeds(setDoc(doc(bia(), "forumPosts", "n1"), post({ totalCurtidas: 0, totalComentarios: 0 })));
        await assertFails(setDoc(doc(bia(), "forumPosts", "n2"), post({ totalCurtidas: 5 })));
    });

    it("curtir e descurtir gravando os contadores", async () => {
        await assertSucceeds(interagir(bia(), (a) => ({ curtidas: [...a.curtidas, "bia"] })));
        await assertSucceeds(interagir(bia(), (a) => ({ curtidas: a.curtidas.filter((u) => u !== "bia") })));
    });

    it("comentar gravando os contadores", () =>
        assertSucceeds(interagir(bia(), (a) => ({ comentarios: [...a.comentarios, comentario()] }))));

    it("contador inflado negado", async () => {
        await assertFails(updateDoc(doc(bia(), "forumPosts", "p1"), { curtidas: arrayUnion("bia"), totalCurtidas: 50 }));
        await assertFails(updateDoc(doc(bia(), "forumPosts", "p1"), { totalComentarios: 9 }));
    });

    it("autora não altera os contadores do próprio post", () =>
        assertFails(updateDoc(doc(ana(), "forumPosts", "p1"), { conteudo: "x", totalCurtidas: 99 })));

    it("acertar contador antigo para o valor real é permitido", () =>
        assertSucceeds(updateDoc(doc(bia(), "forumPosts", "p1"), { totalCurtidas: 1, totalComentarios: 1 })));

    it("contador errado deixado por outro corrige-se na interação seguinte", async () => {
        await semear((db) => updateDoc(doc(db, "forumPosts", "p1"), { totalCurtidas: 7, totalComentarios: 3 }));
        await assertFails(updateDoc(doc(bia(), "forumPosts", "p1"), { curtidas: arrayUnion("bia") }));
        await assertSucceeds(interagir(bia(), (a) => ({ curtidas: [...a.curtidas, "bia"] })));
    });
});
