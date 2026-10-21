"use client";
import { useState, useEffect } from "react";
import { auth, db, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PainelConquistas from "../../components/PainelConquistas";
import SeletorTipoPerfil from "../../components/SeletorTipoPerfil";
import MenuMobile from "../../components/MenuMobile";
import { NOME_MAX, isTipoPerfilValido, rotuloTipoPerfil, carregarUniversidades, destinoDaUrl } from "../../lib/usuarios";

export default function Perfil() {
    const [user, setUser] = useState(null);
    const [nome, setNome] = useState("");
    const [foto, setFoto] = useState("");
    const [fotoFile, setFotoFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [sucesso, setSucesso] = useState("");
    const [erro, setErro] = useState("");
    const [tipoPerfil, setTipoPerfil] = useState("");
    const [universidadeId, setUniversidadeId] = useState(null);
    const [universidades, setUniversidades] = useState([]);
    // /perfil?completar=1: usuário veio de um login social sem tipo de perfil
    const [completar, setCompletar] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setCompletar(new URLSearchParams(window.location.search).get("completar") === "1");
        carregarUniversidades()
            .then(setUniversidades)
            .catch(err => console.error("Erro ao carregar universidades:", err));
    }, []);

    const nomeUniversidade = universidadeId
        ? (universidades.find(uni => String(uni.id) === String(universidadeId)) || {}).nome
        : "";

    // Carregar dados do usuário autenticado
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u) {
                router.push("/login");
                return;
            }
            
            setUser(u);
            try {
                // Buscar perfil no Firestore
                const docRef = doc(db, "usuarios", u.uid);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setNome(data.nome || "");
                    setFoto(data.avatar || "/avatar-default.png");
                    setTipoPerfil(isTipoPerfilValido(data.tipoPerfil) ? data.tipoPerfil : "");
                    setUniversidadeId(data.universidadeId || null);
                } else {
                    setNome(u.displayName || "");
                    setFoto(u.photoURL || "/avatar-default.png");
                }
            } catch (err) {
                console.error("Erro ao carregar perfil:", err);
                setNome(u.displayName || "");
                setFoto("/avatar-default.png");
            } finally {
                setLoadingData(false);
            }
        });
        return () => unsub();
    }, [router]);

    const handleFotoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFotoFile(e.target.files[0]);
            setFoto(URL.createObjectURL(e.target.files[0]));
        }
    };

    // Salvar perfil
    const handleSalvar = async () => {
        if (!user) return;
        setSucesso("");
        setErro("");
        if (!isTipoPerfilValido(tipoPerfil)) {
            setErro("Escolha seu tipo de perfil.");
            return;
        }
        setLoading(true);
        const nomeFinal = nome.trim().slice(0, NOME_MAX);
        let avatarUrl = foto;
        
        try {
            // Upload da foto se houver novo arquivo
            if (fotoFile) {
                try {
                    const storageRef = ref(storage, `avatars/${user.uid}`);
                    await uploadBytes(storageRef, fotoFile);
                    avatarUrl = await getDownloadURL(storageRef);
                } catch (err) {
                    console.error("Erro no upload:", err);
                    // Continua mesmo se o upload falhar
                }
            }
            
            // Atualizar perfil no Auth
            try {
                await updateProfile(user, { displayName: nomeFinal, photoURL: avatarUrl });
            } catch (err) {
                console.error("Erro ao atualizar Auth:", err);
            }
            
            // Salvar no Firestore
            try {
                await setDoc(doc(db, "usuarios", user.uid), {
                    nome: nomeFinal,
                    avatar: avatarUrl,
                    email: user.email || null,
                    tipoPerfil,
                    universidadeId: tipoPerfil === "universitario" ? (universidadeId || null) : null,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            } catch (err) {
                console.error("Erro ao salvar no Firestore:", err);
                setErro("Erro ao salvar perfil. Tente novamente.");
                setLoading(false);
                return;
            }
            if (tipoPerfil !== "universitario") setUniversidadeId(null);

            // Perfil completado após o primeiro login social: segue para o destino
            if (completar) {
                window.location.href = destinoDaUrl("/");
                return;
            }

            setSucesso("Perfil salvo com sucesso!");
            setTimeout(() => setSucesso(""), 3000);
        } catch (err) {
            setErro("Erro ao salvar perfil.");
            console.error(err);
        }
        setLoading(false);
    };

    if (loadingData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4" role="status">
                    <div aria-hidden="true" className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600">Carregando perfil...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto flex items-center justify-between gap-3 px-4 md:px-6 py-4">
                    <Link href="/" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 transition-colors">
                        <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        <span className="font-bold text-lg">Voltar</span>
                    </Link>

                    <img src="/uniscore_star_logo.png" alt="UniScore" className="h-10 sm:h-16 w-auto max-w-[140px] sm:max-w-[220px]" />

                    <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600" aria-label="Principal">
                        <Link href="/forum" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                            </svg>
                            Fórum
                        </Link>
                        <Link href="/relatorio" className="hover:text-yellow-600 transition-colors">Relatórios</Link>
                    </nav>
                    <MenuMobile />
                </div>
            </header>

            <main id="conteudo" className="container mx-auto px-4 py-12">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
                        <p className="text-gray-600">Personalize suas informações</p>
                    </div>

                    {completar && (
                        <div className="mb-6 bg-yellow-50 border border-yellow-300 text-yellow-900 px-4 py-3 rounded-lg text-center" role="status">
                            <strong>Escolha seu tipo de perfil</strong> para concluir seu cadastro e depois clique em &quot;Salvar Perfil&quot;.
                        </div>
                    )}

                    <div className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-sm">
                        <div className="flex flex-col items-center mb-8">
                            {/* Avatar Preview */}
                            <div className="mb-6">
                                <div className="relative">
                                    <img 
                                        src={foto || "/avatar-default.png"} 
                                        alt={nome ? `Foto de perfil de ${nome}` : "Sua foto de perfil"} 
                                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg" 
                                    />
                                    <div aria-hidden="true" className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 shadow-lg">
                                        <svg aria-hidden="true" className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Tipo de perfil (RF01) */}
                            {tipoPerfil && (
                                <p className="-mt-2 mb-6 inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-3 py-1 text-sm font-semibold">
                                    {rotuloTipoPerfil(tipoPerfil)}
                                    {tipoPerfil === "universitario" && nomeUniversidade ? ` · ${nomeUniversidade}` : ""}
                                </p>
                            )}

                            {/* Avatar Options */}
                            <div className="mb-6">
                                <p id="perfil-avatar-rotulo" className="block text-sm font-semibold text-gray-900 mb-3 text-center">
                                    Escolha um avatar padrão
                                </p>
                                <div className="flex justify-center gap-4" role="group" aria-labelledby="perfil-avatar-rotulo">
                                    <button
                                        type="button"
                                        className={`border-4 rounded-full p-1 transition-all duration-200 ${foto === "/avatar-default.png" ? "border-blue-600 shadow-lg scale-110" : "border-gray-200 hover:border-gray-300"}`}
                                        onClick={() => setFoto("/avatar-default.png")}
                                        title="Avatar masculino"
                                        aria-label="Avatar masculino"
                                        aria-pressed={foto === "/avatar-default.png"}
                                    >
                                        <img src="/avatar-default.png" alt="" className="w-20 h-20 rounded-full object-cover" />
                                    </button>
                                    <button
                                        type="button"
                                        className={`border-4 rounded-full p-1 transition-all duration-200 ${foto === "/avatar-feminino-default.jpg" ? "border-blue-600 shadow-lg scale-110" : "border-gray-200 hover:border-gray-300"}`}
                                        onClick={() => setFoto("/avatar-feminino-default.jpg")}
                                        title="Avatar feminino"
                                        aria-label="Avatar feminino"
                                        aria-pressed={foto === "/avatar-feminino-default.jpg"}
                                    >
                                        <img src="/avatar-feminino-default.jpg" alt="" className="w-20 h-20 rounded-full object-cover" />
                                    </button>
                                </div>
                            </div>

                            {/* Upload Custom Photo */}
                            <div className="mb-6 w-full max-w-md">
                                <p id="perfil-foto-rotulo" className="block text-sm font-semibold text-gray-900 mb-2 text-center">
                                    Ou faça upload de sua foto
                                </p>
                                <label htmlFor="perfil-foto" className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 focus-within:ring-2 focus-within:ring-blue-500 text-gray-700 px-4 py-2.5 rounded-lg font-medium cursor-pointer transition-colors border border-gray-300">
                                    <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                    </svg>
                                    Escolher arquivo
                                    <input
                                        id="perfil-foto"
                                        type="file"
                                        accept="image/*"
                                        aria-describedby="perfil-foto-rotulo"
                                        onChange={handleFotoChange}
                                        className="sr-only"
                                    />
                                </label>
                            </div>

                            {/* Nome */}
                            <div className="w-full max-w-md mb-6">
                                <label htmlFor="perfil-nome" className="block text-sm font-semibold text-gray-900 mb-2">
                                    Nome
                                </label>
                                <input
                                    id="perfil-nome"
                                    autoComplete="name"
                                    type="text"
                                    value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                    placeholder="Seu nome completo"
                                    maxLength={NOME_MAX}
                                />
                            </div>

                            {/* Tipo de perfil */}
                            <div className="w-full max-w-md mb-6">
                                <SeletorTipoPerfil
                                    tipoPerfil={tipoPerfil}
                                    onTipoPerfilChange={setTipoPerfil}
                                    universidadeId={universidadeId}
                                    onUniversidadeIdChange={setUniversidadeId}
                                    destacar={completar && !tipoPerfil}
                                    idBase="perfil-tipo-perfil"
                                />
                            </div>

                            {/* Email (read-only) */}
                            {user && (
                                <div className="w-full max-w-md mb-6">
                                    <label htmlFor="perfil-email" className="block text-sm font-semibold text-gray-900 mb-2">
                                        Email
                                    </label>
                                    <input
                                        id="perfil-email"
                                        type="email"
                                        value={user.email}
                                        disabled
                                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-600 cursor-not-allowed"
                                    />
                                </div>
                            )}

                            {/* Mensagens de Feedback */}
                            {sucesso && (
                                <div role="status" className="w-full max-w-md mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
                                    <svg aria-hidden="true" className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                    </svg>
                                    {sucesso}
                                </div>
                            )}
                            {erro && (
                                <div role="alert" className="w-full max-w-md mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                                    <svg aria-hidden="true" className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                                    </svg>
                                    {erro}
                                </div>
                            )}

                            {/* Botão Salvar */}
                            <button
                                type="button"
                                className="w-full max-w-md bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleSalvar}
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div aria-hidden="true" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Salvando...
                                    </div>
                                ) : (
                                    "Salvar Perfil"
                                )}
                            </button>
                        </div>
                    </div>
                    {user && <PainelConquistas uid={user.uid} />}
                </div>
            </main>
        </div>
    );
}
