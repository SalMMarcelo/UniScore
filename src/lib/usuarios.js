// Perfis de usuário (RF01 — Cadastro e Autenticação).
//
// Documento: usuarios/{uid}
// { nome (string ≤ 100), avatar (url), email (string ou null), criadoEm (timestamp),
//   tipoPerfil ('universitario' | 'familiar' | 'visitante' | 'convidado'),
//   universidadeId (id de public/universidades.json, como string, ou null),
//   updatedAt (ISO string, gravado por /perfil) }
//
// Atenção: o tipo de perfil NÃO pode se chamar "papel" nem "role" — esses
// campos são reservados e bloqueados pelas regras do Firestore.

import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { isAdminEmail } from "./admin";

// Mantenha sincronizado com isValidTipoPerfil() em firestore.rules.
export const TIPOS_PERFIL = [
  { valor: "universitario", rotulo: "Universitário" },
  { valor: "familiar", rotulo: "Familiar" },
  { valor: "visitante", rotulo: "Visitante" },
  { valor: "convidado", rotulo: "Convidado" }
];

export const NOME_MAX = 100;
const AVATAR_PADRAO = "/avatar-default.png";

export function isTipoPerfilValido(valor) {
  return TIPOS_PERFIL.some(t => t.valor === valor);
}

export function rotuloTipoPerfil(valor) {
  const tipo = TIPOS_PERFIL.find(t => t.valor === valor);
  return tipo ? tipo.rotulo : "";
}

// Nome sempre string não vazia com no máximo NOME_MAX caracteres
function nomeSeguro(nome, user) {
  const base = String(nome || user.displayName || (user.email || "").split("@")[0] || "Usuário").trim();
  return (base || "Usuário").slice(0, NOME_MAX);
}

// Só estes campos podem vir em `extras` (evita gravar campos reservados)
function extrasPermitidos(extras = {}) {
  const dados = {};
  if (extras.nome !== undefined) dados.nome = String(extras.nome || "").trim().slice(0, NOME_MAX);
  if (extras.avatar !== undefined) dados.avatar = extras.avatar || AVATAR_PADRAO;
  if (extras.tipoPerfil !== undefined && isTipoPerfilValido(extras.tipoPerfil)) {
    dados.tipoPerfil = extras.tipoPerfil;
  }
  if (extras.universidadeId !== undefined) {
    dados.universidadeId = extras.universidadeId ? String(extras.universidadeId) : null;
  }
  return dados;
}

// Garante que usuarios/{uid} existe após qualquer login/cadastro (e-mail ou social).
// - Primeiro acesso: cria o documento com nome, avatar, email e criadoEm (+ extras).
// - Acessos seguintes: só completa campos ausentes (e aplica `extras`, se houver),
//   sem sobrescrever o que o usuário já editou em /perfil.
// Retorna os dados do documento (após a gravação).
export async function garantirDocumentoUsuario(user, extras = {}) {
  if (!user) return null;
  const ref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(ref);
  const permitidos = extrasPermitidos(extras);

  if (!snap.exists()) {
    const dados = {
      nome: nomeSeguro(permitidos.nome, user),
      avatar: permitidos.avatar || user.photoURL || AVATAR_PADRAO,
      email: user.email || null,
      criadoEm: serverTimestamp(),
      ...(permitidos.tipoPerfil ? { tipoPerfil: permitidos.tipoPerfil } : {}),
      ...("universidadeId" in permitidos ? { universidadeId: permitidos.universidadeId } : {})
    };
    await setDoc(ref, dados);
    return dados;
  }

  const atual = snap.data();
  const faltando = {};
  if (!atual.nome) faltando.nome = nomeSeguro(permitidos.nome, user);
  if (!atual.avatar) faltando.avatar = permitidos.avatar || user.photoURL || AVATAR_PADRAO;
  if (!atual.email && user.email) faltando.email = user.email;
  if (!atual.criadoEm) faltando.criadoEm = serverTimestamp();
  // extras explícitos (ex.: vindos do formulário de cadastro) têm prioridade
  if (permitidos.nome) faltando.nome = permitidos.nome;
  if (permitidos.tipoPerfil) faltando.tipoPerfil = permitidos.tipoPerfil;
  if ("universidadeId" in permitidos) faltando.universidadeId = permitidos.universidadeId;

  if (Object.keys(faltando).length > 0) {
    await setDoc(ref, faltando, { merge: true });
  }
  return { ...atual, ...faltando };
}

// Lista de universidades (public/universidades.json) para o campo universidadeId
export async function carregarUniversidades() {
  const res = await fetch("/universidades.json");
  if (!res.ok) throw new Error("Não foi possível carregar a lista de universidades");
  const lista = await res.json();
  return Array.isArray(lista) ? lista : [];
}

// Caminho interno indicado em ?redirect=/caminho (somente caminhos do próprio site)
export function destinoDaUrl(padrao = "/") {
  if (typeof window === "undefined") return padrao;
  const destino = new URLSearchParams(window.location.search).get("redirect");
  if (destino && destino.startsWith("/") && !destino.startsWith("//") && !destino.startsWith("/\\")) {
    return destino;
  }
  return padrao;
}

// Para onde mandar o usuário depois de entrar/cadastrar (mesma regra em /login e /cadastro).
// Com `exigirTipoPerfil`, quem ainda não escolheu o tipo de perfil vai para /perfil?completar=1.
export function destinoAposLogin(user, dadosUsuario, { exigirTipoPerfil = false } = {}) {
  if (isAdminEmail(user && user.email)) return "/forum/moderacao";
  const destino = destinoDaUrl("/");
  if (exigirTipoPerfil && !(dadosUsuario && isTipoPerfilValido(dadosUsuario.tipoPerfil))) {
    const params = new URLSearchParams({ completar: "1" });
    if (destino !== "/") params.set("redirect", destino);
    return `/perfil?${params.toString()}`;
  }
  return destino;
}

// Mensagens de erro do Firebase Auth em português
export function mensagemErroAuth(err, provedor = "") {
  const code = (err && err.code) || "";
  const com = provedor ? ` com ${provedor}` : "";
  switch (code) {
    case "auth/account-exists-with-different-credential": {
      const email = err.customData && err.customData.email;
      return `Já existe uma conta${email ? ` com o e-mail ${email}` : " com este e-mail"} criada por outro método de login. ` +
        "Entre usando o método que você usou originalmente (por exemplo, e-mail e senha ou Google).";
    }
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "A janela de login foi fechada antes de concluir. Tente novamente.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela de login. Permita pop-ups para este site e tente novamente.";
    case "auth/operation-not-allowed":
      return `O login${com} ainda não está habilitado na plataforma. Use outro método de acesso.`;
    case "auth/unauthorized-domain":
      return "Este domínio não está autorizado para login. Avise o administrador da plataforma.";
    case "auth/network-request-failed":
      return "Falha de conexão. Verifique sua internet e tente novamente.";
    case "auth/email-already-in-use":
      return "Este e-mail já está cadastrado. Faça login ou use outro e-mail.";
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/weak-password":
      return "A senha deve ter pelo menos 6 caracteres.";
    case "auth/user-disabled":
      return "Esta conta foi desativada.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    default:
      return provedor ? `Falha ao autenticar${com}.` : "Não foi possível concluir a operação. Tente novamente.";
  }
}
