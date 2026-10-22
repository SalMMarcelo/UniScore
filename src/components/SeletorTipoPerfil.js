"use client";

import { useEffect, useState } from "react";
import { TIPOS_PERFIL, carregarUniversidades, rotuloTipoPerfil } from "../lib/usuarios";
import { useI18n } from "../i18n/I18nProvider";

// Grupo de opções "tipo de perfil" (RF01) + universidade opcional para universitários.
// Usado em /cadastro e /perfil.
export default function SeletorTipoPerfil({
  tipoPerfil,
  onTipoPerfilChange,
  universidadeId,
  onUniversidadeIdChange,
  obrigatorio = true,
  destacar = false,
  idBase = "tipo-perfil"
}) {
  const { t } = useI18n();
  const [universidades, setUniversidades] = useState([]);

  useEffect(() => {
    let ativo = true;
    carregarUniversidades()
      .then(lista => { if (ativo) setUniversidades(lista); })
      .catch(err => console.error("Erro ao carregar universidades:", err));
    return () => { ativo = false; };
  }, []);

  return (
    <div className="w-full">
      <fieldset
        className={`rounded-lg p-3 border ${destacar ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300" : "border-gray-300"}`}
      >
        <legend className="px-1 text-sm font-semibold text-gray-900">
          {destacar ? t("seletorPerfil.escolha") : t("seletorPerfil.tipo")}
          {obrigatorio && <span className="text-red-600" aria-hidden="true"> *</span>}
        </legend>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {TIPOS_PERFIL.map(tipo => {
            const id = `${idBase}-${tipo.valor}`;
            const selecionado = tipoPerfil === tipo.valor;
            return (
              <label
                key={tipo.valor}
                htmlFor={id}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${
                  selecionado ? "border-blue-600 bg-blue-50 text-blue-800 font-semibold" : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  id={id}
                  name={idBase}
                  value={tipo.valor}
                  checked={selecionado}
                  onChange={() => onTipoPerfilChange(tipo.valor)}
                  required={obrigatorio}
                  className="accent-blue-600"
                />
                {rotuloTipoPerfil(tipo.valor, t)}
              </label>
            );
          })}
        </div>
      </fieldset>

      {tipoPerfil === "universitario" && (
        <div className="mt-3">
          <label htmlFor={`${idBase}-universidade`} className="block text-sm font-semibold text-gray-900 mb-1">
            {t("seletorPerfil.universidade")} <span className="font-normal text-gray-600">{t("seletorPerfil.opcional")}</span>
          </label>
          <select
            id={`${idBase}-universidade`}
            value={universidadeId || ""}
            onChange={e => onUniversidadeIdChange(e.target.value || null)}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("seletorPerfil.prefiroNaoInformar")}</option>
            {universidades.map(uni => (
              <option key={uni.id} value={String(uni.id)}>
                {uni.nome}{uni.sigla && uni.sigla !== uni.nome ? ` (${uni.sigla})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
