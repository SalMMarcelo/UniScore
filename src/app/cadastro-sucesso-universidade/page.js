"use client";
import Link from "next/link";

export default function CadastroSucessoUniversidade() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] relative overflow-hidden">
            {/* Elementos decorativos */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-20 right-20 w-24 h-24 bg-[#ff6b6b]/20 rounded-full blur-lg animate-bounce"></div>
            <div className="absolute bottom-20 left-20 w-40 h-40 bg-[#4ecdc4]/15 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-28 h-28 bg-[#ffe066]/20 rounded-full blur-xl animate-bounce"></div>

            {/* Conteúdo principal */}
            <main id="conteudo" className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="w-full max-w-2xl relative z-10 text-center">
                    <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 sm:p-12 border border-white/20 shadow-2xl">
                        <div className="text-8xl mb-8" aria-hidden="true">🎉</div>

                        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
                            Solicitação <span className="bg-gradient-to-r from-[#ffe066] to-[#ff6b6b] bg-clip-text text-transparent">Enviada!</span>
                        </h1>

                        <p className="text-2xl text-white/90 mb-8 leading-relaxed">
                            Obrigado por se interessar em se tornar uma universidade parceira da UniScore!
                        </p>

                        <div className="bg-white/10 rounded-2xl p-8 border border-white/20 mb-8">
                            <h2 className="text-2xl font-bold text-white mb-4">Próximos Passos</h2>
                            <div className="space-y-4 text-left">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 bg-gradient-to-r from-[#ffe066] to-[#ff6b6b] rounded-full flex items-center justify-center text-gray-900 font-bold text-sm shrink-0 mt-1">
                                        1
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-2">Análise da Solicitação</h3>
                                        <p className="text-white/90">Nossa equipe irá revisar todas as informações fornecidas e verificar a autenticidade da instituição.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 bg-gradient-to-r from-[#ffe066] to-[#ff6b6b] rounded-full flex items-center justify-center text-gray-900 font-bold text-sm shrink-0 mt-1">
                                        2
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-2">Contato por Email</h3>
                                        <p className="text-white/90">Você receberá um email com o resultado da análise em até 3 dias úteis.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 bg-gradient-to-r from-[#ffe066] to-[#ff6b6b] rounded-full flex items-center justify-center text-gray-900 font-bold text-sm shrink-0 mt-1">
                                        3
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-2">Ativação da Conta</h3>
                                        <p className="text-white/90">Após a aprovação, sua conta será ativada e você poderá acessar o dashboard institucional.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-lg text-white/90 mb-6">
                                Enquanto isso, você já pode fazer login com as credenciais fornecidas.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/login-universidades" className="bg-gradient-to-r from-[#ffe066] to-[#ff6b6b] text-gray-900 px-8 py-4 rounded-full font-bold text-lg hover:from-[#ffd93d] hover:to-[#ff5252] transition-all duration-300 shadow-2xl">
                                    Fazer Login
                                </Link>

                                <Link href="/para-universidades" className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/30 transition-all duration-300 border border-white/30">
                                    Voltar ao Início
                                </Link>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/20">
                            <p className="text-sm text-white/90">
                                Dúvidas? Entre em contato conosco: <br />
                                <a href="mailto:universidades@uniscore.com" className="text-[#ffe066] hover:underline">
                                    universidades@uniscore.com
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}