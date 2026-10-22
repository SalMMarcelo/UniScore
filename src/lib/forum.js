// Regras de exibição do fórum (/forum): busca, filtros, ordenação e
// organização dos comentários em fios de respostas.
//
// Coleção "forumPosts" (regras em firestore.rules, bloco /forumPosts):
// { conteudo, autor: { uid, nome, email, foto }, tema (opcional, um de TEMAS),
//   mediaUrl, mediaType: 'image' | 'video' | null, curtidas: [uid],
//   comentarios: [{ autorUid, autorNome, texto, criadoEm (ISO), respostaA? }],
//   criadoEm, moderado }
//
// `respostaA` é a chave (chaveComentario) do comentário respondido. Há um só
// nível de respostas: responder a uma resposta continua no fio do comentário
// original. Se o comentário original for removido, as respostas sobem para
// o primeiro nível.

import { chaveComentario } from "./denuncias";

export const LIMITE_TEXTO = 280;

// Posts por página do feed (o "carregar mais" soma outra página)
export const TAMANHO_PAGINA = 20;

export const ORDENS = ["recentes", "curtidos", "comentados"];

// Limites alinhados com storage.rules (match /forum/{userId}/{fileName})
export const LIMITES_MIDIA = {
    image: 10 * 1024 * 1024,
    video: 50 * 1024 * 1024
};

// Valida o arquivo escolhido para o post. Retorna null (ok) ou
// { chave, vars } com a mensagem de erro a traduzir.
export function validarMidia(arquivo, tipo) {
    if (!arquivo) return null;
    const limite = LIMITES_MIDIA[tipo];
    if (!limite || !String(arquivo.type || "").startsWith(`${tipo}/`)) {
        return { chave: tipo === "video" ? "forum.midiaNaoVideo" : "forum.midiaNaoImagem" };
    }
    if (arquivo.size > limite) {
        return { chave: "forum.midiaGrande", vars: { mb: limite / (1024 * 1024) } };
    }
    return null;
}

// Minúsculas e sem acentos, para a busca ignorar "é"/"e"
export function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
}

function milissegundos(valor) {
    if (!valor) return Number.MAX_SAFE_INTEGER; // ainda sem serverTimestamp: é o mais novo
    if (typeof valor.toMillis === "function") return valor.toMillis();
    if (typeof valor.seconds === "number") return valor.seconds * 1000;
    const ms = Date.parse(valor);
    return Number.isFinite(ms) ? ms : 0;
}

function combinaBusca(post, termos) {
    if (termos.length === 0) return true;
    const alvo = normalizarTexto([
        post.conteudo,
        post.autor?.nome,
        ...(post.comentarios || []).map(c => c.texto)
    ].join(" "));
    return termos.every(termo => alvo.includes(termo));
}

// filtros: { busca, tema, ordem, comMidia, meus }; uid: usuário logado (para "meus")
export function filtrarPosts(posts, filtros = {}, uid = null) {
    const termos = normalizarTexto(filtros.busca).split(/\s+/).filter(Boolean);
    const lista = posts.filter(post =>
        combinaBusca(post, termos)
        && (!filtros.tema || post.tema === filtros.tema)
        && (!filtros.comMidia || !!post.mediaUrl)
        && (!filtros.meus || (uid && post.autor?.uid === uid))
    );

    const recente = (a, b) => milissegundos(b.criadoEm) - milissegundos(a.criadoEm);
    const criterio = {
        curtidos: (a, b) => (b.curtidas?.length || 0) - (a.curtidas?.length || 0) || recente(a, b),
        comentados: (a, b) => (b.comentarios?.length || 0) - (a.comentarios?.length || 0) || recente(a, b)
    }[filtros.ordem] || recente;

    return [...lista].sort(criterio);
}

// Temas que aparecem em algum post (para o filtro mostrar só opções úteis)
export function temasUsados(posts) {
    return [...new Set(posts.map(p => p.tema).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

// Organiza os comentários em fios: [{ comentario, chave, indice, respostas: [...] }].
// `indice` é a posição no array original (usada por chaveComentario).
export function organizarComentarios(comentarios = []) {
    const itens = comentarios.map((comentario, indice) => ({
        comentario,
        indice,
        chave: chaveComentario(comentario, indice),
        respostas: []
    }));
    // Comentários só são acrescentados ao fim do array, então o comentário
    // respondido sempre vem antes da resposta. Só o primeiro nível recebe respostas.
    const primeiroNivel = new Map();
    const fios = [];
    itens.forEach(item => {
        const pai = primeiroNivel.get(item.comentario.respostaA);
        if (pai) {
            pai.respostas.push(item);
        } else {
            fios.push(item);
            primeiroNivel.set(item.chave, item);
        }
    });
    return fios;
}
