"use client";
// Painel de conquistas do perfil (RF05): estrelas, pontos, progresso até o
// próximo nível, selos e histórico de avaliações. Tudo é calculado na leitura
// a partir da atividade do usuário (ver src/lib/gamificacao.js).
import { useState, useEffect } from "react";
import Link from "next/link";
import { carregarAtividade, calcularConquistas, paraMillis } from "../lib/gamificacao";
import { listarEventos } from "../lib/eventos";
import { notaSegura } from "../lib/notas";

const TAMANHO_HISTORICO = 10;

function Estrelas({ quantidade, total = 5, className = "w-6 h-6", rotulo }) {
    return (
        <div className="flex items-center gap-0.5" role="img" aria-label={rotulo || `${quantidade} de ${total} estrelas`}>
            {Array.from({ length: total }, (_, i) => (
                <svg
                    key={i}
                    aria-hidden="true"
                    className={`${className} ${i < quantidade ? "text-yellow-400" : "text-gray-300"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

function formatarData(valor) {
    const ms = paraMillis(valor);
    if (!ms) return "";
    return new Date(ms).toLocaleDateString("pt-BR");
}

export default function PainelConquistas({ uid }) {
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [conquistas, setConquistas] = useState(null);
    const [historico, setHistorico] = useState([]);
    const [nomesEventos, setNomesEventos] = useState({});
    const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

    useEffect(() => {
        if (!uid) return;
        let ativo = true;
        setCarregando(true);
        setErro("");

        (async () => {
            try {
                const atividade = await carregarAtividade(uid);
                if (!ativo) return;
                setConquistas(calcularConquistas(atividade));
                const ultimas = atividade.avaliacoes.slice(0, TAMANHO_HISTORICO);
                setHistorico(ultimas);

                // Nomes dos eventos do histórico (uma única leitura da lista)
                if (ultimas.length > 0) {
                    const eventos = await listarEventos();
                    if (!ativo) return;
                    setNomesEventos(Object.fromEntries(eventos.map(ev => [ev.id, ev.nome])));
                }
            } catch (err) {
                console.error("Erro ao carregar conquistas:", err);
                if (ativo) setErro("Não foi possível carregar suas conquistas.");
            } finally {
                if (ativo) setCarregando(false);
            }
        })();

        return () => {
            ativo = false;
        };
    }, [uid]);

    if (!uid) return null;

    if (carregando) {
        return (
            <div className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm mt-8" aria-busy="true">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600">Carregando conquistas...</p>
                </div>
            </div>
        );
    }

    if (erro || !conquistas) {
        return (
            <div className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm mt-8">
                <p className="text-center text-red-600">{erro || "Não foi possível carregar suas conquistas."}</p>
            </div>
        );
    }

    const { pontos, estrelas, nivel, proximoNivel, selos, totalSelos, detalhamento } = conquistas;
    const progresso = proximoNivel ? Math.max(0, Math.min(100, proximoNivel.progresso)) : 100;

    return (
        <div className="mt-8 space-y-8">
            {/* Nível e pontos */}
            <section className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm" aria-labelledby="titulo-conquistas">
                <h2 id="titulo-conquistas" className="text-2xl font-bold text-gray-900 mb-6 text-center">Minhas conquistas</h2>

                <div className="flex flex-col items-center gap-2 mb-6">
                    <Estrelas quantidade={estrelas} className="w-9 h-9" rotulo={`Nível ${estrelas} de 5 estrelas`} />
                    <p className="text-lg font-semibold text-gray-900">{nivel}</p>
                    <p className="text-gray-600">
                        <span className="text-3xl font-bold text-blue-600">{pontos}</span> pontos
                    </p>
                </div>

                <div className="max-w-md mx-auto">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Nível {estrelas}</span>
                        <span>
                            {proximoNivel
                                ? `Faltam ${proximoNivel.faltam} pontos para ${proximoNivel.estrelas} estrelas`
                                : "Nível máximo alcançado!"}
                        </span>
                    </div>
                    <div
                        className="w-full h-3 bg-gray-200 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-label="Progresso até o próximo nível"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progresso}
                        aria-valuetext={proximoNivel ? `${pontos} de ${proximoNivel.pontosNecessarios} pontos` : "Nível máximo"}
                    >
                        <div
                            className="h-full bg-gradient-to-r from-yellow-300 to-green-400 rounded-full transition-all duration-500"
                            style={{ width: `${progresso}%` }}
                        ></div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMostrarDetalhes(v => !v)}
                        aria-expanded={mostrarDetalhes}
                        className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        {mostrarDetalhes ? "Ocultar" : "Ver"} de onde vieram os pontos
                    </button>
                    <span className="mx-2 text-gray-300" aria-hidden="true">·</span>
                    <Link href="/ranking" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                        Ver ranking da comunidade
                    </Link>
                    {mostrarDetalhes && (
                        <ul className="mt-3 divide-y divide-gray-100 text-sm">
                            {detalhamento.map(item => (
                                <li key={item.id} className="flex justify-between py-2 text-gray-700">
                                    <span>
                                        {item.rotulo} <span className="text-gray-600">({item.quantidade} × {item.valor})</span>
                                    </span>
                                    <span className="font-semibold text-gray-900">{item.pontos}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            {/* Selos */}
            <section className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm" aria-labelledby="titulo-selos">
                <div className="flex items-center justify-between mb-6">
                    <h2 id="titulo-selos" className="text-2xl font-bold text-gray-900">Selos</h2>
                    <span className="text-sm text-gray-600">{totalSelos} de {selos.length} conquistados</span>
                </div>
                <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {selos.map(selo => (
                        <li
                            key={selo.id}
                            className={`rounded-xl p-4 border text-center transition-all duration-200 ${
                                selo.conquistado
                                    ? "bg-gradient-to-br from-yellow-50 to-green-50 border-yellow-300 shadow-sm"
                                    : "bg-gray-50 border-gray-200"
                            }`}
                            aria-label={`${selo.nome}: ${selo.conquistado ? "conquistado" : `bloqueado, ${selo.atual} de ${selo.meta}`}. ${selo.descricao}`}
                        >
                            <div className={`text-4xl mb-2 ${selo.conquistado ? "" : "grayscale opacity-40"}`} aria-hidden="true">
                                {selo.emoji}
                            </div>
                            <p className={`font-semibold text-sm ${selo.conquistado ? "text-gray-900" : "text-gray-600"}`}>{selo.nome}</p>
                            <p className="text-xs text-gray-600 mt-1">{selo.descricao}</p>
                            {!selo.conquistado && (
                                <p className="text-xs text-gray-600 mt-1">{selo.atual}/{selo.meta}</p>
                            )}
                        </li>
                    ))}
                </ul>
            </section>

            {/* Histórico de avaliações */}
            <section className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm" aria-labelledby="titulo-historico">
                <h2 id="titulo-historico" className="text-2xl font-bold text-gray-900 mb-6">Histórico de avaliações</h2>
                {historico.length === 0 ? (
                    <div className="text-center text-gray-600">
                        <p className="mb-4">Você ainda não avaliou nenhum evento.</p>
                        <Link
                            href="/avaliar"
                            className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md"
                        >
                            Fazer minha primeira avaliação
                        </Link>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {historico.map(av => {
                            const nota = notaSegura(av.nota);
                            const nomeEvento = nomesEventos[String(av.eventoId)] || av.titulo || "Evento";
                            return (
                                <li key={av.id}>
                                    <Link
                                        href={`/evento/${encodeURIComponent(av.eventoId)}/detalhes`}
                                        className="flex items-start justify-between gap-4 py-4 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 truncate">{nomeEvento}</p>
                                            {av.comentario && (
                                                <p className="text-sm text-gray-600 line-clamp-2">{av.comentario}</p>
                                            )}
                                            <p className="text-xs text-gray-600 mt-1">{formatarData(av.criadoEm)}</p>
                                        </div>
                                        <Estrelas quantidade={nota} className="w-4 h-4 flex-shrink-0" rotulo={`Nota ${nota} de 5`} />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}
