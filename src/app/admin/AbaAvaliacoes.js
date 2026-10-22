"use client";
// Aba "Avaliações": as 100 mais recentes, com ocultar/reexibir/excluir.
// Avaliações com moderado == true somem de /evento/[id]/detalhes.
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { db } from "../../firebase";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { listarEventos } from "../../lib/eventos";
import { carregarAvaliacoes, nomesDosEventos } from "./dados";
import { useI18n } from "../../i18n/I18nProvider";
import { Botao, Selo, Cartao, Carregando, Erro, Vazio, Filtros, mensagemErro } from "./ui";

const LIMITE = 100;

const FILTROS = [
    { valor: "todas", chave: "admin.filtrosTodas" },
    { valor: "visiveis", chave: "admin.filtrosVisiveis" },
    { valor: "ocultas", chave: "admin.filtrosOcultas" }
];

export default function AbaAvaliacoes({ user }) {
    const { t, formatarDataHora } = useI18n();
    const [avaliacoes, setAvaliacoes] = useState(null);
    const [nomes, setNomes] = useState({});
    const [filtro, setFiltro] = useState("todas");
    const [erro, setErro] = useState("");
    const [ocupado, setOcupado] = useState(null);

    const carregar = useCallback(async () => {
        setErro("");
        try {
            const [lista, eventos] = await Promise.all([carregarAvaliacoes(LIMITE), listarEventos()]);
            setAvaliacoes(lista);
            setNomes(nomesDosEventos(eventos));
        } catch (err) {
            console.error("Erro ao carregar avaliações:", err);
            setErro(mensagemErro(err, t));
            setAvaliacoes([]);
        }
    }, [t]);

    useEffect(() => { carregar(); }, [carregar]);

    async function alternarOculta(av) {
        setOcupado(av.id);
        setErro("");
        try {
            await updateDoc(doc(db, "avaliacoes", av.id), {
                moderado: !av.moderado,
                moderadoPor: user.email,
                moderadoEm: serverTimestamp()
            });
            setAvaliacoes(lista => lista.map(a => (a.id === av.id ? { ...a, moderado: !av.moderado } : a)));
        } catch (err) {
            setErro(mensagemErro(err, t));
        }
        setOcupado(null);
    }

    async function excluir(av) {
        if (!confirm(t("admin.avaliacoes.confirmarExcluir"))) return;
        setOcupado(av.id);
        setErro("");
        try {
            await deleteDoc(doc(db, "avaliacoes", av.id));
            setAvaliacoes(lista => lista.filter(a => a.id !== av.id));
        } catch (err) {
            setErro(mensagemErro(err, t));
        }
        setOcupado(null);
    }

    const visiveis = (avaliacoes || []).filter(a =>
        filtro === "todas" ? true : filtro === "ocultas" ? a.moderado === true : a.moderado !== true
    );

    return (
        <div>
            <Filtros opcoes={FILTROS.map(f => ({ ...f, rotulo: t(f.chave) }))} valor={filtro} onChange={setFiltro} rotulo={t("admin.avaliacoes.filtrar")} />
            <p className="text-sm text-gray-500 mb-4">
                {t("admin.avaliacoes.mostrando", { n: LIMITE })}
            </p>
            <Erro>{erro}</Erro>

            {avaliacoes === null ? (
                <Carregando texto={t("admin.avaliacoes.carregando")} />
            ) : visiveis.length === 0 ? (
                <Vazio>{t("admin.avaliacoes.nenhuma")}</Vazio>
            ) : (
                <div className="space-y-3">
                    {visiveis.map(av => (
                        <Cartao key={av.id}>
                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-1">
                                        <span className="font-semibold text-gray-900">{av.usuario || t("admin.avaliacoes.usuario")}</span>
                                        <span className="text-yellow-500 font-bold">{"★".repeat(Math.max(0, Math.min(5, Number(av.nota) || 0)))}</span>
                                        <span>· {formatarDataHora(av.criadoEm)}</span>
                                        {av.moderado && <Selo cor="amarelo">{t("admin.ocultaSelo")}</Selo>}
                                    </div>
                                    <div className="text-sm mb-1">
                                        {t("admin.avaliacoes.evento")}{" "}
                                        {av.eventoId ? (
                                            <Link href={`/evento/${av.eventoId}/detalhes`} className="text-blue-600 hover:underline">
                                                {nomes[av.eventoId] || `#${av.eventoId}`}
                                            </Link>
                                        ) : "—"}
                                    </div>
                                    {av.titulo && <p className="font-semibold text-gray-900">{av.titulo}</p>}
                                    {av.comentario && <p className="text-gray-700 whitespace-pre-wrap break-words">{av.comentario}</p>}
                                </div>
                                <div className="flex md:flex-col gap-2">
                                    <Botao cor={av.moderado ? "verde" : "amarelo"} disabled={ocupado === av.id} onClick={() => alternarOculta(av)}>
                                        {av.moderado ? t("admin.reexibir") : t("admin.ocultar")}
                                    </Botao>
                                    <Botao cor="vermelho" disabled={ocupado === av.id} onClick={() => excluir(av)}>
                                        {t("admin.excluir")}
                                    </Botao>
                                </div>
                            </div>
                        </Cartao>
                    ))}
                </div>
            )}
        </div>
    );
}
