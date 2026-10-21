"use client";

import Link from "next/link";

export default function AccessTypeTabs({ active }) {
  return (
    <div className="max-w-md mx-auto mb-8">
      <nav className="flex bg-gray-100 rounded-lg p-1" aria-label="Tipo de acesso">
        <Link
          href="/login"
          aria-current={active === "estudante" ? "page" : undefined}
          className={`flex-1 text-center py-2 rounded-md text-sm font-semibold transition-all ${
            active === "estudante"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Estudante / Visitante
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
          Universidade parceira
        </Link>
      </nav>
      {active === "estudante" && (
        <p className="text-xs text-gray-600 text-center mt-2">
          É administrador da plataforma? Entre por aqui — o acesso é liberado automaticamente pelo seu e-mail cadastrado.
        </p>
      )}
    </div>
  );
}
