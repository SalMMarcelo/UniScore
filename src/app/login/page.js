"use client";
import { useState } from "react";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Link from "next/link";
import AccessTypeTabs from "../../components/AccessTypeTabs";
import { isAdminEmail } from "../../lib/admin";

export default function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const redirectAfterLogin = (loggedInEmail) => {
        window.location.href = isAdminEmail(loggedInEmail) ? "/forum/moderacao" : "/";
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro("");
        setLoading(true);
        try {
            const { user } = await signInWithEmailAndPassword(auth, email, senha);
            redirectAfterLogin(user.email);
        } catch (err) {
            setErro("Usuário ou senha inválidos.");
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setErro("");
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const { user } = await signInWithPopup(auth, provider);
            redirectAfterLogin(user.email);
        } catch (err) {
            setErro("Falha ao autenticar com Google.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Lado esquerdo - Formulário */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Logo e Título */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-block mb-6">
                            <img src="/uniscore_star_logo.png" alt="UniScore Logo" className="h-16 w-auto mx-auto max-w-[200px]" />
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo de volta!</h1>
                        <p className="text-gray-600">Entre para continuar avaliando eventos universitários</p>
                    </div>

                    <AccessTypeTabs active="estudante" />

                    {/* Card do formulário */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                        <form onSubmit={handleLogin} className="space-y-5">
                            {/* Campo Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    E-mail
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="seu@email.com"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Campo Senha */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Senha
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                        </svg>
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        value={senha}
                                        onChange={e => setSenha(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Mensagem de erro */}
                            {erro && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span className="text-sm text-red-700">{erro}</span>
                                </div>
                            )}

                            {/* Botão de Login */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Entrando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                                        </svg>
                                        Entrar
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divisor */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">Ou continue com</span>
                            </div>
                        </div>

                        {/* Botão Google */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Entrar com Google
                        </button>

                        {/* Link para cadastro */}
                        <div className="mt-6 text-center">
                            <p className="text-gray-600">
                                Não tem uma conta?{' '}
                                <Link href="/cadastro" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
                                    Cadastre-se grátis
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lado direito - Imagem/Informação */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
                {/* Padrão de fundo */}
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                
                {/* Conteúdo */}
                <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
                    <div className="max-w-md text-center">
                        <div className="mb-8">
                            <div className="w-32 h-32 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm p-6">
                                <img src="/uniscore_star_logo.png" alt="UniScore Logo" className="w-full h-full object-contain" />
                            </div>
                            <h2 className="text-4xl font-bold mb-4">
                                Avalie eventos universitários
                            </h2>
                            <p className="text-xl text-blue-100 leading-relaxed">
                                Compartilhe suas experiências e ajude outros estudantes a descobrir os melhores eventos culturais e acadêmicos.
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-4 mt-12">
                            {[
                                { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "Avalie eventos e universidades" },
                                { icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z", text: "Participe do fórum estudantil" },
                                { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", text: "Acesse relatórios e estatísticas" }
                            ].map((feature, index) => (
                                <div key={index} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                    <div className="flex-shrink-0">
                                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feature.icon}/>
                                        </svg>
                                    </div>
                                    <span className="text-blue-100">{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Elementos decorativos */}
                <div className="absolute top-20 right-20 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-20 w-40 h-40 bg-green-400/20 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
}