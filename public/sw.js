// Service worker único do site (escopo "/"), registrado por
// src/components/PwaInstall.js e src/lib/push.js:
//  - cache do essencial e página offline (install/activate/fetch);
//  - notificações push do Firebase Cloud Messaging (push/notificationclick).
// O push fica neste mesmo SW, e não num firebase-messaging-sw.js separado,
// porque a inscrição de push pertence a um registro de SW: dois SWs (um no
// escopo "/" e outro no escopo do FCM) disputariam o controle e o clique
// teria de ser tratado em dois lugares. As mensagens são só de dados
// (functions/index.js) e quem monta e mostra a notificação é este arquivo,
// sem importScripts do SDK.
const CACHE_VERSION = "uniscore-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(png|jpg|jpeg|webp|avif|svg|ico)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});

// ------------------------------------------------------------------
// Push (FCM). Formato recebido: { data: { titulo, corpo, link, tag }, ... }
// ------------------------------------------------------------------

// Só caminhos internos ("/forum#id"); qualquer outra coisa vira /notificacoes
function linkSeguro(link) {
  return typeof link === "string" && link.startsWith("/") && !link.startsWith("//")
    ? link
    : "/notificacoes";
}

self.addEventListener("push", (event) => {
  let carga = {};
  try {
    carga = event.data ? event.data.json() : {};
  } catch {
    carga = {};
  }
  const dados = carga.data || {};
  const aviso = carga.notification || {};
  const titulo = dados.titulo || aviso.title || "UniScore";
  const opcoes = {
    body: dados.corpo || aviso.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { link: linkSeguro(dados.link) },
  };
  // Mesma tag = substitui o aviso anterior da mesma notificação
  if (dados.tag) opcoes.tag = dados.tag;
  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(linkSeguro(event.notification.data?.link), self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (janelas) => {
      // Reaproveita uma aba do site já aberta; se não der, abre outra
      for (const janela of janelas) {
        if (new URL(janela.url).origin !== self.location.origin) continue;
        try {
          const navegada = await janela.navigate(destino);
          return (navegada || janela).focus();
        } catch {
          // aba não controlada por este SW: tenta a próxima
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
