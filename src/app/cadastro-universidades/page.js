"use client";
import { useState } from "react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buscarUniversidadeId } from "../../lib/universidades";
import { mensagemErroAuth } from "../../lib/usuarios";
import { useI18n } from "../../i18n/I18nProvider";

export default function CadastroUniversidades() {
    const { t } = useI18n();
    const [formData, setFormData] = useState({
        nomeUniversidade: "",
        cnpj: "",
        emailInstitucional: "",
        telefone: "",
        endereco: "",
        responsavel: "",
        cargo: "",
        senha: "",
        confirmarSenha: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Validações
        if (formData.senha !== formData.confirmarSenha) {
            setError(t("cadastroUniversidades.senhasNaoCoincidem"));
            setLoading(false);
            return;
        }

        // Validação básica - a validação de email institucional será feita pelo Firebase Security Rules

        try {
            // Criar conta no Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.emailInstitucional,
                formData.senha
            );

            // Vincular à universidade de public/universidades.json (id usado nas avaliações)
            let universidadeId = null;
            try {
                universidadeId = await buscarUniversidadeId({ nome: formData.nomeUniversidade });
            } catch (lookupErr) {
                console.error("Erro ao buscar universidade na lista:", lookupErr);
            }

            // Salvar dados da universidade no Firestore
            await setDoc(doc(db, "universidades", userCredential.user.uid), {
                ...(universidadeId ? { universidadeId } : {}),
                nomeUniversidade: formData.nomeUniversidade,
                cnpj: formData.cnpj,
                emailInstitucional: formData.emailInstitucional,
                telefone: formData.telefone,
                endereco: formData.endereco,
                responsavel: formData.responsavel,
                cargo: formData.cargo,
                tipo: "universidade",
                status: "pendente", // Requer aprovação
                criadoEm: new Date().toISOString(),
                userId: userCredential.user.uid
            });

            router.push("/cadastro-sucesso-universidade");
        } catch (err) {
            console.error("Erro no cadastro:", err);
            setError(String(err?.code || "").startsWith("auth/") ? mensagemErroAuth(err, "", t) : (err?.message || t("cadastroUniversidades.erroCriar")));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto flex items-center justify-between gap-3 px-4 md:px-6 py-4">
                    <Link href="/para-universidades" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 transition-colors">
                        <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span className="font-bold text-lg">{t("cadastroUniversidades.voltar")}</span>
                    </Link>
                    <img src="/uniscore_star_logo.png" alt="UniScore" className="h-10 sm:h-16 w-auto max-w-[140px] sm:max-w-[220px]" />
                    <div className="w-10 sm:w-20"></div>
                </div>
            </header>

            {/* Conteúdo principal */}
            <main id="conteudo" className="container mx-auto px-4 py-12">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
                            {t("cadastroUniversidades.tituloAntes")} <span className="text-red-600">{t("cadastroUniversidades.tituloDestaque")}</span>
                        </h1>
                        <p className="text-xl text-gray-600">
                            {t("cadastroUniversidades.subtitulo")}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="cad-uni-nomeUniversidade" className="block text-sm font-semibold text-gray-900 mb-2">
                                        {t("cadastroUniversidades.nomeUniversidade")}
                                    </label>
                                    <input
                                        type="text"
                                        name="nomeUniversidade"
                                        id="cad-uni-nomeUniversidade"
                                        autoComplete="organization"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                                        placeholder={t("cadastroUniversidades.placeholderNome")}
                                        value={formData.nomeUniversidade}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="cad-uni-cnpj" className="block text-sm font-semibold text-gray-900 mb-2">
                                        {t("cadastroUniversidades.cnpj")}
                                    </label>
                                    <input
                                        type="text"
                                        name="cnpj"
                                        id="cad-uni-cnpj"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                                        placeholder="00.000.000/0000-00"
                                        value={formData.cnpj}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="cad-uni-emailInstitucional" className="block text-sm font-semibold text-gray-900 mb-2">
                                    {t("cadastroUniversidades.emailInstitucional")}
                                </label>
                                <input
                                    type="email"
                                    name="emailInstitucional"
                                    id="cad-uni-emailInstitucional"
                                    autoComplete="email"
                                    className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                                    placeholder={t("cadastroUniversidades.placeholderEmail")}
                                    value={formData.emailInstitucional}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="cad-uni-telefone" className="block text-sm font-semibold text-gray-900 mb-2">
                                        {t("cadastroUniversidades.telefone")}
                                    </label>
                                    <input
                                        type="tel"
                                        name="telefone"
                                        id="cad-uni-telefone"
                                        autoComplete="tel"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                                        placeholder={t("cadastroUniversidades.placeholderTelefone")}
                                        value={formData.telefone}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="cad-uni-endereco" className="block text-sm font-semibold text-gray-900 mb-2">
                                        {t("cadastroUniversidades.endereco")}
                                    </label>
                                    <input
                                        type="text"
                                        name="endereco"
                                        id="cad-uni-endereco"
                                        autoComplete="address-level2"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                                        placeholder={t("cadastroUniversidades.placeholderEndereco")}
                                        value={formData.endereco}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="cad-uni-responsavel" className="block text-sm font-semibold text-gray-900 mb-2">
                                        {t("cadastroUniversidades.responsavel")}
                                    </label>
                                    <input
                                        type="text"
                                        name="responsavel"
                                        id="cad-uni-responsavel"
                                        autoComplete="name"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                                        placeholder={t("cadastroUniversidades.placeholderResponsavel")}
                                        value={formData.responsavel}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="cad-uni-cargo" className="block text-sm font-semibold text-gray-900 mb-2">
                                        {t("cadastroUniversidades.cargo")}
                                    </label>
                                    <input
                                        type="text"
                                        name="cargo"
                                        id="cad-uni-cargo"
                                        autoComplete="organization-title"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                                        placeholder={t("cadastroUniversidades.placeholderCargo")}
                                        value={formData.cargo}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="cad-uni-senha" className="block text-sm font-semibold text-gray-900 mb-2">
                                        {t("cadastroUniversidades.senha")}
                                    </label>
                                    <input
                                        type="password"
                                        name="senha"
                                        id="cad-uni-senha"
                                        autoComplete="new-password"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                                        placeholder="••••••••"
                                        value={formData.senha}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="cad-uni-confirmarSenha" className="block text-sm font-semibold text-gray-900 mb-2">
                                        {t("cadastroUniversidades.confirmarSenha")}
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmarSenha"
                                        id="cad-uni-confirmarSenha"
                                        autoComplete="new-password"
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                                        placeholder="••••••••"
                                        value={formData.confirmarSenha}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <div className="flex gap-3">
                                    <svg aria-hidden="true" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                                    </svg>
                                    <div className="text-sm text-blue-900 leading-relaxed">
                                        <strong>{t("cadastroUniversidades.processoTitulo")}</strong> {t("cadastroUniversidades.processoTexto")}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div aria-hidden="true" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {t("cadastroUniversidades.enviando")}
                                    </div>
                                ) : (
                                    t("cadastroUniversidades.solicitar")
                                )}
                            </button>

                            <div className="text-center pt-4">
                                <p className="text-gray-600 text-sm mb-3">
                                    {t("cadastroUniversidades.jaPossuiConta")}
                                </p>
                                <Link
                                    href="/login-universidades"
                                    className="inline-block bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200 border border-gray-300"
                                >
                                    {t("cadastroUniversidades.fazerLogin")}
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}