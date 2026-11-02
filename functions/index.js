// Cloud Functions do UniScore (v2, Node 22). Deploy manual: ver README.md.
//
// enviarPushNotificacao: quando um documento é criado em "notificacoes",
// envia um push para os navegadores do destinatário. A lógica fica em
// envio.js; esta função é só o gatilho.

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { enviarPushDaNotificacao } from "./envio.js";

initializeApp();

// A região do gatilho tem de ser compatível com a localização do Firestore
// (multirregião nam5 → us-central1; southamerica-east1 → southamerica-east1).
const REGIAO = "us-central1";

export const enviarPushNotificacao = onDocumentCreated(
    { document: "notificacoes/{id}", region: REGIAO, retry: false },
    async (event) => {
        const notificacao = event.data?.data();
        if (!notificacao) return;
        const resultado = await enviarPushDaNotificacao({
            db: getFirestore(),
            messaging: getMessaging(),
            id: event.params.id,
            notificacao,
            log: logger
        });
        logger.info("Push da notificação", { id: event.params.id, ...resultado });
    }
);
