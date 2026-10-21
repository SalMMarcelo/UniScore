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
    COLUNAS_EVENTOS,
    COLUNAS_DENUNCIAS
} from "./dados";
import { Botao, Cartao, Erro, mensagemErro } from "./ui";

export default function AbaExportar() {
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
                baixarCsv(lista, colunasAvaliacoes(nomesDosEventos(eventos)), "uniscore-avaliacoes");
                setAviso(`${lista.length} avaliações exportadas.`);
            } else if (tipo === "eventos") {
                const lista = await listarEventos();
                baixarCsv(lista, COLUNAS_EVENTOS, "uniscore-eventos");
                setAviso(`${lista.length} eventos exportados.`);
            } else if (tipo === "denuncias") {
                const lista = await carregarDenuncias();
                baixarCsv(lista, COLUNAS_DENUNCIAS, "uniscore-denuncias");
                setAviso(`${lista.length} denúncias exportadas.`);
            }
        } catch (err) {
            console.error("Erro ao exportar:", err);
            setErro(mensagemErro(err));
        }
        setOcupado(null);
    }

    function abrirRelatorio() {
        window.open("/admin/relatorio?imprimir=1", "_blank", "noopener");
    }

    const itens = [
        { tipo: "avaliacoes", titulo: "Avaliações", texto: "Todas as avaliações, com nota, critérios, evento e situação de moderação." },
        { tipo: "eventos", titulo: "Eventos", texto: "Eventos do Firestore e legados (public/events.json)." },
        { tipo: "denuncias", titulo: "Denúncias", texto: "Todas as denúncias, com motivo, status e quem resolveu." }
    ];

    return (
        <div>
            <Erro>{erro}</Erro>
            {aviso && <div role="status" className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 mb-4 text-sm">{aviso}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {itens.map(item => (
                    <Cartao key={item.tipo} className="flex flex-col">
                        <h3 className="font-bold text-gray-900 mb-1">{item.titulo} (CSV)</h3>
                        <p className="text-sm text-gray-600 flex-1 mb-4">{item.texto}</p>
                        <Botao cor="azul" disabled={!!ocupado} onClick={() => exportar(item.tipo)}>
                            {ocupado === item.tipo ? "Gerando..." : "Baixar CSV"}
                        </Botao>
                    </Cartao>
                ))}
                <Cartao className="flex flex-col">
                    <h3 className="font-bold text-gray-900 mb-1">Relatório (PDF)</h3>
                    <p className="text-sm text-gray-600 flex-1 mb-4">
                        Abre o relatório geral em uma nova aba e a janela de impressão. Escolha “Salvar como PDF”.
                    </p>
                    <Botao cor="escuro" onClick={abrirRelatorio}>Exportar PDF</Botao>
                </Cartao>
            </div>

            <p className="text-xs text-gray-600 mt-4">
                Os CSVs usam vírgula como separador, campos entre aspas e codificação UTF-8 com BOM (abrem com acentos no Excel).
            </p>
        </div>
    );
}
