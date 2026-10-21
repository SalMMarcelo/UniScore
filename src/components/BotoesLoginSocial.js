"use client";

import { useState } from "react";
import { auth } from "../firebase";
import { GoogleAuthProvider, FacebookAuthProvider, GithubAuthProvider, signInWithPopup } from "firebase/auth";
import { garantirDocumentoUsuario, destinoAposLogin, mensagemErroAuth } from "../lib/usuarios";

const PROVEDORES = [
  {
    id: "google",
    nome: "Google",
    criar: () => new GoogleAuthProvider(),
    icone: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    )
  },
  {
    id: "facebook",
    nome: "Facebook",
    criar: () => {
      const provider = new FacebookAuthProvider();
      provider.addScope("email");
      return provider;
    },
    icone: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#1877F2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
      </svg>
    )
  },
  {
    id: "github",
    nome: "GitHub",
    criar: () => {
      const provider = new GithubAuthProvider();
      provider.addScope("user:email");
      return provider;
    },
    icone: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#181717" d="M12 .3a12 12 0 00-3.8 23.38c.6.12.83-.26.83-.57v-2c-3.34.72-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.6-2.67-.31-5.47-1.34-5.47-5.94 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 016 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.25 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0012 .3"/>
      </svg>
    )
  }
];

// Botões "Entrar com Google / Facebook / GitHub" (RF01), usados em /login e /cadastro.
// Após o login: garante usuarios/{uid}; se o usuário ainda não escolheu o tipo de
// perfil, vai para /perfil?completar=1; senão, para o destino padrão (ver destinoAposLogin).
export default function BotoesLoginSocial({ acao = "Entrar", onErro, disabled = false }) {
  const [carregando, setCarregando] = useState(null);

  const entrar = async (provedor) => {
    if (onErro) onErro("");
    setCarregando(provedor.id);
    let user;
    try {
      ({ user } = await signInWithPopup(auth, provedor.criar()));
    } catch (err) {
      console.error(`Erro no login com ${provedor.nome}:`, err);
      if (onErro) onErro(mensagemErroAuth(err, provedor.nome));
      setCarregando(null);
      return;
    }

    let dados = null;
    try {
      dados = await garantirDocumentoUsuario(user);
    } catch (err) {
      // O login em si deu certo; o perfil pode ser completado depois em /perfil
      console.error("Erro ao criar/atualizar documento do usuário:", err);
    }
    window.location.href = destinoAposLogin(user, dados, { exigirTipoPerfil: true });
  };

  return (
    <div className="space-y-3">
      {PROVEDORES.map(provedor => (
        <button
          key={provedor.id}
          type="button"
          onClick={() => entrar(provedor)}
          disabled={disabled || carregando !== null}
          className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {carregando === provedor.id ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
          ) : (
            provedor.icone
          )}
          {acao} com {provedor.nome}
        </button>
      ))}
    </div>
  );
}
