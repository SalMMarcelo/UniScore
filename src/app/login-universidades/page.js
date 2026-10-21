"use client";
import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AccessTypeTabs from "../../components/AccessTypeTabs";

export default function LoginUniversidades() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    // Só vai para o dashboard se a conta tiver cadastro em universidades/{uid}
    const verificarUniversidade = useCallback(async (user) => {
        try {
            const docSnap = await getDoc(doc(db, "universidades", user.uid));
            if (docSnap.exists()) {
                router.push("/dashboard-universidade");
                return;
            }
        } catch (err) {
            // permission-denied também indica que não é uma conta de universidade
            console.error("Erro ao verificar conta de universidade:", err);
            if (err.code !== "permission-denied") {
                setError("Erro ao verificar a conta. Tente novamente.");
                return;
            }
        }
        setError("Esta conta não é de uma universidade parceira. Use o login de estudante ou cadastre sua universidade.");
    }, [router]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                verificarUniversidade(user);
            }
        });
        return () => unsubscribe();
    }, [verificarUniversidade]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const cred = await signInWithEmailAndPassword(auth, email, senha);
            await verificarUniversidade(cred.user);
        } catch (err) {
            console.error("Erro no login:", err);
            if (err.code === 'auth/user-not-found') {
                setError("Usuário não encontrado. Verifique se sua universidade está cadastrada.");
            } else if (err.code === 'auth/wrong-password') {
                setError("Senha incorreta. Tente novamente.");
            } else if (err.code === 'auth/invalid-email') {
                setError("Email inválido. Verifique o formato do email.");
            } else {
                setError(err.message || "Erro ao fazer login. Verifique suas credenciais.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Lado esquerdo - Formulário */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Logo e Título */}
                    <div className="text-center mb-8">
                        <Link href="/para-universidades" className="inline-block mb-6">
                            <img src="/uniscore_star_logo.png" alt="UniScore Logo" className="h-16 w-auto mx-auto max-w-[200px]" />
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Acesso Institucional</h1>
                        <p className="text-gray-600">Login exclusivo para universidades parceiras</p>
                    </div>

                    <AccessTypeTabs active="universidade" />

                    {/* Card do formulário */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                        <form onSubmit={handleLogin} className="space-y-5">
                            {/* Mensagem de erro */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span className="text-sm text-red-700">{error}</span>
                                </div>
                            )}

                            {/* Campo Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Institucional
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="reitor@universidade.edu.br"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Use seu email oficial da instituição</p>
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
                                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
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

                            {/* Botão de Login */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-bold hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                        Acessar Dashboard
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Links adicionais */}
                        <div className="mt-6 space-y-4">
                            <div className="text-center">
                                <button className="text-sm text-gray-600 hover:text-red-600 hover:underline transition-colors">
                                    Esqueceu sua senha?
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-gray-500">Ainda não é parceira?</span>
                                </div>
                            </div>

                            <div className="text-center">
                                <Link href="/cadastro-universidades">
                                    <button className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                        </svg>
                                        Solicitar Parceria
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Ajuda */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Precisa de ajuda? Entre em contato com nosso{' '}
                            <a href="mailto:suporte@uniscore.com" className="text-red-600 font-semibold hover:underline">
                                suporte especializado
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            {/* Lado direito - Painel informativo */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-red-600 via-red-700 to-red-800 relative overflow-hidden">
                {/* Conteúdo */}
                <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
                    <div className="max-w-md text-center">
                        <div className="mb-8">
                            <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                                <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                </svg>
                            </div>
                            <h2 className="text-4xl font-bold mb-4">
                                Dashboard Institucional
                            </h2>
                            <p className="text-xl text-red-100 leading-relaxed">
                                Gerencie eventos, monitore avaliações e fortaleça a reputação da sua universidade.
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-4 mt-12">
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <svg className="w-6 h-6 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                                <span className="text-red-100">Análise de métricas e desempenho</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <svg className="w-6 h-6 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                <span className="text-red-100">Gestão completa de eventos</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <svg className="w-6 h-6 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                                <span className="text-red-100">Monitoramento de feedbacks</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <svg className="w-6 h-6 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                </svg>
                                <span className="text-red-100">Dados seguros e privacidade</span>
                            </div>
                        </div>

                        {/* Estatísticas */}
                        <div className="mt-12 grid grid-cols-2 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold mb-1">67</div>
                                <div className="text-sm text-red-100">Universidades Parceiras</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold mb-1">1.2k+</div>
                                <div className="text-sm text-red-100">Eventos Cadastrados</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Elementos decorativos */}
                <div className="absolute top-20 right-20 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-20 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
}
