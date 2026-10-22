"use client";
import Link from "next/link";
import MenuMobile from "../../components/MenuMobile";

export default function OQueFazemos() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto flex items-center justify-between gap-3 px-4 md:px-6 py-4">
                    <Link href="/" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 transition-colors">
                        <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span className="font-bold text-lg">Voltar</span>
                    </Link>

                    <img src="/uniscore_star_logo.png" alt="UniScore" className="h-10 sm:h-16 w-auto max-w-[140px] sm:max-w-[220px]" />

                    <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600" aria-label="Principal">
                        <Link href="/forum" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                            </svg>
                            Fórum
                        </Link>
                        <Link href="/relatorio" className="hover:text-yellow-600 transition-colors">Relatórios</Link>
                    </nav>
                    <MenuMobile />
                </div>
            </header>

            <main id="conteudo">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-20">
                <div className="container mx-auto px-6">
                    <div className="text-center">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                            O que <span className="text-yellow-300">fazemos</span>
                        </h1>
                        <p className="text-xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
                            Revolucionamos a forma como universidades e estudantes se conectam através de feedback valioso
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 md:px-6 py-12">
                {/* Video Section */}
                <div className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm mb-12">
                    <div className="text-center mb-8">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Conheça nossa plataforma</h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Descubra como o UniScore conecta culturas através de avaliações transparentes feitas pela comunidade acadêmica
                        </p>
                    </div>

                    <div className="flex justify-center mb-6">
                        <div className="relative group">
                            <video
                                width="800"
                                height="450"
                                controls
                                className="w-full max-w-full h-auto rounded-xl shadow-lg border border-gray-200"
                                poster="/video-poster.jpg"
                            >
                                <source src="/Avalie_o_Impacto_dos_Eventos_Universitrios_com_Nos.mp4" type="video/mp4" />
                                Seu navegador não suporta o elemento de vídeo.
                            </video>
                        </div>
                    </div>
                </div>

                {/* Mission Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-red-500 rounded-2xl flex items-center justify-center">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-900">Nossa missão</h3>
                                <p className="text-gray-600">Conectando culturas através de eventos universitários</p>
                            </div>
                        </div>
                        <p className="text-lg text-gray-700 leading-relaxed">
                            O UniScore é uma plataforma para avaliação de eventos universitários que promove
                            <strong className="text-gray-900"> transparência e intercâmbio cultural</strong>. Conectamos estudantes de diferentes origens,
                            permitindo que compartilhem experiências e <strong className="text-gray-900">avaliem o impacto dos eventos</strong> em suas vidas acadêmicas e pessoais.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-900">Impacto dos eventos</h3>
                                <p className="text-gray-600">Avalie e compartilhe experiências</p>
                            </div>
                        </div>
                        <p className="text-lg text-gray-700 leading-relaxed">
                            Compartilhe como os eventos <strong className="text-gray-900">impactaram sua formação acadêmica e pessoal</strong>.
                            Avalie aspectos como qualidade, organização, relevância e também
                            <strong className="text-gray-900"> intercâmbio cultural e diversidade</strong> promovidos.
                        </p>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-12">
                    <h3 className="text-4xl font-bold text-gray-900 text-center mb-12">O que oferecemos</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center hover:shadow-md transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">Avaliações Transparentes</h4>
                            <p className="text-gray-600">Sistema de notas e comentários para eventos universitários com total transparência</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center hover:shadow-md transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">Intercâmbio Cultural</h4>
                            <p className="text-gray-600">Conecte-se com pessoas de diferentes origens e compartilhe experiências</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center hover:shadow-md transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">Avaliação de Qualidade</h4>
                            <p className="text-gray-600">Avalie aspectos como organização, conteúdo e impacto dos eventos</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center hover:shadow-md transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">Analytics para Universidades</h4>
                            <p className="text-gray-600">Relatórios detalhados sobre o impacto e qualidade dos eventos universitários</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center hover:shadow-md transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">Rede de Contatos</h4>
                            <p className="text-gray-600">Conecte-se com outros participantes e amplie sua rede acadêmica e profissional</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center hover:shadow-md transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">Desenvolvimento Acadêmico</h4>
                            <p className="text-gray-600">Acompanhe como os eventos contribuem para sua formação e crescimento pessoal</p>
                        </div>
                    </div>
                </div>

                {/* Impact Stats */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-12">
                    <h3 className="text-4xl font-bold text-gray-900 text-center mb-12">Nosso impacto</h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="text-5xl font-bold text-gray-900 mb-2">25+</div>
                            <div className="text-gray-600 text-lg">Universidades Parceiras</div>
                        </div>
                        <div className="text-center">
                            <div className="text-5xl font-bold text-gray-900 mb-2">10k+</div>
                            <div className="text-gray-600 text-lg">Eventos Avaliados</div>
                        </div>
                        <div className="text-center">
                            <div className="text-5xl font-bold text-gray-900 mb-2">50k+</div>
                            <div className="text-gray-600 text-lg">Estudantes Ativos</div>
                        </div>
                        <div className="text-center">
                            <div className="text-5xl font-bold text-gray-900 mb-2">4.8★</div>
                            <div className="text-gray-600 text-lg">Satisfação Geral</div>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="bg-gradient-to-r from-green-700 to-green-800 rounded-2xl p-6 sm:p-12 text-center shadow-lg mb-12">
                    <h3 className="text-3xl sm:text-4xl font-bold text-white mb-6">Pronto para fazer a diferença?</h3>
                    <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
                        Junte-se à revolução da transparência universitária e ajude a construir um futuro melhor para a educação superior
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        <Link
                            href="/cadastro"
                            className="bg-white text-green-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl"
                        >
                            Começar Agora
                        </Link>
                        <Link
                            href="/"
                            className="bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-green-800 transition-all duration-300 border-2 border-white/20"
                        >
                            Voltar ao Início
                        </Link>
                    </div>
                </div>
            </div>
            </main>
        </div>
    );
}
