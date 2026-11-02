// Regras de users/{uid}/tokensPush/{token} (src/lib/push.js)
import { describe, it, beforeEach } from "node:test";
import {
    doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, serverTimestamp, Timestamp
} from "firebase/firestore";
import { criarAmbiente, assertSucceeds, assertFails } from "./ambiente.mjs";

const { env, usuario, anonimo, semear } = await criarAmbiente();

const ana = () => usuario("ana").firestore();
const bia = () => usuario("bia").firestore();

const TOKEN = "fcm-token_abc:APA91bHexemplo-1234567890";
const ref = (db, uid = "ana", token = TOKEN) => doc(db, "users", uid, "tokensPush", token);

const novo = (extra = {}) => ({
    token: TOKEN, idioma: "pt-BR", navegador: "Mozilla/5.0",
    criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(), ...extra
});

const semente = async () => {
    await env.clearFirestore();
    await semear((db) => setDoc(ref(db), {
        token: TOKEN, idioma: "pt-BR", navegador: "Mozilla/5.0",
        criadoEm: Timestamp.fromDate(new Date("2026-10-01")), atualizadoEm: Timestamp.fromDate(new Date("2026-10-01"))
    }));
};

describe("tokens de push: criação", () => {
    beforeEach(() => env.clearFirestore());

    it("dono salva o próprio token", () => assertSucceeds(setDoc(ref(ana()), novo())));

    it("sem navegador também vale", () => {
        const { navegador, ...dados } = novo();
        return assertSucceeds(setDoc(ref(ana()), dados));
    });

    it("não grava token na conta de outro usuário", () => assertFails(setDoc(ref(bia()), novo())));

    it("anônimo não grava", () => assertFails(setDoc(ref(anonimo().firestore()), novo())));

    it("campo token diferente do id", () => assertFails(setDoc(ref(ana()), novo({ token: "outro-token-qualquer-123456" }))));

    it("id com caracteres inválidos", () => {
        const id = "token invalido com espaco 1234567890";
        return assertFails(setDoc(ref(ana(), "ana", id), novo({ token: id })));
    });

    it("id curto demais", () => assertFails(setDoc(ref(ana(), "ana", "curto"), novo({ token: "curto" }))));

    it("idioma desconhecido", () => assertFails(setDoc(ref(ana()), novo({ idioma: "es-ES" }))));

    it("navegador longo demais", () => assertFails(setDoc(ref(ana()), novo({ navegador: "x".repeat(201) }))));

    it("campo extra", () => assertFails(setDoc(ref(ana()), novo({ admin: true }))));

    it("sem criadoEm", () => {
        const { criadoEm, ...dados } = novo();
        return assertFails(setDoc(ref(ana()), dados));
    });

    it("datas forjadas", () =>
        assertFails(setDoc(ref(ana()), novo({ criadoEm: Timestamp.fromDate(new Date("2020-01-01")) }))));
});

describe("tokens de push: leitura, renovação e remoção", () => {
    beforeEach(semente);

    it("dono lê o token", () => assertSucceeds(getDoc(ref(ana()))));

    it("dono lista os próprios tokens", () =>
        assertSucceeds(getDocs(collection(ana(), "users", "ana", "tokensPush"))));

    it("outro usuário não lê nem lista", async () => {
        await assertFails(getDoc(ref(bia())));
        await assertFails(getDocs(collection(bia(), "users", "ana", "tokensPush")));
    });

    it("dono renova idioma e atualizadoEm", () =>
        assertSucceeds(updateDoc(ref(ana()), { idioma: "en-US", atualizadoEm: serverTimestamp() })));

    it("renovação sem atualizar atualizadoEm", () => assertFails(updateDoc(ref(ana()), { idioma: "en-US" })));

    it("não muda criadoEm", () =>
        assertFails(updateDoc(ref(ana()), { criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() })));

    it("outro usuário não altera", () =>
        assertFails(updateDoc(ref(bia()), { idioma: "en-US", atualizadoEm: serverTimestamp() })));

    it("dono apaga; outro não", async () => {
        await assertFails(deleteDoc(ref(bia())));
        await assertSucceeds(deleteDoc(ref(ana())));
    });
});
