"use client";
// Painel de check-in de um evento (docs/checkin-presenca.md), aberto pelo botão "Check-in"
// em "Meus eventos" do dashboard da universidade.
// Grava eventos/{id}/privado/checkin via src/lib/presencas.js (só a universidade dona do evento).
import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import {
    obterCheckin,
    salvarCheckin,
    rotacionarCodigo,
    urlCheckin,
    contarPresencas,
    validadePadrao
} from "../../../lib/presencas";
import { useI18n } from "../../../i18n/I18nProvider";

// Date -> "YYYY-MM-DDTHH:MM" (valor de <input type="datetime-local">, no fuso local)
function paraInputDataHora(data) {
    if (!(data instanceof Date) || isNaN(data)) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}T${p(data.getHours())}:${p(data.getMinutes())}`;
}

function deInputDataHora(valor) {
    if (!valor) return null;
    const data = new Date(valor);
    return isNaN(data) ? null : data;
}

// Nome de arquivo seguro para o PNG baixado
function nomeArquivo(nome) {
    const base = String(nome || "evento")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()
        .slice(0, 60);
    return `checkin-${base || "evento"}.png`;
}

export default function PainelCheckin({ evento }) {
    const { t, formatarDataHora, formatarNumero } = useI18n();
    const [carregando, setCarregando] = useState(true);
    const [checkin, setCheckin] = useState(null); // { codigo, ativo, expiraEm } | null
    const [validade, setValidade] = useState(paraInputDataHora(validadePadrao(evento.data)));
    const [presencas, setPresencas] = useState(null);
    const [qr, setQr] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");
    const [aviso, setAviso] = useState("");
    const [telaCheia, setTelaCheia] = useState(false);
    const botaoTelaCheiaRef = useRef(null);
    const fecharRef = useRef(null);
    const overlayRef = useRef(null);

    const prefixo = `checkin-${evento.id}`;
    const link = checkin ? urlCheckin(evento.id, checkin.codigo) : "";
    const expirado = !!(checkin && checkin.expiraEm && checkin.expiraEm.getTime() <= Date.now());
    const valendo = !!(checkin && checkin.ativo && !expirado);

    const atualizarPresencas = useCallback(async () => {
        try {
            setPresencas(await contarPresencas(evento.id));
        } catch (err) {
            console.error("Erro ao contar presenças:", err);
            setPresencas(null);
        }
    }, [evento.id]);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            try {
                const atual = await obterCheckin(evento.id);
                if (cancelado) return;
                setCheckin(atual);
                if (atual && atual.expiraEm) setValidade(paraInputDataHora(atual.expiraEm));
            } catch (err) {
                console.error("Erro ao carregar check-in:", err);
                if (!cancelado) setErro(t("checkinPainel.erroCarregar"));
            } finally {
                if (!cancelado) setCarregando(false);
            }
        })();
        atualizarPresencas();
        return () => { cancelado = true; };
        // t fica de fora: trocar o idioma não deve recarregar o painel
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [evento.id, atualizarPresencas]);

    // QR gerado no cliente a partir do link
    useEffect(() => {
        if (!link) {
            setQr("");
            return;
        }
        let cancelado = false;
        QRCode.toDataURL(link, { width: 640, margin: 2, errorCorrectionLevel: "M" })
            .then(url => { if (!cancelado) setQr(url); })
            .catch(err => console.error("Erro ao gerar QR:", err));
        return () => { cancelado = true; };
    }, [link]);

    // Tela cheia: Esc fecha; foco no botão "Fechar" e devolvido ao sair
    useEffect(() => {
        if (!telaCheia) return;
        fecharRef.current?.focus();
        const aoTeclar = (e) => {
            if (e.key === "Escape") setTelaCheia(false);
            // O único controle do diálogo é "Fechar": Tab não sai dele
            if (e.key === "Tab") {
                e.preventDefault();
                fecharRef.current?.focus();
            }
        };
        document.addEventListener("keydown", aoTeclar);
        const botao = botaoTelaCheiaRef.current;
        return () => {
            document.removeEventListener("keydown", aoTeclar);
            try {
                if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
            } catch (_) {}
            botao?.focus();
        };
    }, [telaCheia]);

    const abrirTelaCheia = () => {
        setTelaCheia(true);
        // Tela cheia do navegador quando disponível (o overlay já cobre a página)
        setTimeout(() => {
            try {
                overlayRef.current?.requestFullscreen?.().catch(() => {});
            } catch (_) {}
        }, 0);
    };

    const fecharTelaCheia = () => setTelaCheia(false);

    // Saiu da tela cheia do navegador (ex.: tecla Esc): fecha o overlay também
    useEffect(() => {
        const aoMudar = () => {
            if (!document.fullscreenElement) setTelaCheia(false);
        };
        document.addEventListener("fullscreenchange", aoMudar);
        return () => document.removeEventListener("fullscreenchange", aoMudar);
    }, []);

    const executar = async (acao, mensagemOk) => {
        setErro("");
        setAviso("");
        setSalvando(true);
        try {
            const salvo = await acao();
            setCheckin(salvo);
            if (salvo && salvo.expiraEm) setValidade(paraInputDataHora(salvo.expiraEm));
            setAviso(mensagemOk);
        } catch (err) {
            console.error("Erro ao salvar check-in:", err);
            setErro(err && err.code === "permission-denied"
                ? t("checkinPainel.erroPermissao")
                : t("checkinPainel.erroSalvar"));
        } finally {
            setSalvando(false);
        }
    };

    const validadeEscolhida = () => {
        const data = deInputDataHora(validade);
        if (!data) {
            setErro(t("checkinPainel.erroValidade"));
            return null;
        }
        return data;
    };

    const ativar = (ativo) => {
        const expiraEm = validadeEscolhida();
        if (!expiraEm) return;
        if (ativo && expiraEm.getTime() <= Date.now()) {
            setErro(t("checkinPainel.erroValidadePassada"));
            return;
        }
        executar(
            () => salvarCheckin(evento.id, { ativo, expiraEm }),
            ativo ? t("checkinPainel.ativadoOk") : t("checkinPainel.desativadoOk")
        );
    };

    const salvarValidade = () => {
        const expiraEm = validadeEscolhida();
        if (!expiraEm) return;
        executar(
            () => salvarCheckin(evento.id, { ativo: checkin ? checkin.ativo : false, expiraEm }),
            t("checkinPainel.validadeOk")
        );
    };

    const gerarNovo = () => {
        if (!window.confirm(t("checkinPainel.confirmarNovoCodigo"))) return;
        executar(() => rotacionarCodigo(evento.id), t("checkinPainel.novoCodigoOk"));
    };

    const copiarLink = async () => {
        setErro("");
        try {
            await navigator.clipboard.writeText(link);
            setAviso(t("checkinPainel.linkCopiado"));
        } catch (_) {
            // Sem acesso à área de transferência: seleciona o texto para cópia manual
            const campo = document.getElementById(`${prefixo}-link`);
            campo?.focus();
            campo?.select();
            setAviso(t("checkinPainel.copieManual"));
        }
    };

    const botaoSecundario = "bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed";
    const botaoPrincipal = "bg-gradient-to-r from-orange-700 to-red-700 text-white px-4 py-2 rounded-lg font-bold hover:from-orange-800 hover:to-red-800 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed";
    const textoAltQr = t("checkinPainel.qrAlt", { nome: evento.nome });

    if (carregando) {
        return (
            <div role="status" className="p-4 text-gray-600 text-sm">{t("checkinPainel.carregando")}</div>
        );
    }

    return (
        <section aria-labelledby={`${prefixo}-titulo`} className="mt-3 p-4 sm:p-6 bg-white rounded-xl border border-gray-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                    <h4 id={`${prefixo}-titulo`} className="text-lg font-bold text-gray-900">
                        {t("checkinPainel.titulo", { nome: evento.nome })}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{t("checkinPainel.explicacao")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${valendo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                        {!checkin
                            ? t("checkinPainel.statusNaoConfigurado")
                            : valendo
                                ? t("checkinPainel.statusAtivo")
                                : checkin.ativo && expirado
                                    ? t("checkinPainel.statusExpirado")
                                    : t("checkinPainel.statusInativo")}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800" aria-live="polite">
                        {presencas === null
                            ? t("checkinPainel.presencasIndisponivel")
                            : t(presencas === 1 ? "checkinPainel.presenca" : "checkinPainel.presencas", { n: formatarNumero(presencas) })}
                    </span>
                    <button type="button" onClick={atualizarPresencas} className="text-sm text-blue-700 font-semibold hover:underline">
                        {t("checkinPainel.atualizarContagem")}
                    </button>
                </div>
            </div>

            {erro && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{erro}</div>
            )}
            <div role="status" aria-live="polite" className={aviso ? "bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm" : ""}>
                {aviso}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                    <label htmlFor={`${prefixo}-validade`} className="block text-sm font-semibold text-gray-700 mb-2">
                        {t("checkinPainel.validade")}
                    </label>
                    <input
                        id={`${prefixo}-validade`}
                        type="datetime-local"
                        aria-describedby={`${prefixo}-validade-ajuda`}
                        value={validade}
                        onChange={(e) => setValidade(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <p id={`${prefixo}-validade-ajuda`} className="text-xs text-gray-600 mt-1">
                        {checkin && checkin.expiraEm
                            ? t("checkinPainel.validadeAtual", { data: formatarDataHora(checkin.expiraEm) })
                            : t("checkinPainel.validadeAjuda")}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {checkin && (
                        <button type="button" onClick={salvarValidade} disabled={salvando} className={botaoSecundario}>
                            {t("checkinPainel.salvarValidade")}
                        </button>
                    )}
                    {checkin && checkin.ativo ? (
                        <button type="button" onClick={() => ativar(false)} disabled={salvando} className={botaoSecundario}>
                            {t("checkinPainel.desativar")}
                        </button>
                    ) : (
                        <button type="button" onClick={() => ativar(true)} disabled={salvando} className={botaoPrincipal}>
                            {t("checkinPainel.ativar")}
                        </button>
                    )}
                </div>
            </div>

            {checkin && (
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="shrink-0 mx-auto md:mx-0">
                        {qr ? (
                            <img src={qr} alt={textoAltQr} width={220} height={220} className={`w-[220px] h-[220px] rounded-xl border border-gray-200 bg-white ${valendo ? "" : "opacity-50"}`} />
                        ) : (
                            <div role="status" className="w-[220px] h-[220px] rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-600">
                                {t("checkinPainel.gerandoQr")}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-4 w-full">
                        {!valendo && (
                            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                {t("checkinPainel.qrSemValer")}
                            </p>
                        )}
                        <div>
                            <label htmlFor={`${prefixo}-link`} className="block text-sm font-semibold text-gray-700 mb-2">
                                {t("checkinPainel.link")}
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    id={`${prefixo}-link`}
                                    type="text"
                                    readOnly
                                    value={link}
                                    onFocus={(e) => e.target.select()}
                                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <button type="button" onClick={copiarLink} className={botaoSecundario}>
                                    {t("checkinPainel.copiar")}
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" ref={botaoTelaCheiaRef} onClick={abrirTelaCheia} disabled={!qr} className={botaoPrincipal}>
                                {t("checkinPainel.telaCheia")}
                            </button>
                            {qr ? (
                                <a href={qr} download={nomeArquivo(evento.nome)} className={botaoSecundario}>
                                    {t("checkinPainel.baixarPng")}
                                </a>
                            ) : null}
                            <button type="button" onClick={gerarNovo} disabled={salvando} className={botaoSecundario}>
                                {t("checkinPainel.gerarNovoCodigo")}
                            </button>
                        </div>
                        <p className="text-xs text-gray-600">{t("checkinPainel.dicaSeguranca")}</p>
                    </div>
                </div>
            )}

            {telaCheia && qr && (
                <div
                    ref={overlayRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={`${prefixo}-tela-cheia-titulo`}
                    className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-4 sm:p-8 overflow-auto"
                >
                    <h2 id={`${prefixo}-tela-cheia-titulo`} className="text-2xl sm:text-4xl font-bold text-gray-900 text-center mb-2">
                        {evento.nome}
                    </h2>
                    <p className="text-lg sm:text-2xl text-gray-700 text-center mb-6">{t("checkinPainel.telaCheiaInstrucao")}</p>
                    <img src={qr} alt={textoAltQr} className="w-[min(80vw,70vh)] h-[min(80vw,70vh)]" />
                    <p className="mt-4 text-sm sm:text-base text-gray-700 font-mono break-all text-center max-w-3xl">{link}</p>
                    <button
                        type="button"
                        ref={fecharRef}
                        onClick={fecharTelaCheia}
                        className="mt-6 bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition-all focus:outline-none focus:ring-4 focus:ring-red-400"
                    >
                        {t("checkinPainel.fecharTelaCheia")}
                    </button>
                </div>
            )}
        </section>
    );
}
