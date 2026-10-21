"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../../firebase";
import { buscarEvento } from "../../../../lib/eventos";
import { notaSegura } from "../../../../lib/notas";
import { isAdminEmail } from "../../../../lib/admin";
import BotaoDenunciar from "../../../../components/BotaoDenunciar";
import MenuMobile from "../../../../components/MenuMobile";

const LIMITE_AVALIACOES = 50;

// Critérios da avaliação (RF03). Valor 1-5, ou null = "não se aplica".
const CRITERIOS = [
    { chave: "acessibilidade", rotulo: "Acessibilidade" },
    { chave: "conforto", rotulo: "Conforto" },
    { chave: "interculturalidade", rotulo: "Interculturalidade" },
    { chave: "politizacao", rotulo: "Politização" },
    { chave: "impacto", rotulo: "Impacto" }
];

const ESTRELA = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

function Estrelas({ nota, tamanho = "w-5 h-5" }) {
    const n = notaSegura(nota);
    return (
        <div className="flex items-center gap-1" role="img" aria-label={`${n} de 5 estrelas`}>
            {Array(n).fill().map((_, i) => (
                <svg aria-hidden="true" key={`c${i}`} className={`${tamanho} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20"><path d={ESTRELA} /></svg>
            ))}
            {Array(5 - n).fill().map((_, i) => (
                <svg aria-hidden="true" key={`v${i}`} className={`${tamanho} text-gray-300`} fill="currentColor" viewBox="0 0 20 20"><path d={ESTRELA} /></svg>
            ))}
        </div>
    );
}

// Nota de critério válida: inteiro 1-5 (null/ausente = "não se aplica")
function valorCriterio(v) {
    const n = Number(v);
    return v !== null && v !== undefined && v !== "" && Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

function formatarData(data) {
    if (!data || typeof data !== "string") return "";
    const [ano, mes, dia] = data.split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

function formatarPreco(preco) {
    const n = Number(preco) || 0;
    return n > 0 ? `R$ ${n.toFixed(2).replace(".", ",")}` : "Gratuito";
}

export default function DetalhesEvento() {
    const params = useParams();
    const eventoId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const [evento, setEvento] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [avaliacoes, setAvaliacoes] = useState([]);
    const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!eventoId) return;
        let cancelado = false;
        setCarregando(true);
        buscarEvento(eventoId)
            .then(ev => { if (!cancelado) setEvento(ev); })
            .catch(err => console.error("Erro ao buscar evento:", err))
            .finally(() => { if (!cancelado) setCarregando(false); });
        return () => { cancelado = true; };
    }, [eventoId]);

    useEffect(() => {
        if (!eventoId) return;
        let cancelado = false;

        const carregar = async () => {
            setCarregandoAvaliacoes(true);
            const id = String(eventoId);
            let docs;
            try {
                // Requer o índice composto avaliacoes (eventoId ASC, criadoEm DESC) - firestore.indexes.json
                const snap = await getDocs(query(
                    collection(db, "avaliacoes"),
                    where("eventoId", "==", id),
                    orderBy("criadoEm", "desc"),
                    limit(LIMITE_AVALIACOES)
                ));
                docs = snap.docs;
            } catch (err) {
                // Se o índice ainda não foi publicado, busca sem ordenação e ordena aqui
                console.error("Erro ao buscar avaliações ordenadas (índice publicado?):", err);
                try {
                    const snap = await getDocs(query(
                        collection(db, "avaliacoes"),
                        where("eventoId", "==", id),
                        limit(LIMITE_AVALIACOES)
                    ));
                    docs = snap.docs;
                } catch (err2) {
                    console.error("Erro ao buscar avaliações:", err2);
                    docs = [];
                }
            }
            if (cancelado) return;
            // Avaliações ocultadas pela moderação (painel /admin) não aparecem
            // nem entram nas médias
            const lista = docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(av => av.moderado !== true);
            const ms = (av) => (av.criadoEm?.toMillis ? av.criadoEm.toMillis() : 0);
            lista.sort((a, b) => ms(b) - ms(a));
            setAvaliacoes(lista);
            setCarregandoAvaliacoes(false);
        };

        carregar();
        return () => { cancelado = true; };
    }, [eventoId]);

    // Média geral (notas inteiras 1-5)
    const notas = avaliacoes.map(av => notaSegura(av.nota)).filter(n => n >= 1);
    const mediaGeral = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;

    // Média por critério, ignorando "não se aplica" (null)
    const mediasCriterios = CRITERIOS.map(c => {
        const valores = avaliacoes
            .filter(av => av.criterios && typeof av.criterios === "object")
            .map(av => valorCriterio(av.criterios[c.chave]))
            .filter(v => v !== null);
        return {
            ...c,
            quantidade: valores.length,
            media: valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null
        };
    });
    const temCriterios = mediasCriterios.some(c => c.quantidade > 0);

    const podeEditar = evento && !evento.legado && user
        && (user.uid === evento.universidadeUid || isAdminEmail(user.email));

    if (carregando) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center" role="status">
                    <div aria-hidden="true" className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <div className="text-gray-700 text-lg">Carregando evento...</div>
                </div>
            </div>
        );
    }

    if (!evento) {
        return (
            <main id="conteudo" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 text-center max-w-md">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Evento não encontrado</h1>
                    <p className="text-gray-600 mb-6">Este evento não existe ou foi removido.</p>
                    <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all">
                        Ir para Home
                    </Link>
                </div>
            </main>
        );
    }

    const infos = [
        { rotulo: "Data", valor: formatarData(evento.data), icone: "📅" },
        { rotulo: "Local", valor: evento.local, icone: "📍" },
        { rotulo: "Público-alvo", valor: evento.publicoAlvo, icone: "👥" },
        { rotulo: "Preço", valor: formatarPreco(evento.preco), icone: "🎟️" },
        { rotulo: "Tipo", valor: evento.tipo, icone: "🏷️" },
        { rotulo: "Tema", valor: evento.tema, icone: "📚" }
    ].filter(i => i.valor);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto flex items-center justify-between gap-3 px-4 md:px-6 py-4">
                    <Link href="/" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 transition-colors">
                        <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span className="font-bold text-lg">Voltar</span>
                    </Link>
                    <img src="/uniscore_star_logo.png" alt="UniScore" className="h-10 sm:h-16 w-auto max-w-[140px] sm:max-w-[220px]" />
                    <nav className="hidden md:flex gap-8 text-sm" aria-label="Principal">
                        <Link href="/forum" className="hover:text-blue-600 transition-colors flex items-center gap-1 text-gray-600">
                            Fórum
                        </Link>
                    </nav>
                    <MenuMobile />
                </div>
            </header>

            <main id="conteudo" className="container mx-auto px-4 md:px-6 py-12 max-w-5xl">
                {/* Evento */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-8">
                    <div className="flex flex-col md:flex-row">
                        {evento.imagem ? (
                            <img src={evento.imagem} alt={`Imagem do evento ${evento.nome}`} className="w-full md:w-80 h-64 md:h-auto object-cover bg-gray-100" />
                        ) : (
                            <div aria-hidden="true" className="w-full md:w-80 h-64 md:h-auto bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 flex items-center justify-center text-white text-6xl font-bold">
                                {evento.nome?.charAt(0)?.toUpperCase() || "E"}
                            </div>
                        )}
                        <div className="flex-1 p-5 sm:p-8">
                            {evento.universidadeNome && (
                                evento.universidadeId ? (
                                    <Link href={`/universidade/${evento.universidadeId}`} className="text-sm font-semibold text-blue-600 hover:underline">
                                        {evento.universidadeNome}
                                    </Link>
                                ) : (
                                    <span className="text-sm font-semibold text-blue-600">{evento.universidadeNome}</span>
                                )
                            )}
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-1 mb-4">{evento.nome}</h1>

                            <div className="flex flex-wrap items-center gap-3 mb-6">
                                <Estrelas nota={mediaGeral} />
                                <span className="text-2xl font-bold text-gray-900">{notas.length ? mediaGeral.toFixed(1) : "–"}</span>
                                <span className="text-gray-600 text-sm">
                                    ({notas.length} {notas.length === 1 ? "avaliação" : "avaliações"}
                                    {avaliacoes.length >= LIMITE_AVALIACOES ? `, últimas ${LIMITE_AVALIACOES}` : ""})
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                {infos.map(info => (
                                    <div key={info.rotulo} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                                        <div className="text-xs text-gray-600"><span aria-hidden="true">{info.icone}</span> {info.rotulo}</div>
                                        <div className="text-gray-900 font-semibold">{info.valor}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href={`/avaliar?eventoId=${encodeURIComponent(evento.id)}`}
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-700 to-green-800 text-white px-6 py-3 rounded-lg font-bold hover:from-green-800 hover:to-green-900 transition-all duration-300 shadow-lg transform hover:scale-105"
                                >
                                    <span aria-hidden="true">★</span> Avaliar este evento
                                </Link>
                                {podeEditar && (
                                    <Link
                                        href={`/dashboard-universidade/eventos/${evento.id}/editar`}
                                        className="inline-flex items-center gap-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-300 transition-all duration-300"
                                    >
                                        <span aria-hidden="true">✏️</span> Editar evento
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {evento.descricao && (
                        <div className="border-t border-gray-200 p-5 sm:p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-3">Sobre o evento</h2>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{evento.descricao}</p>
                        </div>
                    )}
                </div>

                {/* Médias por critério */}
                {temCriterios && (
                    <div className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Avaliação por critério</h2>
                        <div className="space-y-4">
                            {mediasCriterios.map(c => (
                                <div key={c.chave} className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
                                    <div className="w-full sm:w-40 text-gray-700 font-medium">{c.rotulo}</div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden" aria-hidden="true">
                                        <div
                                            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                                            style={{ width: `${c.media ? (c.media / 5) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <div className="w-28 text-right text-sm">
                                        {c.media !== null ? (
                                            <span className="font-bold text-gray-900">{c.media.toFixed(1)} <span className="font-normal text-gray-600">({c.quantidade})</span></span>
                                        ) : (
                                            <span className="text-gray-600">Não se aplica</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Avaliações */}
                <div className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Avaliações</h2>
                    {carregandoAvaliacoes ? (
                        <div className="text-gray-600 text-center py-6" role="status">Carregando avaliações...</div>
                    ) : avaliacoes.length === 0 ? (
                        <div className="text-gray-600 bg-gray-50 rounded-xl p-6 text-center">
                            Este evento ainda não tem avaliações. Seja o primeiro a avaliar!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {avaliacoes.map(av => (
                                <div key={av.id} className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                        {av.photoURL ? (
                                            <img src={av.photoURL} alt="" className="rounded-full w-12 h-12 object-cover border-2 border-gray-300" />
                                        ) : (
                                            <div aria-hidden="true" className="rounded-full bg-gradient-to-br from-blue-500 to-blue-600 w-12 h-12 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                                {av.usuario?.charAt(0)?.toUpperCase() || "U"}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-900">{av.usuario || "Usuário"}</div>
                                            <div className="text-xs text-gray-600">
                                                {av.criadoEm?.toDate ? av.criadoEm.toDate().toLocaleDateString("pt-BR") : ""}
                                            </div>
                                        </div>
                                        <Estrelas nota={av.nota} />
                                    </div>
                                    {av.titulo && <h3 className="font-bold text-gray-900 mb-1">{av.titulo}</h3>}
                                    {av.comentario && <p className="text-gray-700 leading-relaxed">{av.comentario}</p>}
                                    {av.criterios && typeof av.criterios === "object" && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {CRITERIOS.map(c => {
                                                const v = valorCriterio(av.criterios[c.chave]);
                                                return (
                                                    <span key={c.chave} className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600">
                                                        {c.rotulo}: <span className="font-semibold text-gray-900">{v !== null ? `${v}/5` : "N/A"}</span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {av.imagem && typeof av.imagem === "string" && (
                                        <img src={av.imagem} alt={`Imagem enviada por ${av.usuario || "usuário"} na avaliação`} className="w-full max-w-sm h-48 object-cover rounded-lg mt-3 border border-gray-200" />
                                    )}
                                    <div className="flex justify-end mt-3">
                                        <BotaoDenunciar user={user} tipo="avaliacao" alvoId={av.id} autorUid={av.usuarioId} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
