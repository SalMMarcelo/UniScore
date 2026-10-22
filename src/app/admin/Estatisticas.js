"use client";
// Exibição das estatísticas (aba "Estatísticas" e relatório para impressão).
import { useI18n } from "../../i18n/I18nProvider";

function criarNumero(formatarNumero) {
    return (valor) => (valor === null || valor === undefined ? "—" : formatarNumero(valor));
}

function criarMedia(formatarNumero) {
    return (valor) => (valor === null || valor === undefined
        ? "—"
        : formatarNumero(valor, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

function Indicador({ rotulo, valor, detalhe }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 break-inside-avoid">
            <div className="text-sm text-gray-500">{rotulo}</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{valor}</div>
            {detalhe && <div className="text-xs text-gray-500 mt-1">{detalhe}</div>}
        </div>
    );
}

export default function Estatisticas({ dados }) {
    const { t, rotulo, formatarNumero, formatarDataHora } = useI18n();
    const numero = criarNumero(formatarNumero);
    const media = criarMedia(formatarNumero);
    if (!dados) return null;
    return (
        <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Indicador
                    rotulo={t("admin.estatisticas.avaliacoes")}
                    valor={numero(dados.avaliacoes)}
                    detalhe={t("admin.estatisticas.ocultasModeracao", { n: numero(dados.avaliacoesOcultas) })}
                />
                <Indicador rotulo={t("admin.estatisticas.notaMedia")} valor={media(dados.mediaGeral)} detalhe={t("admin.estatisticas.deUmACinco")} />
                <Indicador
                    rotulo={t("admin.estatisticas.eventos")}
                    valor={numero(dados.eventos)}
                    detalhe={t("admin.estatisticas.legados", { n: numero(dados.eventosLegados) })}
                />
                <Indicador
                    rotulo={t("admin.estatisticas.posts")}
                    valor={numero(dados.posts)}
                    detalhe={t("admin.estatisticas.ocultos", { n: numero(dados.postsOcultos) })}
                />
                <Indicador
                    rotulo={t("admin.estatisticas.universidades")}
                    valor={numero(dados.universidades)}
                    detalhe={t("admin.estatisticas.aprovadasPendentes", { aprovadas: numero(dados.universidadesAprovadas), pendentes: numero(dados.universidadesPendentes) })}
                />
                <Indicador
                    rotulo={t("admin.estatisticas.denunciasAbertas")}
                    valor={numero(dados.denunciasAbertas)}
                    detalhe={t("admin.estatisticas.noTotal", { n: numero(dados.denuncias) })}
                />
                <Indicador
                    rotulo={t("admin.estatisticas.usuarios")}
                    valor="—"
                    detalhe={t("admin.estatisticas.usuariosIndisponivel")}
                />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-3">{t("admin.estatisticas.porTema")}</h3>
            {dados.porTema.length === 0 ? (
                <p className="text-gray-500 text-sm">{t("admin.estatisticas.nenhumEvento")}</p>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-left">
                            <tr>
                                <th scope="col" className="px-4 py-3 font-semibold">{t("admin.estatisticas.colTema")}</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-right">{t("admin.estatisticas.colEventos")}</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-right">{t("admin.estatisticas.colAvaliacoes")}</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-right">{t("admin.estatisticas.colNotaMedia")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {dados.porTema.map(linha => (
                                <tr key={linha.tema}>
                                    <td className="px-4 py-2 text-gray-900">{rotulo("valores.temas", linha.tema)}</td>
                                    <td className="px-4 py-2 text-right text-gray-700">{numero(linha.eventos)}</td>
                                    <td className="px-4 py-2 text-right text-gray-700">{numero(linha.avaliacoes)}</td>
                                    <td className="px-4 py-2 text-right text-gray-700">{media(linha.media)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="text-xs text-gray-600 mt-3">
                {t("admin.estatisticas.rodape", { data: formatarDataHora(dados.geradoEm) })}
            </p>
        </div>
    );
}
