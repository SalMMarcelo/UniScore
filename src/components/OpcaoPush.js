"use client";
// Opção "Receber notificações no celular/computador" (push via FCM).
// Fica oculta se NEXT_PUBLIC_FIREBASE_VAPID_KEY não estiver definida.
// Lógica em src/lib/push.js.
import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { pushConfigurado, suportaPush, permissaoPush, pushAtivo, ativarPush, desativarPush } from "../lib/push";

// estado: 'carregando' | 'naoSuportado' | 'negada' | 'inativo' | 'ativo'
export default function OpcaoPush({ user }) {
    const { t, idioma } = useI18n();
    const [estado, setEstado] = useState("carregando");
    const [ocupado, setOcupado] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        if (!user || !pushConfigurado()) return;
        let cancelado = false;
        (async () => {
            let novo;
            try {
                if (!(await suportaPush())) novo = "naoSuportado";
                else if (permissaoPush() === "denied") novo = "negada";
                else novo = (await pushAtivo(user.uid, idioma)) ? "ativo" : "inativo";
            } catch (err) {
                console.error("Erro ao verificar notificações push:", err);
                novo = "inativo";
            }
            if (!cancelado) setEstado(novo);
        })();
        return () => { cancelado = true; };
    }, [user, idioma]);

    if (!user || !pushConfigurado()) return null;

    const alternar = async () => {
        setErro("");
        setOcupado(true);
        try {
            if (estado === "ativo") {
                await desativarPush(user.uid);
                setEstado("inativo");
            } else {
                const permissao = await ativarPush(user.uid, idioma);
                setEstado(permissao === "granted" ? "ativo" : permissao === "denied" ? "negada" : "inativo");
            }
        } catch (err) {
            console.error("Erro ao alterar notificações push:", err);
            setErro(t("push.erro"));
        } finally {
            setOcupado(false);
        }
    };

    const ativo = estado === "ativo";
    const podeAlternar = estado === "ativo" || estado === "inativo";
    const descricao = {
        carregando: t("push.verificando"),
        naoSuportado: t("push.naoSuportado"),
        negada: t("push.negada"),
        inativo: t("push.descricao"),
        ativo: t("push.ativoDescricao")
    }[estado];

    return (
        <section aria-labelledby="push-titulo" className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 id="push-titulo" className="text-base font-semibold text-gray-900">{t("push.titulo")}</h2>
                    <p id="push-descricao" className="text-sm text-gray-600 mt-1" role="status">{descricao}</p>
                </div>
                {podeAlternar && (
                    <button
                        type="button"
                        role="switch"
                        aria-checked={ativo}
                        aria-labelledby="push-titulo"
                        aria-describedby="push-descricao"
                        disabled={ocupado}
                        onClick={alternar}
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 ${ativo ? "bg-blue-600" : "bg-gray-300"}`}
                    >
                        <span
                            aria-hidden="true"
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${ativo ? "translate-x-6" : "translate-x-1"}`}
                        />
                    </button>
                )}
            </div>
            {ocupado && <p className="text-sm text-gray-600 mt-2" role="status">{t("push.aguarde")}</p>}
            {erro && (
                <p role="alert" className="mt-3 bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2 text-sm">{erro}</p>
            )}
        </section>
    );
}
