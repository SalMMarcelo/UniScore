import { describe, it, beforeEach } from "node:test";
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { criarAmbiente, assertSucceeds, assertFails } from "./ambiente.mjs";

const { env, usuario, moderador, anonimo, semear } = await criarAmbiente();

const avaliacao = (extra = {}) => ({
    usuarioId: "ana",
    eventoId: "e1",
    nota: 4,
    titulo: "Bom",
    comentario: "Gostei",
    criterios: { acessibilidade: 5, conforto: null, interculturalidade: 3, politizacao: 2, impacto: 4 },
    intercultural: { conexaoIntercultural: 4 },
    ...extra
});

describe("avaliacoes", () => {
    const ana = () => usuario("ana").firestore();
    const bia = () => usuario("bia").firestore();

    beforeEach(async () => {
        await env.clearFirestore();
        await semear((db) => setDoc(doc(db, "avaliacoes", "a1"), avaliacao()));
    });

    it("leitura pública", () =>
        assertSucceeds(getDoc(doc(anonimo().firestore(), "avaliacoes", "a1"))));

    it("autor cria avaliação válida", () =>
        assertSucceeds(setDoc(doc(ana(), "avaliacoes", "a2"), avaliacao())));

    it("anônimo não cria", () =>
        assertFails(setDoc(doc(anonimo().firestore(), "avaliacoes", "a2"), avaliacao())));

    it("não cria em nome de outro usuário", () =>
        assertFails(setDoc(doc(bia(), "avaliacoes", "a2"), avaliacao())));

    for (const nota of [0, 6, 3.5, "4"]) {
        it(`nota ${JSON.stringify(nota)} negada`, () =>
            assertFails(setDoc(doc(ana(), "avaliacoes", "a2"), avaliacao({ nota }))));
    }

    it("critério fora de 1 a 5 negado", () =>
        assertFails(setDoc(doc(ana(), "avaliacoes", "a2"), avaliacao({ criterios: { conforto: 6 } }))));

    it("critério desconhecido negado", () =>
        assertFails(setDoc(doc(ana(), "avaliacoes", "a2"), avaliacao({ criterios: { beleza: 3 } }))));

    it("critério ausente vale como 'não se aplica'", () =>
        assertSucceeds(setDoc(doc(ana(), "avaliacoes", "a2"), avaliacao({ criterios: { conforto: 2 } }))));

    it("comentário com mais de 2000 caracteres negado", () =>
        assertFails(setDoc(doc(ana(), "avaliacoes", "a2"), avaliacao({ comentario: "a".repeat(2001) }))));

    it("autor edita a própria avaliação", () =>
        assertSucceeds(updateDoc(doc(ana(), "avaliacoes", "a1"), { nota: 5 })));

    it("autor não transfere a avaliação", () =>
        assertFails(updateDoc(doc(ana(), "avaliacoes", "a1"), { usuarioId: "bia" })));

    it("autor não se modera", () =>
        assertFails(updateDoc(doc(ana(), "avaliacoes", "a1"), { moderado: false, moderadoPor: "ana" })));

    it("outro usuário não edita", () =>
        assertFails(updateDoc(doc(bia(), "avaliacoes", "a1"), { nota: 1 })));

    it("moderador oculta", () =>
        assertSucceeds(updateDoc(doc(moderador().firestore(), "avaliacoes", "a1"), { moderado: true, moderadoPor: "mod" })));

    it("e-mail de moderador sem verificação não modera", () => {
        const falso = usuario("falso", { email: "moderador@uniscore.com", email_verified: false }).firestore();
        return assertFails(updateDoc(doc(falso, "avaliacoes", "a1"), { moderado: true }));
    });

    it("outro usuário não apaga; autor e moderador apagam", async () => {
        await assertFails(deleteDoc(doc(bia(), "avaliacoes", "a1")));
        await assertSucceeds(deleteDoc(doc(ana(), "avaliacoes", "a1")));
        await semear((db) => setDoc(doc(db, "avaliacoes", "a1"), avaliacao()));
        await assertSucceeds(deleteDoc(doc(moderador().firestore(), "avaliacoes", "a1")));
    });
});
