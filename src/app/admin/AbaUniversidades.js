"use client";
// Aba "Universidades": aprova/revoga contas de universidade e confirma o
// vínculo (`universidadeId`) com o catálogo (docs/catalogo-universidades.md).
// Ao aprovar, o moderador vincula a uma entrada existente ou cria
// catalogoUniversidades/{uid} (src/lib/universidades.js, publicarNoCatalogo).
// Revogar oculta a entrada da conta (ativo: false).
import { useState, useEffect, useCallback } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import {
    encontrarUniversidadeId,
    listarUniversidades,
    publicarNoCatalogo,
    revogarNoCatalogo
} from "../../lib/universidades";
import { useI18n } from "../../i18n/I18nProvider";
import { Botao, Selo, Cartao, Carregando, Erro, Vazio, Filtros, mensagemErro } from "./ui";

// Valor do select para "criar entrada nova no catálogo"
const NOVA = "__nova__";

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
                listarUniversidades({ incluirInativas: true, atualizar: true }).catch(() => [])
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

    // Grava catalogoUniversidades/{uid} + universidades/{uid} num batch
    async function publicar(conta) {
        setOcupado(conta.uid);
        setErro("");
        setAviso("");
        try {
            const existente = catalogo.find(u => u.id === conta.uid) || null;
            const alteracoes = await publicarNoCatalogo(conta, { aprovadoPor: user.email, existente });
            setContas(lista => lista.map(c => (c.uid === conta.uid ? { ...c, ...alteracoes } : c)));
            setVinculos(v => { const { [conta.uid]: _, ...resto } = v; return resto; });
            setCatalogo(await listarUniversidades({ incluirInativas: true, atualizar: true }).catch(() => catalogo));
            setAviso(t("admin.universidades.publicada", { nome: conta.nomeUniversidade || t("admin.universidades.universidade") }));
        } catch (err) {
            console.error("Erro ao publicar universidade no catálogo:", err);
            setErro(mensagemErro(err, t));
        }
        setOcupado(null);
    }

    // Sugestão pelo nome (só para contas ainda sem vínculo)
    function sugestaoDe(conta) {
        return !conta.universidadeId
            ? encontrarUniversidadeId(catalogo.filter(u => u.ativo), { nome: conta.nomeUniversidade })
            : null;
    }

    // Valor padrão do select: o vínculo atual; senão, para contas pendentes,
    // a sugestão pelo nome ou "criar entrada nova".
    function valorSelecionado(conta) {
        if (conta.uid in vinculos) return vinculos[conta.uid];
        if (conta.universidadeId != null) return String(conta.universidadeId);
        if (conta.status !== "aprovado") return sugestaoDe(conta) || NOVA;
        return "";
    }

    function aprovar(conta) {
        const vinculo = valorSelecionado(conta);
        // Entrada nova, ou a própria entrada da conta (reaprovação após revogar,
        // que precisa voltar a ativo: true)
        if (vinculo === NOVA || vinculo === conta.uid) {
            publicar(conta);
            return;
        }
        if (!vinculo && !confirm(t("admin.universidades.confirmarSemVinculo"))) return;
        salvar(conta, {
            status: "aprovado",
            universidadeId: vinculo || null,
            aprovadoPor: user.email,
            aprovadoEm: new Date().toISOString()
        }, t("admin.universidades.aprovada", { nome: conta.nomeUniversidade || t("admin.universidades.universidade") }));
    }

    async function revogar(conta) {
        if (!confirm(t("admin.universidades.confirmarRevogar"))) return;
        setOcupado(conta.uid);
        setErro("");
        setAviso("");
        try {
            const alteracoes = await revogarNoCatalogo(conta);
            setContas(lista => lista.map(c => (c.uid === conta.uid ? { ...c, ...alteracoes } : c)));
            setCatalogo(lista => lista.map(u => (u.id === conta.uid ? { ...u, ativo: false } : u)));
            setAviso(t("admin.universidades.revogada", { nome: conta.nomeUniversidade || t("admin.universidades.universidadeMinusculo") }));
        } catch (err) {
            console.error("Erro ao revogar universidade:", err);
            setErro(mensagemErro(err, t));
        }
        setOcupado(null);
    }

    function salvarVinculo(conta) {
        const vinculo = valorSelecionado(conta);
        if (vinculo === NOVA) {
            publicar(conta);
            return;
        }
        salvar(conta, { universidadeId: vinculo || null }, t("admin.universidades.vinculoAtualizado"));
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
                        const sugestao = sugestaoDe(conta);
                        const selecionado = valorSelecionado(conta);
                        const aprovada = conta.status === "aprovado";
                        const alterado = aprovada && selecionado !== (conta.universidadeId != null ? String(conta.universidadeId) : "");
                        const foraDoCatalogo = aprovada && !conta.universidadeId;
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
                                            {!catalogo.some(u => u.id === conta.uid) && (
                                                <option value={NOVA}>{t("admin.universidades.criarNova")}</option>
                                            )}
                                            {catalogo.map(u => (
                                                <option key={u.id} value={String(u.id)}>
                                                    {t("admin.universidades.opcaoId", { nome: `${u.nome}${u.sigla && u.sigla !== u.nome ? ` (${u.sigla})` : ""}`, id: u.id })}
                                                    {u.ativo ? "" : t("admin.universidades.oculta")}
                                                </option>
                                            ))}
                                        </select>
                                        {selecionado === NOVA && (
                                            <p className="text-xs text-gray-600">{t("admin.universidades.ajudaNova", { uid: conta.uid })}</p>
                                        )}
                                        {foraDoCatalogo && (
                                            <p className="text-xs text-amber-700">{t("admin.universidades.semVinculoAprovada")}</p>
                                        )}
                                        {sugestao && selecionado !== sugestao && (
                                            <button
                                                type="button"
                                                onClick={() => setVinculos(v => ({ ...v, [conta.uid]: sugestao }))}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                {t("admin.universidades.sugestao", { nome: catalogo.find(u => String(u.id) === sugestao)?.nome })}
                                            </button>
                                        )}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {foraDoCatalogo && !alterado && (
                                                <Botao cor="azul" disabled={ocupado === conta.uid} onClick={() => publicar(conta)}>
                                                    {t("admin.universidades.publicar")}
                                                </Botao>
                                            )}
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
