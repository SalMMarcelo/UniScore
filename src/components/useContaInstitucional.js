"use client";
// Diz se o usuário logado é uma conta de universidade (tem documento universidades/{uid},
// aprovada ou pendente). Essas contas não avaliam nem fazem check-in e, no cabeçalho, vão para
// /dashboard-universidade em vez de /perfil. Enquanto não se sabe, devolve false: as páginas
// mantêm o comportamento de estudante até a leitura terminar.
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { contaInstitucional } from "../lib/usuarios";

// Resultado por uid, para não repetir a leitura em cada componente da página
const cache = new Map();

export function verificarContaInstitucional(uid) {
    if (!cache.has(uid)) cache.set(uid, contaInstitucional(uid));
    return cache.get(uid);
}

export function useContaInstitucional() {
    const [institucional, setInstitucional] = useState(false);

    useEffect(() => {
        let ativo = true;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setInstitucional(false);
                return;
            }
            verificarContaInstitucional(user.uid).then(valor => { if (ativo) setInstitucional(valor); });
        });
        return () => { ativo = false; unsubscribe(); };
    }, []);

    return institucional;
}

export default useContaInstitucional;
