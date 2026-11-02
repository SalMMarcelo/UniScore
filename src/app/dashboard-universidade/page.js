"use client";
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, deleteDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { carregarDashboard } from "../../lib/dashboardUniversidade";
import SeletorIdioma from "../../components/SeletorIdioma";
import SeloPresencaVerificada from "../../components/SeloPresencaVerificada";
import PainelCheckin from "./eventos/PainelCheckin";
import { useI18n } from "../../i18n/I18nProvider";

const SEM_VALOR = "—";

const ESTRELA_PATH = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

// Barra horizontal decorativa: o valor sempre aparece em texto ao lado
function Barra({ fracao, cor }) {
    const largura = Math.max(0, Math.min(1, Number(fracao) || 0)) * 100;
    return (
        <div aria-hidden="true" className="flex-1 min-w-[60px] bg-gray-100 rounded-full h-3">
            <div className={`${cor} h-3 rounded-full`} style={{ width: `${largura}%` }}></div>
        </div>
    );
}

function Cartao({ cor, icone, valor, rotulo, detalhe }) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className={`w-12 h-12 ${cor} rounded-xl flex items-center justify-center mb-4`}>{icone}</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{valor}</div>
            <div className="text-sm text-gray-600">{rotulo}</div>
            {detalhe && <div className="text-sm text-gray-700 mt-1 font-medium">{detalhe}</div>}
        </div>
    );
}

export default function DashboardUniversidade() {
    const { t, rotulo, formatarData, formatarNumero, formatarMoeda } = useI18n();
    const [user, setUser] = useState(null);
    const [universidadeData, setUniversidadeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isUniversidade, setIsUniversidade] = useState(false);
    const [meusEventos, setMeusEventos] = useState([]);
    const [eventosProntos, setEventosProntos] = useState(false);
    const [excluindoId, setExcluindoId] = useState(null);
    const [checkinAbertoId, setCheckinAbertoId] = useState(null);
    // Dados agregados (src/lib/dashboardUniversidade.js)
    const [dados, setDados] = useState(null);
    const [carregandoDados, setCarregandoDados] = useState(true);
    const [erroDados, setErroDados] = useState(false);
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
                        // Guarda a chave de tradução (a tela de erro mostra um texto fixo traduzido)
                        setError("dashboard.acessoNegadoMsg");
                        setTimeout(() => {
                            router.push("/");
                        }, 3000);
                    }
                } catch (error) {
                    console.error("Erro ao buscar dados da universidade:", error);

                    // Se o erro for de permissão, significa que não é uma universidade
                    if (error.code === 'permission-denied') {
                        setError("dashboard.acessoNegadoMsg");
                    } else {
                        setError("dashboard.erroCarregar");
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

    const aprovada = universidadeData?.status === "aprovado";
    // Vínculo com uma universidade: só o que está na própria conta (universidades/{uid})
    const universidadeId = universidadeData?.universidadeId ? String(universidadeData.universidadeId) : null;
    const semVinculo = isUniversidade && !universidadeId;

    // Eventos cadastrados por esta conta (RF02) - só para universidades aprovadas
    useEffect(() => {
        if (!user || !aprovada) {
            setMeusEventos([]);
            setEventosProntos(false);
            return;
        }
        const q = query(collection(db, "eventos"), where("universidadeUid", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Mais recentes primeiro (ordenação local para não exigir índice composto)
            lista.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
            setMeusEventos(lista);
            setEventosProntos(true);
        }, (err) => {
            console.error("Erro ao buscar eventos da universidade:", err);
            setEventosProntos(true);
        });
        return () => unsubscribe();
    }, [user, aprovada]);

    // Avaliações, presenças e agregações. Recarrega quando a lista de eventos muda.
    // Conta não aprovada: a lib busca os eventos da conta e não conta presenças (as regras negariam).
    const chaveEventos = meusEventos.map(ev => `${ev.id}:${ev.nome || ""}`).join("|");
    useEffect(() => {
        if (!user || !isUniversidade || error) return;
        if (aprovada && !eventosProntos) return;
        let cancelado = false;
        setCarregandoDados(true);
        setErroDados(false);
        carregarDashboard({
            uid: user.uid,
            universidadeId,
            eventosConta: aprovada ? meusEventos : null,
            contarPresencasDosEventos: aprovada
        })
            .then(resultado => { if (!cancelado) setDados(resultado); })
            .catch(err => {
                console.error("Erro ao carregar os dados do dashboard:", err);
                if (!cancelado) setErroDados(true);
            })
            .finally(() => { if (!cancelado) setCarregandoDados(false); });
        return () => { cancelado = true; };
        // meusEventos entra pela chaveEventos (evita recarregar a cada snapshot igual)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isUniversidade, error, aprovada, eventosProntos, universidadeId, chaveEventos]);

    const excluirEvento = async (evento) => {
        if (!window.confirm(t("dashboard.confirmarExclusao", { nome: evento.nome }))) return;
        setExcluindoId(evento.id);
        try {
            await deleteDoc(doc(db, "eventos", evento.id));
        } catch (err) {
            console.error("Erro ao excluir evento:", err);
            alert(t("dashboard.erroExcluir"));
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

    const fmtNota = (n) => (n === null || n === undefined ? SEM_VALOR : formatarNumero(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
    const fmtPct = (f) => (f === null || f === undefined ? SEM_VALOR : formatarNumero(f, { style: "percent", maximumFractionDigits: 1 }));
    const nomeEvento = (id) => dados?.nomesEventos?.[String(id)] || t("dashboard.eventoSemNome", { id: String(id) });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center" role="status">
                    <div aria-hidden="true" className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                    <div className="text-gray-700 text-lg">{t("dashboard.carregando")}</div>
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("dashboard.acessoNegado")}</h2>
                    <p className="text-gray-600 mb-6">{t("dashboard.exclusiva")}</p>
                    <Link href="/" className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-all">
                        {t("dashboard.irHome")}
                    </Link>
                </div>
            </div>
        );
    }

    const resumo = dados?.resumo;
    const presencas = dados?.presencas;
    const semAvaliacoes = !resumo || resumo.total === 0;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <img src="/uniscore_star_logo.png" alt={t("dashboard.logoInicio")} className="h-10 sm:h-16 w-auto max-w-[140px] sm:max-w-[220px]" />
                        </Link>
                        <div className="flex items-center gap-4">
                            <SeletorIdioma />
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-semibold text-gray-900">{universidadeData?.nomeUniversidade || t("dashboard.universidade")}</p>
                                <p className="text-xs text-gray-600">{t("dashboard.contaInstitucional")}</p>
                            </div>
                            <button type="button" onClick={handleLogout} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                </svg>
                                <span className="sr-only sm:not-sr-only">{t("dashboard.sair")}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main id="conteudo" className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {/* Welcome */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        {t("dashboard.bemVinda")} <span className="text-red-600">{universidadeData?.nomeUniversidade}</span>
                    </h2>
                    <p className="text-lg text-gray-600">{t("dashboard.subtitulo")}</p>
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
                                <h3 className="font-bold text-xl text-gray-900 mb-1">{t("dashboard.analiseTitulo")}</h3>
                                <p className="text-gray-700">{t("dashboard.analiseTexto")}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Conta sem vínculo: só as avaliações dos eventos cadastrados pela conta */}
                {semVinculo && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 px-8 py-6 rounded-2xl mb-8">
                        <h3 className="font-bold text-xl text-gray-900 mb-1">{t("dashboard.semVinculoTitulo")}</h3>
                        <p className="text-gray-700">
                            {t("dashboard.semVinculoTexto", { nome: universidadeData?.nomeUniversidade || "" })}
                        </p>
                    </div>
                )}

                {/* Dados reais das avaliações (src/lib/dashboardUniversidade.js) */}
                {carregandoDados && !dados ? (
                    <div role="status" className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-8 text-center text-gray-700">
                        <div aria-hidden="true" className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-3"></div>
                        <div>{t("dashboard.carregandoDados")}</div>
                    </div>
                ) : erroDados ? (
                    <div role="alert" className="bg-red-50 border-2 border-red-200 text-red-800 px-8 py-6 rounded-2xl mb-8">
                        {t("dashboard.erroDados")}
                    </div>
                ) : (
                    <>
                        {/* Cartões */}
                        <section aria-labelledby="titulo-resumo" className="mb-8">
                            <h3 id="titulo-resumo" className="sr-only">{t("dashboard.resumoTitulo")}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Cartao
                                    cor="bg-blue-100"
                                    icone={<svg aria-hidden="true" className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>}
                                    valor={formatarNumero(resumo?.total ?? 0)}
                                    rotulo={t("dashboard.avaliacoesRecebidas")}
                                />
                                <Cartao
                                    cor="bg-yellow-100"
                                    icone={<svg aria-hidden="true" className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20"><path d={ESTRELA_PATH}/></svg>}
                                    valor={fmtNota(resumo?.notaMedia)}
                                    rotulo={t("dashboard.notaMedia")}
                                />
                                <Cartao
                                    cor="bg-green-100"
                                    icone={<svg aria-hidden="true" className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
                                    valor={formatarNumero(resumo?.eventosAvaliados ?? 0)}
                                    rotulo={t("dashboard.eventosAvaliados")}
                                />
                                <Cartao
                                    cor="bg-emerald-100"
                                    icone={<svg aria-hidden="true" className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                                    valor={formatarNumero(resumo?.verificadas ?? 0)}
                                    rotulo={t("dashboard.comPresencaVerificada")}
                                    detalhe={resumo?.percentualVerificadas != null ? t("dashboard.percentualDoTotal", { pct: fmtPct(resumo.percentualVerificadas) }) : null}
                                />
                            </div>
                        </section>

                        {/* Presenças e comparativo de 30 dias */}
                        <section aria-labelledby="titulo-presencas" className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                <h3 id="titulo-presencas" className="text-lg font-bold text-gray-900 mb-4">{t("dashboard.presencasTitulo")}</h3>
                                <dl className="grid grid-cols-2 gap-4">
                                    <div>
                                        <dt className="text-sm text-gray-600">{t("dashboard.presencasTotal")}</dt>
                                        <dd className="text-3xl font-bold text-gray-900">{presencas ? formatarNumero(presencas.total) : SEM_VALOR}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-gray-600">{t("dashboard.taxaAvaliacao")}</dt>
                                        <dd className="text-3xl font-bold text-gray-900">{fmtPct(presencas?.taxaAvaliacao)}</dd>
                                    </div>
                                </dl>
                                <p className="text-sm text-gray-600 mt-4">
                                    {presencas ? t("dashboard.taxaAvaliacaoAjuda") : t("dashboard.presencasIndisponiveis")}
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">{t("dashboard.ultimos30Titulo")}</h3>
                                {dados?.comparativo ? (
                                    <dl className="grid grid-cols-3 gap-4">
                                        <div>
                                            <dt className="text-sm text-gray-600">{t("dashboard.ultimos30")}</dt>
                                            <dd className="text-3xl font-bold text-gray-900">{formatarNumero(dados.comparativo.atual)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-gray-600">{t("dashboard.anteriores30")}</dt>
                                            <dd className="text-3xl font-bold text-gray-900">{formatarNumero(dados.comparativo.anterior)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-gray-600">{t("dashboard.variacao")}</dt>
                                            <dd className={`text-3xl font-bold ${dados.comparativo.variacao >= 0 ? "text-green-700" : "text-red-700"}`}>
                                                {formatarNumero(dados.comparativo.variacao, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" })}
                                            </dd>
                                        </div>
                                    </dl>
                                ) : (
                                    <p className="text-gray-600">{t("dashboard.semComparativo")}</p>
                                )}
                            </div>
                        </section>

                        {semAvaliacoes ? (
                            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-8 text-center">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{t("dashboard.nenhumaAvaliacao")}</h3>
                                <p className="text-gray-600">{t("dashboard.nenhumaAvaliacaoTexto")}</p>
                            </div>
                        ) : (
                            <>
                                {/* Satisfação por critério e distribuição de notas */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                    <section aria-labelledby="titulo-criterios" className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                        <h3 id="titulo-criterios" className="text-lg font-bold text-gray-900 mb-4">{t("dashboard.satisfacaoCriterio")}</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-600 border-b border-gray-200">
                                                        <th scope="col" className="py-2 pr-3 font-semibold">{t("dashboard.colCriterio")}</th>
                                                        <th scope="col" className="py-2 pr-3 font-semibold">{t("dashboard.colMedia")}</th>
                                                        <th scope="col" className="py-2 font-semibold text-right">{t("dashboard.colAvaliacoes")}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dados.criterios.map(c => (
                                                        <tr key={c.id} className="border-b border-gray-100 last:border-0">
                                                            <th scope="row" className="py-2 pr-3 text-left font-medium text-gray-800">{t(`criterios.${c.id}`)}</th>
                                                            <td className="py-2 pr-3">
                                                                <div className="flex items-center gap-3">
                                                                    <Barra fracao={c.media ? c.media / 5 : 0} cor="bg-blue-500" />
                                                                    <span className="w-10 text-right font-bold text-gray-900">{fmtNota(c.media)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2 text-right text-gray-700">{formatarNumero(c.quantidade)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-3">{t("dashboard.criteriosAjuda")}</p>
                                    </section>

                                    <section aria-labelledby="titulo-distribuicao" className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                        <h3 id="titulo-distribuicao" className="text-lg font-bold text-gray-900 mb-4">{t("dashboard.distribuicaoNotas")}</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-600 border-b border-gray-200">
                                                        <th scope="col" className="py-2 pr-3 font-semibold">{t("dashboard.colNota")}</th>
                                                        <th scope="col" className="py-2 pr-3 font-semibold">{t("dashboard.colPercentual")}</th>
                                                        <th scope="col" className="py-2 font-semibold text-right">{t("dashboard.colQuantidade")}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dados.distribuicao.map(item => (
                                                        <tr key={item.estrelas} className="border-b border-gray-100 last:border-0">
                                                            <th scope="row" className="py-2 pr-3 text-left font-medium text-gray-800 whitespace-nowrap">
                                                                {t("dashboard.estrelas", { n: item.estrelas })}
                                                            </th>
                                                            <td className="py-2 pr-3">
                                                                <div className="flex items-center gap-3">
                                                                    <Barra fracao={item.percentual} cor="bg-yellow-500" />
                                                                    <span className="w-14 text-right font-bold text-gray-900">{fmtPct(item.percentual)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2 text-right text-gray-700">{formatarNumero(item.quantidade)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                </div>
                            </>
                        )}

                        {/* Por evento */}
                        {dados?.porEvento?.length > 0 && (
                            <section aria-labelledby="titulo-por-evento" className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm mb-8">
                                <h3 id="titulo-por-evento" className="text-2xl font-bold text-gray-900 mb-4">{t("dashboard.porEventoTitulo")}</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-600 border-b border-gray-200">
                                                <th scope="col" className="py-2 pr-3 font-semibold">{t("dashboard.colEvento")}</th>
                                                <th scope="col" className="py-2 pr-3 font-semibold text-right">{t("dashboard.colAvaliacoes")}</th>
                                                <th scope="col" className="py-2 pr-3 font-semibold text-right">{t("dashboard.colNotaMedia")}</th>
                                                <th scope="col" className="py-2 pr-3 font-semibold text-right">{t("dashboard.colPresencas")}</th>
                                                <th scope="col" className="py-2 font-semibold text-right">{t("dashboard.colVerificadas")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dados.porEvento.map(linha => (
                                                <tr key={linha.eventoId} className="border-b border-gray-100 last:border-0">
                                                    <th scope="row" className="py-2 pr-3 text-left font-medium text-gray-900">
                                                        <Link href={`/evento/${linha.eventoId}/detalhes`} className="hover:text-red-600 underline-offset-2 hover:underline">
                                                            {linha.nome || nomeEvento(linha.eventoId)}
                                                        </Link>
                                                    </th>
                                                    <td className="py-2 pr-3 text-right">{formatarNumero(linha.avaliacoes)}</td>
                                                    <td className="py-2 pr-3 text-right">{fmtNota(linha.notaMedia)}</td>
                                                    <td className="py-2 pr-3 text-right">{linha.presencas === null ? SEM_VALOR : formatarNumero(linha.presencas)}</td>
                                                    <td className="py-2 text-right">{formatarNumero(linha.verificadas)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* Avaliações recentes */}
                        {!semAvaliacoes && (
                            <section aria-labelledby="titulo-recentes" className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm mb-8">
                                <h3 id="titulo-recentes" className="text-2xl font-bold text-gray-900">{t("dashboard.recentesTitulo")}</h3>
                                <p className="text-gray-600 mb-4">{t("dashboard.recentesTexto", { n: dados.recentes.length })}</p>
                                <ul className="space-y-4">
                                    {dados.recentes.map(av => {
                                        const nota = Math.max(0, Math.min(5, Math.round(Number(av.nota) || 0)));
                                        return (
                                            <li key={av.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                                                    <span className="flex items-center gap-0.5" role="img" aria-label={t("dashboard.notaDe5", { n: nota })}>
                                                        {[1, 2, 3, 4, 5].map(i => (
                                                            <svg key={i} aria-hidden="true" className={`w-4 h-4 ${i <= nota ? "text-yellow-500" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20"><path d={ESTRELA_PATH}/></svg>
                                                        ))}
                                                    </span>
                                                    {av.presencaVerificada === true && <SeloPresencaVerificada />}
                                                    <span className="text-sm text-gray-600">{formatarData(av.criadoEm) || SEM_VALOR}</span>
                                                </div>
                                                <div className="text-sm text-gray-700 mb-1">
                                                    <span className="font-semibold">{t("dashboard.colEvento")}:</span>{" "}
                                                    {av.eventoId ? (
                                                        <Link href={`/evento/${av.eventoId}/detalhes`} className="hover:text-red-600 hover:underline">{nomeEvento(av.eventoId)}</Link>
                                                    ) : SEM_VALOR}
                                                </div>
                                                {av.titulo && <p className="font-semibold text-gray-900">{av.titulo}</p>}
                                                <p className="text-gray-800 whitespace-pre-line break-words">{av.comentario || <span className="italic text-gray-600">{t("dashboard.semComentario")}</span>}</p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        )}
                    </>
                )}

                {/* Meus Eventos (RF02) */}
                <div id="meus-eventos" className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-8 scroll-mt-28">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{t("dashboard.meusEventos")}</h3>
                            <p className="text-gray-600">{t("dashboard.meusEventosTexto")}</p>
                        </div>
                        {aprovada && (
                            <Link href="/dashboard-universidade/eventos/novo" className="text-center bg-gradient-to-r from-orange-700 to-red-700 text-white px-6 py-3 rounded-lg font-bold hover:from-orange-800 hover:to-red-800 transition-all duration-300 shadow-md">
                                {t("dashboard.cadastrarEvento")}
                            </Link>
                        )}
                    </div>

                    {!aprovada ? (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 px-6 py-5 rounded-xl text-gray-700">
                            {t("dashboard.cadastroIndisponivel")}
                        </div>
                    ) : meusEventos.length === 0 ? (
                        <div className="text-gray-600 bg-gray-50 rounded-xl p-6 text-center">
                            {t("dashboard.nenhumEvento")}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {meusEventos.map(ev => (
                                <div key={ev.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-red-300 transition-all">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    {ev.imagem ? (
                                        <img src={ev.imagem} alt="" className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200 shrink-0" />
                                    ) : (
                                        <div aria-hidden="true" className="w-20 h-20 rounded-xl bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                                            {ev.nome?.charAt(0)?.toUpperCase() || "E"}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/evento/${ev.id}/detalhes`} className="text-gray-900 font-bold text-lg hover:text-red-600 transition-colors">
                                            {ev.nome}
                                        </Link>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-600 text-sm mt-1">
                                            <span><span aria-hidden="true">📅</span> {typeof ev.data === "string" && ev.data ? (formatarData(ev.data) || ev.data) : t("dashboard.semData")}</span>
                                            {ev.local && <span><span aria-hidden="true">📍</span> {ev.local}</span>}
                                            {ev.tipo && <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">{rotulo("valores.tipos", ev.tipo)}</span>}
                                            {ev.tema && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">{rotulo("valores.temas", ev.tema)}</span>}
                                            <span>{Number(ev.preco) > 0 ? formatarMoeda(Number(ev.preco)) : t("dashboard.gratuito")}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setCheckinAbertoId(atual => atual === ev.id ? null : ev.id)}
                                            aria-expanded={checkinAbertoId === ev.id}
                                            aria-controls={`painel-checkin-${ev.id}`}
                                            aria-label={t("dashboard.checkinEvento", { nome: ev.nome })}
                                            className="bg-green-50 text-green-800 px-4 py-2 rounded-lg font-bold hover:bg-green-100 transition-all duration-300"
                                        >
                                            <span aria-hidden="true">📲</span> {t("dashboard.checkin")}
                                        </button>
                                        <Link href={`/dashboard-universidade/eventos/${ev.id}/editar`} aria-label={t("dashboard.editarEvento", { nome: ev.nome })} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-all duration-300">
                                            <span aria-hidden="true">✏️</span> {t("dashboard.editar")}
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => excluirEvento(ev)}
                                            aria-label={t("dashboard.excluirEvento", { nome: ev.nome })}
                                            disabled={excluindoId === ev.id}
                                            className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-all duration-300 disabled:opacity-60"
                                        >
                                            {excluindoId === ev.id ? t("dashboard.excluindo") : <><span aria-hidden="true">🗑️</span> {t("dashboard.excluir")}</>}
                                        </button>
                                    </div>
                                </div>
                                <div id={`painel-checkin-${ev.id}`}>
                                    {checkinAbertoId === ev.id && (
                                        <PainelCheckin evento={{ id: ev.id, nome: ev.nome, data: typeof ev.data === "string" ? ev.data : "" }} />
                                    )}
                                </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ferramentas de Gestão */}
                <div className="mb-8">
                    {/* Gerenciamento de Eventos */}
                    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-700 rounded-2xl flex items-center justify-center">
                                <svg aria-hidden="true" className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{t("dashboard.gerenciarEventos")}</h3>
                                <p className="text-gray-600">{t("dashboard.gerenciarTexto")}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-red-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">{t("dashboard.criarNovo")}</h4>
                                        <p className="text-gray-600 text-sm">{t("dashboard.criarNovoTexto")}</p>
                                    </div>
                                    {aprovada ? (
                                        <Link href="/dashboard-universidade/eventos/novo" className="bg-gradient-to-r from-orange-700 to-red-700 text-white px-4 py-2 rounded-lg font-bold hover:from-orange-800 hover:to-red-800 transition-all duration-300 shadow-md">
                                            {t("dashboard.criar")}
                                        </Link>
                                    ) : (
                                        <button disabled title={t("dashboard.disponivelAposAprovacao")} className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg font-bold cursor-not-allowed">
                                            {t("dashboard.criar")}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-red-300 transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">{t("dashboard.editarEventos")}</h4>
                                        <p className="text-gray-600 text-sm">{t("dashboard.editarEventosTexto")}</p>
                                    </div>
                                    {aprovada ? (
                                        <a href="#meus-eventos" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-all duration-300">
                                            {t("dashboard.editarBotao")}
                                        </a>
                                    ) : (
                                        <button disabled title={t("dashboard.disponivelAposAprovacao")} className="bg-gray-200 text-gray-400 px-4 py-2 rounded-lg font-bold cursor-not-allowed">
                                            {t("dashboard.editarBotao")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
