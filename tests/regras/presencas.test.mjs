// Check-in por QR (docs/checkin-presenca.md): segredo em
// eventos/{eventoId}/privado/checkin e presenças em presencas/{eventoId}_{uid}.
import { describe, it, beforeEach } from "node:test";
import {
    doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where,
    getCountFromServer, serverTimestamp, Timestamp
} from "firebase/firestore";
import { criarAmbiente, assertSucceeds, assertFails } from "./ambiente.mjs";

const { env, usuario, moderador, anonimo, semear } = await criarAmbiente();

const CODIGO = "Abc123Def456Ghi789Jkl012";       // 24 caracteres, como gerarCodigo()
const OUTRO_CODIGO = "Zzz999Yyy888Xxx777Www666";

const uniA = () => usuario("uniA").firestore();       // aprovada, dona de "ev"
const uniB = () => usuario("uniB").firestore();       // aprovada, não é dona
const uniP = () => usuario("uniP").firestore();       // pendente, "dona" de "evp"
const ana = () => usuario("ana").firestore();
const bia = () => usuario("bia").firestore();
const mod = () => moderador().firestore();

const amanha = () => Timestamp.fromMillis(Date.now() + 24 * 3600 * 1000);
const ontem = () => Timestamp.fromMillis(Date.now() - 24 * 3600 * 1000);

const segredo = (extra = {}) => ({
    codigo: CODIGO,
    ativo: true,
    expiraEm: amanha(),
    atualizadoEm: serverTimestamp(),
    ...extra
});

const presenca = (extra = {}) => ({
    eventoId: "ev",
    usuarioId: "ana",
    codigo: CODIGO,
    criadoEm: serverTimestamp(),
    ...extra
});

const evento = (dono) => ({
    nome: "Feira", descricao: "", data: "2026-11-10", local: "Campus", publicoAlvo: "Todos",
    preco: 0, tema: "Cultura", tipo: "Festival", universidadeUid: dono, criadoEm: new Date("2026-10-01")
});

const checkinRef = (db, eventoId = "ev") => doc(db, "eventos", eventoId, "privado", "checkin");

async function semearSegredo(extra = {}, eventoId = "ev") {
    await semear((db) => setDoc(checkinRef(db, eventoId), { ...segredo(extra), atualizadoEm: new Date() }));
}

beforeEach(async () => {
    await env.clearFirestore();
    await semear(async (db) => {
        await setDoc(doc(db, "universidades", "uniA"), { status: "aprovado", universidadeId: "ufsc" });
        await setDoc(doc(db, "universidades", "uniB"), { status: "aprovado", universidadeId: "ufpr" });
        await setDoc(doc(db, "universidades", "uniP"), { status: "pendente", universidadeId: "ufrgs" });
        await setDoc(doc(db, "eventos", "ev"), evento("uniA"));
        await setDoc(doc(db, "eventos", "ev2"), evento("uniA"));
        await setDoc(doc(db, "eventos", "evp"), evento("uniP"));
    });
});

describe("eventos/{id}/privado/checkin (segredo)", () => {
    it("dona cria, lê, atualiza e apaga", async () => {
        await assertSucceeds(setDoc(checkinRef(uniA()), segredo()));
        await assertSucceeds(getDoc(checkinRef(uniA())));
        await assertSucceeds(updateDoc(checkinRef(uniA()), { codigo: OUTRO_CODIGO, atualizadoEm: serverTimestamp() }));
        await assertSucceeds(updateDoc(checkinRef(uniA()), { ativo: false, atualizadoEm: serverTimestamp() }));
        await assertSucceeds(deleteDoc(checkinRef(uniA())));
    });

    it("leitura do segredo inexistente pela dona (obterCheckin antes de ativar)", () =>
        assertSucceeds(getDoc(checkinRef(uniA()))));

    it("participante, outra universidade e anônimo não leem o código", async () => {
        await semearSegredo();
        await assertFails(getDoc(checkinRef(ana())));
        await assertFails(getDoc(checkinRef(uniB())));
        await assertFails(getDoc(checkinRef(anonimo().firestore())));
    });

    it("participante e outra universidade não gravam nem apagam", async () => {
        await assertFails(setDoc(checkinRef(ana()), segredo()));
        await assertFails(setDoc(checkinRef(uniB()), segredo()));
        await semearSegredo();
        await assertFails(updateDoc(checkinRef(ana()), { codigo: OUTRO_CODIGO, atualizadoEm: serverTimestamp() }));
        await assertFails(deleteDoc(checkinRef(uniB())));
    });

    it("universidade pendente não gerencia o check-in do próprio evento", async () => {
        await assertFails(setDoc(checkinRef(uniP(), "evp"), segredo()));
        await assertFails(getDoc(checkinRef(uniP(), "evp")));
    });

    it("evento inexistente: universidade não cria segredo", () =>
        assertFails(setDoc(checkinRef(uniA(), "naoexiste"), segredo())));

    it("moderador lê, grava e apaga", async () => {
        await assertSucceeds(setDoc(checkinRef(mod()), segredo()));
        await assertSucceeds(getDoc(checkinRef(mod())));
        await assertSucceeds(deleteDoc(checkinRef(mod())));
    });

    it("só o documento 'checkin' existe em privado", () =>
        assertFails(setDoc(doc(uniA(), "eventos", "ev", "privado", "outro"), segredo())));

    it("código fora do formato negado", async () => {
        for (const codigo of ["curto", "a".repeat(65), "Abc123Def456Ghi7-_", 12345678901234567890]) {
            await assertFails(setDoc(checkinRef(uniA()), segredo({ codigo })));
        }
    });

    it("campos com tipo errado, faltando ou a mais negados", async () => {
        await assertFails(setDoc(checkinRef(uniA()), segredo({ ativo: "sim" })));
        await assertFails(setDoc(checkinRef(uniA()), segredo({ expiraEm: "2026-12-01" })));
        await assertFails(setDoc(checkinRef(uniA()), segredo({ extra: 1 })));
        const { expiraEm, ...semValidade } = segredo();
        await assertFails(setDoc(checkinRef(uniA()), semValidade));
    });

    it("atualizadoEm forjado negado", async () => {
        await assertFails(setDoc(checkinRef(uniA()), segredo({ atualizadoEm: new Date("2020-01-01") })));
        await semearSegredo();
        await assertFails(updateDoc(checkinRef(uniA()), { ativo: false }));
    });
});

describe("presencas", () => {
    const presencaRef = (db, id = "ev_ana") => doc(db, "presencas", id);

    it("participante faz check-in com o código vigente", async () => {
        await semearSegredo();
        await assertSucceeds(setDoc(presencaRef(ana()), presenca()));
    });

    // Contas institucionais não fazem check-in (nem no próprio evento)
    for (const [nome, uid, db] of [["dona do evento", "uniA", uniA], ["outra universidade", "uniB", uniB], ["universidade pendente", "uniP", uniP]]) {
        it(`conta institucional (${nome}) não faz check-in`, async () => {
            await semearSegredo();
            await assertFails(setDoc(presencaRef(db(), `ev_${uid}`), presenca({ usuarioId: uid })));
        });
    }

    it("anônimo não faz check-in", async () => {
        await semearSegredo();
        await assertFails(setDoc(presencaRef(anonimo().firestore()), presenca()));
    });

    it("código errado negado", async () => {
        await semearSegredo();
        await assertFails(setDoc(presencaRef(ana()), presenca({ codigo: OUTRO_CODIGO })));
    });

    it("código antigo deixa de valer depois de gerar outro", async () => {
        await semearSegredo({ codigo: OUTRO_CODIGO });
        await assertFails(setDoc(presencaRef(ana()), presenca()));
    });

    it("check-in desativado negado", async () => {
        await semearSegredo({ ativo: false });
        await assertFails(setDoc(presencaRef(ana()), presenca()));
    });

    it("check-in expirado negado", async () => {
        await semearSegredo({ expiraEm: ontem() });
        await assertFails(setDoc(presencaRef(ana()), presenca()));
    });

    it("evento sem check-in configurado negado", () =>
        assertFails(setDoc(presencaRef(ana()), presenca())));

    it("código de um evento não vale para outro", async () => {
        await semearSegredo();
        await semearSegredo({ codigo: OUTRO_CODIGO }, "ev2");
        await assertFails(setDoc(presencaRef(ana(), "ev2_ana"), presenca({ eventoId: "ev2" })));
    });

    it("não registra presença em nome de outra pessoa", async () => {
        await semearSegredo();
        await assertFails(setDoc(presencaRef(bia(), "ev_ana"), presenca()));
        await assertFails(setDoc(presencaRef(bia(), "ev_bia"), presenca()));
    });

    it("id fora do padrão {eventoId}_{uid} negado", async () => {
        await semearSegredo();
        await assertFails(setDoc(presencaRef(ana(), "qualquer"), presenca()));
        await assertFails(setDoc(presencaRef(ana(), "ev2_ana"), presenca()));
    });

    it("campo a mais ou criadoEm forjado negado", async () => {
        await semearSegredo();
        await assertFails(setDoc(presencaRef(ana()), presenca({ verificadoPor: "uniA" })));
        await assertFails(setDoc(presencaRef(ana()), presenca({ criadoEm: new Date("2026-11-10") })));
    });

    it("segundo check-in (vira update) negado; presença não é editada", async () => {
        await semearSegredo();
        await assertSucceeds(setDoc(presencaRef(ana()), presenca()));
        await assertFails(setDoc(presencaRef(ana()), presenca()));
        await assertFails(updateDoc(presencaRef(ana()), { codigo: OUTRO_CODIGO }));
        await assertFails(updateDoc(presencaRef(mod()), { codigo: OUTRO_CODIGO }));
    });

    describe("leitura e revogação", () => {
        beforeEach(async () => {
            await semear(async (db) => {
                for (const [id, eventoId, usuarioId] of [["ev_ana", "ev", "ana"], ["ev_bia", "ev", "bia"], ["ev2_ana", "ev2", "ana"]]) {
                    await setDoc(doc(db, "presencas", id), { eventoId, usuarioId, codigo: CODIGO, criadoEm: new Date() });
                }
            });
        });

        const doEvento = (db, eventoId = "ev") => query(collection(db, "presencas"), where("eventoId", "==", eventoId));

        it("participante lê a própria presença (temPresenca)", () =>
            assertSucceeds(getDoc(presencaRef(ana()))));

        it("participante consulta se tem presença antes do check-in (documento inexistente)", () =>
            assertSucceeds(getDoc(presencaRef(usuario("caio").firestore(), "ev_caio"))));

        it("participante não lê presença de outra pessoa, nem a inexistente", async () => {
            await assertFails(getDoc(presencaRef(bia(), "ev_ana")));
            await assertFails(getDoc(presencaRef(bia(), "ev_caio")));
            await assertFails(getDoc(presencaRef(anonimo().firestore(), "ev_ana")));
        });

        it("dona do evento lê, lista e conta as presenças do evento", async () => {
            await assertSucceeds(getDoc(presencaRef(uniA(), "ev_bia")));
            const lista = await assertSucceeds(getDocs(doEvento(uniA())));
            if (lista.size !== 2) throw new Error(`esperava 2 presenças, veio ${lista.size}`);
            const contagem = await assertSucceeds(getCountFromServer(doEvento(uniA())));
            if (contagem.data().count !== 2) throw new Error(`esperava contagem 2, veio ${contagem.data().count}`);
        });

        it("outra universidade e participante não listam as presenças do evento", async () => {
            await assertFails(getDocs(doEvento(uniB())));
            await assertFails(getCountFromServer(doEvento(uniB())));
            await assertFails(getDocs(doEvento(ana())));
            await assertFails(getDoc(presencaRef(uniB(), "ev_ana")));
        });

        it("participante lista as próprias presenças", () =>
            assertSucceeds(getDocs(query(collection(ana(), "presencas"), where("usuarioId", "==", "ana")))));

        it("consulta sem filtro negada a não moderadores", async () => {
            await assertFails(getDocs(collection(uniA(), "presencas")));
            await assertSucceeds(getDocs(collection(mod(), "presencas")));
        });

        it("moderador lê e conta", async () => {
            await assertSucceeds(getDoc(presencaRef(mod(), "ev_ana")));
            await assertSucceeds(getCountFromServer(doEvento(mod())));
        });

        it("participante e outra universidade não revogam; dona e moderador revogam", async () => {
            await assertFails(deleteDoc(presencaRef(ana())));
            await assertFails(deleteDoc(presencaRef(uniB(), "ev_ana")));
            await assertSucceeds(deleteDoc(presencaRef(uniA(), "ev_ana")));
            await assertSucceeds(deleteDoc(presencaRef(mod(), "ev_bia")));
        });
    });
});
