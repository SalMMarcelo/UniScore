"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { ouvirNotificacoes } from "../lib/notificacoes";
import { useI18n } from "../i18n/I18nProvider";

// Usuário logado e suas notificações em tempo real.
// user: undefined (carregando) | null (deslogado) | User
// notificacoes: null enquanto carrega; erro: true se a consulta falhar.
export function useNotificacoes() {
    const [user, setUser] = useState(undefined);
    const [notificacoes, setNotificacoes] = useState(null);
    const [erro, setErro] = useState(false);

    useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

    useEffect(() => {
        if (!user) {
            setNotificacoes(user === null ? [] : null);
            return;
        }
        setErro(false);
        return ouvirNotificacoes(user.uid, setNotificacoes, () => setErro(true));
    }, [user]);

    return { user, notificacoes, erro };
}

// Sino com o número de não lidas; leva a /notificacoes. Só aparece logado.
export default function SinoNotificacoes({ className = "" }) {
    const { t, formatarNumero } = useI18n();
    const { user, notificacoes } = useNotificacoes();
    if (!user) return null;

    const naoLidas = (notificacoes || []).filter((n) => !n.lida).length;
    const rotulo = naoLidas > 0
        ? t(naoLidas === 1 ? "notificacoes.sinoUma" : "notificacoes.sinoVarias", { n: formatarNumero(naoLidas) })
        : t("notificacoes.titulo");

    return (
        <Link
            href="/notificacoes"
            aria-label={rotulo}
            title={rotulo}
            className={`relative flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 ${className}`}
        >
            <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {naoLidas > 0 && (
                <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                    {naoLidas > 9 ? "9+" : naoLidas}
                </span>
            )}
        </Link>
    );
}
