"use client";

import Link from "next/link";
import { useI18n } from "../i18n/I18nProvider";

export default function AccessTypeTabs({ active }) {
  const { t } = useI18n();
  return (
    <div className="max-w-md mx-auto mb-8">
      <nav className="flex bg-gray-100 rounded-lg p-1" aria-label={t("acesso.tiposAcesso")}>
        <Link
          href="/login"
          aria-current={active === "estudante" ? "page" : undefined}
          className={`flex-1 text-center py-2 rounded-md text-sm font-semibold transition-all ${
            active === "estudante"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          {t("acesso.estudante")}
        </Link>
        <Link
          href="/login-universidades"
          aria-current={active === "universidade" ? "page" : undefined}
          className={`flex-1 text-center py-2 rounded-md text-sm font-semibold transition-all ${
            active === "universidade"
              ? "bg-white text-red-700 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          {t("acesso.universidade")}
        </Link>
      </nav>
      {active === "estudante" && (
        <p className="text-xs text-gray-600 text-center mt-2">
          {t("acesso.avisoAdmin")}
        </p>
      )}
    </div>
  );
}
