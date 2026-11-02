"use client";
// Check-in no evento (docs/checkin-presenca.md): aberto pelo QR projetado pela universidade,
// /checkin?evento={eventoId}&c={codigo}. Sem login, vai para /login e volta para cá.
// Com login, grava presencas/{eventoId}_{uid} (src/lib/presencas.js).
import Link from "next/link";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { buscarEvento } from "../../lib/eventos";
import { registrarPresenca, ERROS_PRESENCA } from "../../lib/presencas";
import MenuMobile from "../../components/MenuMobile";
import SeletorIdioma from "../../components/SeletorIdioma";
import { useI18n } from "../../i18n/I18nProvider";

function TelaCarregando({ texto }) {
    const { t } = useI18n();
    return (
        <div className="text-center py-12" role="status">
            <div aria-hidden="true" className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700">{texto || t("comum.carregando")}</p>
        </div>
    );
}

function Moldura({ children }) {
    const { t } = useI18n();
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="container mx-auto flex items-center justify-between gap-3 px-4 md:px-6 py-4">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <img src="/uniscore_star_logo.png" alt={t("checkin.logoInicio")} className="h-10 sm:h-14 w-auto max-w-[140px] sm:max-w-[200px]" />
                    </Link>
                    <SeletorIdioma className="hidden md:inline-flex" />
                    <MenuMobile />
                </div>
            </header>
            <main id="conteudo" className="container mx-auto px-4 md:px-6 py-10 max-w-xl">
                {children}
            </main>
        </div>
    );
}

function CheckinConteudo() {
    const { t } = useI18n();
    const router = useRouter();
    const searchParams = useSearchParams();
    const eventoId = searchParams.get("evento") || "";
    const codigo = searchParams.get("c") || "";

    // estado: "carregando" | "redirecionando" | "registrando" | "sucesso" | "erro"
    const [estado, setEstado] = useState("carregando");
    const [jaExistia, setJaExistia] = useState(false);
    const [erro, setErro] = useState("");
    const [evento, setEvento] = useState(null);
    const tituloRef = useRef(null);
    const tentouRef = useRef(false);

    // Nome do evento (público) para a mensagem
    useEffect(() => {
        if (!eventoId) return;
        let cancelado = false;
        buscarEvento(eventoId)
            .then(ev => { if (!cancelado) setEvento(ev); })
            .catch(() => {});
        return () => { cancelado = true; };
    }, [eventoId]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setEstado("redirecionando");
                const retorno = `/checkin?${new URLSearchParams({ evento: eventoId, c: codigo }).toString()}`;
                router.replace(`/login?redirect=${encodeURIComponent(retorno)}`);
                return;
            }
            if (tentouRef.current) return;
            tentouRef.current = true;
            setEstado("registrando");
            try {
                const resultado = await registrarPresenca(eventoId, codigo);
                setJaExistia(!!(resultado && resultado.jaExistia));
                setEstado("sucesso");
            } catch (err) {
                const conhecido = Object.values(ERROS_PRESENCA).includes(err && err.code);
                if (!conhecido) console.error("Erro ao registrar presença:", err);
                setErro(conhecido ? err.code : "desconhecido");
                setEstado("erro");
            }
        });
        return () => unsubscribe();
    }, [eventoId, codigo, router]);

    // Leva o foco ao resultado para leitores de tela
    useEffect(() => {
        if (estado === "sucesso" || estado === "erro") tituloRef.current?.focus();
    }, [estado]);

    if (estado === "carregando" || estado === "redirecionando") {
        return <TelaCarregando texto={estado === "redirecionando" ? t("checkin.redirecionandoLogin") : undefined} />;
    }
    if (estado === "registrando") {
        return <TelaCarregando texto={t("checkin.registrando")} />;
    }

    const nomeEvento = evento && evento.nome ? evento.nome : "";
    const linkAvaliar = `/avaliar?${new URLSearchParams({ eventoId }).toString()}`;

    if (estado === "sucesso") {
        return (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-lg text-center">
                <div aria-hidden="true" className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-9 h-9 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 ref={tituloRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 mb-2 focus:outline-none">
                    {t("checkin.sucessoTitulo")}
                </h1>
                <p role="status" className="text-gray-700 mb-6">
                    {jaExistia
                        ? (nomeEvento ? t("checkin.jaRegistradoEvento", { nome: nomeEvento }) : t("checkin.jaRegistrado"))
                        : (nomeEvento ? t("checkin.sucessoTextoEvento", { nome: nomeEvento }) : t("checkin.sucessoTexto"))}
                </p>
                <p className="text-sm text-gray-600 mb-6">{t("checkin.sucessoDica")}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href={linkAvaliar} className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-lg font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-lg">
                        {t("checkin.avaliarAgora")}
                    </Link>
                    <Link href={`/evento/${encodeURIComponent(eventoId)}/detalhes`} className="bg-white text-gray-700 px-6 py-3 rounded-lg font-bold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all">
                        {t("checkin.verEvento")}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-lg text-center">
            <div aria-hidden="true" className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h1 ref={tituloRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 mb-2 focus:outline-none">
                {t("checkin.erroTitulo")}
            </h1>
            <p role="alert" className="text-gray-700 mb-6">{t(`checkin.erros.${erro}`)}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {eventoId && erro !== ERROS_PRESENCA.CODIGO_INVALIDO && (
                    <Link href={`/evento/${encodeURIComponent(eventoId)}/detalhes`} className="bg-white text-gray-700 px-6 py-3 rounded-lg font-bold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all">
                        {t("checkin.verEvento")}
                    </Link>
                )}
                <Link href="/" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition-all">
                    {t("checkin.irInicio")}
                </Link>
            </div>
        </div>
    );
}

// useSearchParams exige um limite <Suspense> no App Router
export default function Checkin() {
    return (
        <Moldura>
            <Suspense fallback={<TelaCarregando />}>
                <CheckinConteudo />
            </Suspense>
        </Moldura>
    );
}
