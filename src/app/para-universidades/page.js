"use client";
import Link from "next/link";
import MenuMobile from "../../components/MenuMobile";

export default function ParaUniversidades() {
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                <img src="/uniscore_star_logo.png" alt="UniScore - página inicial" className="h-10 sm:h-16 w-auto max-w-[140px] sm:max-w-[220px]" />
                            </Link>
                        </div>
                        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600" aria-label="Principal">
                            <button className="hover:text-gray-900 transition-colors flex items-center gap-1">
                                Soluções <span className="text-xs" aria-hidden="true">▼</span>
                            </button>
                            <button className="hover:text-gray-900 transition-colors flex items-center gap-1">
                                Recursos <span className="text-xs" aria-hidden="true">▼</span>
                            </button>
                            <button className="hover:text-gray-900 transition-colors flex items-center gap-1">
                                Preços <span className="text-xs" aria-hidden="true">▼</span>
                            </button>
                            <button className="hover:text-gray-900 transition-colors flex items-center gap-1">
                                Suporte <span className="text-xs" aria-hidden="true">▼</span>
                            </button>
                        </nav>
                        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                            <Link href="/login-universidades" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
                                Iniciar sessão
                            </Link>
                            <Link href="/cadastro-universidades" className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-md">
                                Criar conta gratuita
                            </Link>
                            <MenuMobile />
                        </div>
                    </div>
                </div>
            </header>

            <main id="conteudo">
            {/* Hero Section */}
            <section className="bg-white py-20">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        <div className="flex-1 max-w-2xl">
                            <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                                A maior plataforma independente de avaliação de eventos universitários
                            </h1>
                            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                                Atraia e mantenha estudantes com a plataforma de avaliação da UniScore e ferramentas poderosas de análise de eventos.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button type="button" className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:from-red-700 hover:to-red-800 transition-all">
                                    Agendar uma demonstração
                                </button>
                            </div>
                        </div>

                        {/* Área para imagens */}
                        <div className="flex-1 relative">
                            <div className="rounded-2xl shadow-2xl overflow-hidden border border-gray-200 bg-white p-4">
                                <img src="/para_universidades.png" alt="UniScore para Universidades" className="w-full h-auto object-cover rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-gray-50 py-16">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
                        Por que universidades escolhem a UniScore?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg aria-hidden="true" className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-gray-900">Análises Detalhadas</h3>
                            <p className="text-gray-600">Obtenha insights valiosos sobre seus eventos com relatórios completos e métricas de satisfação.</p>
                        </div>
                        <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg aria-hidden="true" className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-gray-900">Maior Engajamento</h3>
                            <p className="text-gray-600">Aumente a participação em eventos com avaliações transparentes e feedback construtivo.</p>
                        </div>
                        <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg aria-hidden="true" className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-gray-900">Reputação Fortalecida</h3>
                            <p className="text-gray-600">Construa uma reputação sólida com avaliações reais de estudantes e visitantes.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-r from-red-600 to-red-700 text-white py-16">
                <div className="max-w-4xl mx-auto text-center px-6">
                    <h2 className="text-4xl font-bold mb-6">Pronto para transformar seus eventos?</h2>
                    <p className="text-xl mb-8 text-white">Junte-se às universidades que já usam a UniScore para melhorar seus eventos.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/cadastro-universidades" className="bg-white text-red-700 px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:bg-gray-100 transition-all">
                            Criar conta gratuita
                        </Link>
                        <button type="button" className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-red-600 transition-all">
                            Falar com especialista
                        </button>
                    </div>
                </div>
            </section>
            </main>
        </div>
    );
}