// Acesso aos eventos da plataforma (RF02).
//
// Fontes:
//  - Firestore, coleção "eventos" (cadastrados por universidades aprovadas);
//  - public/events.json (eventos "legados", anteriores ao cadastro real).
//    Os legados mantêm os ids originais ("1", "2"...) porque avaliações
//    existentes (avaliacoes.eventoId) apontam para esses ids.
//
// Todos os eventos são devolvidos no formato normalizado:
// { id, nome, descricao, data (YYYY-MM-DD), local, publicoAlvo, preco (number, 0 = gratuito),
//   tema, tipo, imagem (url ou null), universidadeId (id de universidades.json ou null),
//   universidadeNome, universidadeUid (ou null), legado (bool) }

import { db } from "../firebase";
import { collection, getDocs, getDoc, doc, query, orderBy } from "firebase/firestore";
import { encontrarUniversidadeId } from "./universidades";

export const TIPOS = [
  "Palestra",
  "Workshop",
  "Congresso",
  "Feira",
  "Cultural",
  "Esportivo",
  "Acadêmico",
  "Outro"
];

export const TEMAS = [
  "Interculturalidade",
  "Tecnologia",
  "Inovação e Empreendedorismo",
  "Ciências Exatas",
  "Ciências Biológicas e Saúde",
  "Ciências Humanas",
  "Ciências Sociais Aplicadas",
  "Direito",
  "Educação",
  "Engenharia",
  "Artes e Cultura",
  "Meio Ambiente e Sustentabilidade",
  "Diversidade e Inclusão",
  "Política e Sociedade",
  "Carreira e Mercado de Trabalho",
  "Esportes",
  "Outro"
];

// Tipos de usuário previstos na especificação (universitários, familiares, visitantes, convidados)
export const PUBLICOS = [
  "Universitários",
  "Familiares",
  "Visitantes",
  "Convidados",
  "Todos"
];

// Converte o campo "data" (string, Timestamp do Firestore ou Date) em "YYYY-MM-DD"
function normalizarData(valor) {
  if (!valor) return "";
  if (typeof valor === "string") return valor.slice(0, 10);
  const data = typeof valor.toDate === "function" ? valor.toDate() : valor;
  if (data instanceof Date && !isNaN(data)) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }
  return "";
}

function texto(valor) {
  return typeof valor === "string" ? valor : "";
}

// Normaliza um documento da coleção "eventos"
function normalizarEventoFirestore(id, d = {}) {
  const preco = Number(d.preco);
  return {
    id: String(id),
    nome: texto(d.nome),
    descricao: texto(d.descricao),
    data: normalizarData(d.data),
    local: texto(d.local),
    publicoAlvo: texto(d.publicoAlvo),
    preco: Number.isFinite(preco) && preco > 0 ? preco : 0,
    tema: texto(d.tema),
    tipo: texto(d.tipo),
    imagem: d.imagem && typeof d.imagem === "string" ? d.imagem : null,
    universidadeId: d.universidadeId != null && d.universidadeId !== "" ? String(d.universidadeId) : null,
    universidadeNome: texto(d.universidadeNome),
    universidadeUid: d.universidadeUid || null,
    legado: false
  };
}

// Normaliza uma entrada de public/events.json.
// O JSON legado só tem: id, nome, data, descricao, imagem, universidade (nome) e avaliacao.
function normalizarEventoLegado(ev, universidades) {
  const id = String(ev.id);
  let universidadeId = null;
  let universidadeNome = texto(ev.universidade);

  if (Array.isArray(universidades)) {
    // 1) A universidade que lista o evento em "eventos" no universidades.json
    const dona = universidades.find(
      uni => Array.isArray(uni.eventos) && uni.eventos.map(String).includes(id)
    );
    if (dona) {
      universidadeId = String(dona.id);
    } else if (universidadeNome) {
      // 2) Correspondência pelo nome da universidade
      universidadeId = encontrarUniversidadeId(universidades, { nome: universidadeNome });
    }
    if (!universidadeNome && universidadeId) {
      const uni = universidades.find(u => String(u.id) === universidadeId);
      universidadeNome = uni ? texto(uni.nome) : "";
    }
  }

  const preco = Number(ev.preco);
  return {
    id,
    nome: texto(ev.nome),
    descricao: texto(ev.descricao),
    data: normalizarData(ev.data),
    local: texto(ev.local),
    publicoAlvo: texto(ev.publicoAlvo),
    preco: Number.isFinite(preco) && preco > 0 ? preco : 0,
    tema: texto(ev.tema),
    tipo: texto(ev.tipo),
    imagem: ev.imagem && typeof ev.imagem === "string" ? ev.imagem : null,
    universidadeId,
    universidadeNome,
    universidadeUid: null,
    legado: true
  };
}

async function carregarJson(caminho) {
  try {
    const res = await fetch(caminho);
    if (!res.ok) return [];
    const dados = await res.json();
    return Array.isArray(dados) ? dados : [];
  } catch (err) {
    console.error(`Erro ao carregar ${caminho}:`, err);
    return [];
  }
}

async function listarEventosLegados() {
  const [eventos, universidades] = await Promise.all([
    carregarJson("/events.json"),
    carregarJson("/universidades.json")
  ]);
  return eventos.map(ev => normalizarEventoLegado(ev, universidades));
}

// Lista todos os eventos (Firestore + legados), do mais recente para o mais antigo.
// Se um evento do Firestore tiver o mesmo id de um legado, o do Firestore prevalece.
export async function listarEventos() {
  const [doFirestore, legados] = await Promise.all([
    getDocs(query(collection(db, "eventos"), orderBy("data", "desc")))
      .then(snap => snap.docs.map(d => normalizarEventoFirestore(d.id, d.data())))
      .catch(err => {
        console.error("Erro ao buscar eventos no Firestore:", err);
        return [];
      }),
    listarEventosLegados()
  ]);

  const idsFirestore = new Set(doFirestore.map(ev => ev.id));
  const todos = [...doFirestore, ...legados.filter(ev => !idsFirestore.has(ev.id))];

  // Ordena por data (desc); eventos sem data ficam no fim
  return todos.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
}

// Busca um evento pelo id: primeiro no Firestore, depois no JSON legado.
// Retorna o evento normalizado ou null.
export async function buscarEvento(id) {
  if (id === undefined || id === null || id === "") return null;
  const idTexto = String(id);

  try {
    const snap = await getDoc(doc(db, "eventos", idTexto));
    if (snap.exists()) return normalizarEventoFirestore(snap.id, snap.data());
  } catch (err) {
    console.error("Erro ao buscar evento no Firestore:", err);
  }

  const legados = await listarEventosLegados();
  return legados.find(ev => ev.id === idTexto) || null;
}
