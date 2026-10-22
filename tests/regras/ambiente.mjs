// Ambiente compartilhado dos testes de regras (firestore.rules e storage.rules).
// Os testes rodam no emulador: `npm run test:rules` (precisa de Java 21+).
// O emulators:exec define FIRESTORE_EMULATOR_HOST e
// FIREBASE_STORAGE_EMULATOR_HOST, que o rules-unit-testing usa.
import { readFileSync } from "node:fs";
import { after } from "node:test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { setLogLevel } from "firebase/firestore";

export { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";

const raiz = new URL("../../", import.meta.url);

// Mantenha sincronizado com isModerator() em firestore.rules
export const EMAIL_MODERADOR = "salmeron.marcelo@gmail.com";

// As negações esperadas viram avisos do SDK; sem isso a saída fica ilegível
setLogLevel("silent");

export async function criarAmbiente() {
    const env = await initializeTestEnvironment({
        projectId: "demo-uniscore",
        firestore: { rules: readFileSync(new URL("firestore.rules", raiz), "utf8") },
        storage: { rules: readFileSync(new URL("storage.rules", raiz), "utf8") }
    });
    after(() => env.cleanup());

    const usuario = (uid, token = {}) => env.authenticatedContext(uid, token);
    return {
        env,
        usuario,
        moderador: () => usuario("mod", { email: EMAIL_MODERADOR, email_verified: true }),
        anonimo: () => env.unauthenticatedContext(),
        // Grava dados iniciais ignorando as regras
        semear: (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()))
    };
}
