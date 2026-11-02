// Catálogo de universidades (docs/catalogo-universidades.md).
//
// Fontes:
//  - Firestore, coleção "catalogoUniversidades" (perfil público; gravada pelo
//    moderador em src/app/admin/AbaUniversidades.js);
//  - public/universidades.json (entradas legadas "1", "2"...). Uma entrada do
//    JSON só aparece se o mesmo id não existir no Firestore.
// O id do catálogo é o valor gravado em avaliacoes.universidadeId,
// eventos.universidadeId e universidades/{uid}.universidadeId.
//
// Formato normalizado:
// { id (string), nome, sigla (ou null), descricao, imagem (url ou null),
//   contaUid (ou null), ativo (bool), legado (bool),
//   eventos (ids de public/events.json; só nas entradas legadas) }

import { db } from "../firebase";
import {
  collection, getDocs, getDoc, doc, writeBatch, serverTimestamp, query, where, updateDoc
} from "firebase/firestore";

const COLECAO = "catalogoUniversidades";

// Normaliza texto: minúsculas, sem acentos, sem pontuação e espaços extras
function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Nomes aceitos para uma entrada do JSON: nome, sigla e o nome completo
// que aparece no início da descrição (ex.: "Universidade de São Paulo, ...")
function nomesDaEntrada(uni) {
  const nomeCompleto = String(uni.descricao || "").split(",")[0];
  return [uni.nome, uni.sigla, nomeCompleto].map(normalizar).filter(Boolean);
}

// Procura a universidade do JSON que corresponde ao nome e/ou sigla informados.
// Retorna o id como string, ou null se não houver correspondência única.
export function encontrarUniversidadeId(lista, { nome, sigla } = {}) {
  if (!Array.isArray(lista)) return null;
  const termos = [nome, sigla].map(normalizar).filter(Boolean);
  if (termos.length === 0) return null;

  // 1) Correspondência exata com nome, sigla ou nome completo
  const exata = lista.find(uni => {
    const nomes = nomesDaEntrada(uni);
    return termos.some(t => nomes.includes(t));
  });
  if (exata) return String(exata.id);

  // 2) Nome/sigla do JSON aparece como palavra inteira no texto informado
  //    (ex.: "Universidade Presbiteriana Mackenzie - Campus Higienópolis").
  //    Só aceita se houver um único candidato, para evitar vínculo errado.
  const candidatos = lista.filter(uni => {
    const nomes = nomesDaEntrada(uni);
    return termos.some(t => nomes.some(n => ` ${t} `.includes(` ${n} `)));
  });
  if (candidatos.length === 1) return String(candidatos[0].id);

  return null;
}

// Procura a correspondência (nome/sigla) no catálogo completo
export async function buscarUniversidadeId({ nome, sigla } = {}) {
  const lista = await listarUniversidades();
  return encontrarUniversidadeId(lista, { nome, sigla });
}

function texto(valor) {
  return typeof valor === "string" ? valor : "";
}

function normalizarEntrada(id, d = {}, legado) {
  return {
    id: String(id),
    nome: texto(d.nome),
    sigla: d.sigla && typeof d.sigla === "string" ? d.sigla : null,
    descricao: texto(d.descricao),
    imagem: d.imagem && typeof d.imagem === "string" ? d.imagem : null,
    contaUid: d.contaUid && typeof d.contaUid === "string" ? d.contaUid : null,
    ativo: d.ativo !== false,
    legado,
    eventos: legado && Array.isArray(d.eventos) ? d.eventos.map(String) : []
  };
}

async function carregarJsonLegado() {
  try {
    const res = await fetch("/universidades.json");
    if (!res.ok) return [];
    const dados = await res.json();
    return Array.isArray(dados) ? dados.map(u => normalizarEntrada(u.id, u, true)) : [];
  } catch (err) {
    console.error("Erro ao carregar public/universidades.json:", err);
    return [];
  }
}

// Cache em memória durante a sessão (a lista é pequena e muda pouco).
// Guarda todas as entradas, inclusive as inativas; os filtros são aplicados na saída.
let cache = null;

export function limparCacheUniversidades() {
  cache = null;
}

async function carregarTudo() {
  const [doFirestore, legados] = await Promise.all([
    getDocs(collection(db, COLECAO))
      .then(snap => snap.docs.map(d => normalizarEntrada(d.id, d.data(), false)))
      .catch(err => {
        console.error("Erro ao buscar o catálogo de universidades:", err);
        return null; // null = falhou; não guarda no cache
      }),
    carregarJsonLegado()
  ]);
  const firestore = doFirestore || [];
  const ids = new Set(firestore.map(u => u.id));
  // Entrada legada migrada para o Firestore mantém a lista de eventos do JSON
  const porId = new Map(legados.map(u => [u.id, u]));
  const todas = [
    ...firestore.map(u => (porId.has(u.id) ? { ...u, eventos: porId.get(u.id).eventos } : u)),
    ...legados.filter(u => !ids.has(u.id))
  ];
  todas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return { todas, completo: doFirestore !== null };
}

async function obterTudo({ atualizar = false } = {}) {
  if (!cache || atualizar) {
    const promessa = carregarTudo();
    cache = promessa;
    promessa.then(r => { if (!r.completo && cache === promessa) cache = null; }, () => { cache = null; });
  }
  return (await cache).todas;
}

// Universidades do catálogo (Firestore com ativo != false + legadas do JSON
// cujo id não está no Firestore), em ordem alfabética.
// `incluirInativas` (painel do moderador) devolve também as ocultas.
export async function listarUniversidades({ incluirInativas = false, atualizar = false } = {}) {
  const todas = await obterTudo({ atualizar });
  return incluirInativas ? todas : todas.filter(u => u.ativo);
}

// Uma universidade do catálogo pelo id, ou null (inexistente ou oculta)
export async function buscarUniversidade(id) {
  if (id === undefined || id === null || id === "") return null;
  const idTexto = String(id);
  if (cache) {
    const lista = await listarUniversidades();
    const achada = lista.find(u => u.id === idTexto);
    if (achada) return achada;
  }
  try {
    if (!idTexto.includes("/")) {
      const snap = await getDoc(doc(db, COLECAO, idTexto));
      if (snap.exists()) {
        const uni = normalizarEntrada(snap.id, snap.data(), false);
        return uni.ativo ? uni : null;
      }
    }
  } catch (err) {
    console.error("Erro ao buscar universidade no catálogo:", err);
  }
  const legados = await carregarJsonLegado();
  return legados.find(u => u.id === idTexto) || null;
}

// Iniciais para o avatar quando não há imagem: a sigla (até 4 letras) ou as
// iniciais das duas primeiras palavras significativas do nome.
export function iniciaisUniversidade(uni) {
  const sigla = uni && typeof uni.sigla === "string" ? uni.sigla.trim() : "";
  if (sigla && sigla.length <= 4) return sigla.toUpperCase();
  const palavras = String((uni && uni.nome) || "")
    .split(/\s+/)
    .filter(p => p.length > 2 || /^[A-Z]/.test(p))
    .filter(p => !["de", "da", "do", "das", "dos", "e"].includes(p.toLowerCase()));
  const iniciais = palavras.slice(0, 2).map(p => p[0]).join("").toUpperCase();
  return iniciais || "?";
}

// ---------------------------------------------------------------------------
// Gravações do moderador (src/app/admin/AbaUniversidades.js).
// As regras (firestore.rules, match /catalogoUniversidades) só deixam o
// moderador criar a entrada e mudar nome, contaUid e ativo.
// ---------------------------------------------------------------------------

// Aprova a conta criando (ou reativando) catalogoUniversidades/{uid} num único
// batch com universidades/{uid} (status 'aprovado' e universidadeId = uid).
// Também serve para "Publicar no catálogo" contas já aprovadas sem vínculo.
// `existente`: entrada atual do catálogo com esse id (para preservar criadoEm).
export async function publicarNoCatalogo(conta, { aprovadoPor, existente = null } = {}) {
  const uid = conta.uid;
  const batch = writeBatch(db);
  const refCatalogo = doc(db, COLECAO, uid);
  const snap = existente ? null : await getDoc(refCatalogo);
  if (existente || (snap && snap.exists())) {
    // Reaprovação: reativa a entrada sem sobrescrever o perfil já editado
    batch.update(refCatalogo, {
      contaUid: uid,
      ativo: true,
      atualizadoEm: serverTimestamp()
    });
  } else {
    batch.set(refCatalogo, {
      nome: String(conta.nomeUniversidade || "").slice(0, 200) || uid,
      sigla: null,
      descricao: "",
      imagem: null,
      contaUid: uid,
      ativo: true,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });
  }
  const alteracoesConta = { status: "aprovado", universidadeId: uid };
  if (aprovadoPor && conta.status !== "aprovado") {
    alteracoesConta.aprovadoPor = aprovadoPor;
    alteracoesConta.aprovadoEm = new Date().toISOString();
  }
  batch.update(doc(db, "universidades", uid), alteracoesConta);
  await batch.commit();
  limparCacheUniversidades();
  await vincularEventosDaConta(uid, conta.nomeUniversidade);
  return alteracoesConta;
}

// Eventos que a conta cadastrou antes do vínculo (universidadeId null ou
// outro) passam a apontar para a entrada nova, para aparecerem no filtro de
// /eventos e na página da universidade. Melhor esforço: um evento que falhe
// (ex.: dados antigos fora do formato das regras) não desfaz a aprovação.
async function vincularEventosDaConta(uid, nome) {
  try {
    const snap = await getDocs(query(collection(db, "eventos"), where("universidadeUid", "==", uid)));
    await Promise.all(snap.docs
      .filter(d => d.data().universidadeId !== uid)
      .map(d => updateDoc(d.ref, {
        universidadeId: uid,
        ...(nome ? { universidadeNome: String(nome).slice(0, 200) } : {}),
        atualizadoEm: serverTimestamp()
      }).catch(err => console.error(`Erro ao vincular o evento ${d.id}:`, err))));
  } catch (err) {
    console.error("Erro ao vincular os eventos da universidade:", err);
  }
}

// Revoga a aprovação: a conta volta a 'pendente' e a entrada criada para ela
// (catalogoUniversidades/{uid}, se existir) fica oculta (ativo: false).
export async function revogarNoCatalogo(conta) {
  const uid = conta.uid;
  const batch = writeBatch(db);
  batch.update(doc(db, "universidades", uid), { status: "pendente" });
  const snap = await getDoc(doc(db, COLECAO, uid));
  if (snap.exists() && snap.data().ativo !== false) {
    batch.update(doc(db, COLECAO, uid), { ativo: false, atualizadoEm: serverTimestamp() });
  }
  await batch.commit();
  limparCacheUniversidades();
  return { status: "pendente" };
}
