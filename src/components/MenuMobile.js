"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { useI18n } from "../i18n/I18nProvider";
import SeletorIdioma from "./SeletorIdioma";

// Menu de navegação para telas pequenas (abaixo de md), onde a <nav> do
// cabeçalho fica oculta. Botão com aria-expanded/aria-controls, fecha com Esc,
// ao clicar fora e ao navegar.
export default function MenuMobile({ className = "" }) {
  const { t } = useI18n();
  const [aberto, setAberto] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const idMenu = useId();
  const botaoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Fecha ao trocar de rota
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  useEffect(() => {
    if (!aberto) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setAberto(false);
        botaoRef.current?.focus();
      }
    };
    const handleClickFora = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setAberto(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickFora);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickFora);
    };
  }, [aberto]);

  const fechar = () => setAberto(false);
  const classeLink =
    "block rounded-lg px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-700";

  return (
    <div ref={containerRef} className={`relative md:hidden ${className}`}>
      <button
        ref={botaoRef}
        type="button"
        aria-expanded={aberto}
        aria-controls={idMenu}
        aria-label={aberto ? t("menu.fechar") : t("menu.abrir")}
        onClick={() => setAberto((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
      >
        {aberto ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      <nav
        id={idMenu}
        aria-label={t("menu.principal")}
        hidden={!aberto}
        className="absolute right-0 top-full z-[70] mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
      >
        <ul className="flex flex-col">
          <li>
            <Link href="/" onClick={fechar} className={classeLink} aria-current={pathname === "/" ? "page" : undefined}>
              {t("menu.inicio")}
            </Link>
          </li>
          <li>
            <Link href="/eventos" onClick={fechar} className={classeLink} aria-current={pathname === "/eventos" ? "page" : undefined}>
              {t("menu.buscarEventos")}
            </Link>
          </li>
          <li>
            <Link href="/forum" onClick={fechar} className={classeLink} aria-current={pathname === "/forum" ? "page" : undefined}>
              {t("menu.forum")}
            </Link>
          </li>
          <li>
            <Link href="/avaliar" onClick={fechar} className={classeLink} aria-current={pathname === "/avaliar" ? "page" : undefined}>
              {t("menu.escrevaAvaliacao")}
            </Link>
          </li>
          <li>
            <Link href="/ranking" onClick={fechar} className={classeLink} aria-current={pathname === "/ranking" ? "page" : undefined}>
              {t("menu.ranking")}
            </Link>
          </li>
          <li>
            <Link href="/para-universidades" onClick={fechar} className={classeLink} aria-current={pathname === "/para-universidades" ? "page" : undefined}>
              {t("menu.paraUniversidades")}
            </Link>
          </li>
          {user && (
            <li>
              <Link href="/notificacoes" onClick={fechar} className={classeLink} aria-current={pathname === "/notificacoes" ? "page" : undefined}>
                {t("menu.notificacoes")}
              </Link>
            </li>
          )}
          <li>
            {user ? (
              <Link href="/perfil" onClick={fechar} className={classeLink} aria-current={pathname === "/perfil" ? "page" : undefined}>
                {t("menu.perfil")}
              </Link>
            ) : (
              <Link href="/login" onClick={fechar} className={classeLink} aria-current={pathname === "/login" ? "page" : undefined}>
                {t("menu.entrar")}
              </Link>
            )}
          </li>
        </ul>
        <div className="mt-1 border-t border-gray-200 px-4 pb-2 pt-3">
          <SeletorIdioma />
        </div>
      </nav>
    </div>
  );
}
