"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";

export default function UniversidadePage() {
    const { id } = useParams();
    const [universidade, setUniversidade] = useState(null);
    const [avaliacoes, setAvaliacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch("/universidades.json")
            .then(res => res.json())
            .then(data => {
                const uni = data.find(u => String(u.id) === String(id));
                setUniversidade(uni);
                setLoading(false);
            });
    }, [id]);

    // Buscar avaliações da universidade no Firestore
    useEffect(() => {
        if (!id) return;
        
        const q = query(
            collection(db, "avaliacoes"),
            where("universidadeId", "==", String(id))
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAvaliacoes(data);
        });
        
        return () => unsubscribe();
    }, [id]);

    // Calcular distribuição de estrelas e média baseado nas avaliações reais
    const calcularEstatisticas = () => {
        if (avaliacoes.length === 0) {
            return {
                starDist: [0, 0, 0, 0, 0],
                total: 0,
                avg: "-"
            };
        }

        const starDist = [0, 0, 0, 0, 0]; // 5, 4, 3, 2, 1 estrelas
        
        avaliacoes.forEach(av => {
            const nota = av.nota || 0;
            if (nota >= 1 && nota <= 5) {
                starDist[5 - nota]++;
            }
        });

        const total = avaliacoes.length;
        const somaNotas = avaliacoes.reduce((sum, av) => sum + (av.nota || 0), 0);
        const avg = total > 0 ? (somaNotas / total).toFixed(1) : "-";

        return { starDist, total, avg };
    };

    const { starDist, total, avg } = calcularEstatisticas();

    if (!universidade || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                    <div className="text-gray-700 text-lg">Carregando universidade...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto flex items-center justify-between px-6 py-4">
                    <Link href="/" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span className="font-bold text-lg">Voltar</span>
                    </Link>

                    <img src="/uniscore_star_logo.png" alt="UniScore Logo" className="h-16 w-auto max-w-[220px]" />

                    <nav className="hidden md:flex gap-8 text-sm">
                        <Link href="/forum" className="hover:text-blue-600 transition-colors flex items-center gap-1 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                            </svg>
                            Fórum
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Conteúdo principal */}
            <div className="container mx-auto px-6 py-12">
                {/* Hero Section com logo e nome da universidade */}
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-6">
                        <div className="w-32 h-32 rounded-full bg-white p-2 shadow-xl border-4 border-gray-200">
                            <img src={universidade.imagem} alt={universidade.nome} className="w-full h-full object-cover rounded-full" />
                        </div>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        {universidade.nome}
                    </h2>
                    <p className="text-xl text-gray-600 mb-6">{universidade.sigla}</p>
                    <a
                        href="https://www.mackenzie.br/universidade/conheca-a-universidade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all duration-300 shadow-md"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Visitar site oficial
                    </a>
                </div>

                {/* Grid com vídeo e estatísticas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Vídeo */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Conheça a Universidade</h3>
                        <div className="aspect-video rounded-xl overflow-hidden shadow-lg border border-gray-200">
                            <iframe
                                width="100%"
                                height="100%"
                                src="https://www.youtube.com/embed/j-QzD0tXQXc?si=AD9N5d4Wf_4af0QU"
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        </div>
                    </div>

                    {/* Card de avaliações */}
                    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <div className="text-center mb-6">
                            <div className="text-6xl font-extrabold text-gray-900 mb-2">{avg}</div>
                            <div className="flex items-center justify-center gap-1 mb-2">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className={`w-6 h-6 ${i < Math.round(parseFloat(avg)) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <div className="text-lg font-medium text-gray-700">Excelente</div>
                        </div>

                        <div className="space-y-3 mb-6">
                            {[5, 4, 3, 2, 1].map((star, i) => (
                                <div key={star} className="flex items-center gap-3">
                                    <span className="text-gray-600 text-sm w-16">{star} estrelas</span>
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                                            style={{ width: `${total ? (starDist[5 - star] / total) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-gray-600 text-sm w-8 text-right">{starDist[5 - star]}</span>
                                </div>
                            ))}
                        </div>

                        <div className="text-center pt-4 border-t border-gray-200">
                            <div className="text-gray-600 text-sm">{total} avaliações totais</div>
                        </div>
                    </div>
                </div>

                {/* Botão de avaliação */}
                <div className="text-center mb-12">
                    <Link
                        href={`/avaliar?universidadeId=${encodeURIComponent(id)}`}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg transform hover:scale-105"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Escreva uma avaliação
                    </Link>
                </div>

                {/* Seção de avaliações */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                    <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Avaliações da Comunidade
                        <span className="ml-auto text-lg font-normal text-gray-600">({avaliacoes.length})</span>
                    </h2>

                    {avaliacoes.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            <p className="text-gray-600 text-lg mb-4">Nenhuma avaliação ainda</p>
                            <Link
                                href={`/avaliar?universidadeId=${encodeURIComponent(id)}`}
                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Seja o primeiro a avaliar
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {avaliacoes.map((av) => (
                                <div key={av.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        {av.photoURL ? (
                                            <img src={av.photoURL} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-gray-300" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
                                                {av.usuario?.charAt(0)?.toUpperCase() || "U"}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-900">{av.usuario || "Usuário"}</div>
                                            <div className="text-sm text-gray-500">
                                                {av.criadoEm?.toDate ? av.criadoEm.toDate().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : ""}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mb-3">
                                        {[...Array(5)].map((_, i) => (
                                            <svg key={i} className={`w-5 h-5 ${i < av.nota ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    {av.titulo && (
                                        <h3 className="font-bold text-gray-900 mb-2">{av.titulo}</h3>
                                    )}
                                    <p className="text-gray-700 leading-relaxed line-clamp-4">
                                        {av.comentario}
                                    </p>
                                    {av.imagem && typeof av.imagem === "string" && (
                                        <img src={av.imagem} alt="Imagem avaliação" className="w-full h-32 object-cover rounded-lg mt-4 border border-gray-200" />
                                    )}
                                    {av.eventoId && (
                                        <div className="mt-3 text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 inline-block">
                                            Evento ID: {av.eventoId}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};