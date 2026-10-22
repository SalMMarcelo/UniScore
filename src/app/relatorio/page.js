"use client";
import Link from "next/link";
import MenuMobile from "../../components/MenuMobile";
import SeletorIdioma from "../../components/SeletorIdioma";
import { useI18n } from "../../i18n/I18nProvider";
import { useState, useEffect } from "react";

export default function RelatorioPublico() {
    const { t, formatarNumero } = useI18n();
    const [animatedStats, setAnimatedStats] = useState({
        avaliacoes: 0,
        universidades: 0,
        usuarios: 0,
        eventos: 0
    });

    useEffect(() => {
        const targets = {
            avaliacoes: 12847,
            universidades: 67,
            usuarios: 28394,
            eventos: 1205
        };

        // Movimento reduzido: mostra os valores finais sem animar a contagem
        if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
            setAnimatedStats(targets);
            return;
        }

        const duration = 2000;
        const steps = 60;
        const stepDuration = duration / steps;

        let step = 0;
        const timer = setInterval(() => {
            step++;
            const progress = step / steps;
            const easeOut = 1 - Math.pow(1 - progress, 3);

            setAnimatedStats({
                avaliacoes: Math.floor(targets.avaliacoes * easeOut),
                universidades: Math.floor(targets.universidades * easeOut),
                usuarios: Math.floor(targets.usuarios * easeOut),
                eventos: Math.floor(targets.eventos * easeOut)
            });

            if (step >= steps) {
                clearInterval(timer);
                setAnimatedStats(targets);
            }
        }, stepDuration);

        return () => clearInterval(timer);
    }, []);

    // Separador de milhar conforme o idioma ativo
    const formatNumber = (num) => formatarNumero(num);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 md:px-6 py-4">
                    <Link href="/" className="flex items-center gap-3 text-gray-900 hover:text-gray-600 transition-colors">
                        <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span className="font-bold text-xl">UniScore</span>
                    </Link>

                    <nav className="hidden md:flex gap-8 text-sm font-medium" aria-label={t("menu.navPrincipal")}>
                        <Link href="/forum" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-2">
                            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                            </svg>
                            {t("menu.forum")}
                        </Link>
                        <Link href="/o-que-fazemos" className="text-gray-600 hover:text-blue-600 transition-colors">{t("relatorio.oQueFazemos")}</Link>
                    </nav>

                    <div className="flex items-center gap-2">
                        <SeletorIdioma className="hidden md:inline-flex" />
                        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                            <div aria-hidden="true" className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-green-700 text-sm font-medium">{t("relatorio.aoVivo")}</span>
                        </div>
                        <MenuMobile />
                    </div>
                </div>
            </header>

            <main id="conteudo">

            {/* Page Title */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("relatorio.titulo")}</h1>
                    <p className="text-gray-600">{t("relatorio.subtitulo")}</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {/* Principais Métricas - Estilo do template */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Avaliações - Pink/Magenta */}
                    <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className="text-white">
                                <div className="text-sm font-medium opacity-90 mb-2">{t("relatorio.avaliacoes")}</div>
                                <div className="text-4xl font-bold mb-1">{formatNumber(animatedStats.avaliacoes)}</div>
                                <div className="text-xs opacity-75">{t("relatorio.esteMes", { valor: "12%" })}</div>
                            </div>
                            <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                                </svg>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-white text-xs">
                            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                            <span className="font-medium">{t("relatorio.esteMes", { valor: "+847" })}</span>
                        </div>
                    </div>

                    {/* Universidades - Cyan/Turquesa */}
                    <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className="text-white">
                                <div className="text-sm font-medium opacity-90 mb-2">{t("relatorio.universidades")}</div>
                                <div className="text-4xl font-bold mb-1">{animatedStats.universidades}</div>
                                <div className="text-xs opacity-75">{t("relatorio.esteTrimestre", { valor: "18%" })}</div>
                            </div>
                            <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                </svg>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-white text-xs">
                            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                            <span className="font-medium">{t("relatorio.novasAtivas")}</span>
                        </div>
                    </div>

                    {/* Usuários - Verde */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className="text-white">
                                <div className="text-sm font-medium opacity-90 mb-2">{t("relatorio.usuarios")}</div>
                                <div className="text-4xl font-bold mb-1">{formatNumber(animatedStats.usuarios)}</div>
                                <div className="text-xs opacity-75">{t("relatorio.estaSemana", { valor: "24%" })}</div>
                            </div>
                            <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                                </svg>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-white text-xs">
                            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                            <span className="font-medium">{t("relatorio.registrados")}</span>
                        </div>
                    </div>

                    {/* Eventos - Amarelo/Laranja */}
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className="text-white">
                                <div className="text-sm font-medium opacity-90 mb-2">{t("relatorio.eventos")}</div>
                                <div className="text-4xl font-bold mb-1">{formatNumber(animatedStats.eventos)}</div>
                                <div className="text-xs opacity-75">{t("relatorio.hoje", { valor: "15%" })}</div>
                            </div>
                            <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-white text-xs">
                            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                            <span className="font-medium">{t("relatorio.avaliados")}</span>
                        </div>
                    </div>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Crescimento - Estilo do template */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900">{t("relatorio.crescimento")}</h3>
                            <div className="flex gap-2">
                                <button type="button" aria-pressed="false" className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded">{t("relatorio.mes")}</button>
                                <button type="button" aria-pressed="true" className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded">{t("relatorio.ano")}</button>
                            </div>
                        </div>
                        <div className="h-64 relative">
                            {/* Grid lines */}
                            <div className="absolute inset-0 flex flex-col justify-between">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div key={i} className="border-t border-gray-100"></div>
                                ))}
                            </div>
                            {/* Bars */}
                            <div className="relative h-full flex items-end justify-between gap-2 px-2">
                                {[
                                    { mes: t('relatorio.meses.jan'), usuarios: 2100 },
                                    { mes: t('relatorio.meses.fev'), usuarios: 2850 },
                                    { mes: t('relatorio.meses.mar'), usuarios: 4200 },
                                    { mes: t('relatorio.meses.abr'), usuarios: 6100 },
                                    { mes: t('relatorio.meses.mai'), usuarios: 8900 },
                                    { mes: t('relatorio.meses.jun'), usuarios: 12400 },
                                    { mes: t('relatorio.meses.jul'), usuarios: 16800 },
                                    { mes: t('relatorio.meses.ago'), usuarios: 21200 },
                                    { mes: t('relatorio.meses.set'), usuarios: 25100 },
                                    { mes: t('relatorio.meses.out'), usuarios: 28394 }
                                ].map((item, index) => (
                                    <div key={index} className="flex-1 flex flex-col items-center group">
                                        <div className="relative w-full mb-2">
                                            <div 
                                                className="w-full bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-t-lg transition-all duration-500 hover:from-cyan-600 hover:to-cyan-400 shadow-lg"
                                                style={{ height: `${Math.max((item.usuarios / 28394) * 220, 20)}px` }}
                                            >
                                                {/* Tooltip on hover */}
                                                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {formatNumber(item.usuarios)}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-600 font-medium">{item.mes}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gradient-to-r from-cyan-500 to-cyan-300 rounded"></div>
                                <span>{t("relatorio.usuariosAtivos")}</span>
                            </div>
                        </div>
                    </div>

                    {/* Impacto Intercultural - Estilo do template */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">{t("relatorio.impacto")}</h3>
                        <div className="space-y-5">
                            {[
                                { aspecto: t('relatorio.aspectos.cosmovisao'), impacto: 92, color: 'from-pink-500 to-pink-400', textColor: 'text-pink-600', bgColor: 'bg-pink-100' },
                                { aspecto: t('relatorio.aspectos.conexao'), impacto: 87, color: 'from-cyan-500 to-cyan-400', textColor: 'text-cyan-600', bgColor: 'bg-cyan-100' },
                                { aspecto: t('relatorio.aspectos.valorizacao'), impacto: 95, color: 'from-green-500 to-green-400', textColor: 'text-green-600', bgColor: 'bg-green-100' },
                                { aspecto: t('relatorio.aspectos.preconceitos'), impacto: 89, color: 'from-yellow-500 to-yellow-400', textColor: 'text-yellow-600', bgColor: 'bg-yellow-100' },
                                { aspecto: t('relatorio.aspectos.consciencia'), impacto: 91, color: 'from-purple-500 to-purple-400', textColor: 'text-purple-600', bgColor: 'bg-purple-100' }
                            ].map((item, index) => (
                                <div key={index}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">{item.aspecto}</span>
                                        <span className={`text-sm font-bold ${item.textColor} ${item.bgColor} px-2 py-1 rounded`}>{item.impacto}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                                        <div 
                                            className={`h-3 bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000 shadow-sm`}
                                            style={{ width: `${item.impacto}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Categorias Culturais & Distribuição Regional */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Categorias - Estilo colorido */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">{t("relatorio.categoriasTitulo")}</h3>
                        <div className="space-y-4">
                            {[
                                { categoria: t('relatorio.categorias.intercambio'), total: 3847, color: 'from-pink-500 to-pink-600', icon: '🌍' },
                                { categoria: t('relatorio.categorias.diversidade'), total: 2934, color: 'from-cyan-500 to-cyan-600', icon: '🎨' },
                                { categoria: t('relatorio.categorias.linguas'), total: 2105, color: 'from-green-500 to-green-600', icon: '🗣️' },
                                { categoria: t('relatorio.categorias.arte'), total: 1678, color: 'from-yellow-500 to-orange-500', icon: '🎵' },
                                { categoria: t('relatorio.categorias.culinaria'), total: 1425, color: 'from-purple-500 to-purple-600', icon: '🍜' },
                                { categoria: t('relatorio.categorias.tradicoes'), total: 858, color: 'from-blue-500 to-blue-600', icon: '🎭' }
                            ].map((item, index) => (
                                <div key={index} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                    <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center text-lg shadow-md`}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-gray-700">{item.categoria}</span>
                                            <span className="text-sm font-bold text-gray-900">{formatNumber(item.total)}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className={`h-2 bg-gradient-to-r ${item.color} rounded-full transition-all duration-700 shadow-sm`}
                                                style={{ width: `${(item.total / 3847) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Distribuição Regional - Estilo colorido */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">{t("relatorio.regionalTitulo")}</h3>
                        <div className="space-y-4">
                            {[
                                { regiao: t('relatorio.regioes.sudeste'), universidades: 28, porcentagem: 42, color: 'from-pink-500 to-pink-600' },
                                { regiao: t('relatorio.regioes.sul'), universidades: 15, porcentagem: 22, color: 'from-cyan-500 to-cyan-600' },
                                { regiao: t('relatorio.regioes.nordeste'), universidades: 12, porcentagem: 18, color: 'from-green-500 to-green-600' },
                                { regiao: t('relatorio.regioes.centroOeste'), universidades: 7, porcentagem: 10, color: 'from-yellow-500 to-orange-500' },
                                { regiao: t('relatorio.regioes.norte'), universidades: 5, porcentagem: 8, color: 'from-purple-500 to-purple-600' }
                            ].map((item, index) => (
                                <div key={index} className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3 flex-1">
                                        <span className="text-sm font-medium text-gray-700 w-32">{item.regiao}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-9 overflow-hidden shadow-inner">
                                            <div 
                                                className={`bg-gradient-to-r ${item.color} h-9 rounded-full flex items-center justify-end pr-3 transition-all duration-700 shadow-sm`}
                                                style={{ width: `${item.porcentagem}%` }}
                                            >
                                                <span className="text-xs font-bold text-white">{item.porcentagem}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 ml-3 bg-gray-100 px-3 py-1 rounded-full">{item.universidades}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Avaliações Recentes */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">{t("relatorio.recentes")}</h3>
                    <div className="space-y-4">
                        {[
                            { usuario: 'Maria Silva', universidade: 'USP', nota: 5, tempo: t('relatorio.minAtras', { n: 2 }), evento: 'Semana de Inovação' },
                            { usuario: 'João Santos', universidade: 'UFRJ', nota: 4, tempo: t('relatorio.minAtras', { n: 15 }), evento: 'Festival Cultural' },
                            { usuario: 'Ana Costa', universidade: 'UFMG', nota: 5, tempo: t('relatorio.minAtras', { n: 32 }), evento: 'Encontro Internacional' },
                            { usuario: 'Pedro Lima', universidade: 'Mackenzie', nota: 4, tempo: t('relatorio.horaAtras', { n: 1 }), evento: 'Tech Summit' }
                        ].map((item, index) => (
                            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div aria-hidden="true" className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                        {item.usuario.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{item.usuario}</div>
                                        <div className="text-xs text-gray-600">{item.universidade} • {item.evento}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1" role="img" aria-label={t("geral.estrelas", { n: item.nota })}>
                                        {[...Array(5)].map((_, i) => (
                                            <svg aria-hidden="true" key={i} className={`w-4 h-4 ${i < item.nota ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                            </svg>
                                        ))}
                                    </div>
                                    <span className="text-xs text-gray-600">{item.tempo}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            </main>
        </div>
    );
}
