"use client";
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, deleteDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buscarUniversidadeId } from "../../lib/universidades";
import { notaSegura } from "../../lib/notas";

export default function DashboardUniversidade() {
    const [user, setUser] = useState(null);
    const [universidadeData, setUniversidadeData] = useState(null);
    const [avaliacoes, setAvaliacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isUniversidade, setIsUniversidade] = useState(false);
    const [semVinculo, setSemVinculo] = useState(false);
    const [meusEventos, setMeusEventos] = useState([]);
    const [excluindoId, setExcluindoId] = useState(null);
    const [stats, setStats] = useState({
        totalAvaliacoes: 0,
        mediaGeral: 0,
        eventosAvaliados: 0,
        ultimaAvaliacao: null
    });
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);

                try {
                    // Tentar buscar dados da universidade - se o usuário não tiver permissão, será rejeitado pelo Firebase
                    const docRef = doc(db, "universidades", u.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        setIsUniversidade(true);
                        setUniversidadeData(docSnap.data());
                    } else {
                        // Usuário logado mas não é uma universidade cadastrada
                        setError("Acesso negado: Esta área é exclusiva para universidades cadastradas.");
                        setTimeout(() => {
                            router.push("/");
                        }, 3000);
                    }
                } catch (error) {
                    console.error("Erro ao buscar dados da universidade:", error);

                    // Se o erro for de permissão, significa que não é uma universidade
                    if (error.code === 'permission-denied') {
                        setError("Acesso negado: Esta área é exclusiva para universidades cadastradas.");
                    } else {
                        setError("Erro ao carregar dados da universidade. Tente novamente.");
                    }

                    setTimeout(() => {
                        router.push("/");
                    }, 3000);
                }
            } else {
                // Usuário não logado
                router.push("/login-universidades");
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        // Buscar avaliações apenas se for uma universidade válida
        if (user && universidadeData && isUniversidade && !error) {
            // Se o status for "pendente", mostrar dados de demonstração
            if (universidadeData.status === "pendente") {
                // Dados de demonstração para preview
                const demoAvaliacoes = [
                    {
                        id: "demo1",
                        usuario: "Ana Silva",
                        photoURL: null,
                        nota: 5,
                        comentario: "Excelente evento de tecnologia! A organização foi impecável e os palestrantes muito qualificados. Definitivamente participaria novamente.",
                        titulo: "Semana de Tecnologia 2024",
                        criadoEm: { toDate: () => new Date(Date.now() - 86400000) }
                    },
                    {
                        id: "demo2",
                        usuario: "Carlos Mendes",
                        photoURL: null,
                        nota: 4,
                        comentario: "Muito bom! O networking foi fantástico e aprendi bastante sobre as tendências do mercado. Única sugestão é melhorar o coffee break.",
                        titulo: "Feira de Profissões",
                        criadoEm: { toDate: () => new Date(Date.now() - 172800000) }
                    },
                    {
                        id: "demo3",
                        usuario: "Marina Santos",
                        photoURL: null,
                        nota: 5,
                        comentario: "Simplesmente incrível! As palestras sobre sustentabilidade abriram minha mente. Parabéns pela iniciativa da universidade.",
                        titulo: "Simpósio de Sustentabilidade",
                        criadoEm: { toDate: () => new Date(Date.now() - 259200000) }
                    },
                    {
                        id: "demo4",
                        usuario: "João Oliveira",
                        photoURL: null,
                        nota: 4,
                        comentario: "Workshop muito prático sobre empreendedorismo. Os casos apresentados foram relevantes e inspiradores.",
                        titulo: "Workshop de Empreendedorismo",
                        criadoEm: { toDate: () => new Date(Date.now() - 345600000) }
                    },
                    {
                        id: "demo5",
                        usuario: "Fernanda Costa",
                        photoURL: null,
                        nota: 5,
                        comentario: "Evento espetacular! A qualidade dos palestrantes e a infraestrutura estavam perfeitas. Já estou ansioso pelo próximo.",
                        titulo: "Congresso de Inovação",
                        criadoEm: { toDate: () => new Date(Date.now() - 432000000) }
                    },
                    {
                        id: "demo6",
                        usuario: "Rafael Lima",
                        photoURL: null,
                        nota: 4,
                        comentario: "Muito bem organizado! As atividades práticas complementaram perfeitamente a teoria apresentada nas palestras.",
                        título: "Semana Acadêmica",
                        criadoEm: { toDate: () => new Date(Date.now() - 518400000) }
                    }
                ];

                setAvaliacoes(demoAvaliacoes);
                setStats({
                    totalAvaliacoes: 1247,
                    mediaGeral: "4.7",
                    eventosAvaliados: 23,
                    ultimaAvaliacao: new Date()
                });
            } else {
                // Modo produção - buscar dados reais
                // As avaliações guardam o id de public/universidades.json ("1", "2"...),
                // não o uid da conta. Cadastros antigos não têm universidadeId: buscar pelo nome.
                let cancelado = false;
                let unsubscribe = null;

                const zerarStats = () => setStats({
                    totalAvaliacoes: 0,
                    mediaGeral: 0,
                    eventosAvaliados: 0,
                    ultimaAvaliacao: null
                });

                const iniciar = async () => {
                    let universidadeId = universidadeData.universidadeId || null;
                    if (!universidadeId) {
                        try {
                            universidadeId = await buscarUniversidadeId({
                                nome: universidadeData.nomeUniversidade,
                                sigla: universidadeData.sigla
                            });
                        } catch (lookupErr) {
                            console.error("Erro ao buscar universidade na lista:", lookupErr);
                        }
                    }
                    if (cancelado) return;

                    if (!universidadeId) {
                        // Sem vínculo com a lista de universidades: não há como buscar avaliações
                        setSemVinculo(true);
                        setAvaliacoes([]);
                        zerarStats();
                        return;
                    }
                    setSemVinculo(false);

                    const q = query(
                        collection(db, "avaliacoes"),
                        where("universidadeId", "==", String(universidadeId))
                    );

                    unsubscribe = onSnapshot(q, (snapshot) => {
                        const avaliacoesData = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                        setAvaliacoes(avaliacoesData);

                        if (avaliacoesData.length > 0) {
                            const media = avaliacoesData.reduce((acc, av) => acc + notaSegura(av.nota), 0) / avaliacoesData.length;
                            const eventosUnicos = [...new Set(avaliacoesData.map(av => av.eventoId))];

                            setStats({
                                totalAvaliacoes: avaliacoesData.length,
                                mediaGeral: media.toFixed(1),
                                eventosAvaliados: eventosUnicos.length,
                                ultimaAvaliacao: avaliacoesData[0]?.criadoEm
                            });
                        } else {
                            zerarStats();
                        }
                    }, (err) => {
                        console.error("Erro ao buscar avaliações:", err);
                    });
                };

                iniciar();

                return () => {
                    cancelado = true;
                    if (unsubscribe) unsubscribe();
                };
            }
        }
    }, [user, universidadeData, isUniversidade, error]);

    const aprovada = universidadeData?.status === "aprovado";

    // Eventos cadastrados por esta conta (RF02) - só para universidades aprovadas
    useEffect(() => {
        if (!user || !aprovada) {
            setMeusEventos([]);
            return;
        }
        const q = query(collection(db, "eventos"), where("universidadeUid", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Mais recentes primeiro (ordenação local para não exigir índice composto)
            lista.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
            setMeusEventos(lista);
        }, (err) => {
            console.error("Erro ao buscar eventos da universidade:", err);
        });
        return () => unsubscribe();
    }, [user, aprovada]);

    const excluirEvento = async (evento) => {
        if (!window.confirm(`Excluir o evento "${evento.nome}"? Esta ação não pode ser desfeita.`)) return;
        setExcluindoId(evento.id);
        try {
            await deleteDoc(doc(db, "eventos", evento.id));
        } catch (err) {
            console.error("Erro ao excluir evento:", err);
            alert("Não foi possível excluir o evento. Tente novamente.");
        } finally {
            setExcluindoId(null);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/para-universidades");
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                    <div className="text-gray-700 text-lg">Carregando dashboard...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 text-center max-w-md">
                    <svg aria-hidden="true" className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
                    <p className="text-gray-600 mb-6">Esta área é exclusiva para universidades cadastradas.</p>
                    <Link href="/" className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-all">
                        Ir para Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <img src="/uniscore_star_logo.png" alt="UniScore Logo" className="h-16 w-auto max-w-[220px]" />
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-semibold text-gray-900">{universidadeData?.nomeUniversidade || "Universidade"}</p>
                                <p className="text-xs text-gray-500">Conta Institucional</p>
                            </div>
                            <button onClick={handleLogout} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                </svg>
                                <span className="hidden sm:inline">Sair</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Bem-vinda, <span className="text-red-600">{universidadeData?.nomeUniversidade}</span>
                    </h2>
                    <p className="text-lg text-gray-600">Gerencie suas avaliações e monitore o desempenho dos seus eventos</p>
                </div>

                {/* Pending Status Alert */}
                {universidadeData?.status === "pendente" && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 px-8 py-6 rounded-2xl mb-8">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg aria-hidden="true" className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-gray-900 mb-1">Análise em Andamento</h3>
                                <p className="text-gray-700 mb-4">Esta é uma prévia do dashboard que estará disponível após aprovação.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Conta sem vínculo com a lista de universidades */}
                {semVinculo && universidadeData?.status !== "pendente" && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 px-8 py-6 rounded-2xl mb-8">
                        <h3 className="font-bold text-xl text-gray-900 mb-1">Nenhuma avaliação vinculada</h3>
                        <p className="text-gray-700">
                            Não encontramos "{universidadeData?.nomeUniversidade}" na lista de universidades da UniScore,
                            por isso ainda não é possível exibir avaliações. Entre em contato com a equipe UniScore para vincular sua conta.
                        </p>
                    </div>
                )}

                {/* Stats Cards - 4 principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <svg aria-hidden="true" className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                            </div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+15%</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalAvaliacoes.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Avaliações Recebidas</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                                <svg aria-hidden="true" className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 mb-1">{stats.mediaGeral}</div>
                        <div className="text-sm text-gray-600">Rating Médio</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <svg aria-hidden="true" className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 mb-1">{stats.eventosAvaliados}</div>
                        <div className="text-sm text-gray-600">Eventos Avaliados</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <svg aria-hidden="true" className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 mb-1">+28%</div>
                        <div className="text-sm text-gray-600">Engajamento</div>
                    </div>
                </div>

                {/* Métricas de Engajamento - Últimos 30 dias */}
                <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Métricas de Engajamento - Últimos 30 dias</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Visualizações */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-3xl font-bold text-gray-900">12,847</div>
                                    <div className="text-gray-600">Visualizações</div>
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
                                    <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-green-600">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                                <span className="text-sm font-medium">+23% vs mês anterior</span>
                            </div>
                        </div>

                        {/* Taxa de Conversão */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-3xl font-bold text-gray-900">67.3%</div>
                                    <div className="text-gray-600">Taxa de Avaliação</div>
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center">
                                    <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-green-600">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                                <span className="text-sm font-medium">+5.2% vs mês anterior</span>
                            </div>
                        </div>

                        {/* NPS Score */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-3xl font-bold text-gray-900">+72</div>
                                    <div className="text-gray-600">Net Promoter Score</div>
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center">
                                    <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                                    </svg>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-green-600">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                                <span className="text-sm font-medium">+12 pontos vs mês anterior</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gráficos de Satisfação e Distribuição de Notas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Satisfação por Categoria */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <svg aria-hidden="true" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                            </svg>
                            Satisfação por Categoria
                        </h3>
                        <div className="space-y-4">
                            {[
                                { categoria: 'Organização', valor: 92, cor: 'bg-green-500' },
                                { categoria: 'Conteúdo', valor: 88, cor: 'bg-blue-500' },
                                { categoria: 'Infraestrutura', valor: 85, cor: 'bg-purple-500' },
                                { categoria: 'Networking', valor: 78, cor: 'bg-yellow-500' },
                                { categoria: 'Alimentação', valor: 72, cor: 'bg-red-500' }
                            ].map((item, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-28 text-gray-700 text-sm font-medium">{item.categoria}</div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                                        <div className={`${item.cor} h-3 rounded-full transition-all duration-1000`} style={{ width: `${item.valor}%` }}></div>
                                    </div>
                                    <div className="w-12 text-gray-900 font-bold text-sm text-right">{item.valor}%</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Distribuição de Notas */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <svg aria-hidden="true" className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            Distribuição de Notas
                        </h3>
                        <div className="space-y-3">
                            {[
                                { estrelas: 5, quantidade: 623, porcentagem: 52 },
                                { estrelas: 4, quantidade: 389, porcentagem: 32 },
                                { estrelas: 3, quantidade: 156, porcentagem: 13 },
                                { estrelas: 2, quantidade: 48, porcentagem: 2 },
                                { estrelas: 1, quantidade: 31, porcentagem: 1 }
                            ].map((item, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 w-12">
                                        <span className="text-gray-900 font-bold text-sm">{item.estrelas}</span>
                                        <svg aria-hidden="true" className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                        </svg>
                                    </div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-4">
                                        <div className="bg-yellow-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${item.porcentagem}%` }}></div>
                                    </div>
                                    <div className="text-gray-600 text-sm w-16 text-right">{item.quantidade}</div>
                                    <div className="text-gray-900 font-bold text-sm w-12 text-right">{item.porcentagem}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Eventos por Performance */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <svg aria-hidden="true" className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        Top 5 Eventos por Performance
                    </h3>
                    <div className="space-y-4">
                        {[
                            { nome: 'Semana de Tecnologia 2024', rating: 4.9, participantes: 847, nps: '+85', posicao: 1 },
                            { nome: 'Feira de Profissões', rating: 4.8, participantes: 623, nps: '+78', posicao: 2 },
                            { nome: 'Congresso de Inovação', rating: 4.7, participantes: 512, nps: '+72', posicao: 3 },
                            { nome: 'Workshop de Empreendedorismo', rating: 4.6, participantes: 389, nps: '+68', posicao: 4 },
                            { nome: 'Simpósio de Sustentabilidade', rating: 4.5, participantes: 298, nps: '+64', posicao: 5 }
                        ].map((evento, index) => (
                            <div key={index} className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300">
                                <div className={`w-10 h-10 ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' : index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gray-300'} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                                    {evento.posicao}
                                </div>
                                <div className="flex-1">
                                    <div className="text-gray-900 font-bold text-lg">{evento.nome}</div>
                                    <div className="flex items-center gap-4 text-gray-600 text-sm mt-1">
                                        <span className="flex items-center gap-1">
                                            <svg aria-hidden="true" className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                            </svg>
                                            {evento.rating}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                            </svg>
                                            {evento.participantes} participantes
                                        </span>
                                        <span className="flex items-center gap-1 font-semibold text-green-600">
                                            NPS {evento.nps}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full"
                                            style={{ width: `${evento.rating * 20}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Meus Eventos (RF02) */}
                <div id="meus-eventos" className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-8 scroll-mt-28">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Meus Eventos</h3>
                            <p className="text-gray-600">Eventos cadastrados pela sua universidade</p>
                        </div>
                        {aprovada && (
                            <Link href="/dashboard-universidade/eventos/novo" className="text-center bg-gradient-to-r from-yellow-400 to-red-500 text-white px-6 py-3 rounded-lg font-bold hover:from-yellow-500 hover:to-red-600 transition-all duration-300 shadow-md">
                                + Cadastrar evento
                            </Link>
                        )}
                    </div>

                    {!aprovada ? (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 px-6 py-5 rounded-xl text-gray-700">
                            O cadastro de eventos fica disponível depois que a equipe UniScore aprovar a conta da sua universidade.
                        </div>
                    ) : meusEventos.length === 0 ? (
                        <div className="text-gray-500 bg-gray-50 rounded-xl p-6 text-center">
                            Nenhum evento cadastrado ainda. Clique em &quot;+ Cadastrar evento&quot; para criar o primeiro.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {meusEventos.map(ev => (
                                <div key={ev.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-red-300 transition-all">
                                    {ev.imagem ? (
                                        <img src={ev.imagem} alt={ev.nome} className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200 shrink-0" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-xl bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                                            {ev.nome?.charAt(0)?.toUpperCase() || "E"}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/evento/${ev.id}/detalhes`} className="text-gray-900 font-bold text-lg hover:text-red-600 transition-colors">
                                            {ev.nome}
                                        </Link>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-600 text-sm mt-1">
                                            <span>📅 {typeof ev.data === "string" && ev.data ? ev.data.split("-").reverse().join("/") : "Sem data"}</span>
                                            {ev.local && <span>📍 {ev.local}</span>}
                                            {ev.tipo && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-xs font-semibold">{ev.tipo}</span>}
                                            {ev.tema && <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full text-xs font-semibold">{ev.tema}</span>}
                                            <span>{Number(ev.preco) > 0 ? `R$ ${Number(ev.preco).toFixed(2).replace(".", ",")}` : "Gratuito"}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <Link href={`/dashboard-universidade/eventos/${ev.id}/editar`} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-all duration-300">
                                            ✏️ Editar
                                        </Link>
                                        <button
                                            onClick={() => excluirEvento(ev)}
                                            disabled={excluindoId === ev.id}
                                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-all duration-300 disabled:opacity-60"
                                        >
                                            {excluindoId === ev.id ? "Excluindo..." : "🗑️ Excluir"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ferramentas de Gestão */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Gerenciamento de Eventos */}
                    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-700 rounded-2xl flex items-center justify-center">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Gerenciar Eventos</h3>
                                <p className="text-gray-600">Controle total sobre seus eventos</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-red-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">Criar Novo Evento</h4>
                                        <p className="text-gray-600 text-sm">Configure detalhes, datas e descrições</p>
                                    </div>
                                    {aprovada ? (
                                        <Link href="/dashboard-universidade/eventos/novo" className="bg-gradient-to-r from-yellow-400 to-red-500 text-white px-4 py-2 rounded-lg font-bold hover:from-yellow-500 hover:to-red-600 transition-all duration-300 shadow-md">
                                            + Criar
                                        </Link>
                                    ) : (
                                        <button disabled title="Disponível após a aprovação da universidade" className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg font-bold cursor-not-allowed">
                                            + Criar
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-red-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">Editar Eventos</h4>
                                        <p className="text-gray-600 text-sm">Atualize informações em tempo real</p>
                                    </div>
                                    {aprovada ? (
                                        <a href="#meus-eventos" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-all duration-300">
                                            ✏️ Editar
                                        </a>
                                    ) : (
                                        <button disabled title="Disponível após a aprovação da universidade" className="bg-gray-200 text-gray-400 px-4 py-2 rounded-lg font-bold cursor-not-allowed">
                                            ✏️ Editar
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-red-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">Monitorar Performance</h4>
                                        <p className="text-gray-600 text-sm">Acompanhe métricas em tempo real</p>
                                    </div>
                                    <button className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:from-cyan-500 hover:to-blue-600 transition-all duration-300 shadow-md">
                                        📊 Monitor
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Relatórios e Analytics */}
                    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Relatórios Avançados</h3>
                                <p className="text-gray-600">Analytics detalhados e insights</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-purple-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">Dashboard Executivo</h4>
                                        <p className="text-gray-600 text-sm">Visão geral de todas as métricas</p>
                                    </div>
                                    <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-md">
                                        📊 Ver
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-purple-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">Exportar Relatórios</h4>
                                        <p className="text-gray-600 text-sm">PDF, Excel e outros formatos</p>
                                    </div>
                                    <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-all duration-300">
                                        💾 Exportar
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-purple-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">Análise Preditiva</h4>
                                        <p className="text-gray-600 text-sm">IA para prever tendências</p>
                                    </div>
                                    <button className="bg-gradient-to-r from-pink-500 to-rose-600 text-white px-4 py-2 rounded-lg font-bold hover:from-pink-600 hover:to-rose-700 transition-all duration-300 shadow-md">
                                        🤖 Analisar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA Final */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-8 text-center text-white shadow-lg">
                    <h3 className="text-3xl font-bold mb-4">Pronto para começar?</h3>
                    <p className="text-lg text-red-100 mb-6 max-w-2xl mx-auto">
                        Conecte sua universidade ao UniScore e comece a coletar feedback valioso dos seus eventos.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="bg-white text-red-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all duration-300 shadow-lg">
                            Solicitar Aprovação Completa
                        </button>
                        <button className="bg-red-800 text-white px-8 py-3 rounded-lg font-bold hover:bg-red-900 transition-all duration-300 border-2 border-white/20">
                            Falar com Suporte
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
