"use client";
import { useState } from "react";
import Link from "next/link";
import { auth } from "../../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import BotoesLoginSocial from "../../components/BotoesLoginSocial";
import SeletorTipoPerfil from "../../components/SeletorTipoPerfil";
import {
    NOME_MAX,
    isTipoPerfilValido,
    garantirDocumentoUsuario,
    destinoAposLogin,
    mensagemErroAuth
} from "../../lib/usuarios";

export default function Cadastro() {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [avatar, setAvatar] = useState("/avatar-default.png");
    const [tipoPerfil, setTipoPerfil] = useState("");
    const [universidadeId, setUniversidadeId] = useState(null);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro("");
        setSucesso("");
        if (!isTipoPerfilValido(tipoPerfil)) {
            setErro("Escolha seu tipo de perfil.");
            return;
        }
        setLoading(true);
        let user;
        try {
            // Cria usuário no Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            user = userCredential.user;
        } catch (err) {
            setErro("Erro ao cadastrar: " + mensagemErroAuth(err));
            setLoading(false);
            return;
        }
        const nomeFinal = nome.trim().slice(0, NOME_MAX);
        try {
            // Atualiza displayName e avatar
            await updateProfile(user, { displayName: nomeFinal, photoURL: avatar });
        } catch (err) {
            console.error("Erro ao atualizar Auth:", err);
        }
        let dados = null;
        try {
            // Salva dados no Firestore (usuarios/{uid})
            dados = await garantirDocumentoUsuario(user, {
                nome: nomeFinal,
                avatar,
                tipoPerfil,
                universidadeId: tipoPerfil === "universitario" ? universidadeId : null
            });
        } catch (err) {
            // A conta já foi criada; o perfil pode ser completado depois em /perfil
            console.error("Erro ao salvar perfil no Firestore:", err);
        }
        setSucesso("Cadastro realizado com sucesso! Redirecionando...");
        window.location.href = destinoAposLogin(user, dados, { exigirTipoPerfil: true });
    };

    return (
        <main id="conteudo" className="min-h-screen flex items-center justify-center bg-mackenzie-light p-4">
            <form className="bg-white p-5 sm:p-8 rounded shadow-md w-full max-w-md flex flex-col gap-4" onSubmit={handleSubmit}>
                <h1 className="text-2xl font-bold text-mackenzie-red mb-4 text-center">Cadastro</h1>
                <p id="cadastro-avatar-rotulo" className="sr-only">Escolha seu avatar</p>
                <div className="flex justify-center gap-4 mb-2" role="group" aria-labelledby="cadastro-avatar-rotulo">
                    <button
                        type="button"
                        className={`border-2 rounded-full p-1 ${avatar === "/avatar-default.png" ? "border-mackenzie-red" : "border-gray-200"}`}
                        onClick={() => setAvatar("/avatar-default.png")}
                        title="Avatar masculino"
                        aria-label="Avatar masculino"
                        aria-pressed={avatar === "/avatar-default.png"}
                    >
                        <img src="/avatar-default.png" alt="" className="w-12 h-12 rounded-full object-cover" />
                    </button>
                    <button
                        type="button"
                        className={`border-2 rounded-full p-1 ${avatar === "/avatar-feminino-default.jpg" ? "border-mackenzie-red" : "border-gray-200"}`}
                        onClick={() => setAvatar("/avatar-feminino-default.jpg")}
                        title="Avatar feminino"
                        aria-label="Avatar feminino"
                        aria-pressed={avatar === "/avatar-feminino-default.jpg"}
                    >
                        <img src="/avatar-feminino-default.jpg" alt="" className="w-12 h-12 rounded-full object-cover" />
                    </button>
                </div>
                <div>
                    <label htmlFor="cadastro-nome" className="block text-sm font-medium text-gray-700 mb-1">
                        Nome
                    </label>
                    <input
                        id="cadastro-nome"
                        type="text"
                        autoComplete="name"
                        placeholder="Nome"
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={NOME_MAX}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="cadastro-email" className="block text-sm font-medium text-gray-700 mb-1">
                        E-mail
                    </label>
                    <input
                        id="cadastro-email"
                        type="email"
                        autoComplete="email"
                        placeholder="E-mail"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="cadastro-senha" className="block text-sm font-medium text-gray-700 mb-1">
                        Senha
                    </label>
                    <input
                        id="cadastro-senha"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Senha (mínimo 6 caracteres)"
                        aria-describedby="cadastro-senha-ajuda"
                        minLength={6}
                        value={senha}
                        onChange={e => setSenha(e.target.value)}
                        className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    <p id="cadastro-senha-ajuda" className="text-xs text-gray-600 mt-1">Mínimo de 6 caracteres.</p>
                </div>
                <SeletorTipoPerfil
                    tipoPerfil={tipoPerfil}
                    onTipoPerfilChange={setTipoPerfil}
                    universidadeId={universidadeId}
                    onUniversidadeIdChange={setUniversidadeId}
                    idBase="cadastro-tipo-perfil"
                />
                <button
                    type="submit"
                    className="bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
                    disabled={loading}
                >
                    {loading ? "Cadastrando..." : "Cadastrar"}
                </button>
                {sucesso && <div className="text-green-700 text-center mt-2" role="status">{sucesso}</div>}
                {erro && <div className="text-red-700 text-center mt-2" role="alert">{erro}</div>}
                <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-600">Ou cadastre-se com</span>
                    </div>
                </div>
                <BotoesLoginSocial acao="Continuar" onErro={setErro} disabled={loading} />
                <p className="text-gray-600 text-center text-sm">
                    Já tem uma conta?{' '}
                    <Link href="/login" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
                        Entrar
                    </Link>
                </p>
            </form>
        </main>
    );
}
