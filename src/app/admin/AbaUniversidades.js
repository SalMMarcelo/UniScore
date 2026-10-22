"use client";
// Aba "Universidades": aprova/revoga contas de universidade e confirma o
// vínculo (`universidadeId`) com uma entrada de public/universidades.json.
import { useState, useEffect, useCallback } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { encontrarUniversidadeId } from "../../lib/universidades";
import { useI18n } from "../../i18n/I18nProvider";
import { Botao, Selo, Cartao, Carregando, Erro, Vazio, Filtros, mensagemErro } from "./ui";

const FILTROS = [
    { valor: "pendente", chave: "admin.universidades.pendentes" },
    { valor: "aprovado", chave: "admin.universidades.aprovadas" },
    { valor: "todas", chave: "admin.universidades.todas" }
];

export default function AbaUniversidades({ user }) {
    const { t, formatarDataHora } = useI18n();
    const [contas, setContas] = useState(null);
    const [catalogo, setCatalogo] = useState([]);
    const [filtro, setFiltro] = useState("pendente");
    const [vinculos, setVinculos] = useState({}); // uid -> valor escolhido no select
    const [erro, setErro] = useState("");
    const [aviso, setAviso] = useState("");
    const [ocupado, setOcupado] = useState(null);

    const carregar = useCallback(async () => {
        setErro("");
        try {
            const [snap, lista] = await Promise.all([
                getDocs(collection(db, "universidades")),
                fetch("/universidades.json").then(r => (r.ok ? r.json() : [])).catch(() => [])
            ]);
            const dados = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
            dados.sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
            setContas(dados);
            setCatalogo(Array.isArray(lista) ? lista : []);
        } catch (err) {
            console.error("Erro ao carregar universidades:", err);
            setErro(mensagemErro(err, t));
            setContas([]);
        }
    }, [t]);

    useEffect(() => { carregar(); }, [carregar]);

    async function salvar(conta, alteracoes, mensagem) {
        setOcupado(conta.uid);
        setErro("");
        setAviso("");
        try {
            await updateDoc(doc(db, "universidades", conta.uid), alteracoes);
            setContas(lista => lista.map(c => (c.uid === conta.uid ? { ...c, ...alteracoes } : c)));
            setAviso(mensagem);
        } catch (err) {
            console.error("Erro ao atualizar universidade:", err);
            setErro(mensagemErro(err, t));
        }
        setOcupado(null);
    }

    function valorSelecionado(conta) {
        if (conta.uid in vinculos) return vinculos[conta.uid];
        return conta.universidadeId != null ? String(conta.universidadeId) : "";
    }

    function aprovar(conta) {
        const vinculo = valorSelecionado(conta);
        if (!vinculo && !confirm(t("admin.universidades.confirmarSemVinculo"))) return;
        salvar(conta, {
            status: "aprovado",
            universidadeId: vinculo || null,
            aprovadoPor: user.email,
            aprovadoEm: new Date().toISOString()
        }, t("admin.universidades.aprovada", { nome: conta.nomeUniversidade || t("admin.universidades.universidade") }));
    }

    function revogar(conta) {
        if (!confirm(t("admin.universidades.confirmarRevogar"))) return;
        salvar(conta, { status: "pendente" }, t("admin.universidades.revogada", { nome: conta.nomeUniversidade || t("admin.universidades.universidadeMinusculo") }));
    }

    function salvarVinculo(conta) {
        salvar(conta, { universidadeId: valorSelecionado(conta) || null }, t("admin.universidades.vinculoAtualizado"));
    }

    const lista = (contas || []).filter(c => filtro === "todas" || c.status === filtro);

    return (
        <div>
            <Filtros opcoes={FILTROS.map(f => ({ ...f, rotulo: t(f.chave) }))} valor={filtro} onChange={setFiltro} rotulo={t("admin.universidades.filtrar")} />
            <Erro>{erro}</Erro>
            {aviso && <div role="status" className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 mb-4 text-sm">{aviso}</div>}

            {contas === null ? (
                <Carregando texto={t("admin.universidades.carregando")} />
            ) : lista.length === 0 ? (
                <Vazio>{t("admin.universidades.nenhuma")}</Vazio>
            ) : (
                <div className="space-y-3">
                    {lista.map(conta => {
                        const sugestao = !conta.universidadeId
                            ? encontrarUniversidadeId(catalogo, { nome: conta.nomeUniversidade })
                            : null;
                        const selecionado = valorSelecionado(conta);
                        const alterado = selecionado !== (conta.universidadeId != null ? String(conta.universidadeId) : "");
                        const aprovada = conta.status === "aprovado";
                        return (
                            <Cartao key={conta.uid}>
                                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-900 text-lg">{conta.nomeUniversidade || t("admin.universidades.semNome")}</h3>
                                            <Selo cor={aprovada ? "verde" : "amarelo"}>{aprovada ? t("admin.universidades.seloAprovada") : t("admin.universidades.seloPendente")}</Selo>
                                        </div>
                                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                                            <div><dt className="inline font-semibold">{t("admin.universidades.email")} </dt><dd className="inline break-all">{conta.emailInstitucional || "—"}</dd></div>
                                            <div><dt className="inline font-semibold">{t("admin.universidades.cnpj")} </dt><dd className="inline">{conta.cnpj || "—"}</dd></div>
                                            <div><dt className="inline font-semibold">{t("admin.universidades.responsavel")} </dt><dd className="inline">{conta.responsavel || "—"}{conta.cargo ? ` (${conta.cargo})` : ""}</dd></div>
                                            <div><dt className="inline font-semibold">{t("admin.universidades.telefone")} </dt><dd className="inline">{conta.telefone || "—"}</dd></div>
                                            <div><dt className="inline font-semibold">{t("admin.universidades.cadastro")} </dt><dd className="inline">{formatarDataHora(conta.criadoEm) || "—"}</dd></div>
                                            <div><dt className="inline font-semibold">{t("admin.universidades.uid")} </dt><dd className="inline text-xs break-all">{conta.uid}</dd></div>
                                        </dl>
                                    </div>

                                    <div className="lg:w-80 space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700" htmlFor={`vinculo-${conta.uid}`}>
                                            {t("admin.universidades.catalogo")}
                                        </label>
                                        <select
                                            id={`vinculo-${conta.uid}`}
                                            value={selecionado}
                                            onChange={e => setVinculos(v => ({ ...v, [conta.uid]: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                                        >
                                            <option value="">{t("admin.universidades.semVinculo")}</option>
                                            {catalogo.map(u => (
                                                <option key={u.id} value={String(u.id)}>
                                                    {t("admin.universidades.opcaoId", { nome: `${u.nome}${u.sigla && u.sigla !== u.nome ? ` (${u.sigla})` : ""}`, id: u.id })}
                                                </option>
                                            ))}
                                        </select>
                                        {sugestao && !(conta.uid in vinculos) && (
                                            <button
                                                type="button"
                                                onClick={() => setVinculos(v => ({ ...v, [conta.uid]: sugestao }))}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                {t("admin.universidades.sugestao", { nome: catalogo.find(u => String(u.id) === sugestao)?.nome })}
                                            </button>
                                        )}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {alterado && (
                                                <Botao cor="azul" disabled={ocupado === conta.uid} onClick={() => salvarVinculo(conta)}>
                                                    {t("admin.universidades.salvarVinculo")}
                                                </Botao>
                                            )}
                                            {aprovada ? (
                                                <Botao cor="vermelho" disabled={ocupado === conta.uid} onClick={() => revogar(conta)}>
                                                    {t("admin.universidades.revogar")}
                                                </Botao>
                                            ) : (
                                                <Botao cor="verde" disabled={ocupado === conta.uid} onClick={() => aprovar(conta)}>
                                                    {t("admin.universidades.aprovar")}
                                                </Botao>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Cartao>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
