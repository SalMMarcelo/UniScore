// Envio do push de uma notificação, independente do gatilho.
//
// Usado hoje pela Cloud Function (index.js). Uma Netlify Function poderia
// reaproveitar o mesmo módulo (ver README.md): basta passar o Firestore e o
// Messaging do firebase-admin já inicializados.
//
// Tokens: users/{uid}/tokensPush/{token} (gravados por src/lib/push.js).
// Mensagem só de dados: quem mostra a notificação é public/sw.js.

import { montarMensagem } from "./mensagens.js";

// Erros do FCM que significam "token morto": o documento é apagado
const ERROS_TOKEN_INVALIDO = new Set([
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token"
]);

const MAX_TOKENS = 20;
const VALIDADE_SEGUNDOS = 24 * 60 * 60;

// db: Firestore do firebase-admin; messaging: Messaging do firebase-admin;
// id: id do documento em "notificacoes"; notificacao: os dados dele.
// Devolve { enviados, falhas, removidos }.
export async function enviarPushDaNotificacao({ db, messaging, id, notificacao, log = console }) {
    const uid = notificacao?.destinatarioUid;
    if (!uid) return { enviados: 0, falhas: 0, removidos: 0 };

    const snap = await db.collection("users").doc(uid).collection("tokensPush").limit(MAX_TOKENS).get();
    if (snap.empty) return { enviados: 0, falhas: 0, removidos: 0 };

    const mensagens = snap.docs.map((d) => {
        const { titulo, corpo, link } = montarMensagem(notificacao, d.get("idioma"));
        return {
            token: d.id,
            data: { titulo, corpo, link, tag: `notificacao-${id}` },
            webpush: { headers: { TTL: String(VALIDADE_SEGUNDOS), Urgency: "normal" } }
        };
    });

    const resposta = await messaging.sendEach(mensagens);
    const invalidos = [];
    resposta.responses.forEach((r, i) => {
        if (r.success) return;
        const codigo = r.error?.code;
        if (ERROS_TOKEN_INVALIDO.has(codigo)) invalidos.push(snap.docs[i].ref);
        else log.warn?.("Falha ao enviar push", { uid, codigo });
    });
    await Promise.all(invalidos.map((ref) => ref.delete()));

    return { enviados: resposta.successCount, falhas: resposta.failureCount, removidos: invalidos.length };
}
