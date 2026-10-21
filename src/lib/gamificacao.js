// Gamificação (RF05): estrelas, pontos, bônus e selos por participação.
//
// IMPORTANTE: nada aqui é gravado no Firestore. As regras (firestore.rules)
// impedem, de propósito, que o usuário escreva `pontos`, `selos`, `estrelas`
// etc. no próprio documento — senão qualquer um poderia se dar pontos.
// Por isso as conquistas são DERIVADAS na leitura, a partir da atividade real:
//  - avaliacoes onde usuarioId == uid;
//  - forumPosts onde autor.uid == uid (posts, mídia, curtidas recebidas);
//  - comentários do usuário dentro de forumPosts.comentarios (autorUid == uid).
//    Comentários ficam embutidos nos posts, então é preciso varrer os posts:
//    a varredura é limitada aos LIMITE_POSTS_VARREDURA posts mais recentes.
//
// `calcularConquistas` é uma função pura (sem Firestore) e é usada tanto pelo
// painel do perfil quanto pelo ranking da comunidade.

import { db } from "../firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Tabela de pontos
// ---------------------------------------------------------------------------
export const PONTOS = {
  avaliacao: 10,            // cada avaliação (uma por evento)
  bonusComentario: 5,       // avaliação com comentário de pelo menos 50 caracteres
  bonusImagem: 5,           // avaliação com imagem
  bonusCriterios: 5,        // avaliação com os 5 critérios respondidos (nenhum "Não se aplica")
  post: 5,                  // post no fórum
  bonusMidia: 2,            // post com foto/vídeo
  comentario: 2,            // comentário em post do fórum
  curtidaRecebida: 1        // curtida recebida em post próprio (exceto a própria)
};

// Mínimo de caracteres para o bônus de comentário
export const MIN_CARACTERES_COMENTARIO = 50;

// Limites anti-abuso (contam para pontos e selos):
//  - avaliações: só uma por evento (a mais recente);
//  - comentários: no máximo 3 por post contam;
//  - curtidas: no máximo 20 por post contam. As regras permitem que o autor
//    edite o próprio post (inclusive `curtidas`), então limitamos o ganho.
export const MAX_COMENTARIOS_POR_POST = 3;
export const MAX_CURTIDAS_POR_POST = 20;

// Limites das leituras no Firestore (custo e tempo de carregamento)
export const LIMITE_AVALIACOES_USUARIO = 500;
export const LIMITE_POSTS_USUARIO = 500;
export const LIMITE_POSTS_VARREDURA = 500;

// Critérios do RF03 (mesmos ids gravados por /avaliar em avaliacoes.criterios)
const CRITERIOS = ["acessibilidade", "conforto", "interculturalidade", "politizacao", "impacto"];

// ---------------------------------------------------------------------------
// Níveis (estrelas 1–5) a partir dos pontos
// ---------------------------------------------------------------------------
export const NIVEIS = [
  { estrelas: 1, pontos: 0, nome: "Iniciante" },
  { estrelas: 2, pontos: 50, nome: "Participante" },
  { estrelas: 3, pontos: 150, nome: "Colaborador" },
  { estrelas: 4, pontos: 350, nome: "Referência" },
  { estrelas: 5, pontos: 700, nome: "Embaixador UniScore" }
];

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

// Converte Timestamp do Firestore, Date, string ISO ou número em milissegundos
export function paraMillis(valor) {
  if (!valor) return 0;
  if (typeof valor.toMillis === "function") return valor.toMillis();
  if (typeof valor.seconds === "number") return valor.seconds * 1000;
  if (valor instanceof Date) return valor.getTime() || 0;
  const n = new Date(valor).getTime();
  return Number.isFinite(n) ? n : 0;
}

function criterioRespondido(valor) {
  return Number.isInteger(valor) && valor >= 1 && valor <= 5;
}

function textoDe(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

// Uma avaliação por evento: mantém a mais recente de cada eventoId
function avaliacoesUnicasPorEvento(avaliacoes) {
  const porEvento = new Map();
  for (const av of avaliacoes) {
    const chave = av.eventoId != null && av.eventoId !== "" ? String(av.eventoId) : `sem-evento-${av.id}`;
    const atual = porEvento.get(chave);
    if (!atual || paraMillis(av.criadoEm) > paraMillis(atual.criadoEm)) porEvento.set(chave, av);
  }
  return [...porEvento.values()];
}

// Curtidas válidas de um post: uids distintos, sem a do próprio autor, limitadas
function curtidasValidas(post) {
  const autorUid = post.autor?.uid;
  const uids = new Set(
    (Array.isArray(post.curtidas) ? post.curtidas : []).filter(u => typeof u === "string" && u && u !== autorUid)
  );
  return Math.min(uids.size, MAX_CURTIDAS_POR_POST);
}

// ---------------------------------------------------------------------------
// Selos
// ---------------------------------------------------------------------------
// Cada selo recebe as estatísticas (ver `estatisticas` abaixo) e devolve
// { conquistado, atual, meta } para mostrar o progresso.
function meta(atual, alvo) {
  return { conquistado: atual >= alvo, atual: Math.min(atual, alvo), meta: alvo };
}

export const SELOS = [
  {
    id: "primeira-avaliacao",
    emoji: "🏅",
    nome: "Primeira avaliação",
    descricao: "Publique sua primeira avaliação de evento.",
    verificar: e => meta(e.avaliacoes, 1)
  },
  {
    id: "avaliador-dedicado",
    emoji: "🎓",
    nome: "Avaliador dedicado",
    descricao: "Avalie 10 eventos diferentes.",
    verificar: e => meta(e.avaliacoes, 10)
  },
  {
    id: "olhar-intercultural",
    emoji: "🌍",
    nome: "Olhar intercultural",
    descricao: "Responda o critério Interculturalidade em 5 avaliações.",
    verificar: e => meta(e.comInterculturalidade, 5)
  },
  {
    id: "atento-acessibilidade",
    emoji: "♿",
    nome: "Atento à acessibilidade",
    descricao: "Responda o critério Acessibilidade em 5 avaliações.",
    verificar: e => meta(e.comAcessibilidade, 5)
  },
  {
    id: "reporter",
    emoji: "📸",
    nome: "Repórter",
    descricao: "Publique 5 avaliações com imagem.",
    verificar: e => meta(e.comImagem, 5)
  },
  {
    id: "debatedor",
    emoji: "💬",
    nome: "Debatedor",
    descricao: "Faça 10 comentários no fórum.",
    verificar: e => meta(e.comentarios, 10)
  },
  {
    id: "popular",
    emoji: "🔥",
    nome: "Popular",
    descricao: "Receba 50 curtidas nos seus posts do fórum.",
    verificar: e => meta(e.curtidasRecebidas, 50)
  },
  {
    id: "explorador",
    emoji: "🗺️",
    nome: "Explorador",
    descricao: "Avalie eventos de 3 universidades diferentes.",
    verificar: e => meta(e.universidades, 3)
  }
];

// ---------------------------------------------------------------------------
// Cálculo (função pura)
// ---------------------------------------------------------------------------

// atividade = {
//   avaliacoes:  [{ id, eventoId, universidadeId, nota, comentario, imagem, criterios, intercultural, criadoEm }],
//   posts:       [{ id, conteudo, mediaUrl, curtidas: [uid], comentarios, autor: { uid } }]  (posts do usuário)
//   comentarios: [{ postId, texto, criadoEm }]                                             (comentários do usuário)
// }
export function calcularConquistas(atividade = {}) {
  const avaliacoes = avaliacoesUnicasPorEvento(Array.isArray(atividade.avaliacoes) ? atividade.avaliacoes : []);
  const posts = Array.isArray(atividade.posts) ? atividade.posts : [];
  const comentariosBrutos = Array.isArray(atividade.comentarios) ? atividade.comentarios : [];

  // Comentários: no máximo MAX_COMENTARIOS_POR_POST por post
  const porPost = new Map();
  for (const c of comentariosBrutos) {
    const chave = c.postId || "?";
    porPost.set(chave, (porPost.get(chave) || 0) + 1);
  }
  let comentarios = 0;
  for (const qtd of porPost.values()) comentarios += Math.min(qtd, MAX_COMENTARIOS_POR_POST);

  // Estatísticas usadas por pontos e selos
  const estatisticas = {
    avaliacoes: avaliacoes.length,
    comComentarioLongo: avaliacoes.filter(av => textoDe(av.comentario).length >= MIN_CARACTERES_COMENTARIO).length,
    comImagem: avaliacoes.filter(av => typeof av.imagem === "string" && av.imagem).length,
    comTodosCriterios: avaliacoes.filter(av => CRITERIOS.every(c => criterioRespondido(av.criterios?.[c]))).length,
    comInterculturalidade: avaliacoes.filter(av => criterioRespondido(av.criterios?.interculturalidade)).length,
    comAcessibilidade: avaliacoes.filter(av => criterioRespondido(av.criterios?.acessibilidade)).length,
    universidades: new Set(
      avaliacoes.map(av => av.universidadeId).filter(u => u != null && u !== "").map(String)
    ).size,
    posts: posts.length,
    postsComMidia: posts.filter(p => typeof p.mediaUrl === "string" && p.mediaUrl).length,
    comentarios,
    curtidasRecebidas: posts.reduce((soma, p) => soma + curtidasValidas(p), 0)
  };

  // Detalhamento dos pontos (para mostrar "de onde vieram")
  const detalhamento = [
    { id: "avaliacao", rotulo: "Avaliações", quantidade: estatisticas.avaliacoes, valor: PONTOS.avaliacao },
    { id: "bonusComentario", rotulo: `Bônus: comentário com ${MIN_CARACTERES_COMENTARIO}+ caracteres`, quantidade: estatisticas.comComentarioLongo, valor: PONTOS.bonusComentario },
    { id: "bonusImagem", rotulo: "Bônus: avaliação com imagem", quantidade: estatisticas.comImagem, valor: PONTOS.bonusImagem },
    { id: "bonusCriterios", rotulo: "Bônus: todos os critérios respondidos", quantidade: estatisticas.comTodosCriterios, valor: PONTOS.bonusCriterios },
    { id: "post", rotulo: "Posts no fórum", quantidade: estatisticas.posts, valor: PONTOS.post },
    { id: "bonusMidia", rotulo: "Bônus: post com mídia", quantidade: estatisticas.postsComMidia, valor: PONTOS.bonusMidia },
    { id: "comentario", rotulo: "Comentários no fórum", quantidade: estatisticas.comentarios, valor: PONTOS.comentario },
    { id: "curtidaRecebida", rotulo: "Curtidas recebidas", quantidade: estatisticas.curtidasRecebidas, valor: PONTOS.curtidaRecebida }
  ].map(item => ({ ...item, pontos: item.quantidade * item.valor }));

  const pontos = detalhamento.reduce((soma, item) => soma + item.pontos, 0);

  // Nível atual e próximo
  let indice = 0;
  NIVEIS.forEach((nivel, i) => {
    if (pontos >= nivel.pontos) indice = i;
  });
  const nivel = NIVEIS[indice];
  const seguinte = NIVEIS[indice + 1] || null;
  const proximoNivel = seguinte
    ? {
        estrelas: seguinte.estrelas,
        nome: seguinte.nome,
        pontosNecessarios: seguinte.pontos,
        faltam: seguinte.pontos - pontos,
        progresso: Math.round(((pontos - nivel.pontos) / (seguinte.pontos - nivel.pontos)) * 100)
      }
    : null;

  const selos = SELOS.map(({ verificar, ...selo }) => ({ ...selo, ...verificar(estatisticas) }));

  return {
    pontos,
    estrelas: nivel.estrelas,
    nivel: nivel.nome,
    proximoNivel,
    selos,
    totalSelos: selos.filter(s => s.conquistado).length,
    detalhamento,
    estatisticas
  };
}

// ---------------------------------------------------------------------------
// Agrupamento por usuário (usado pelo ranking e por carregarAtividade)
// ---------------------------------------------------------------------------

// Recebe avaliações e posts (de qualquer usuário) e devolve um Map
// uid -> { uid, nome, foto, atividade: { avaliacoes, posts, comentarios } }.
// Nome e foto vêm da atividade mais recente (avaliacoes.usuario/photoURL ou autor.nome/foto).
export function agruparAtividadePorUsuario(avaliacoes = [], posts = []) {
  const usuarios = new Map();

  function obter(uid) {
    if (!usuarios.has(uid)) {
      usuarios.set(uid, {
        uid,
        nome: "",
        foto: null,
        _ultimaAtividade: -1,
        atividade: { avaliacoes: [], posts: [], comentarios: [] }
      });
    }
    return usuarios.get(uid);
  }

  function atualizarIdentidade(u, nome, foto, quando) {
    if (quando >= u._ultimaAtividade && textoDe(nome)) {
      u.nome = textoDe(nome);
      u.foto = typeof foto === "string" && foto ? foto : u.foto;
      u._ultimaAtividade = quando;
    }
  }

  for (const av of avaliacoes) {
    if (!av.usuarioId) continue;
    const u = obter(av.usuarioId);
    u.atividade.avaliacoes.push(av);
    atualizarIdentidade(u, av.usuario, av.photoURL, paraMillis(av.criadoEm));
  }

  for (const post of posts) {
    const autorUid = post.autor?.uid;
    if (autorUid) {
      const u = obter(autorUid);
      u.atividade.posts.push(post);
      atualizarIdentidade(u, post.autor.nome, post.autor.foto, paraMillis(post.criadoEm));
    }
    for (const c of Array.isArray(post.comentarios) ? post.comentarios : []) {
      if (!c || !c.autorUid) continue;
      const u = obter(c.autorUid);
      u.atividade.comentarios.push({ postId: post.id, texto: c.texto, criadoEm: c.criadoEm });
      atualizarIdentidade(u, c.autorNome, null, paraMillis(c.criadoEm));
    }
  }

  for (const u of usuarios.values()) delete u._ultimaAtividade;
  return usuarios;
}

// Nome exibível em público: nunca mostra e-mails (alguns registros antigos
// gravaram o e-mail no lugar do nome quando não havia displayName).
export function nomePublico(nome) {
  const texto = textoDe(nome);
  if (!texto || texto.includes("@")) return "Participante";
  return texto;
}

// ---------------------------------------------------------------------------
// Leitura no Firestore (limitada)
// ---------------------------------------------------------------------------

// Conteúdo ocultado pela moderação não rende pontos
function docsComId(snap) {
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.moderado);
}

// Carrega a atividade de um usuário. Cada consulta falha de forma independente
// (retorna lista vazia), para o painel mostrar o que for possível.
// Consultas sem orderBy usam apenas índices de campo único (automáticos).
export async function carregarAtividade(uid) {
  if (!uid) return { avaliacoes: [], posts: [], comentarios: [] };

  const [avaliacoes, postsDoUsuario, postsRecentes] = await Promise.all([
    getDocs(query(collection(db, "avaliacoes"), where("usuarioId", "==", uid), limit(LIMITE_AVALIACOES_USUARIO)))
      .then(docsComId)
      .catch(err => {
        console.error("Erro ao carregar avaliações do usuário:", err);
        return [];
      }),
    getDocs(query(collection(db, "forumPosts"), where("autor.uid", "==", uid), limit(LIMITE_POSTS_USUARIO)))
      .then(docsComId)
      .catch(err => {
        console.error("Erro ao carregar posts do usuário:", err);
        return [];
      }),
    // Varredura limitada para encontrar os comentários do usuário
    getDocs(query(collection(db, "forumPosts"), orderBy("criadoEm", "desc"), limit(LIMITE_POSTS_VARREDURA)))
      .then(docsComId)
      .catch(err => {
        console.error("Erro ao carregar posts recentes do fórum:", err);
        return [];
      })
  ]);

  // Une os posts do usuário com os da varredura (sem duplicar)
  const postsPorId = new Map();
  for (const p of [...postsRecentes, ...postsDoUsuario]) postsPorId.set(p.id, p);

  const comentarios = [];
  for (const post of postsPorId.values()) {
    for (const c of Array.isArray(post.comentarios) ? post.comentarios : []) {
      if (c && c.autorUid === uid) comentarios.push({ postId: post.id, texto: c.texto, criadoEm: c.criadoEm });
    }
  }

  return {
    avaliacoes: avaliacoes.sort((a, b) => paraMillis(b.criadoEm) - paraMillis(a.criadoEm)),
    posts: [...postsPorId.values()].filter(p => p.autor?.uid === uid),
    comentarios
  };
}

// Limites do ranking
export const LIMITE_RANKING_AVALIACOES = 500;
export const LIMITE_RANKING_POSTS = 500;
export const TAMANHO_RANKING = 20;

// Ranking da comunidade a partir das últimas avaliações e posts (limitado).
// Retorna [{ uid, nome, foto, pontos, estrelas, totalSelos, avaliacoes }], top N.
export async function carregarRanking() {
  const [avaliacoes, posts] = await Promise.all([
    getDocs(query(collection(db, "avaliacoes"), orderBy("criadoEm", "desc"), limit(LIMITE_RANKING_AVALIACOES)))
      .then(docsComId)
      .catch(err => {
        console.error("Erro ao carregar avaliações para o ranking:", err);
        return [];
      }),
    getDocs(query(collection(db, "forumPosts"), orderBy("criadoEm", "desc"), limit(LIMITE_RANKING_POSTS)))
      .then(docsComId)
      .catch(err => {
        console.error("Erro ao carregar posts para o ranking:", err);
        return [];
      })
  ]);

  const usuarios = agruparAtividadePorUsuario(avaliacoes, posts);
  return [...usuarios.values()]
    .map(u => {
      const c = calcularConquistas(u.atividade);
      return {
        uid: u.uid,
        nome: nomePublico(u.nome),
        foto: u.foto,
        pontos: c.pontos,
        estrelas: c.estrelas,
        totalSelos: c.totalSelos,
        selos: c.selos.filter(s => s.conquistado),
        avaliacoes: c.estatisticas.avaliacoes
      };
    })
    .filter(u => u.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || b.totalSelos - a.totalSelos || a.nome.localeCompare(b.nome))
    .slice(0, TAMANHO_RANKING);
}
