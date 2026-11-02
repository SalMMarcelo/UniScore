// Regras de catalogoUniversidades (docs/catalogo-universidades.md)
import { describe, it, beforeEach } from "node:test";
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { criarAmbiente, assertSucceeds, assertFails } from "./ambiente.mjs";

const { env, usuario, moderador, anonimo, semear } = await criarAmbiente();

const dona = () => usuario("uniA").firestore();        // aprovada, dona de catalogoUniversidades/uniA
const outra = () => usuario("uniB").firestore();       // aprovada, dona de outra entrada
const revogada = () => usuario("uniR").firestore();    // dona de entrada, mas voltou a 'pendente'
const mod = () => moderador().firestore();

const entrada = (extra = {}) => ({
    nome: "Universidade Teste",
    sigla: null,
    descricao: "",
    imagem: null,
    contaUid: "uniN",
    ativo: true,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
    ...extra
});

const ANTIGO = new Date("2026-01-01");

beforeEach(async () => {
    await env.clearFirestore();
    await semear(async (db) => {
        await setDoc(doc(db, "universidades", "uniA"), { status: "aprovado", universidadeId: "uniA" });
        await setDoc(doc(db, "universidades", "uniB"), { status: "aprovado", universidadeId: "uniB" });
        await setDoc(doc(db, "universidades", "uniR"), { status: "pendente", universidadeId: "uniR" });
        await setDoc(doc(db, "universidades", "uniN"), { status: "pendente", universidadeId: null, nomeUniversidade: "Universidade Teste" });
        for (const uid of ["uniA", "uniB", "uniR"]) {
            await setDoc(doc(db, "catalogoUniversidades", uid), {
                ...entrada({ nome: `Uni ${uid}`, contaUid: uid }), criadoEm: ANTIGO, atualizadoEm: ANTIGO
            });
        }
        await setDoc(doc(db, "catalogoUniversidades", "1"), {
            ...entrada({ nome: "Mackenzie", sigla: "UPM", contaUid: null }), criadoEm: ANTIGO, atualizadoEm: ANTIGO
        });
    });
});

describe("catalogoUniversidades: leitura", () => {
    it("anônimo lê uma entrada", () =>
        assertSucceeds(getDoc(doc(anonimo().firestore(), "catalogoUniversidades", "1"))));

    it("anônimo lista o catálogo", () =>
        assertSucceeds(getDocs(collection(anonimo().firestore(), "catalogoUniversidades"))));
});

describe("catalogoUniversidades: criação", () => {
    it("moderador cria entrada", () =>
        assertSucceeds(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), entrada())));

    it("moderador cria entrada legada (contaUid null)", () =>
        assertSucceeds(setDoc(doc(mod(), "catalogoUniversidades", "2"), entrada({ nome: "USP", sigla: "USP", contaUid: null }))));

    it("universidade aprovada não cria (nem para si)", () =>
        assertFails(setDoc(doc(dona(), "catalogoUniversidades", "nova"), entrada({ contaUid: "uniA" }))));

    it("conta pendente não se publica", () =>
        assertFails(setDoc(doc(usuario("uniN").firestore(), "catalogoUniversidades", "uniN"), entrada())));

    it("anônimo não cria", () =>
        assertFails(setDoc(doc(anonimo().firestore(), "catalogoUniversidades", "x"), entrada())));

    it("campos extras negados", () =>
        assertFails(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), entrada({ status: "aprovado" }))));

    it("campo obrigatório faltando negado", async () => {
        const { ativo, ...semAtivo } = entrada();
        await assertFails(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), semAtivo));
    });

    it("criadoEm forjado negado", () =>
        assertFails(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), entrada({ criadoEm: ANTIGO }))));

    it("atualizadoEm forjado negado", () =>
        assertFails(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), entrada({ atualizadoEm: ANTIGO }))));

    it("tipos e tamanhos inválidos negados", async () => {
        await assertFails(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), entrada({ nome: "" })));
        await assertFails(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), entrada({ nome: "x".repeat(201) })));
        await assertFails(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), entrada({ sigla: "x".repeat(21) })));
        await assertFails(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), entrada({ descricao: "x".repeat(1001) })));
        await assertFails(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), entrada({ imagem: "x".repeat(2049) })));
        await assertFails(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), entrada({ ativo: "sim" })));
        await assertFails(setDoc(doc(mod(), "catalogoUniversidades", "uniN"), entrada({ contaUid: 123 })));
    });
});

describe("catalogoUniversidades: atualização", () => {
    const perfil = { descricao: "Nova descrição", imagem: "https://exemplo.com/logo.png", sigla: "UA", atualizadoEm: serverTimestamp() };

    it("dona aprovada altera descrição, imagem e sigla", () =>
        assertSucceeds(updateDoc(doc(dona(), "catalogoUniversidades", "uniA"), perfil)));

    it("dona não altera o nome", () =>
        assertFails(updateDoc(doc(dona(), "catalogoUniversidades", "uniA"), { nome: "Outro nome", atualizadoEm: serverTimestamp() })));

    it("dona não troca contaUid", () =>
        assertFails(updateDoc(doc(dona(), "catalogoUniversidades", "uniA"), { contaUid: "uniB", atualizadoEm: serverTimestamp() })));

    it("dona não muda ativo", async () => {
        await semear((db) => updateDoc(doc(db, "catalogoUniversidades", "uniA"), { ativo: false }));
        await assertFails(updateDoc(doc(dona(), "catalogoUniversidades", "uniA"), { ativo: true, atualizadoEm: serverTimestamp() }));
    });

    it("dona não altera criadoEm", () =>
        assertFails(updateDoc(doc(dona(), "catalogoUniversidades", "uniA"), { criadoEm: new Date("2020-01-01"), atualizadoEm: serverTimestamp() })));

    it("dona não forja atualizadoEm", () =>
        assertFails(updateDoc(doc(dona(), "catalogoUniversidades", "uniA"), { descricao: "x", atualizadoEm: ANTIGO })));

    it("dona não acrescenta campos extras", () =>
        assertFails(updateDoc(doc(dona(), "catalogoUniversidades", "uniA"), { descricao: "x", pontos: 10, atualizadoEm: serverTimestamp() })));

    it("outra universidade não altera a entrada", () =>
        assertFails(updateDoc(doc(outra(), "catalogoUniversidades", "uniA"), perfil)));

    it("universidade não altera entrada legada (contaUid null)", () =>
        assertFails(updateDoc(doc(dona(), "catalogoUniversidades", "1"), perfil)));

    it("dona revogada (pendente) não altera", () =>
        assertFails(updateDoc(doc(revogada(), "catalogoUniversidades", "uniR"), perfil)));

    it("moderador altera tudo (nome, ativo, contaUid)", () =>
        assertSucceeds(updateDoc(doc(mod(), "catalogoUniversidades", "1"), {
            nome: "Mackenzie!", ativo: false, contaUid: "uniB", atualizadoEm: serverTimestamp()
        })));

    it("moderador não altera criadoEm", () =>
        assertFails(updateDoc(doc(mod(), "catalogoUniversidades", "1"), { criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() })));
});

describe("catalogoUniversidades: exclusão", () => {
    it("dona não apaga", () =>
        assertFails(deleteDoc(doc(dona(), "catalogoUniversidades", "uniA"))));

    it("moderador apaga", () =>
        assertSucceeds(deleteDoc(doc(mod(), "catalogoUniversidades", "uniA"))));
});

describe("aprovação em batch (AbaUniversidades)", () => {
    it("moderador grava o catálogo e aprova a conta juntos", async () => {
        const db = mod();
        const b = writeBatch(db);
        b.set(doc(db, "catalogoUniversidades", "uniN"), entrada());
        b.update(doc(db, "universidades", "uniN"), { status: "aprovado", universidadeId: "uniN" });
        await assertSucceeds(b.commit());
    });

    it("a própria conta não consegue o mesmo batch", async () => {
        const db = usuario("uniN").firestore();
        const b = writeBatch(db);
        b.set(doc(db, "catalogoUniversidades", "uniN"), entrada());
        b.update(doc(db, "universidades", "uniN"), { status: "aprovado", universidadeId: "uniN" });
        await assertFails(b.commit());
    });

    it("revogar: moderador volta a conta a pendente e oculta a entrada", async () => {
        const db = mod();
        const b = writeBatch(db);
        b.update(doc(db, "universidades", "uniA"), { status: "pendente" });
        b.update(doc(db, "catalogoUniversidades", "uniA"), { ativo: false, atualizadoEm: serverTimestamp() });
        await assertSucceeds(b.commit());
    });

    it("eventos da conta aprovada pelo batch usam o novo vínculo", async () => {
        const db = mod();
        const b = writeBatch(db);
        b.set(doc(db, "catalogoUniversidades", "uniN"), entrada());
        b.update(doc(db, "universidades", "uniN"), { status: "aprovado", universidadeId: "uniN" });
        await b.commit();
        const conta = usuario("uniN").firestore();
        await assertSucceeds(setDoc(doc(conta, "eventos", "ev-novo"), {
            nome: "Feira", descricao: "", data: "2026-11-10", local: "Campus", publicoAlvo: "Todos",
            preco: 0, tema: "Cultura", tipo: "Feira", universidadeUid: "uniN", universidadeId: "uniN",
            universidadeNome: "Universidade Teste", criadoEm: serverTimestamp()
        }));
    });

    it("moderador vincula ao catálogo um evento antigo da conta (vincularEventosDaConta)", async () => {
        const evento = {
            nome: "Feira", descricao: "", data: "2026-11-10", local: "Campus", publicoAlvo: "Todos",
            preco: 0, tema: "Cultura", tipo: "Feira", universidadeUid: "uniN", universidadeId: null,
            universidadeNome: "Universidade Teste", criadoEm: ANTIGO
        };
        await semear((db) => setDoc(doc(db, "eventos", "ev-antigo"), evento));
        await assertSucceeds(updateDoc(doc(mod(), "eventos", "ev-antigo"), {
            universidadeId: "uniN", universidadeNome: "Universidade Teste", atualizadoEm: serverTimestamp()
        }));
    });
});
