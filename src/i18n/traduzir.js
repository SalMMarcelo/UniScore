// Núcleo da internacionalização (RNF07): funções puras, sem React, para que
// possam ser usadas tanto pelo I18nProvider quanto por módulos de src/lib.
//
// - Dicionários aninhados em src/i18n/pt-BR.js (fonte da verdade) e en-US.js.
// - Chaves em "caminho.com.pontos"; variáveis no texto como {nome}.
// - Fallback: idioma ativo -> pt-BR -> a própria chave.

import ptBR from "./pt-BR";
import enUS from "./en-US";

export const IDIOMA_PADRAO = "pt-BR";
export const IDIOMAS = ["pt-BR", "en-US"];
export const DICIONARIOS = { "pt-BR": ptBR, "en-US": enUS };

export function idiomaValido(idioma) {
  return IDIOMAS.includes(idioma);
}

// Busca um valor por caminho com pontos (ex.: "menu.inicio")
export function buscarChave(dicionario, chave) {
  if (!dicionario || typeof chave !== "string" || !chave) return undefined;
  let atual = dicionario;
  for (const parte of chave.split(".")) {
    if (atual === null || typeof atual !== "object" || !(parte in atual)) return undefined;
    atual = atual[parte];
  }
  return atual;
}

// Substitui {nome} pelos valores de `vars` (mantém o marcador se faltar a variável)
export function interpolar(texto, vars) {
  if (typeof texto !== "string" || !vars) return texto;
  return texto.replace(/\{(\w+)\}/g, (marcador, nome) =>
    Object.prototype.hasOwnProperty.call(vars, nome) && vars[nome] !== undefined && vars[nome] !== null
      ? String(vars[nome])
      : marcador
  );
}

const avisadas = new Set();
function avisarChaveAusente(idioma, chave) {
  if (process.env.NODE_ENV === "production") return;
  const id = `${idioma}:${chave}`;
  if (avisadas.has(id)) return;
  avisadas.add(id);
  console.warn(`[i18n] Chave ausente em ${idioma}: "${chave}"`);
}

// Traduz uma chave. Retorna string (ou o valor bruto, se for lista/objeto).
export function traduzir(idioma, chave, vars) {
  const dicionario = DICIONARIOS[idioma] || ptBR;
  let valor = buscarChave(dicionario, chave);
  if (valor === undefined) {
    avisarChaveAusente(idioma, chave);
    if (dicionario !== ptBR) valor = buscarChave(ptBR, chave);
  }
  if (valor === undefined) return chave;
  return typeof valor === "string" ? interpolar(valor, vars) : valor;
}

// Cria uma função t(chave, vars) presa a um idioma
export function criarT(idioma = IDIOMA_PADRAO) {
  return (chave, vars) => traduzir(idioma, chave, vars);
}

// Tradutor padrão (pt-BR) para módulos chamados sem `t`
export const tPadrao = criarT(IDIOMA_PADRAO);

// Converte um valor gravado no Firestore em trecho de chave:
// "Inovação e Empreendedorismo" -> "inovacao_e_empreendedorismo"
export function slugChave(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Rótulo exibível de um valor armazenado (tema, tipo, público, motivo...).
// O valor gravado não muda; sem tradução cadastrada, devolve o próprio valor.
export function rotuloDeValor(idioma, grupo, valor) {
  if (valor === undefined || valor === null || valor === "") return "";
  const chave = `${grupo}.${slugChave(valor)}`;
  const texto = buscarChave(DICIONARIOS[idioma] || ptBR, chave) ?? buscarChave(ptBR, chave);
  return typeof texto === "string" ? texto : String(valor);
}

// ---------------------------------------------------------------------------
// Formatação com Intl no idioma ativo
// ---------------------------------------------------------------------------

// Aceita Timestamp do Firestore, Date, milissegundos ou string.
// "YYYY-MM-DD" é lido como data local (evita mostrar o dia anterior).
export function paraData(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  let data = null;
  if (typeof valor.toDate === "function") data = valor.toDate();
  else if (valor instanceof Date) data = valor;
  else if (typeof valor === "number") data = new Date(valor);
  else if (typeof valor === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    data = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(valor);
  } else if (typeof valor.seconds === "number") data = new Date(valor.seconds * 1000);
  return data instanceof Date && !isNaN(data.getTime()) ? data : null;
}

export function criarFormatadores(idioma = IDIOMA_PADRAO) {
  const locale = idiomaValido(idioma) ? idioma : IDIOMA_PADRAO;
  return {
    // Só a data (padrão: dd/mm/aaaa em pt-BR, m/d/yyyy em en-US)
    formatarData(valor, opcoes) {
      const data = paraData(valor);
      return data ? data.toLocaleDateString(locale, opcoes) : "";
    },
    // Data e hora
    formatarDataHora(valor, opcoes) {
      const data = paraData(valor);
      return data ? data.toLocaleString(locale, opcoes) : "";
    },
    formatarNumero(valor, opcoes) {
      const n = Number(valor);
      return Number.isFinite(n) ? new Intl.NumberFormat(locale, opcoes).format(n) : "";
    },
    // Valores sempre em reais (BRL), nos dois idiomas
    formatarMoeda(valor, opcoes) {
      const n = Number(valor);
      return Number.isFinite(n)
        ? new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", ...opcoes }).format(n)
        : "";
    }
  };
}
