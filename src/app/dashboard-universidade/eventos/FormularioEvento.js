"use client";
// Formulário de cadastro/edição de eventos (RF02).
// Usado por /dashboard-universidade/eventos/novo e /dashboard-universidade/eventos/[id]/editar.
// Quem pode usar: contas de universidade com status 'aprovado' (seus próprios eventos)
// e moderadores da plataforma (qualquer evento, apenas edição).
// As regras correspondentes estão no bloco `eventos` de firestore.rules.
import { useState, useEffect } from "react";
import { auth, db, storage } from "../../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdminEmail } from "../../../lib/admin";
import { TEMAS, TIPOS, PUBLICOS } from "../../../lib/eventos";
import { useI18n } from "../../../i18n/I18nProvider";

const LIMITE_IMAGEM = 5 * 1024 * 1024; // 5 MB (igual a storage.rules)

const VAZIO = {
    nome: "",
    descricao: "",
    data: "",
    local: "",
    publicoAlvo: "Todos",
    preco: "0",
    tema: "",
    tipo: "",
    imagem: null
};

export default function FormularioEvento({ eventoId = null }) {
    const { t, rotulo } = useI18n();
    const router = useRouter();
    const editando = !!eventoId;

    const [user, setUser] = useState(null);
    const [universidade, setUniversidade] = useState(null);
    const [moderador, setModerador] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [bloqueio, setBloqueio] = useState(null); // { titulo, mensagem } (chaves de tradução)
    const [form, setForm] = useState(VAZIO);
    const [arquivo, setArquivo] = useState(null);
    const [preview, setPreview] = useState(null);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (!u) {
                router.push("/login-universidades");
                return;
            }
            setUser(u);
            const ehModerador = isAdminEmail(u.email);
            setModerador(ehModerador);

            try {
                // Conta de universidade (moderadores normalmente não têm)
                const uniSnap = await getDoc(doc(db, "universidades", u.uid));
                const uni = uniSnap.exists() ? uniSnap.data() : null;
                setUniversidade(uni);

                if (!ehModerador) {
                    if (!uni) {
                        setBloqueio({
                            titulo: "formEvento.bloqueios.acessoNegadoTitulo",
                            mensagem: "formEvento.bloqueios.acessoNegadoMsg"
                        });
                        return;
                    }
                    if (uni.status !== "aprovado") {
                        setBloqueio({
                            titulo: "formEvento.bloqueios.aprovacaoTitulo",
                            mensagem: "formEvento.bloqueios.aprovacaoMsg"
                        });
                        return;
                    }
                }

                if (editando) {
                    const evSnap = await getDoc(doc(db, "eventos", String(eventoId)));
                    if (!evSnap.exists()) {
                        setBloqueio({
                            titulo: "formEvento.bloqueios.naoEncontradoTitulo",
                            mensagem: "formEvento.bloqueios.naoEncontradoMsg"
                        });
                        return;
                    }
                    const ev = evSnap.data();
                    if (!ehModerador && ev.universidadeUid !== u.uid) {
                        setBloqueio({
                            titulo: "formEvento.bloqueios.semPermissaoTitulo",
                            mensagem: "formEvento.bloqueios.semPermissaoMsg"
                        });
                        return;
                    }
                    setForm({
                        nome: ev.nome || "",
                        descricao: ev.descricao || "",
                        data: typeof ev.data === "string" ? ev.data : "",
                        local: ev.local || "",
                        publicoAlvo: ev.publicoAlvo || "Todos",
                        preco: String(Number(ev.preco) || 0),
                        tema: ev.tema || "",
                        tipo: ev.tipo || "",
                        imagem: ev.imagem || null
                    });
                } else if (!uni) {
                    // Moderador sem conta de universidade não cadastra eventos
                    setBloqueio({
                        titulo: "formEvento.bloqueios.apenasUniversidadesTitulo",
                        mensagem: "formEvento.bloqueios.apenasUniversidadesMsg"
                    });
                }
            } catch (err) {
                console.error("Erro ao carregar dados do evento:", err);
                setBloqueio({
                    titulo: "formEvento.bloqueios.erroTitulo",
                    mensagem: "formEvento.bloqueios.erroMsg"
                });
            } finally {
                setCarregando(false);
            }
        });
        return () => unsubscribe();
    }, [router, eventoId, editando]);

    // Libera a URL temporária do preview
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const alterar = (campo) => (e) => setForm(prev => ({ ...prev, [campo]: e.target.value }));

    const escolherImagem = (e) => {
        const file = e.target.files?.[0] || null;
        setErro("");
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setErro(t("formEvento.selecioneImagem"));
            return;
        }
        if (file.size >= LIMITE_IMAGEM) {
            setErro(t("formEvento.imagemGrande"));
            return;
        }
        setArquivo(file);
        setPreview(URL.createObjectURL(file));
    };

    const removerImagem = () => {
        setArquivo(null);
        setPreview(null);
        setForm(prev => ({ ...prev, imagem: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro("");

        const nome = form.nome.trim();
        const descricao = form.descricao.trim();
        const local = form.local.trim();
        const preco = Number(String(form.preco).replace(",", "."));

        if (!nome || nome.length > 200) return setErro(t("formEvento.erroNome"));
        if (descricao.length > 5000) return setErro(t("formEvento.erroDescricao"));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(form.data)) return setErro(t("formEvento.erroData"));
        if (!local || local.length > 300) return setErro(t("formEvento.erroLocal"));
        if (!Number.isFinite(preco) || preco < 0) return setErro(t("formEvento.erroPreco"));
        if (!form.tipo) return setErro(t("formEvento.erroTipo"));
        if (!form.tema) return setErro(t("formEvento.erroTema"));

        setSalvando(true);
        try {
            let imagem = form.imagem || null;
            if (arquivo) {
                const ext = (arquivo.name.split(".").pop() || "jpg").toLowerCase();
                const storageRef = ref(storage, `eventos/${user.uid}/${Date.now()}.${ext}`);
                await uploadBytes(storageRef, arquivo, { contentType: arquivo.type });
                imagem = await getDownloadURL(storageRef);
            }

            const dados = {
                nome,
                descricao,
                data: form.data,
                local,
                publicoAlvo: form.publicoAlvo,
                preco: Math.round(preco * 100) / 100,
                tema: form.tema,
                tipo: form.tipo,
                imagem
            };

            // Vínculo com public/universidades.json: tem de ser igual ao da conta
            // (firestore.rules confere universidades/{uid}.universidadeId)
            const vinculo = universidade ? {
                universidadeId: typeof universidade.universidadeId === "string" ? universidade.universidadeId : null,
                universidadeNome: String(universidade.nomeUniversidade || "").slice(0, 200)
            } : null;

            if (editando) {
                await updateDoc(doc(db, "eventos", String(eventoId)), {
                    ...dados,
                    // Moderador editando evento de outra universidade não mexe no vínculo
                    ...(!moderador && vinculo ? vinculo : {}),
                    atualizadoEm: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, "eventos"), {
                    ...dados,
                    ...vinculo,
                    universidadeUid: user.uid,
                    criadoEm: serverTimestamp()
                });
            }

            router.push("/dashboard-universidade#meus-eventos");
        } catch (err) {
            console.error("Erro ao salvar evento:", err);
            setErro(err.code === "permission-denied"
                ? t("formEvento.erroPermissao")
                : t("formEvento.erroSalvar"));
            setSalvando(false);
        }
    };

    const imagemAtual = preview || form.imagem;
    const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all";
    const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-3">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <img src="/uniscore_star_logo.png" alt={t("formEvento.logoInicio")} className="h-10 sm:h-16 w-auto max-w-[140px] sm:max-w-[220px]" />
                    </Link>
                    <Link href="/dashboard-universidade" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-all">
                        <span aria-hidden="true">←</span> {t("formEvento.voltarDashboard")}
                    </Link>
                </div>
            </header>

            <main id="conteudo" className="max-w-3xl mx-auto px-4 md:px-6 py-8">
                {carregando ? (
                    <div className="text-center py-20" role="status">
                        <div aria-hidden="true" className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                        <div className="text-gray-700 text-lg">{t("formEvento.carregando")}</div>
                    </div>
                ) : bloqueio ? (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 px-8 py-6 rounded-2xl text-center">
                        <h2 className="font-bold text-2xl text-gray-900 mb-2">{t(bloqueio.titulo)}</h2>
                        <p className="text-gray-700 mb-6">{t(bloqueio.mensagem)}</p>
                        <Link href="/dashboard-universidade" className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-all">
                            {t("formEvento.voltarDashboard")}
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                {editando ? t("formEvento.editarTitulo") : t("formEvento.cadastrarTitulo")}
                            </h2>
                            <p className="text-lg text-gray-600">
                                {universidade?.nomeUniversidade
                                    ? <>{t("formEvento.eventoDe")} <span className="text-red-600 font-semibold">{universidade.nomeUniversidade}</span></>
                                    : t("formEvento.preencha")}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                            {erro && (
                                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{erro}</div>
                            )}

                            <div>
                                <label className={labelClass} htmlFor="nome">{t("formEvento.nome")}</label>
                                <input id="nome" className={inputClass} value={form.nome} onChange={alterar("nome")} maxLength={200} required placeholder={t("formEvento.placeholderNome")} />
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="descricao">{t("formEvento.descricao")}</label>
                                <textarea id="descricao" aria-describedby="descricao-contador" className={`${inputClass} min-h-[140px]`} value={form.descricao} onChange={alterar("descricao")} maxLength={5000} placeholder={t("formEvento.placeholderDescricao")} />
                                <div id="descricao-contador" className="text-xs text-gray-600 text-right mt-1">{form.descricao.length}/5000</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass} htmlFor="data">{t("formEvento.data")}</label>
                                    <input id="data" type="date" className={inputClass} value={form.data} onChange={alterar("data")} required />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="preco">{t("formEvento.preco")}</label>
                                    <input id="preco" aria-describedby="preco-ajuda" type="number" min="0" step="0.01" className={inputClass} value={form.preco} onChange={alterar("preco")} required />
                                    <p id="preco-ajuda" className="text-xs text-gray-600 mt-1">{t("formEvento.ajudaPreco")}</p>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="local">{t("formEvento.local")}</label>
                                <input id="local" className={inputClass} value={form.local} onChange={alterar("local")} maxLength={300} required placeholder={t("formEvento.placeholderLocal")} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={labelClass} htmlFor="tipo">{t("formEvento.tipo")}</label>
                                    <select id="tipo" className={inputClass} value={form.tipo} onChange={alterar("tipo")} required>
                                        <option value="">{t("formEvento.selecione")}</option>
                                        {TIPOS.map(tipo => <option key={tipo} value={tipo}>{rotulo("valores.tipos", tipo)}</option>)}
                                        {form.tipo && !TIPOS.includes(form.tipo) && <option value={form.tipo}>{form.tipo}</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="tema">{t("formEvento.tema")}</label>
                                    <select id="tema" className={inputClass} value={form.tema} onChange={alterar("tema")} required>
                                        <option value="">{t("formEvento.selecione")}</option>
                                        {TEMAS.map(tema => <option key={tema} value={tema}>{rotulo("valores.temas", tema)}</option>)}
                                        {form.tema && !TEMAS.includes(form.tema) && <option value={form.tema}>{form.tema}</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="publicoAlvo">{t("formEvento.publicoAlvo")}</label>
                                    <select id="publicoAlvo" className={inputClass} value={form.publicoAlvo} onChange={alterar("publicoAlvo")} required>
                                        {PUBLICOS.map(p => <option key={p} value={p}>{rotulo("valores.publicos", p)}</option>)}
                                        {form.publicoAlvo && !PUBLICOS.includes(form.publicoAlvo) && <option value={form.publicoAlvo}>{form.publicoAlvo}</option>}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="imagem">{t("formEvento.imagem")}</label>
                                {imagemAtual && (
                                    <div className="flex items-center gap-4 mb-3">
                                        <img src={imagemAtual} alt={form.nome ? t("formEvento.imagemAtualDe", { nome: form.nome }) : t("formEvento.imagemAtual")} className="w-32 h-32 rounded-xl object-cover border-2 border-gray-200" />
                                        <button type="button" onClick={removerImagem} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-all">
                                            {t("formEvento.removerImagem")}
                                        </button>
                                    </div>
                                )}
                                <input id="imagem" aria-describedby="imagem-ajuda" type="file" accept="image/*" onChange={escolherImagem} className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                                <p id="imagem-ajuda" className="text-xs text-gray-600 mt-1">{t("formEvento.ajudaImagem")}</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-end pt-2">
                                <Link href="/dashboard-universidade" className="text-center bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-300 transition-all">
                                    {t("formEvento.cancelar")}
                                </Link>
                                <button type="submit" disabled={salvando} className="bg-gradient-to-r from-orange-700 to-red-700 text-white px-6 py-3 rounded-lg font-bold hover:from-orange-800 hover:to-red-800 transition-all duration-300 shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
                                    {salvando ? t("formEvento.salvando") : editando ? t("formEvento.salvarAlteracoes") : t("formEvento.cadastrar")}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </main>
        </div>
    );
}
