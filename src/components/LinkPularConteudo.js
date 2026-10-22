"use client";

import { useI18n } from "../i18n/I18nProvider";

// Link "pular para o conteúdo" traduzido (o layout é componente de servidor)
export default function LinkPularConteudo() {
  const { t } = useI18n();
  return (
    <a href="#conteudo" className="skip-link">
      {t("comum.pularConteudo")}
    </a>
  );
}
