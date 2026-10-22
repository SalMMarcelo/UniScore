"use client";

// Provider de idioma (RNF07: PT-BR e EN-US), sem dependências externas.
//
// - A primeira renderização é SEMPRE em pt-BR (igual à renderização do
//   servidor, evitando erro de hidratação). Depois de montar, aplica o idioma
//   salvo em localStorage ou, sem escolha salva, o do navegador ("en*" -> en-US).
// - Atualiza <html lang> a cada troca.
//
// Uso: const { t, idioma, setIdioma, formatarData } = useI18n();
//      t("menu.inicio"); t("avaliar.estrelas", { n: 3 });

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  IDIOMA_PADRAO,
  idiomaValido,
  traduzir,
  rotuloDeValor,
  criarFormatadores
} from "./traduzir";

const CHAVE_ARMAZENADA = "uniscore:idioma";

function lerIdiomaSalvo() {
  try {
    const salvo = window.localStorage.getItem(CHAVE_ARMAZENADA);
    return idiomaValido(salvo) ? salvo : null;
  } catch (_) {
    return null;
  }
}

function salvarIdioma(idioma) {
  try {
    window.localStorage.setItem(CHAVE_ARMAZENADA, idioma);
  } catch (_) {}
}

function idiomaDoNavegador() {
  try {
    const lista = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    return String(lista[0] || "").toLowerCase().startsWith("en") ? "en-US" : IDIOMA_PADRAO;
  } catch (_) {
    return IDIOMA_PADRAO;
  }
}

function criarValor(idioma, setIdioma) {
  const t = (chave, vars) => traduzir(idioma, chave, vars);
  return {
    idioma,
    setIdioma,
    t,
    // Rótulo traduzido de um valor gravado (ex.: rotulo("eventos.temas", ev.tema))
    rotulo: (grupo, valor) => rotuloDeValor(idioma, grupo, valor),
    ...criarFormatadores(idioma)
  };
}

const I18nContext = createContext(criarValor(IDIOMA_PADRAO, () => {}));

export function I18nProvider({ children }) {
  const [idioma, setIdiomaEstado] = useState(IDIOMA_PADRAO);

  // Depois de montar: idioma salvo ou detectado no navegador
  useEffect(() => {
    const inicial = lerIdiomaSalvo() || idiomaDoNavegador();
    if (inicial !== IDIOMA_PADRAO) setIdiomaEstado(inicial);
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = idioma;
    } catch (_) {}
  }, [idioma]);

  const setIdioma = useCallback((novo) => {
    if (!idiomaValido(novo)) return;
    salvarIdioma(novo);
    setIdiomaEstado(novo);
  }, []);

  const valor = useMemo(() => criarValor(idioma, setIdioma), [idioma, setIdioma]);

  return <I18nContext.Provider value={valor}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export default I18nProvider;
