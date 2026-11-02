"use client";
// Links do cabeçalho que dependem do tipo de conta. Para contas de universidade, o perfil e o
// "Para universidades" (página de divulgação) dão lugar ao painel da instituição. Enquanto o tipo
// de conta não é conhecido, ficam como para estudantes (sem piscar para quem é estudante).
import Link from "next/link";
import { useI18n } from "../i18n/I18nProvider";
import { useContaInstitucional } from "./useContaInstitucional";

export const ROTA_PAINEL_UNIVERSIDADE = "/dashboard-universidade";

// Link de perfil. Com `texto`, mostra o texto (trocado por "Meu painel" para universidades);
// sem `texto`, mostra os children (ex.: um ícone) e usa `rotulo` como aria-label/title.
export function LinkPerfil({ texto, rotulo, children, ...props }) {
    const { t } = useI18n();
    const institucional = useContaInstitucional();
    const href = institucional ? ROTA_PAINEL_UNIVERSIDADE : "/perfil";

    if (texto !== undefined) {
        return <Link href={href} {...props}>{institucional ? t("menu.meuPainel") : texto}</Link>;
    }
    const rotuloFinal = institucional ? t("menu.meuPainel") : rotulo;
    return (
        <Link href={href} title={rotuloFinal} aria-label={rotuloFinal} {...props}>
            {children}
        </Link>
    );
}

// Mostra os children para visitantes e estudantes; para contas de universidade, um único link
// "Meu painel" com `className` (ex.: no lugar de "Iniciar sessão"/"Criar conta" da divulgação).
export function OuMeuPainel({ children, className }) {
    const { t } = useI18n();
    const institucional = useContaInstitucional();
    if (institucional) {
        return <Link href={ROTA_PAINEL_UNIVERSIDADE} className={className}>{t("menu.meuPainel")}</Link>;
    }
    return children;
}

// Link "Para universidades" (página de divulgação), que vira "Meu painel" para contas de
// universidade. Os children são o conteúdo para estudantes e visitantes.
export function LinkParaUniversidades({ children, ...props }) {
    const { t } = useI18n();
    const institucional = useContaInstitucional();
    if (institucional) {
        return <Link href={ROTA_PAINEL_UNIVERSIDADE} {...props}>{t("menu.meuPainel")}</Link>;
    }
    return <Link href="/para-universidades" {...props}>{children}</Link>;
}
