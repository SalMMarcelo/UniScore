// Texto e link do push a partir de um documento de "notificacoes".
// Função pura (sem Firebase) para poder ser testada com `npm test`.
//
// Os textos repetem os de src/i18n/*.js (seção "notificacoes"): mantenha
// sincronizado. O link segue linkDaNotificacao() de src/lib/notificacoes.js.

const TEXTOS = {
    "pt-BR": {
        alguem: "Alguém",
        mensagens: {
            curtida: "{nome} curtiu seu post",
            comentario: "{nome} comentou no seu post",
            resposta: "{nome} respondeu ao seu comentário"
        },
        moderacao: {
            ocultado: "A moderação ocultou {alvo}",
            restaurado: "A moderação restaurou {alvo}",
            removido: "A moderação removeu {alvo}"
        },
        alvos: { post: "seu post", comentario: "seu comentário", avaliacao: "sua avaliação" },
        generico: "Você tem uma notificação nova",
        abrir: "Toque para ver no UniScore."
    },
    "en-US": {
        alguem: "Someone",
        mensagens: {
            curtida: "{nome} liked your post",
            comentario: "{nome} commented on your post",
            resposta: "{nome} replied to your comment"
        },
        moderacao: {
            ocultado: "Moderators hid {alvo}",
            restaurado: "Moderators restored {alvo}",
            removido: "Moderators removed {alvo}"
        },
        alvos: { post: "your post", comentario: "your comment", avaliacao: "your review" },
        generico: "You have a new notification",
        abrir: "Tap to open UniScore."
    }
};

export const IDIOMA_PADRAO = "pt-BR";

function preencher(modelo, vars) {
    return modelo.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}

export function linkDaNotificacao(n) {
    if (n.postId && !(n.tipo === "moderacao" && n.acao === "removido" && n.alvoTipo === "post")) {
        return `/forum#${n.postId}`;
    }
    return "/notificacoes";
}

// Devolve { titulo, corpo, link } no idioma pedido
export function montarMensagem(n, idioma = IDIOMA_PADRAO) {
    const tx = TEXTOS[idioma] || TEXTOS[IDIOMA_PADRAO];
    let titulo;
    if (n.tipo === "moderacao") {
        const modelo = tx.moderacao[n.acao];
        const alvo = tx.alvos[n.alvoTipo];
        titulo = modelo && alvo ? preencher(modelo, { alvo }) : tx.generico;
    } else {
        const modelo = tx.mensagens[n.tipo];
        const nome = String(n.autorNome || "").trim() || tx.alguem;
        titulo = modelo ? preencher(modelo, { nome }) : tx.generico;
    }
    const trecho = String(n.trecho || "").trim();
    return {
        titulo,
        corpo: trecho ? `“${trecho}”` : tx.abrir,
        link: linkDaNotificacao(n)
    };
}
