import { describe, it, beforeEach } from "node:test";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { criarAmbiente, assertSucceeds, assertFails } from "./ambiente.mjs";

const { env, usuario, moderador, anonimo, semear } = await criarAmbiente();

const uniA = () => usuario("uniA").firestore();       // aprovada, vinculada a "ufsc"
const uniB = () => usuario("uniB").firestore();       // aprovada, vinculada a "ufpr"
const pendente = () => usuario("uniP").firestore();   // ainda não aprovada

const evento = (extra = {}) => ({
    nome: "Feira cultural",
    descricao: "Música e comida",
    data: "2026-11-10",
    local: "Campus",
    publicoAlvo: "Todos",
    preco: 0,
    tema: "Cultura",
    tipo: "Festival",
    universidadeUid: "uniA",
    universidadeId: "ufsc",
    universidadeNome: "UFSC",
    criadoEm: serverTimestamp(),
    ...extra
});

beforeEach(async () => {
    await env.clearFirestore();
    await semear(async (db) => {
        await setDoc(doc(db, "universidades", "uniA"), { status: "aprovado", universidadeId: "ufsc", nome: "UFSC" });
        await setDoc(doc(db, "universidades", "uniB"), { status: "aprovado", universidadeId: "ufpr", nome: "UFPR" });
        await setDoc(doc(db, "universidades", "uniP"), { status: "pendente", universidadeId: "ufrgs", nome: "UFRGS" });
        await setDoc(doc(db, "eventos", "e1"), { ...evento(), criadoEm: new Date("2026-10-01") });
    });
});

describe("universidades", () => {
    it("cadastro do próprio uid como pendente", () =>
        assertSucceeds(setDoc(doc(usuario("nova").firestore(), "universidades", "nova"), { status: "pendente", universidadeId: "ufmg" })));

    it("cadastro já aprovado negado", () =>
        assertFails(setDoc(doc(usuario("nova").firestore(), "universidades", "nova"), { status: "aprovado" })));

    it("cadastro para outro uid negado", () =>
        assertFails(setDoc(doc(usuario("nova").firestore(), "universidades", "outra"), { status: "pendente" })));

    it("dono lê; outro não; moderador sim", async () => {
        await assertSucceeds(getDoc(doc(pendente(), "universidades", "uniP")));
        await assertFails(getDoc(doc(uniA(), "universidades", "uniP")));
        await assertSucceeds(getDoc(doc(moderador().firestore(), "universidades", "uniP")));
    });

    it("dono edita os dados, mas não se aprova nem troca o vínculo", async () => {
        await assertSucceeds(updateDoc(doc(pendente(), "universidades", "uniP"), { nome: "UFRGS!" }));
        await assertFails(updateDoc(doc(pendente(), "universidades", "uniP"), { status: "aprovado" }));
        await assertFails(updateDoc(doc(pendente(), "universidades", "uniP"), { universidadeId: "ufsc" }));
    });

    it("moderador aprova", () =>
        assertSucceeds(updateDoc(doc(moderador().firestore(), "universidades", "uniP"), { status: "aprovado" })));

    it("só moderador apaga", async () => {
        await assertFails(deleteDoc(doc(pendente(), "universidades", "uniP")));
        await assertSucceeds(deleteDoc(doc(moderador().firestore(), "universidades", "uniP")));
    });
});

describe("eventos", () => {
    it("leitura pública", () =>
        assertSucceeds(getDoc(doc(anonimo().firestore(), "eventos", "e1"))));

    it("universidade aprovada cria evento", () =>
        assertSucceeds(setDoc(doc(uniA(), "eventos", "novo"), evento())));

    it("universidade pendente não cria", () =>
        assertFails(setDoc(doc(pendente(), "eventos", "novo"), evento({ universidadeUid: "uniP", universidadeId: "ufrgs" }))));

    it("estudante não cria", () =>
        assertFails(setDoc(doc(usuario("ana").firestore(), "eventos", "novo"), evento({ universidadeUid: "ana" }))));

    it("id numérico (reservado aos eventos legados) negado", () =>
        assertFails(setDoc(doc(uniA(), "eventos", "42"), evento())));

    it("evento em nome de outra universidade negado", () =>
        assertFails(setDoc(doc(uniA(), "eventos", "novo"), evento({ universidadeId: "ufpr" }))));

    it("evento com dono diferente negado", () =>
        assertFails(setDoc(doc(uniA(), "eventos", "novo"), evento({ universidadeUid: "uniB" }))));

    it("data fora do formato AAAA-MM-DD negada", () =>
        assertFails(setDoc(doc(uniA(), "eventos", "novo"), evento({ data: "10/11/2026" }))));

    it("preço negativo negado", () =>
        assertFails(setDoc(doc(uniA(), "eventos", "novo"), evento({ preco: -1 }))));

    it("campo desconhecido negado", () =>
        assertFails(setDoc(doc(uniA(), "eventos", "novo"), evento({ destaque: true }))));

    it("criadoEm forjado negado", () =>
        assertFails(setDoc(doc(uniA(), "eventos", "novo"), evento({ criadoEm: new Date("2020-01-01") }))));

    it("dono edita", () =>
        assertSucceeds(updateDoc(doc(uniA(), "eventos", "e1"), { nome: "Feira", atualizadoEm: serverTimestamp() })));

    it("dono não muda criadoEm nem o dono", async () => {
        await assertFails(updateDoc(doc(uniA(), "eventos", "e1"), { criadoEm: new Date("2020-01-01") }));
        await assertFails(updateDoc(doc(uniA(), "eventos", "e1"), { universidadeUid: "uniB" }));
    });

    it("outra universidade não edita nem apaga", async () => {
        await assertFails(updateDoc(doc(uniB(), "eventos", "e1"), { nome: "Meu" }));
        await assertFails(deleteDoc(doc(uniB(), "eventos", "e1")));
    });

    it("moderador edita e apaga", async () => {
        await assertSucceeds(updateDoc(doc(moderador().firestore(), "eventos", "e1"), { nome: "Corrigido" }));
        await assertSucceeds(deleteDoc(doc(moderador().firestore(), "eventos", "e1")));
    });

    it("dono apaga", () =>
        assertSucceeds(deleteDoc(doc(uniA(), "eventos", "e1"))));
});
