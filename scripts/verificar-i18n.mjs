// Confere se pt-BR.js (fonte da verdade) e en-US.js têm exatamente as mesmas chaves.
// Uso: node scripts/verificar-i18n.mjs   (sai com código 1 se houver diferença)
import ptBR from "../src/i18n/pt-BR.js";
import enUS from "../src/i18n/en-US.js";

function chaves(obj, prefixo = "") {
    return Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === "object" && !Array.isArray(v) ? chaves(v, `${prefixo}${k}.`) : [`${prefixo}${k}`]
    );
}

const pt = new Set(chaves(ptBR));
const en = new Set(chaves(enUS));
const faltamEn = [...pt].filter((k) => !en.has(k));
const sobramEn = [...en].filter((k) => !pt.has(k));

if (faltamEn.length) console.log("Faltam em en-US:\n  " + faltamEn.join("\n  "));
if (sobramEn.length) console.log("Sobram em en-US (não existem em pt-BR):\n  " + sobramEn.join("\n  "));
if (faltamEn.length || sobramEn.length) process.exit(1);
console.log(`i18n ok: ${pt.size} chaves iguais em pt-BR e en-US`);
