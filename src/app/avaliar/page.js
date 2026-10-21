"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { notaSegura } from "../../lib/notas";

export default function AvaliarEvento() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [universidades, setUniversidades] = useState([]);
    const [todosEventos, setTodosEventos] = useState([]);
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [imagemFile, setImagemFile] = useState(null);
    const [imagemPreview, setImagemPreview] = useState(null);
    
    const [avaliacao, setAvaliacao] = useState({
        universidadeId: '',
        eventoId: '',
        nota: 0,
        titulo: '',
        comentario: '',
        data: '',
        impactoCultural: '',
        diversidadePromovida: 0,
        ampliacaoCosmivisao: 0,
        conexaoIntercultural: 0,
        identidadeCultural: '',
        mudancaPerspectiva: '',
        recomendaria: true,
        categoria: 'multicultural'
    });

    const [etapa, setEtapa] = useState(1);
    const totalEtapas = 3;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log('Estado de autenticação:', currentUser ? 'Logado' : 'Não logado');
            if (currentUser) {
                console.log('Usuário:', {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL
                });
            }
            setUser(currentUser);
            setLoadingAuth(false);
            
            if (!currentUser) {
                alert('Você precisa estar logado para avaliar!');
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        fetch("/universidades.json")
            .then(res => res.json())
            .then(data => {
                setUniversidades(data);
                if (data.length > 0) {
                    setAvaliacao(prev => ({ ...prev, universidadeId: data[0].id }));
                }
            });
        
        fetch("/events.json")
            .then(res => res.json())
            .then(data => {
                console.log('Eventos carregados:', data);
                setTodosEventos(data);
            });
    }, []);

    useEffect(() => {
        if (avaliacao.universidadeId && todosEventos.length > 0) {
            const uni = universidades.find(u => u.id === Number(avaliacao.universidadeId));
            if (uni) {
                // Filtrar eventos pela universidade
                const eventosUni = todosEventos.filter(evt => evt.universidade === uni.nome);
                console.log('Eventos filtrados para', uni.nome, ':', eventosUni);
                setEventos(eventosUni);
                if (eventosUni.length > 0) {
                    setAvaliacao(prev => ({ ...prev, eventoId: eventosUni[0].id }));
                }
            }
        } else {
            setEventos([]);
        }
    }, [avaliacao.universidadeId, universidades, todosEventos]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        console.log('handleSubmit chamado! Etapa atual:', etapa);
        
        // Só permite submeter na última etapa
        if (etapa !== totalEtapas) {
            console.log('Bloqueado: não está na última etapa');
            return;
        }
        
        if (!user) {
            alert('Você precisa estar logado para avaliar!');
            router.push('/login');
            return;
        }

        if (avaliacao.nota === 0) {
            alert('Por favor, dê uma nota ao evento!');
            return;
        }

        if (!avaliacao.universidadeId) {
            alert('Por favor, selecione uma universidade!');
            return;
        }

        if (!avaliacao.eventoId) {
            alert('Por favor, selecione um evento!');
            return;
        }

        if (!avaliacao.data) {
            alert('Por favor, informe a data do evento!');
            return;
        }

        setLoading(true);
        try {
            let imagemUrl = null;
            if (imagemFile) {
                const storageRef = ref(storage, `avaliacoes/${user.uid}/${Date.now()}_${imagemFile.name}`);
                await uploadBytes(storageRef, imagemFile);
                imagemUrl = await getDownloadURL(storageRef);
            }

            const avaliacaoData = {
                universidadeId: String(avaliacao.universidadeId),
                eventoId: String(avaliacao.eventoId),
                nota: Number(avaliacao.nota),
                titulo: avaliacao.titulo || '',
                comentario: avaliacao.comentario || '',
                data: avaliacao.data,
                imagem: imagemUrl,
                usuario: user.displayName || user.email || 'Usuário',
                usuarioId: user.uid,
                photoURL: user.photoURL || null,
                criadoEm: serverTimestamp()
            };

            console.log('Tentando salvar avaliação:', avaliacaoData);
            
            await addDoc(collection(db, "avaliacoes"), avaliacaoData);

            alert('Obrigado por sua avaliação transcultural! Sua perspectiva é valiosa para construir um ambiente universitário mais diverso e inclusivo.');
            router.push('/');
        } catch (error) {
            console.error('Erro completo ao salvar avaliação:', error);
            alert(`Erro ao salvar avaliação: ${error.message}. Verifique o console para mais detalhes.`);
        } finally {
            setLoading(false);
        }
    };

    const proximaEtapa = (e) => {
        if (e) e.preventDefault(); // Prevenir submit do formulário
        console.log('Avançando da etapa', etapa, 'para', etapa + 1);
        if (etapa < totalEtapas) setEtapa(etapa + 1);
    };

    const etapaAnterior = (e) => {
        if (e) e.preventDefault(); // Prevenir submit do formulário
        console.log('Voltando da etapa', etapa, 'para', etapa - 1);
        if (etapa > 1) setEtapa(etapa - 1);
    };

    const renderStars = (current, setter) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(num => (
                    <button
                        key={num}
                        type="button"
                        onClick={() => setter(num)}
                        className={`transition-all duration-200 hover:scale-110`}
                    >
                        <svg className={`w-8 h-8 ${num <= current ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                    </button>
                ))}
            </div>
        );
    };

    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Navigation */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="container mx-auto flex items-center justify-between px-6 py-4">
                    <Link href="/" className="flex items-center gap-3 text-gray-900 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span className="font-bold text-xl">UniScore</span>
                    </Link>

                    <nav className="hidden md:flex gap-8 text-sm font-medium">
                        <Link href="/forum" className="text-gray-600 hover:text-green-600 transition-colors flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                            </svg>
                            Fórum
                        </Link>
                        <Link href="/relatorio" className="text-gray-600 hover:text-blue-600 transition-colors">Relatórios</Link>
                    </nav>

                    <div className="w-20"></div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="relative z-10 container mx-auto px-6 py-12">
                    <div className="text-center mb-8">
                        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                            Avalie sua <span className="bg-gradient-to-r from-yellow-300 to-green-400 bg-clip-text text-transparent">universidade</span>
                        </h1>
                        <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                            Registre sua opinião sobre eventos acadêmicos, culturais e esportivos da sua universidade
                        </p>
                    </div>

                    {/* Progresso */}
                    <div className="max-w-md mx-auto mb-8">
                        <div className="flex items-center justify-between mb-4">
                            {[1, 2, 3].map(num => (
                                <div key={num} className={`flex items-center ${num < totalEtapas ? 'flex-1' : ''}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${num <= etapa ? 'bg-white text-blue-600 shadow-lg' : 'bg-white/20 text-white/60'
                                        }`}>
                                        {num}
                                    </div>
                                    {num < totalEtapas && (
                                        <div className={`flex-1 h-1 mx-2 rounded transition-all ${num < etapa ? 'bg-white' : 'bg-white/20'
                                            }`}></div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="text-center text-white font-medium">
                            Etapa {etapa} de {totalEtapas}
                        </div>
                    </div>
                </div>
            </div>

            {/* Formulário */}
            <div className="container mx-auto px-6 -mt-8 relative z-20 pb-12">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">

                        {/* Etapa 1: Avaliação Geral */}
                        {etapa === 1 && (
                            <div className="space-y-8">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                        </svg>
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Avaliação geral do evento</h2>
                                </div>

                                {/* Universidade e Evento */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                        <label className="block text-gray-900 font-bold mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                            </svg>
                                            Universidade
                                        </label>
                                        <select
                                            value={avaliacao.universidadeId}
                                            onChange={(e) => setAvaliacao({ ...avaliacao, universidadeId: e.target.value })}
                                            className="w-full bg-white text-gray-900 rounded-lg p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                            required
                                        >
                                            <option value="">Selecione a universidade</option>
                                            {universidades.map(uni => (
                                                <option key={uni.id} value={uni.id}>{uni.nome}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                        <label className="block text-gray-900 font-bold mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                            </svg>
                                            Evento
                                        </label>
                                        <select
                                            value={avaliacao.eventoId}
                                            onChange={(e) => setAvaliacao({ ...avaliacao, eventoId: e.target.value })}
                                            className="w-full bg-white text-gray-900 rounded-lg p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                            required
                                            disabled={!avaliacao.universidadeId || eventos.length === 0}
                                        >
                                            <option value="">Selecione o evento</option>
                                            {eventos.map(evt => (
                                                <option key={evt.id} value={evt.id}>{evt.nome}</option>
                                            ))}
                                        </select>
                                        {eventos.length === 0 && avaliacao.universidadeId && (
                                            <p className="text-sm text-gray-500 mt-2">Nenhum evento disponível para esta universidade</p>
                                        )}
                                    </div>
                                </div>

                                {/* Data e Imagem */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                        <label className="block text-gray-900 font-bold mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                            </svg>
                                            Data do evento
                                        </label>
                                        <input
                                            type="date"
                                            value={avaliacao.data}
                                            onChange={(e) => setAvaliacao({ ...avaliacao, data: e.target.value })}
                                            className="w-full bg-white text-gray-900 rounded-lg p-3 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                        <label className="block text-gray-900 font-bold mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                            </svg>
                                            Imagem (opcional)
                                        </label>
                                        <label className="flex items-center justify-center gap-2 bg-white border-2 border-dashed border-gray-300 hover:border-pink-400 text-gray-600 hover:text-pink-600 px-4 py-3 rounded-lg cursor-pointer transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                            </svg>
                                            <span className="text-sm font-medium">
                                                {imagemFile ? imagemFile.name : 'Escolher imagem'}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setImagemFile(file);
                                                        setImagemPreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                        </label>
                                        {imagemPreview && (
                                            <div className="mt-3 relative">
                                                <img src={imagemPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                                                <button
                                                    type="button"
                                                    onClick={() => { setImagemFile(null); setImagemPreview(null); }}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Nota Geral */}
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                        <label className="block text-gray-900 font-bold mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                            </svg>
                                            Nota geral do evento
                                        </label>
                                        {renderStars(avaliacao.nota, (nota) => setAvaliacao({ ...avaliacao, nota }))}
                                        <div className="text-gray-600 text-sm mt-3">
                                            {avaliacao.nota > 0 ? `${avaliacao.nota}/5 estrelas` : 'Selecione uma nota'}
                                        </div>
                                    </div>

                                    {/* Categoria do Evento */}
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                        <label className="block text-gray-900 font-bold mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                                            </svg>
                                            Categoria cultural
                                        </label>
                                        <p className="text-gray-700 text-sm mb-4">O evento incentivou a interação entre pessoas de diferentes origens culturais, sociais ou acadêmicas?</p>
                                        <div className="flex flex-col gap-3">
                                            {["Sim", "Parcialmente", "Não"].map(opcao => (
                                                <label key={opcao} className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="categoriaInteracao"
                                                        value={opcao}
                                                        checked={avaliacao.categoria === opcao}
                                                        onChange={(e) => setAvaliacao({ ...avaliacao, categoria: e.target.value })}
                                                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                                    />
                                                    <span className="text-gray-800 font-medium">{opcao}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Título da Avaliação */}
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <label className="block text-gray-900 font-bold mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                        </svg>
                                        Título da sua avaliação
                                    </label>
                                    <input
                                        type="text"
                                        value={avaliacao.titulo}
                                        onChange={(e) => setAvaliacao({ ...avaliacao, titulo: e.target.value })}
                                        placeholder="Ex: Uma experiência transformadora que ampliou minha visão de mundo"
                                        className="w-full bg-white text-gray-900 rounded-lg p-4 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder-gray-400"
                                    />
                                </div>

                                {/* Comentário Geral */}
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <label className="block text-gray-900 font-bold mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                                        </svg>
                                        Seu comentário sobre o evento
                                    </label>
                                    <textarea
                                        value={avaliacao.comentario}
                                        onChange={(e) => setAvaliacao({ ...avaliacao, comentario: e.target.value })}
                                        placeholder="Descreva sua experiência geral no evento..."
                                        rows={4}
                                        className="w-full bg-white text-gray-900 rounded-lg p-4 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder-gray-400 resize-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Etapa 2: Impacto Cultural */}
                        {etapa === 2 && (
                            <div className="space-y-8">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Impacto intercultural</h2>
                                    <p className="text-gray-600">Como este evento influenciou sua perspectiva cultural?</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Diversidade Promovida */}
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 text-center">
                                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                                            </svg>
                                        </div>
                                        <label className="block text-gray-900 font-bold mb-4">
                                            Diversidade promovida
                                        </label>
                                        {renderStars(avaliacao.diversidadePromovida, (nota) => setAvaliacao({ ...avaliacao, diversidadePromovida: nota }))}
                                        <p className="text-gray-600 text-sm mt-3">
                                            O evento contemplou múltiplas culturas e visões de mundo?
                                        </p>
                                    </div>

                                    {/* Ampliação da Cosmovisão */}
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 text-center">
                                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                            </svg>
                                        </div>
                                        <label className="block text-gray-900 font-bold mb-4">
                                            Ampliação da cosmovisão
                                        </label>
                                        {renderStars(avaliacao.ampliacaoCosmivisao, (nota) => setAvaliacao({ ...avaliacao, ampliacaoCosmivisao: nota }))}
                                        <p className="text-gray-600 text-sm mt-3">
                                            Expandiu sua visão de mundo?
                                        </p>
                                    </div>

                                    {/* Conexão Intercultural */}
                                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200 text-center">
                                        <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                            </svg>
                                        </div>
                                        <label className="block text-gray-900 font-bold mb-4">
                                            Conexão intercultural
                                        </label>
                                        {renderStars(avaliacao.conexaoIntercultural, (nota) => setAvaliacao({ ...avaliacao, conexaoIntercultural: nota }))}
                                        <p className="text-gray-600 text-sm mt-3">
                                            O evento incentivou a interação entre pessoas de diferentes culturas?
                                        </p>
                                    </div>
                                </div>

                                {/* Impacto na Identidade Cultural */}
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <label className="block text-gray-900 font-bold mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                        </svg>
                                        Impacto na sua identidade cultural
                                    </label>
                                    <textarea
                                        value={avaliacao.identidadeCultural}
                                        onChange={(e) => setAvaliacao({ ...avaliacao, identidadeCultural: e.target.value })}
                                        placeholder="Como este evento influenciou ou reforçou sua identidade cultural? Descreva mudanças em sua autopercepção..."
                                        rows={4}
                                        className="w-full bg-white text-gray-900 rounded-lg p-4 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder-gray-400 resize-none"
                                    />
                                </div>

                                {/* Mudança de Perspectiva */}
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <label className="block text-gray-900 font-bold mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                                        </svg>
                                        Mudanças de perspectiva
                                    </label>
                                    <textarea
                                        value={avaliacao.mudancaPerspectiva}
                                        onChange={(e) => setAvaliacao({ ...avaliacao, mudancaPerspectiva: e.target.value })}
                                        placeholder="Que novas perspectivas você adquiriu sobre outras culturas?"
                                        rows={4}
                                        className="w-full bg-white text-gray-900 rounded-lg p-4 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder-gray-400 resize-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Etapa 3: Confirmação */}
                        {etapa === 3 && (
                            <div className="space-y-8">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Finalização</h2>
                                    <p className="text-gray-600">Revise sua avaliação e confirme o envio</p>
                                </div>

                                {/* Resumo da Avaliação */}
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        Resumo da sua avaliação
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="text-gray-600 text-sm mb-1">Nota Geral</div>
                                            <div className="flex items-center gap-1">
                                                {Array(notaSegura(avaliacao.nota)).fill().map((_, i) => (
                                                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                    </svg>
                                                ))}
                                                <span className="text-gray-900 font-bold ml-2">({avaliacao.nota}/5)</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-600 text-sm mb-1">Categoria</div>
                                            <div className="text-gray-900 font-medium capitalize">{avaliacao.categoria.replace('-', ' ')}</div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <div className="text-gray-600 text-sm mb-1">Título</div>
                                            <div className="text-gray-900 font-medium">{avaliacao.titulo || 'Não informado'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recomendação */}
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center">
                                    <label className="block text-gray-900 font-bold mb-6 text-lg">
                                        Recomendaria este evento?
                                    </label>
                                    <div className="flex justify-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setAvaliacao({ ...avaliacao, recomendaria: true })}
                                            className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${avaliacao.recomendaria
                                                ? 'bg-green-500 text-white shadow-lg scale-105'
                                                : 'bg-white text-gray-600 border-2 border-gray-300 hover:border-green-500'
                                                }`}
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                                            </svg>
                                            Sim, recomendo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAvaliacao({ ...avaliacao, recomendaria: false })}
                                            className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${!avaliacao.recomendaria
                                                ? 'bg-red-500 text-white shadow-lg scale-105'
                                                : 'bg-white text-gray-600 border-2 border-gray-300 hover:border-red-500'
                                                }`}
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/>
                                            </svg>
                                            Não recomendo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Botões de Navegação */}
                        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                            <div className="flex gap-3">
                                {etapa > 1 && (
                                    <button
                                        type="button"
                                        onClick={etapaAnterior}
                                        className="bg-white text-gray-700 px-6 py-3 rounded-lg font-bold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                                        </svg>
                                        Anterior
                                    </button>
                                )}

                                <Link href="/">
                                    <button
                                        type="button"
                                        className="bg-white text-gray-700 px-6 py-3 rounded-lg font-bold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                                        </svg>
                                        Início
                                    </button>
                                </Link>
                            </div>

                            {etapa < totalEtapas ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        proximaEtapa(e);
                                    }}
                                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                                >
                                    Próximo
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                                            </svg>
                                            Enviar Avaliação
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}