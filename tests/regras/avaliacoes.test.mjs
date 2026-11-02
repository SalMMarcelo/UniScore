import { describe, it, beforeEach } from "node:test";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";
import { criarAmbiente, assertSucceeds, assertFails, EMAIL_MODERADOR } from "./ambiente.mjs";

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

    it("conta institucional (aprovada ou pendente) não avalia", async () => {
        await semear(async (db) => {
            await setDoc(doc(db, "universidades", "uniA"), { status: "aprovado", universidadeId: "1" });
            await setDoc(doc(db, "universidades", "uniP"), { status: "pendente" });
        });
        await assertFails(setDoc(doc(usuario("uniA").firestore(), "avaliacoes", "a2"), avaliacao({ usuarioId: "uniA" })));
        await assertFails(setDoc(doc(usuario("uniP").firestore(), "avaliacoes", "a3"), avaliacao({ usuarioId: "uniP" })));
    });

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
        const falso = usuario("falso", { email: EMAIL_MODERADOR, email_verified: false }).firestore();
        return assertFails(updateDoc(doc(falso, "avaliacoes", "a1"), { moderado: true }));
    });

    it("e-mails antigos da lista de moderadores não moderam mais", async () => {
        for (const email of ["admin@uniscore.com", "moderador@uniscore.com"]) {
            const antigo = usuario(email, { email, email_verified: true }).firestore();
            await assertFails(updateDoc(doc(antigo, "avaliacoes", "a1"), { moderado: true }));
        }
    });

    it("outro usuário não apaga; autor e moderador apagam", async () => {
        await assertFails(deleteDoc(doc(bia(), "avaliacoes", "a1")));
        await assertSucceeds(deleteDoc(doc(ana(), "avaliacoes", "a1")));
        await semear((db) => setDoc(doc(db, "avaliacoes", "a1"), avaliacao()));
        await assertSucceeds(deleteDoc(doc(moderador().firestore(), "avaliacoes", "a1")));
    });
});

describe("avaliacoes com presença verificada", () => {
    const ana = () => usuario("ana").firestore();
    const eventoFs = (extra = {}) => ({
        nome: "Feira", descricao: "", data: "2026-11-10", local: "Campus", publicoAlvo: "Todos",
        preco: 0, tema: "Cultura", tipo: "Festival", universidadeUid: "uniA", criadoEm: new Date("2026-10-01"),
        ...extra
    });

    beforeEach(async () => {
        await env.clearFirestore();
        await semear(async (db) => {
            await setDoc(doc(db, "eventos", "livre"), eventoFs());
            await setDoc(doc(db, "eventos", "fechado"), eventoFs({ exigeCheckin: true }));
            await setDoc(doc(db, "eventos", "aberto"), eventoFs({ exigeCheckin: false }));
            await setDoc(doc(db, "presencas", "fechado_ana"), { eventoId: "fechado", usuarioId: "ana", codigo: "x", criadoEm: new Date() });
            await setDoc(doc(db, "presencas", "livre_ana"), { eventoId: "livre", usuarioId: "ana", codigo: "x", criadoEm: new Date() });
            await setDoc(doc(db, "avaliacoes", "v1"), avaliacao({ eventoId: "fechado", presencaVerificada: true }));
            await setDoc(doc(db, "avaliacoes", "v2"), avaliacao({ eventoId: "livre" }));
        });
    });

    it("com presença cria com o selo", () =>
        assertSucceeds(setDoc(doc(ana(), "avaliacoes", "n"), avaliacao({ eventoId: "livre", presencaVerificada: true }))));

    it("sem presença não cria com o selo", () =>
        assertFails(setDoc(doc(usuario("bia").firestore(), "avaliacoes", "n"),
            avaliacao({ usuarioId: "bia", eventoId: "livre", presencaVerificada: true }))));

    it("presença de outra pessoa não vale", async () => {
        await semear((db) => setDoc(doc(db, "presencas", "aberto_bia"), { eventoId: "aberto", usuarioId: "bia", codigo: "x", criadoEm: new Date() }));
        await assertFails(setDoc(doc(ana(), "avaliacoes", "n"), avaliacao({ eventoId: "aberto", presencaVerificada: true })));
    });

    it("presença de outro evento não vale", () =>
        assertFails(setDoc(doc(ana(), "avaliacoes", "n"), avaliacao({ eventoId: "aberto", presencaVerificada: true }))));

    it("selo sem eventoId negado", () => {
        const { eventoId, ...semEvento } = avaliacao({ presencaVerificada: true });
        return assertFails(setDoc(doc(ana(), "avaliacoes", "n"), semEvento));
    });

    it("presencaVerificada que não é booleano negado", () =>
        assertFails(setDoc(doc(ana(), "avaliacoes", "n"), avaliacao({ eventoId: "livre", presencaVerificada: "true" }))));

    it("evento sem exigência: avalia sem o selo (presencaVerificada false ou ausente)", async () => {
        await assertSucceeds(setDoc(doc(ana(), "avaliacoes", "n1"), avaliacao({ eventoId: "aberto", presencaVerificada: false })));
        await assertSucceeds(setDoc(doc(usuario("bia").firestore(), "avaliacoes", "n2"), avaliacao({ usuarioId: "bia", eventoId: "livre" })));
    });

    it("evento com exigeCheckin: sem o selo negado, mesmo tendo presença", async () => {
        await assertFails(setDoc(doc(ana(), "avaliacoes", "n"), avaliacao({ eventoId: "fechado" })));
        await assertFails(setDoc(doc(ana(), "avaliacoes", "n"), avaliacao({ eventoId: "fechado", presencaVerificada: false })));
    });

    it("evento com exigeCheckin: com presença e selo cria", () =>
        assertSucceeds(setDoc(doc(ana(), "avaliacoes", "n"), avaliacao({ eventoId: "fechado", presencaVerificada: true }))));

    it("evento com exigeCheckin: sem presença negado", () =>
        assertFails(setDoc(doc(usuario("bia").firestore(), "avaliacoes", "n"),
            avaliacao({ usuarioId: "bia", eventoId: "fechado", presencaVerificada: true }))));

    it("evento legado (fora do Firestore) continua livre", async () => {
        await assertSucceeds(setDoc(doc(ana(), "avaliacoes", "n1"), avaliacao({ eventoId: "7" })));
        await assertSucceeds(setDoc(doc(ana(), "avaliacoes", "n2"), avaliacao({ eventoId: 7 })));
    });

    it("eventoId com caracteres de caminho negado", () =>
        assertFails(setDoc(doc(ana(), "avaliacoes", "n"), avaliacao({ eventoId: "fechado/privado/checkin" }))));

    it("autor edita a nota sem mexer no selo", () =>
        assertSucceeds(updateDoc(doc(ana(), "avaliacoes", "v1"), { nota: 2 })));

    it("autor não acrescenta, tira nem muda o selo", async () => {
        await assertFails(updateDoc(doc(ana(), "avaliacoes", "v2"), { presencaVerificada: true }));
        await assertFails(updateDoc(doc(ana(), "avaliacoes", "v1"), { presencaVerificada: false }));
        await assertFails(updateDoc(doc(ana(), "avaliacoes", "v1"), { presencaVerificada: deleteField() }));
    });

    it("autor não troca o evento", async () => {
        await assertFails(updateDoc(doc(ana(), "avaliacoes", "v1"), { eventoId: "livre" }));
        await assertFails(updateDoc(doc(ana(), "avaliacoes", "v2"), { eventoId: "fechado" }));
    });

    it("moderador pode corrigir o selo", () =>
        assertSucceeds(updateDoc(doc(moderador().firestore(), "avaliacoes", "v1"), { presencaVerificada: false })));
});
