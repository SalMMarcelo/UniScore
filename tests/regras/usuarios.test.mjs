import { describe, it, beforeEach } from "node:test";
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { criarAmbiente, assertSucceeds, assertFails } from "./ambiente.mjs";

const { env, usuario, semear } = await criarAmbiente();

// As duas coleções seguem as mesmas regras
for (const colecao of ["users", "usuarios"]) {
    describe(`${colecao}`, () => {
        const ana = () => usuario("ana").firestore();
        const perfil = { nome: "Ana", tipoPerfil: "universitario", universidadeId: null };

        beforeEach(async () => {
            await env.clearFirestore();
            await semear((db) => setDoc(doc(db, colecao, "legado"), { nome: "x".repeat(300), pontos: 50 }));
        });

        it("dono cria o próprio perfil", () =>
            assertSucceeds(setDoc(doc(ana(), colecao, "ana"), perfil)));

        it("não cria perfil de outro uid", () =>
            assertFails(setDoc(doc(ana(), colecao, "bia"), perfil)));

        for (const campo of ["pontos", "selos", "estrelas", "papel", "role"]) {
            it(`não grava o campo reservado ${campo}`, () =>
                assertFails(setDoc(doc(ana(), colecao, "ana"), { ...perfil, [campo]: 1 })));
        }

        it("tipoPerfil fora da lista negado", () =>
            assertFails(setDoc(doc(ana(), colecao, "ana"), { ...perfil, tipoPerfil: "admin" })));

        it("nome com mais de 100 caracteres negado", () =>
            assertFails(setDoc(doc(ana(), colecao, "ana"), { ...perfil, nome: "a".repeat(101) })));

        it("universidadeId não-string negado", () =>
            assertFails(setDoc(doc(ana(), colecao, "ana"), { ...perfil, universidadeId: 7 })));

        it("dono não altera os próprios pontos", () => {
            const db = usuario("legado").firestore();
            return assertFails(updateDoc(doc(db, colecao, "legado"), { pontos: 999 }));
        });

        it("documento antigo continua editável (só valida o que mudou)", () => {
            const db = usuario("legado").firestore();
            return assertSucceeds(updateDoc(doc(db, colecao, "legado"), { tipoPerfil: "familiar" }));
        });

        it("outro usuário não lê nem apaga", async () => {
            await assertFails(getDoc(doc(ana(), colecao, "legado")));
            await assertFails(deleteDoc(doc(ana(), colecao, "legado")));
        });

        it("dono lê e apaga", async () => {
            const db = usuario("legado").firestore();
            await assertSucceeds(getDoc(doc(db, colecao, "legado")));
            await assertSucceeds(deleteDoc(doc(db, colecao, "legado")));
        });
    });
}
