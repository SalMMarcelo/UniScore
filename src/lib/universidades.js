// Utilitários para relacionar uma conta de universidade (coleção "universidades")
// com a entrada correspondente em public/universidades.json, cujo "id" ("1", "2"...)
// é o valor gravado em avaliacoes.universidadeId.

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

// Carrega public/universidades.json e procura a correspondência
export async function buscarUniversidadeId({ nome, sigla } = {}) {
  const res = await fetch("/universidades.json");
  if (!res.ok) throw new Error("Não foi possível carregar a lista de universidades");
  const lista = await res.json();
  return encontrarUniversidadeId(lista, { nome, sigla });
}
