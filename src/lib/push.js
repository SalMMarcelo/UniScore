// Notificações push (PWA) com Firebase Cloud Messaging.
//
// Fluxo: o usuário ativa em /notificacoes (src/components/OpcaoPush.js) →
// pedimos permissão → o FCM gera um token para este navegador, inscrito no
// service worker do site (public/sw.js, escopo "/") → o token é salvo em
// users/{uid}/tokensPush/{token} (regras em firestore.rules, bloco tokensPush).
// A Cloud Function em functions/ envia um push para esses tokens sempre que
// uma notificação é criada em "notificacoes" e apaga os tokens inválidos.
//
// Documento users/{uid}/tokensPush/{token}:
// { token (= id do documento), idioma: 'pt-BR' | 'en-US' (idioma do aviso),
//   navegador (userAgent, até 200), criadoEm, atualizadoEm (serverTimestamp) }
//
// Sem NEXT_PUBLIC_FIREBASE_VAPID_KEY o recurso fica oculto (pushConfigurado()).

import { getApp } from "firebase/app";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";
const URL_SW = "/sw.js";

export function pushConfigurado() {
    return VAPID_KEY.length > 0;
}

function refToken(uid, token) {
    return doc(db, "users", uid, "tokensPush", token);
}

async function messaging() {
    const { getMessaging } = await import("firebase/messaging");
    return getMessaging(getApp());
}

// O navegador consegue receber push? (no iPhone, só com o app instalado na tela inicial)
export async function suportaPush() {
    if (!pushConfigurado() || typeof window === "undefined") return false;
    if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
        return false;
    }
    try {
        const { isSupported } = await import("firebase/messaging");
        return await isSupported();
    } catch {
        return false;
    }
}

// 'default' | 'granted' | 'denied'
export function permissaoPush() {
    return typeof Notification === "undefined" ? "default" : Notification.permission;
}

// O mesmo service worker do cache offline (registrado também em PwaInstall.js)
async function registroSW() {
    await navigator.serviceWorker.register(URL_SW);
    return navigator.serviceWorker.ready;
}

async function obterToken() {
    const { getToken } = await import("firebase/messaging");
    return getToken(await messaging(), {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await registroSW()
    });
}

// Cria ou renova o documento do token (renovar mantém atualizadoEm e o idioma em dia)
async function salvarToken(uid, token, idioma) {
    const ref = refToken(uid, token);
    const dados = {
        token,
        idioma,
        navegador: String(navigator.userAgent || "").slice(0, 200),
        atualizadoEm: serverTimestamp()
    };
    const atual = await getDoc(ref);
    if (atual.exists()) {
        await updateDoc(ref, dados);
    } else {
        await setDoc(ref, { ...dados, criadoEm: serverTimestamp() });
    }
}

// Push ativo neste navegador? Não cria inscrição nova: só confere a existente.
// Se estiver ativo, renova o token salvo (o FCM recomenda atualizar periodicamente).
export async function pushAtivo(uid, idioma) {
    if (permissaoPush() !== "granted") return false;
    const reg = await registroSW();
    const inscricao = await reg.pushManager.getSubscription();
    if (!inscricao) return false;
    const token = await obterToken();
    if (!token) return false;
    const salvo = await getDoc(refToken(uid, token));
    if (!salvo.exists()) return false;
    await salvarToken(uid, token, idioma);
    return true;
}

// Pede permissão e salva o token. Devolve a permissão final.
export async function ativarPush(uid, idioma) {
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") return permissao;
    const token = await obterToken();
    if (!token) throw new Error("Token do FCM não obtido");
    await salvarToken(uid, token, idioma);
    return permissao;
}

// Remove o token do Firestore e cancela a inscrição deste navegador
export async function desativarPush(uid) {
    const { deleteToken } = await import("firebase/messaging");
    const token = await obterToken();
    if (token) await deleteDoc(refToken(uid, token));
    await deleteToken(await messaging());
}
