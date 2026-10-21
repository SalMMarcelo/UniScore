"use client";

import { useI18n } from "../i18n/I18nProvider";

const OPCOES = [
  { idioma: "pt-BR", sigla: "PT", chaveNome: "idioma.portugues" },
  { idioma: "en-US", sigla: "EN", chaveNome: "idioma.ingles" }
];

// Alternância de idioma "PT | EN" (RNF07). Botões com aria-pressed dentro de
// um grupo rotulado; o nome completo do idioma é lido pelos leitores de tela.
export default function SeletorIdioma({ className = "" }) {
  const { idioma, setIdioma, t } = useI18n();
  // Sem classe de display em className, usa inline-flex (evita conflito com "hidden md:inline-flex")
  const exibicao = /(^|\s)(hidden|flex|inline-flex|block)(\s|$)/.test(className) ? "" : "inline-flex";

  return (
    <div
      role="group"
      aria-label={t("idioma.rotulo")}
      className={`${exibicao} items-center rounded-lg border border-gray-300 bg-white p-0.5 text-xs font-semibold ${className}`}
    >
      {OPCOES.map((opcao, i) => {
        const ativo = idioma === opcao.idioma;
        return (
          <span key={opcao.idioma} className="flex items-center">
            {i > 0 && (
              <span aria-hidden="true" className="px-0.5 text-gray-400">
                |
              </span>
            )}
            <button
              type="button"
              lang={opcao.idioma}
              aria-pressed={ativo}
              aria-label={t(opcao.chaveNome)}
              onClick={() => setIdioma(opcao.idioma)}
              className={`min-h-[32px] min-w-[32px] rounded-md px-2 py-1 transition-colors ${
                ativo ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {opcao.sigla}
            </button>
          </span>
        );
      })}
    </div>
  );
}
