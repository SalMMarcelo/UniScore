// Busca e filtros de eventos (RF06).
//
// - carregarEstatisticas(): média e total de avaliações por evento;
// - filtrarEventos() / ordenarEventos(): funções puras sobre a lista de
//   eventos normalizados de listarEventos() (src/lib/eventos.js);
// - filtrosDaUrl() / filtrosParaUrl(): sincronizam os filtros com a query
//   string, para que uma busca possa ser compartilhada por link.

import { db } from "../firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { notaSegura } from "./notas";

// Limite de documentos lidos de "avaliacoes" para calcular as estatísticas.
export const LIMITE_AVALIACOES = 2000;

export const ORDENACOES = [
  { valor: "recentes", rotulo: "Mais recentes" },
  { valor: "melhores", rotulo: "Melhor avaliados" },
  { valor: "mais-avaliados", rotulo: "Mais avaliados" },
  { valor: "nome", rotulo: "Nome (A-Z)" }
];

export const ORDENACAO_PADRAO = "recentes";

export const FILTROS_VAZIOS = {
  texto: "",
  tema: "",
  tipo: "",
  universidadeId: "",
  dataInicio: "",
  dataFim: "",
  notaMinima: 0,
  minAvaliacoes: 0,
  apenasGratuitos: false
};

// Mesma normalização de src/lib/universidades.js: minúsculas, sem acentos,
// sem pontuação e sem espaços extras (ex.: "Inovação!" -> "inovacao").
export function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Calcula, para cada evento, a média das notas (1-5) e o total de avaliações.
// Retorna Map<eventoId (string), { media, total }>.
//
// ATENÇÃO: agregação feita no cliente. Lê até LIMITE_AVALIACOES documentos de
// "avaliacoes" a cada carregamento da página, o que não escala (RNF01) e fica
// incompleto quando houver mais avaliações que o limite. Deve ser substituída
// por agregados armazenados no próprio evento (ex.: eventos/{id}.mediaNotas e
// .totalAvaliacoes), mantidos por uma Cloud Function disparada na criação /
// exclusão de avaliações — o que também permitiria filtrar e ordenar por nota
// diretamente no Firestore.
export async function carregarEstatisticas() {
  const estatisticas = new Map();
  try {
    const snap = await getDocs(query(collection(db, "avaliacoes"), limit(LIMITE_AVALIACOES)));
    const somas = new Map();
    snap.docs.forEach(d => {
      const av = d.data();
      if (av.eventoId === undefined || av.eventoId === null || av.eventoId === "") return;
      const nota = notaSegura(av.nota);
      if (nota < 1) return;
      const id = String(av.eventoId);
      const atual = somas.get(id) || { soma: 0, total: 0 };
      atual.soma += nota;
      atual.total += 1;
      somas.set(id, atual);
    });
    somas.forEach(({ soma, total }, id) => {
      estatisticas.set(id, { media: soma / total, total });
    });
  } catch (err) {
    console.error("Erro ao carregar estatísticas de avaliações:", err);
  }
  return estatisticas;
}

const SEM_AVALIACOES = { media: 0, total: 0 };

export function estatisticaDoEvento(stats, eventoId) {
  return (stats && stats.get(String(eventoId))) || SEM_AVALIACOES;
}

// Filtra a lista de eventos. Todos os critérios são opcionais (valor vazio/0/false = ignorar).
// - texto: todas as palavras precisam aparecer no nome, na descrição ou no nome
//   da universidade (sem diferenciar acentos e maiúsculas);
// - tema, tipo, universidadeId: igualdade exata;
// - dataInicio, dataFim: "YYYY-MM-DD", inclusivos (eventos sem data são excluídos);
// - notaMinima (1-5): média >= notaMinima (eventos sem avaliações são excluídos);
// - minAvaliacoes: total de avaliações >= minAvaliacoes;
// - apenasGratuitos: preco === 0.
export function filtrarEventos(eventos, stats, filtros = {}) {
  const f = { ...FILTROS_VAZIOS, ...filtros };
  const palavras = normalizarTexto(f.texto).split(" ").filter(Boolean);
  const notaMinima = Number(f.notaMinima) || 0;
  const minAvaliacoes = Number(f.minAvaliacoes) || 0;

  return (eventos || []).filter(ev => {
    if (palavras.length) {
      const alvo = normalizarTexto(`${ev.nome} ${ev.descricao} ${ev.universidadeNome}`);
      const alvoPalavras = ` ${alvo} `;
      // Prefixo de palavra: "tecno" encontra "tecnologia"
      if (!palavras.every(p => alvoPalavras.includes(` ${p}`))) return false;
    }
    if (f.tema && ev.tema !== f.tema) return false;
    if (f.tipo && ev.tipo !== f.tipo) return false;
    if (f.universidadeId && ev.universidadeId !== String(f.universidadeId)) return false;
    if (f.dataInicio && (!ev.data || ev.data < f.dataInicio)) return false;
    if (f.dataFim && (!ev.data || ev.data > f.dataFim)) return false;
    if (f.apenasGratuitos && ev.preco > 0) return false;

    if (notaMinima > 0 || minAvaliacoes > 0) {
      const { media, total } = estatisticaDoEvento(stats, ev.id);
      if (notaMinima > 0 && (total === 0 || media < notaMinima)) return false;
      if (minAvaliacoes > 0 && total < minAvaliacoes) return false;
    }
    return true;
  });
}

// Ordena (sem alterar o array original).
// ordem: "recentes" | "melhores" | "mais-avaliados" | "nome"
export function ordenarEventos(eventos, stats, ordem = ORDENACAO_PADRAO) {
  const porData = (a, b) => (b.data || "").localeCompare(a.data || "");
  const porNome = (a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" });
  const est = ev => estatisticaDoEvento(stats, ev.id);

  const comparadores = {
    recentes: (a, b) => porData(a, b) || porNome(a, b),
    melhores: (a, b) =>
      est(b).media - est(a).media || est(b).total - est(a).total || porData(a, b),
    "mais-avaliados": (a, b) =>
      est(b).total - est(a).total || est(b).media - est(a).media || porData(a, b),
    nome: (a, b) => porNome(a, b) || porData(a, b)
  };

  return [...(eventos || [])].sort(comparadores[ordem] || comparadores[ORDENACAO_PADRAO]);
}

// ---------- Sincronização com a URL ----------
// Parâmetros: q, tema, tipo, universidade, de, ate, nota, min, gratis=1, ordem

const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

function inteiroEntre(valor, min, max) {
  const n = parseInt(valor, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

// Lê filtros e ordenação de um URLSearchParams (ou ReadonlyURLSearchParams do Next).
export function filtrosDaUrl(params) {
  const get = chave => (params && params.get(chave)) || "";
  const de = get("de");
  const ate = get("ate");
  const ordem = get("ordem");
  return {
    filtros: {
      texto: get("q"),
      tema: get("tema"),
      tipo: get("tipo"),
      universidadeId: get("universidade"),
      dataInicio: DATA_VALIDA.test(de) ? de : "",
      dataFim: DATA_VALIDA.test(ate) ? ate : "",
      notaMinima: inteiroEntre(get("nota"), 0, 5),
      minAvaliacoes: inteiroEntre(get("min"), 0, 100000),
      apenasGratuitos: get("gratis") === "1"
    },
    ordem: ORDENACOES.some(o => o.valor === ordem) ? ordem : ORDENACAO_PADRAO
  };
}

// Gera a query string (sem "?") apenas com os filtros preenchidos.
export function filtrosParaUrl(filtros, ordem) {
  const f = { ...FILTROS_VAZIOS, ...filtros };
  const params = new URLSearchParams();
  const texto = String(f.texto || "").trim();
  if (texto) params.set("q", texto);
  if (f.tema) params.set("tema", f.tema);
  if (f.tipo) params.set("tipo", f.tipo);
  if (f.universidadeId) params.set("universidade", String(f.universidadeId));
  if (f.dataInicio) params.set("de", f.dataInicio);
  if (f.dataFim) params.set("ate", f.dataFim);
  if (Number(f.notaMinima) > 0) params.set("nota", String(f.notaMinima));
  if (Number(f.minAvaliacoes) > 0) params.set("min", String(f.minAvaliacoes));
  if (f.apenasGratuitos) params.set("gratis", "1");
  if (ordem && ordem !== ORDENACAO_PADRAO) params.set("ordem", ordem);
  return params.toString();
}
