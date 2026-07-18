"use client";

import Link from "next/link";

export default function AccessTypeTabs({ active }) {
  return (
    <div className="max-w-md mx-auto mb-8">
      <div className="flex bg-gray-100 rounded-lg p-1">
        <Link
          href="/login"
          className={`flex-1 text-center py-2 rounded-md text-sm font-semibold transition-all ${
            active === "estudante"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Estudante / Visitante
        </Link>
        <Link
          href="/login-universidades"
          className={`flex-1 text-center py-2 rounded-md text-sm font-semibold transition-all ${
            active === "universidade"
              ? "bg-white text-red-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Universidade parceira
        </Link>
      </div>
      {active === "estudante" && (
        <p className="text-xs text-gray-500 text-center mt-2">
          É administrador da plataforma? Entre por aqui — o acesso é liberado automaticamente pelo seu e-mail cadastrado.
        </p>
      )}
    </div>
  );
}
