"use client";
// Link para /avaliar que não aparece para contas de universidade: elas não avaliam nem
// fazem check-in (regra isContaUniversidade em firestore.rules). Mesmas props do <Link>.
import Link from "next/link";
import { useContaInstitucional } from "./useContaInstitucional";

// Mantido aqui para quem já importa o hook deste arquivo
export { useContaInstitucional };

export default function LinkAvaliar({ children, ...props }) {
    const institucional = useContaInstitucional();
    if (institucional) return null;
    return <Link {...props}>{children}</Link>;
}
