"use client";
// Link para /avaliar que não aparece para contas de universidade: elas não avaliam nem
// fazem check-in (regra isContaUniversidade em firestore.rules). Mesmas props do <Link>.
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { contaInstitucional } from "../lib/usuarios";

// Resultado por uid, para não repetir a leitura em cada link da página
const cache = new Map();

function verificar(uid) {
    if (!cache.has(uid)) cache.set(uid, contaInstitucional(uid));
    return cache.get(uid);
}

// true quando o usuário logado é uma conta de universidade (aprovada ou pendente)
export function useContaInstitucional() {
    const [institucional, setInstitucional] = useState(false);

    useEffect(() => {
        let ativo = true;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setInstitucional(false);
                return;
            }
            verificar(user.uid).then(valor => { if (ativo) setInstitucional(valor); });
        });
        return () => { ativo = false; unsubscribe(); };
    }, []);

    return institucional;
}

export default function LinkAvaliar({ children, ...props }) {
    const institucional = useContaInstitucional();
    if (institucional) return null;
    return <Link {...props}>{children}</Link>;
}
