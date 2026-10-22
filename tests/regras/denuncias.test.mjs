import { describe, it, beforeEach } from "node:test";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { criarAmbiente, assertSucceeds, assertFails } from "./ambiente.mjs";

const { env, usuario, moderador, semear } = await criarAmbiente();

const bia = () => usuario("bia").firestore();

const denuncia = (extra = {}) => ({
    tipo: "post", alvoId: "p1", motivo: "spam", detalhe: "propaganda",
    denuncianteUid: "bia", criadoEm: serverTimestamp(), status: "aberta", ...extra
});

describe("denuncias", () => {
    beforeEach(async () => {
        await env.clearFirestore();
        await semear(async (db) => {
            await setDoc(doc(db, "forumPosts", "p1"), { conteudo: "x", autor: { uid: "ana" } });
            await setDoc(doc(db, "avaliacoes", "a1"), { usuarioId: "ana", nota: 3 });
        });
    });

    it("denuncia post, avaliação e comentário", async () => {
        await assertSucceeds(setDoc(doc(bia(), "denuncias", "post_p1_bia"), denuncia()));
        await assertSucceeds(setDoc(doc(bia(), "denuncias", "avaliacao_a1_bia"), denuncia({ tipo: "avaliacao", alvoId: "a1" })));
        await assertSucceeds(setDoc(doc(bia(), "denuncias", "comentario_caio-123_bia"),
            denuncia({ tipo: "comentario", alvoId: "caio-123", alvoPostId: "p1" })));
    });

    it("a mesma pessoa não denuncia duas vezes", async () => {
        await assertSucceeds(setDoc(doc(bia(), "denuncias", "post_p1_bia"), denuncia()));
        await assertFails(setDoc(doc(bia(), "denuncias", "post_p1_bia"), denuncia()));
    });

    it("id fora do padrão negado", () =>
        assertFails(setDoc(doc(bia(), "denuncias", "qualquer"), denuncia())));

    it("alvo inexistente negado", () =>
        assertFails(setDoc(doc(bia(), "denuncias", "post_p9_bia"), denuncia({ alvoId: "p9" }))));

    it("comentário sem alvoPostId negado", () =>
        assertFails(setDoc(doc(bia(), "denuncias", "comentario_caio-123_bia"), denuncia({ tipo: "comentario", alvoId: "caio-123" }))));

    it("motivo fora da lista negado", () =>
        assertFails(setDoc(doc(bia(), "denuncias", "post_p1_bia"), denuncia({ motivo: "chato" }))));

    it("status diferente de 'aberta' negado", () =>
        assertFails(setDoc(doc(bia(), "denuncias", "post_p1_bia"), denuncia({ status: "resolvida" }))));

    it("denúncia em nome de outra pessoa negada", () =>
        assertFails(setDoc(doc(bia(), "denuncias", "post_p1_ana"), denuncia({ denuncianteUid: "ana" }))));

    it("detalhe com mais de 500 caracteres negado", () =>
        assertFails(setDoc(doc(bia(), "denuncias", "post_p1_bia"), denuncia({ detalhe: "a".repeat(501) }))));

    it("só moderador lê e resolve", async () => {
        await semear((db) => setDoc(doc(db, "denuncias", "post_p1_bia"), { ...denuncia(), criadoEm: new Date() }));
        await assertFails(getDoc(doc(bia(), "denuncias", "post_p1_bia")));
        await assertSucceeds(getDoc(doc(moderador().firestore(), "denuncias", "post_p1_bia")));
        await assertSucceeds(updateDoc(doc(moderador().firestore(), "denuncias", "post_p1_bia"), { status: "resolvida" }));
    });
});
