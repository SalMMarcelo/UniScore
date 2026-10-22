"use client";
// Aba "Exportar" (RF08): CSV de avaliações, eventos e denúncias; PDF via impressão.
import { useState } from "react";
import { listarEventos } from "../../lib/eventos";
import { baixarCsv } from "../../lib/exportar";
import {
    carregarAvaliacoes,
    carregarDenuncias,
    nomesDosEventos,
    colunasAvaliacoes,
    colunasEventos,
    colunasDenuncias
} from "./dados";
import { Botao, Cartao, Erro, mensagemErro } from "./ui";
import { useI18n } from "../../i18n/I18nProvider";

export default function AbaExportar() {
    const { t, idioma } = useI18n();
    const [ocupado, setOcupado] = useState(null);
    const [erro, setErro] = useState("");
    const [aviso, setAviso] = useState("");

    async function exportar(tipo) {
        setOcupado(tipo);
        setErro("");
        setAviso("");
        try {
            if (tipo === "avaliacoes") {
                const [lista, eventos] = await Promise.all([carregarAvaliacoes(), listarEventos()]);
                baixarCsv(lista, colunasAvaliacoes(nomesDosEventos(eventos), t, idioma), "uniscore-avaliacoes");
                setAviso(t("admin.exportar.avaliacoesExportadas", { n: lista.length }));
            } else if (tipo === "eventos") {
                const lista = await listarEventos();
                baixarCsv(lista, colunasEventos(t, idioma), "uniscore-eventos");
                setAviso(t("admin.exportar.eventosExportados", { n: lista.length }));
            } else if (tipo === "denuncias") {
                const lista = await carregarDenuncias();
                baixarCsv(lista, colunasDenuncias(t, idioma), "uniscore-denuncias");
                setAviso(t("admin.exportar.denunciasExportadas", { n: lista.length }));
            }
        } catch (err) {
            console.error("Erro ao exportar:", err);
            setErro(mensagemErro(err, t));
        }
        setOcupado(null);
    }

    function abrirRelatorio() {
        window.open("/admin/relatorio?imprimir=1", "_blank", "noopener");
    }

    const itens = [
        { tipo: "avaliacoes", titulo: t("admin.exportar.avaliacoesTitulo"), texto: t("admin.exportar.avaliacoesTexto") },
        { tipo: "eventos", titulo: t("admin.exportar.eventosTitulo"), texto: t("admin.exportar.eventosTexto") },
        { tipo: "denuncias", titulo: t("admin.exportar.denunciasTitulo"), texto: t("admin.exportar.denunciasTexto") }
    ];

    return (
        <div>
            <Erro>{erro}</Erro>
            {aviso && <div role="status" className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 mb-4 text-sm">{aviso}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {itens.map(item => (
                    <Cartao key={item.tipo} className="flex flex-col">
                        <h3 className="font-bold text-gray-900 mb-1">{t("admin.exportar.tituloCsv", { titulo: item.titulo })}</h3>
                        <p className="text-sm text-gray-600 flex-1 mb-4">{item.texto}</p>
                        <Botao cor="azul" disabled={!!ocupado} onClick={() => exportar(item.tipo)}>
                            {ocupado === item.tipo ? t("admin.exportar.gerando") : t("admin.exportar.baixarCsv")}
                        </Botao>
                    </Cartao>
                ))}
                <Cartao className="flex flex-col">
                    <h3 className="font-bold text-gray-900 mb-1">{t("admin.exportar.relatorioPdf")}</h3>
                    <p className="text-sm text-gray-600 flex-1 mb-4">
                        {t("admin.exportar.relatorioTexto")}
                    </p>
                    <Botao cor="escuro" onClick={abrirRelatorio}>{t("admin.exportar.exportarPdf")}</Botao>
                </Cartao>
            </div>

            <p className="text-xs text-gray-600 mt-4">
                {t("admin.exportar.nota")}
            </p>
        </div>
    );
}
