"use client";
// Aba "Eventos": lista todos os eventos (Firestore + legados de public/events.json).
// Moderadores podem editar/excluir eventos do Firestore; os legados são só leitura.
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { db } from "../../firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { listarEventos } from "../../lib/eventos";
import { useI18n } from "../../i18n/I18nProvider";
import { Botao, Selo, Carregando, Erro, Vazio, mensagemErro } from "./ui";

export default function AbaEventos() {
    const { t, rotulo, formatarData } = useI18n();
    const [eventos, setEventos] = useState(null);
    const [busca, setBusca] = useState("");
    const [erro, setErro] = useState("");
    const [ocupado, setOcupado] = useState(null);

    const carregar = useCallback(async () => {
        setErro("");
        try {
            setEventos(await listarEventos());
        } catch (err) {
            setErro(mensagemErro(err, t));
            setEventos([]);
        }
    }, [t]);

    useEffect(() => { carregar(); }, [carregar]);

    async function excluir(ev) {
        if (ev.legado) return;
        if (!confirm(t("admin.eventos.confirmarExcluir", { nome: ev.nome }))) return;
        setOcupado(ev.id);
        setErro("");
        try {
            await deleteDoc(doc(db, "eventos", ev.id));
            setEventos(lista => lista.filter(e => e.id !== ev.id));
        } catch (err) {
            setErro(mensagemErro(err, t));
        }
        setOcupado(null);
    }

    const termo = busca.trim().toLowerCase();
    const lista = (eventos || []).filter(ev =>
        !termo || [ev.nome, ev.universidadeNome, ev.tema, ev.local].some(campo => (campo || "").toLowerCase().includes(termo))
    );

    return (
        <div>
            <div className="mb-4">
                <label htmlFor="busca-eventos" className="sr-only">{t("admin.eventos.buscar")}</label>
                <input
                    id="busca-eventos"
                    type="search"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder={t("admin.eventos.placeholderBusca")}
                    className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 bg-white"
                />
            </div>
            <Erro>{erro}</Erro>

            {eventos === null ? (
                <Carregando texto={t("admin.eventos.carregando")} />
            ) : lista.length === 0 ? (
                <Vazio>{t("admin.eventos.nenhum")}</Vazio>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-left">
                            <tr>
                                <th scope="col" className="px-4 py-3 font-semibold">{t("admin.eventos.colEvento")}</th>
                                <th scope="col" className="px-4 py-3 font-semibold">{t("admin.eventos.colData")}</th>
                                <th scope="col" className="px-4 py-3 font-semibold">{t("admin.eventos.colUniversidade")}</th>
                                <th scope="col" className="px-4 py-3 font-semibold">{t("admin.eventos.colTema")}</th>
                                <th scope="col" className="px-4 py-3 font-semibold">{t("admin.eventos.colAcoes")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {lista.map(ev => (
                                <tr key={ev.id} className="align-top">
                                    <td className="px-4 py-3">
                                        <Link href={`/evento/${ev.id}/detalhes`} className="font-semibold text-gray-900 hover:text-blue-600">
                                            {ev.nome || t("admin.eventos.semNome")}
                                        </Link>
                                        {ev.legado && <span className="ml-2"><Selo cor="cinza">{t("admin.eventos.legado")}</Selo></span>}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatarData(ev.data) || ev.data || "—"}</td>
                                    <td className="px-4 py-3 text-gray-600">{ev.universidadeNome || "—"}</td>
                                    <td className="px-4 py-3 text-gray-600">{rotulo("valores.temas", ev.tema) || "—"}</td>
                                    <td className="px-4 py-3">
                                        {ev.legado ? (
                                            <span className="text-xs text-gray-600">{t("admin.eventos.somenteLeitura")}</span>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/dashboard-universidade/eventos/${ev.id}/editar`}
                                                    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                                >
                                                    {t("admin.editar")}
                                                </Link>
                                                <Botao cor="vermelho" disabled={ocupado === ev.id} onClick={() => excluir(ev)}>
                                                    {t("admin.excluir")}
                                                </Botao>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
