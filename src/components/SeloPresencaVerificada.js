"use client";

import { useI18n } from "../i18n/I18nProvider";

// Selo das avaliações feitas por quem fez check-in no evento (avaliacoes.presencaVerificada).
// Ver docs/checkin-presenca.md.
export default function SeloPresencaVerificada({ className = "" }) {
  const { t } = useI18n();
  return (
    <span
      title={t("presenca.seloDescricao")}
      className={`inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {t("presenca.selo")}
    </span>
  );
}
