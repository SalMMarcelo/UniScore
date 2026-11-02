// npm test (dentro de functions/): textos e envio com Firestore/Messaging falsos
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { montarMensagem, linkDaNotificacao } from "./mensagens.js";
import { enviarPushDaNotificacao } from "./envio.js";

describe("montarMensagem", () => {
    it("curtida em português com trecho", () => {
        const m = montarMensagem({ tipo: "curtida", autorNome: "Ana", postId: "p1", trecho: "oi" }, "pt-BR");
        assert.deepEqual(m, { titulo: "Ana curtiu seu post", corpo: "“oi”", link: "/forum#p1" });
    });

    it("resposta em inglês sem nome nem trecho", () => {
        const m = montarMensagem({ tipo: "resposta", postId: "p1" }, "en-US");
        assert.equal(m.titulo, "Someone replied to your comment");
        assert.equal(m.corpo, "Tap to open UniScore.");
    });

    it("moderação: post removido leva a /notificacoes", () => {
        const n = { tipo: "moderacao", acao: "removido", alvoTipo: "post", postId: "p1" };
        assert.equal(montarMensagem(n).titulo, "A moderação removeu seu post");
        assert.equal(linkDaNotificacao(n), "/notificacoes");
    });

    it("tipo ou idioma desconhecidos usam o genérico em português", () => {
        assert.equal(montarMensagem({ tipo: "x" }, "es-ES").titulo, "Você tem uma notificação nova");
    });
});

function fakes(tokens, respostas) {
    const apagados = [];
    const docs = tokens.map(([id, idioma]) => ({
        id, get: (campo) => (campo === "idioma" ? idioma : undefined),
        ref: { delete: async () => apagados.push(id) }
    }));
    const db = {
        collection: () => ({ doc: () => ({ collection: () => ({ limit: () => ({
            get: async () => ({ empty: docs.length === 0, docs })
        }) }) }) })
    };
    let enviadas = [];
    const messaging = {
        sendEach: async (msgs) => {
            enviadas = msgs;
            return {
                successCount: respostas.filter((r) => r.success).length,
                failureCount: respostas.filter((r) => !r.success).length,
                responses: respostas
            };
        }
    };
    return { db, messaging, apagados, enviadas: () => enviadas };
}

describe("enviarPushDaNotificacao", () => {
    const notificacao = { destinatarioUid: "ana", tipo: "curtida", autorNome: "Bia", postId: "p1" };
    const log = { warn() {} };

    it("envia no idioma de cada token e apaga só os inválidos", async () => {
        const f = fakes([["t1", "pt-BR"], ["t2", "en-US"], ["t3", "pt-BR"]], [
            { success: true },
            { success: false, error: { code: "messaging/registration-token-not-registered" } },
            { success: false, error: { code: "messaging/internal-error" } }
        ]);
        const r = await enviarPushDaNotificacao({ db: f.db, messaging: f.messaging, id: "n1", notificacao, log });
        assert.deepEqual(r, { enviados: 1, falhas: 2, removidos: 1 });
        assert.deepEqual(f.apagados, ["t2"]);
        assert.equal(f.enviadas()[0].data.titulo, "Bia curtiu seu post");
        assert.equal(f.enviadas()[1].data.titulo, "Bia liked your post");
        assert.equal(f.enviadas()[0].data.tag, "notificacao-n1");
    });

    it("sem tokens não chama o FCM", async () => {
        const f = fakes([], []);
        f.messaging.sendEach = async () => assert.fail("não deveria enviar");
        const r = await enviarPushDaNotificacao({ db: f.db, messaging: f.messaging, id: "n1", notificacao, log });
        assert.equal(r.enviados, 0);
    });
});
