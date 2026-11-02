"use client";
// Parte visual do relatório da universidade (docs/relatorio-universidade.md).
// Recebe os dados já agregados (agregarRelatorio em src/lib/dashboardUniversidade.js) e só desenha:
// não busca nada, para poder ser conferida com dados de exemplo.
//
// Impressão: o PDF é gerado pelo próprio navegador (window.print()), com os estilos abaixo.
// A marca-d'água usa position: fixed, que o Chrome/Edge/Firefox repetem em todas as páginas
// impressas. Os cartões não têm fundo para não cobrir a marca-d'água.
import { useI18n } from "../../../i18n/I18nProvider";
import { inicioDoPeriodo } from "../../../lib/dashboardUniversidade";

const SEM_VALOR = "—";

export const ESTILO_IMPRESSAO = `
.relatorio-marca-dagua {
    position: fixed;
    top: 50%;
    left: 50%;
    width: min(70vw, 560px);
    transform: translate(-50%, -50%);
    opacity: 0.06;
    /* o PNG tem fundo quase branco: o brilho leva esse fundo a branco puro e some o "quadrado" */
    filter: brightness(1.04);
    pointer-events: none;
    user-select: none;
    z-index: 0;
}
.relatorio-conteudo { position: relative; z-index: 1; }
.relatorio-raiz { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media print {
    @page { size: A4; margin: 14mm; }
    html, body { background: #ffffff !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .fixed { display: none !important; } /* botão "Instalar app" (PwaInstall) */
    .relatorio-sem-impressao { display: none !important; }
    .relatorio-marca-dagua { width: 150mm; }
    .relatorio-raiz { font-size: 11px; }
    .relatorio-raiz h2 { break-after: avoid; }
    .relatorio-raiz table { font-size: 10px; }
    .relatorio-raiz thead { display: table-header-group; }
    .relatorio-raiz tr, .relatorio-bloco { break-inside: avoid; }
    .relatorio-raiz a { color: inherit; text-decoration: none; }
}
`;

// Barra horizontal decorativa (o valor aparece em texto ao lado)
function Barra({ fracao, cor }) {
    const largura = Math.max(0, Math.min(1, Number(fracao) || 0)) * 100;
    return (
        <div aria-hidden="true" className="flex-1 min-w-[60px] rounded-full h-2.5" style={{ backgroundColor: "#e5e7eb" }}>
            <div className="h-2.5 rounded-full" style={{ width: `${largura}%`, backgroundColor: cor }}></div>
        </div>
    );
}

function Numero({ rotulo, valor, detalhe }) {
    return (
        <div className="relatorio-bloco rounded-lg border border-gray-300 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-600">{rotulo}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{valor}</div>
            {detalhe && <div className="text-xs text-gray-600 mt-1">{detalhe}</div>}
        </div>
    );
}

function Secao({ titulo, children, id }) {
    return (
        <section aria-labelledby={id} className="mb-8">
            <h2 id={id} className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-1 mb-3">{titulo}</h2>
            {children}
        </section>
    );
}

const TH = "py-1.5 px-2 font-semibold text-left border border-gray-300";
const TD = "py-1.5 px-2 border border-gray-300";

// Props:
//  - nomeUniversidade: nome da conta (universidades/{uid}.nomeUniversidade)
//  - periodo: "30d" | "12m" | "tudo"
//  - geradoEm: Date da geração
//  - relatorio: retorno de agregarRelatorio
//  - nomesEventos: { [eventoId]: nome }
//  - datasEventos: { [eventoId]: data } (só os eventos da conta têm data)
//  - urlSite: endereço mostrado no rodapé
export default function RelatorioImpressao({ nomeUniversidade, periodo, geradoEm, relatorio, nomesEventos, datasEventos, urlSite }) {
    const { t, formatarData, formatarDataHora, formatarNumero } = useI18n();

    const fmtNota = (n) => (n === null || n === undefined ? SEM_VALOR : formatarNumero(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
    const fmtPct = (f) => (f === null || f === undefined ? SEM_VALOR : formatarNumero(f, { style: "percent", maximumFractionDigits: 1 }));
    const nomeEvento = (id) => nomesEventos?.[String(id)] || t("dashboard.eventoSemNome", { id: String(id) });

    const inicio = inicioDoPeriodo(periodo, geradoEm);
    const textoPeriodo = inicio
        ? `${t(`relatorioUniversidade.periodos.${periodo}`)} (${t("relatorioUniversidade.periodoIntervalo", { inicio: formatarData(inicio), fim: formatarData(geradoEm) })})`
        : t("relatorioUniversidade.periodoTudo", { fim: formatarData(geradoEm) });

    const { resumo, presencas, criterios, distribuicao, porEvento, recentes } = relatorio;
    const semAvaliacoes = resumo.total === 0;

    return (
        <div className="relatorio-raiz bg-white text-gray-900">
            <style>{ESTILO_IMPRESSAO}</style>
            <img src="/uniscore_star_logo.png" alt="" aria-hidden="true" className="relatorio-marca-dagua" />

            <div className="relatorio-conteudo max-w-4xl mx-auto px-4 md:px-8 py-8">
                {/* Cabeçalho */}
                <header className="flex items-start justify-between gap-6 border-b-2 border-gray-800 pb-4 mb-6">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold uppercase tracking-wide text-gray-600">{t("relatorioUniversidade.titulo")}</p>
                        <h1 className="text-3xl font-bold text-gray-900 break-words">{nomeUniversidade || t("dashboard.universidade")}</h1>
                        <p className="text-sm text-gray-700 mt-2">
                            <span className="font-semibold">{t("relatorioUniversidade.periodoRotulo")}:</span> {textoPeriodo}
                        </p>
                        <p className="text-sm text-gray-700">{t("relatorioUniversidade.geradoEm", { data: formatarDataHora(geradoEm) })}</p>
                    </div>
                    <img src="/uniscore_star_logo.png" alt="UniScore" className="h-24 w-24 flex-shrink-0" />
                </header>

                {/* Números principais */}
                <Secao id="rel-numeros" titulo={t("relatorioUniversidade.numerosTitulo")}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Numero rotulo={t("relatorioUniversidade.avaliacoes")} valor={formatarNumero(resumo.total)} />
                        <Numero rotulo={t("relatorioUniversidade.notaMedia")} valor={fmtNota(resumo.notaMedia)} detalhe={t("relatorioUniversidade.notaMediaDetalhe")} />
                        <Numero rotulo={t("relatorioUniversidade.eventosAvaliados")} valor={formatarNumero(resumo.eventosAvaliados)} />
                        <Numero
                            rotulo={t("relatorioUniversidade.verificadas")}
                            valor={formatarNumero(resumo.verificadas)}
                            detalhe={t("relatorioUniversidade.verificadasDetalhe", { pct: fmtPct(resumo.percentualVerificadas) })}
                        />
                        <Numero
                            rotulo={t("relatorioUniversidade.checkins")}
                            valor={presencas ? formatarNumero(presencas.total) : SEM_VALOR}
                            detalhe={t("relatorioUniversidade.checkinsDetalhe")}
                        />
                        <Numero
                            rotulo={t("relatorioUniversidade.taxaAvaliacao")}
                            valor={fmtPct(presencas?.taxaAvaliacao)}
                            detalhe={t("relatorioUniversidade.taxaAvaliacaoDetalhe")}
                        />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                        {presencas ? t("relatorioUniversidade.checkinsSemPeriodo") : t("relatorioUniversidade.presencasIndisponiveis")}
                    </p>
                </Secao>

                {semAvaliacoes ? (
                    <p className="relatorio-bloco rounded-lg border border-gray-300 p-4 mb-8 text-gray-700">{t("relatorioUniversidade.nenhumaAvaliacao")}</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Critérios */}
                        <Secao id="rel-criterios" titulo={t("relatorioUniversidade.criteriosTitulo")}>
                            <table className="relatorio-bloco w-full text-sm border-collapse">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th scope="col" className={TH}>{t("dashboard.colCriterio")}</th>
                                        <th scope="col" className={TH}>{t("dashboard.colMedia")}</th>
                                        <th scope="col" className={`${TH} text-right`}>{t("dashboard.colAvaliacoes")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {criterios.map(c => (
                                        <tr key={c.id}>
                                            <th scope="row" className={`${TD} text-left font-medium`}>{t(`criterios.${c.id}`)}</th>
                                            <td className={TD}>
                                                <div className="flex items-center gap-2">
                                                    <Barra fracao={c.media ? c.media / 5 : 0} cor="#3b82f6" />
                                                    <span className="w-8 text-right font-bold">{fmtNota(c.media)}</span>
                                                </div>
                                            </td>
                                            <td className={`${TD} text-right`}>{formatarNumero(c.quantidade)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-xs text-gray-600 mt-2">{t("dashboard.criteriosAjuda")}</p>
                        </Secao>

                        {/* Distribuição */}
                        <Secao id="rel-distribuicao" titulo={t("relatorioUniversidade.distribuicaoTitulo")}>
                            <table className="relatorio-bloco w-full text-sm border-collapse">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th scope="col" className={TH}>{t("dashboard.colNota")}</th>
                                        <th scope="col" className={TH}>{t("dashboard.colPercentual")}</th>
                                        <th scope="col" className={`${TH} text-right`}>{t("dashboard.colQuantidade")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {distribuicao.map(item => (
                                        <tr key={item.estrelas}>
                                            <th scope="row" className={`${TD} text-left font-medium whitespace-nowrap`}>{t("dashboard.estrelas", { n: item.estrelas })}</th>
                                            <td className={TD}>
                                                <div className="flex items-center gap-2">
                                                    <Barra fracao={item.percentual} cor="#eab308" />
                                                    <span className="w-12 text-right font-bold">{fmtPct(item.percentual)}</span>
                                                </div>
                                            </td>
                                            <td className={`${TD} text-right`}>{formatarNumero(item.quantidade)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Secao>
                    </div>
                )}

                {/* Por evento */}
                {porEvento.length > 0 && (
                    <Secao id="rel-eventos" titulo={t("relatorioUniversidade.porEventoTitulo")}>
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th scope="col" className={TH}>{t("dashboard.colEvento")}</th>
                                    <th scope="col" className={TH}>{t("relatorioUniversidade.colData")}</th>
                                    <th scope="col" className={`${TH} text-right`}>{t("dashboard.colAvaliacoes")}</th>
                                    <th scope="col" className={`${TH} text-right`}>{t("dashboard.colNotaMedia")}</th>
                                    <th scope="col" className={`${TH} text-right`}>{t("relatorioUniversidade.checkins")}</th>
                                    <th scope="col" className={`${TH} text-right`}>{t("dashboard.colVerificadas")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {porEvento.map(linha => {
                                    const data = datasEventos?.[linha.eventoId];
                                    return (
                                        <tr key={linha.eventoId}>
                                            <th scope="row" className={`${TD} text-left font-medium`}>{linha.nome || nomeEvento(linha.eventoId)}</th>
                                            <td className={`${TD} whitespace-nowrap`}>{(data && (formatarData(data) || String(data))) || SEM_VALOR}</td>
                                            <td className={`${TD} text-right`}>{formatarNumero(linha.avaliacoes)}</td>
                                            <td className={`${TD} text-right`}>{fmtNota(linha.notaMedia)}</td>
                                            <td className={`${TD} text-right`}>{linha.presencas === null ? SEM_VALOR : formatarNumero(linha.presencas)}</td>
                                            <td className={`${TD} text-right`}>{formatarNumero(linha.verificadas)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <p className="text-xs text-gray-600 mt-2">{t("relatorioUniversidade.porEventoAjuda")}</p>
                    </Secao>
                )}

                {/* Avaliações recentes (sem nome nem e-mail do autor) */}
                {recentes.length > 0 && (
                    <Secao id="rel-recentes" titulo={t("relatorioUniversidade.recentesTitulo")}>
                        <p className="text-sm text-gray-600 mb-3">{t("relatorioUniversidade.recentesTexto", { n: recentes.length })}</p>
                        <ul className="space-y-2">
                            {recentes.map(av => {
                                const nota = Math.max(0, Math.min(5, Math.round(Number(av.nota) || 0)));
                                return (
                                    <li key={av.id} className="relatorio-bloco rounded-lg border border-gray-300 p-3">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                            <span className="font-bold" style={{ color: "#a16207" }}>
                                                <span aria-hidden="true">{"★".repeat(nota)}{"☆".repeat(5 - nota)}</span>
                                                <span className="sr-only">{t("dashboard.notaDe5", { n: nota })}</span>
                                            </span>
                                            <span className="text-gray-700">{formatarData(av.criadoEm) || SEM_VALOR}</span>
                                            <span className="text-gray-900 font-medium">{av.eventoId ? nomeEvento(av.eventoId) : SEM_VALOR}</span>
                                            {av.presencaVerificada === true && (
                                                <span
                                                    className="rounded-full border px-2 py-0.5 text-xs font-semibold"
                                                    style={{ backgroundColor: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" }}
                                                >
                                                    {t("presenca.selo")}
                                                </span>
                                            )}
                                        </div>
                                        {av.titulo && <p className="font-semibold text-gray-900 mt-1">{av.titulo}</p>}
                                        <p className="text-gray-800 whitespace-pre-line break-words mt-1">
                                            {av.comentario || <span className="italic text-gray-600">{t("dashboard.semComentario")}</span>}
                                        </p>
                                    </li>
                                );
                            })}
                        </ul>
                    </Secao>
                )}

                {/* Metodologia */}
                <footer className="relatorio-bloco border-t-2 border-gray-800 pt-3 text-xs text-gray-700">
                    <h2 className="text-sm font-bold text-gray-900 mb-2">{t("relatorioUniversidade.metodologiaTitulo")}</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>{t("relatorioUniversidade.metodologiaPresenca")}</li>
                        <li>{t("relatorioUniversidade.metodologiaInstitucional")}</li>
                        <li>{t("relatorioUniversidade.metodologiaModeracao")}</li>
                        <li>{t("relatorioUniversidade.metodologiaPeriodo")}</li>
                    </ul>
                    <p className="mt-3 font-semibold">
                        {t("relatorioUniversidade.rodape", { data: formatarDataHora(geradoEm), url: urlSite })}
                    </p>
                </footer>
            </div>
        </div>
    );
}
