"use client";
// Exibição das estatísticas (aba "Estatísticas" e relatório para impressão).

function numero(valor) {
    return valor === null || valor === undefined ? "—" : Number(valor).toLocaleString("pt-BR");
}

function media(valor) {
    return valor === null || valor === undefined ? "—" : Number(valor).toFixed(2).replace(".", ",");
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
    if (!dados) return null;
    return (
        <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Indicador
                    rotulo="Avaliações"
                    valor={numero(dados.avaliacoes)}
                    detalhe={`${numero(dados.avaliacoesOcultas)} ocultas pela moderação`}
                />
                <Indicador rotulo="Nota média" valor={media(dados.mediaGeral)} detalhe="de 1 a 5, todas as avaliações" />
                <Indicador
                    rotulo="Eventos"
                    valor={numero(dados.eventos)}
                    detalhe={`${numero(dados.eventosLegados)} legados (events.json)`}
                />
                <Indicador
                    rotulo="Posts no fórum"
                    valor={numero(dados.posts)}
                    detalhe={`${numero(dados.postsOcultos)} ocultos`}
                />
                <Indicador
                    rotulo="Universidades"
                    valor={numero(dados.universidades)}
                    detalhe={`${numero(dados.universidadesAprovadas)} aprovadas · ${numero(dados.universidadesPendentes)} pendentes`}
                />
                <Indicador
                    rotulo="Denúncias abertas"
                    valor={numero(dados.denunciasAbertas)}
                    detalhe={`${numero(dados.denuncias)} no total`}
                />
                <Indicador
                    rotulo="Usuários"
                    valor="—"
                    detalhe="Não disponível: as regras só permitem que cada usuário leia o próprio perfil."
                />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-3">Avaliações por tema</h3>
            {dados.porTema.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum evento cadastrado.</p>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-left">
                            <tr>
                                <th scope="col" className="px-4 py-3 font-semibold">Tema</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-right">Eventos</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-right">Avaliações</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-right">Nota média</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {dados.porTema.map(t => (
                                <tr key={t.tema}>
                                    <td className="px-4 py-2 text-gray-900">{t.tema}</td>
                                    <td className="px-4 py-2 text-right text-gray-700">{numero(t.eventos)}</td>
                                    <td className="px-4 py-2 text-right text-gray-700">{numero(t.avaliacoes)}</td>
                                    <td className="px-4 py-2 text-right text-gray-700">{media(t.media)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="text-xs text-gray-600 mt-3">
                Contagens calculadas no servidor (getCountFromServer / getAggregateFromServer) em{" "}
                {dados.geradoEm?.toLocaleString("pt-BR")}. A nota média por tema considera só avaliações de eventos existentes.
            </p>
        </div>
    );
}
