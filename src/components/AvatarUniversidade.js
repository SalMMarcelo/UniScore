"use client";
// Logo da universidade do catálogo ou, quando `imagem` é null (ou a imagem
// não carrega), um círculo com as iniciais (sigla ou nome).
import { useState } from "react";
import { iniciaisUniversidade } from "../lib/universidades";

export default function AvatarUniversidade({ uni, alt = "", className = "w-12 h-12", classeIniciais = "text-base" }) {
  const [falhou, setFalhou] = useState(false);
  const imagem = uni && uni.imagem;

  if (imagem && !falhou) {
    return (
      <img
        src={imagem}
        alt={alt}
        onError={() => setFalhou(true)}
        className={`${className} rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : "true"}
      className={`${className} rounded-full inline-flex items-center justify-center shrink-0 bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] text-white font-bold select-none ${classeIniciais}`}
    >
      {iniciaisUniversidade(uni)}
    </span>
  );
}
