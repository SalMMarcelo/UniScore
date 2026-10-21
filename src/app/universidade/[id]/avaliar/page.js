
"use client";
import { useState, useEffect } from "react";
import { auth } from "../../../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { db } from "../../../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";

export default function AvaliarUniversidade() {
    const [nota, setNota] = useState(0);
    const [comentario, setComentario] = useState("");
    const [titulo, setTitulo] = useState("");
    const [data, setData] = useState("");
    const [imagem, setImagem] = useState("");
    const [categoriaCultural, setCategoriaCultural] = useState("");
    const [enviado, setEnviado] = useState(false);
    const [user, setUser] = useState(undefined); // undefined = loading, null = não logado, objeto = logado
    const { id } = useParams();
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            alert("Você precisa estar logado para enviar uma avaliação.");
            return;
        }
        // Nota precisa ser um inteiro entre 1 e 5
        const notaInt = Math.round(Number(nota));
        if (!Number.isInteger(notaInt) || notaInt < 1 || notaInt > 5) {
            alert("Por favor, dê uma nota de 1 a 5 estrelas.");
            return;
        }
        try {
            await addDoc(collection(db, "avaliacoes"), {
                universidadeId: String(id),
                nota: notaInt,
                comentario,
                titulo,
                data,
                imagem: imagem ? imagem : null,
                categoriaCultural: categoriaCultural || null,
                criadoEm: serverTimestamp(),
                usuario: user.displayName || user.email || "Usuário",
                usuarioId: user.uid,
                photoURL: user.photoURL || null,
            });
            setEnviado(true);
            router.push("/?sucesso=1");
        } catch (err) {
            alert("Erro ao salvar avaliação: " + err.message);
        }
    }
    // Renderização condicional
    let content;
    if (user === undefined) {
        content = (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                <div className="text-white/90 text-lg">Carregando...</div>
            </div>
        );
    } else if (enviado) {
        // Após envio, o usuário será redirecionado para a página inicial, então não exibe mensagem aqui
    } else if (!user) {
        content = (
            <div className="text-center py-12">
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl">
                    <div className="text-6xl mb-6">🔒</div>
                    <h3 className="text-2xl font-bold text-white mb-4">Acesso necessário</h3>
                    <p className="text-white/90 mb-8 text-lg leading-relaxed">
                        Você precisa estar logado para enviar uma avaliação e compartilhar sua experiência com outros estudantes.
                    </p>
                    <Link href="/login">
                        <button className="bg-white text-[#667eea] px-8 py-3 rounded-full font-bold text-lg hover:bg-gray-100 transition-all duration-300 shadow-lg">
                            Fazer login
                        </button>
                    </Link>
                </div>
            </div>
        );
    } else {
        content = (
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className="block text-xl font-bold text-white mb-4">✨ Avalie sua experiência:</label>
                        <div className="flex gap-2 mb-4 justify-center">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    type="button"
                                    key={n}
                                    className={`text-5xl transition-all duration-200 hover:scale-110 ${nota >= n ? "text-[#ffe066] drop-shadow-lg" : "text-white/30 hover:text-white/50"
                                        }`}
                                    onClick={() => setNota(n)}
                                    aria-label={`Dar nota ${n}`}
                                >★</button>
                            ))}
                        </div>
                        <div className="text-center text-white/80 text-sm">
                            {nota === 0 && "Clique nas estrelas para avaliar"}
                            {nota === 1 && "Muito ruim"}
                            {nota === 2 && "Ruim"}
                            {nota === 3 && "Regular"}
                            {nota === 4 && "Bom"}
                            {nota === 5 && "Excelente"}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xl font-bold text-white mb-4">Conte-nos mais sobre sua experiência</label>
                        <textarea
                            className="w-full bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl p-6 text-white placeholder-white/70 focus:border-white/50 focus:ring-4 focus:ring-white/20 transition-all duration-300 resize-none"
                            rows={5}
                            value={comentario}
                            onChange={e => setComentario(e.target.value)}
                            required
                            placeholder="O que você achou do evento? Como foi a organização, conteúdo e qualidade? O evento promoveu intercâmbio cultural? Compartilhe aspectos positivos e pontos de melhoria."
                        />
                        <div className="text-sm text-white/70 mt-2">
                            Seja honesto e forneça informações úteis sobre qualidade, organização e aspectos interculturais.
                        </div>
                    </div>

                    <div>
                        <label className="block text-xl font-bold text-white mb-4">🎯 Qual evento você está avaliando?</label>
                        <input
                            type="text"
                            className="w-full bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl p-4 text-white placeholder-white/70 focus:border-white/50 focus:ring-4 focus:ring-white/20 transition-all duration-300"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            required
                            placeholder="Ex: Semana de Tecnologia, Congresso de Inovação, Feira de Profissões..."
                        />
                    </div>

                    <div>
                        <label className="block text-xl font-bold text-white mb-4">🌍 Categoria Cultural</label>
                        <select
                            className="w-full bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl p-4 text-white focus:border-white/50 focus:ring-4 focus:ring-white/20 transition-all duration-300"
                            value={categoriaCultural}
                            onChange={e => setCategoriaCultural(e.target.value)}
                        >
                            <option value="" className="bg-gray-800 text-white">Selecione uma categoria (opcional)</option>
                            <option value="Intercâmbio Internacional" className="bg-gray-800 text-white">Intercâmbio Internacional</option>
                            <option value="Diversidade Cultural" className="bg-gray-800 text-white">Diversidade Cultural</option>
                            <option value="Línguas Estrangeiras" className="bg-gray-800 text-white">Línguas Estrangeiras</option>
                            <option value="Culinária Mundial" className="bg-gray-800 text-white">Culinária Mundial</option>
                            <option value="Arte e Música Internacional" className="bg-gray-800 text-white">Arte e Música Internacional</option>
                            <option value="Tradições Regionais" className="bg-gray-800 text-white">Tradições Regionais</option>
                            <option value="Estudos Étnicos" className="bg-gray-800 text-white">Estudos Étnicos</option>
                            <option value="Religião e Espiritualidade" className="bg-gray-800 text-white">Religião e Espiritualidade</option>
                            <option value="Migração e Diáspora" className="bg-gray-800 text-white">Migração e Diáspora</option>
                            <option value="Cooperação Internacional" className="bg-gray-800 text-white">Cooperação Internacional</option>
                            <option value="Outros" className="bg-gray-800 text-white">Outros</option>
                        </select>
                        <div className="text-sm text-white/70 mt-2">
                            Selecione a categoria que melhor representa o aspecto intercultural do evento.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/10 rounded-2xl p-6 border border-white/20 text-center">
                            <label className="block text-white font-bold mb-4">Qualidade do Conteúdo</label>
                            <div className="flex gap-1 justify-center">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        type="button"
                                        key={n}
                                        className="text-2xl text-white/30 hover:text-yellow-400 transition-colors"
                                    >★</button>
                                ))}
                            </div>
                            <p className="text-white/70 text-sm mt-2">Como avalia o conteúdo apresentado?</p>
                        </div>

                        <div className="bg-white/10 rounded-2xl p-6 border border-white/20 text-center">
                            <label className="block text-white font-bold mb-4">Intercâmbio Cultural</label>
                            <div className="flex gap-1 justify-center">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        type="button"
                                        key={n}
                                        className="text-2xl text-white/30 hover:text-yellow-400 transition-colors"
                                    >★</button>
                                ))}
                            </div>
                            <p className="text-white/70 text-sm mt-2">O evento promoveu troca cultural?</p>
                        </div>

                        <div className="bg-white/10 rounded-2xl p-6 border border-white/20 text-center">
                            <label className="block text-white font-bold mb-4">Organização Geral</label>
                            <div className="flex gap-1 justify-center">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        type="button"
                                        key={n}
                                        className="text-2xl text-white/30 hover:text-yellow-400 transition-colors"
                                    >★</button>
                                ))}
                            </div>
                            <p className="text-white/70 text-sm mt-2">Como foi a organização do evento?</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xl font-bold text-white mb-4">📅 Data do evento</label>
                        <input
                            type="date"
                            className="w-full bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl p-4 text-white focus:border-white/50 focus:ring-4 focus:ring-white/20 transition-all duration-300"
                            value={data}
                            onChange={e => setData(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xl font-bold text-white mb-4">📸 Imagem do evento (opcional)</label>
                        <input
                            type="text"
                            className="w-full bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl p-4 text-white placeholder-white/70 focus:border-white/50 focus:ring-4 focus:ring-white/20 transition-all duration-300"
                            value={imagem || ""}
                            onChange={e => setImagem(e.target.value)}
                            placeholder="Ex: evento1.jpg"
                        />
                        <div className="text-sm text-white/70 mt-2">
                            Coloque apenas o nome do arquivo presente na pasta public.
                        </div>
                    </div>

                    <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                        <div className="text-sm text-white/90 leading-relaxed">
                            🤝 <strong>Compromisso com a veracidade:</strong> Ao enviar esta avaliação, você confirma que se baseia em uma experiência real e que não recebeu nenhum incentivo para escrevê-la.
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-[#ffe066] to-[#ff6b6b] text-gray-900 px-8 py-4 rounded-full font-bold text-xl hover:from-[#ffd93d] hover:to-[#ff5252] transition-all duration-300 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                        disabled={nota === 0 || !comentario || !titulo || !data}
                    >
                        {nota === 0 || !comentario || !titulo || !data ?
                            "Complete todos os campos obrigatórios" :
                            "Enviar avaliação ✨"
                        }
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] relative overflow-hidden">
            {/* Elementos decorativos */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-20 right-20 w-24 h-24 bg-[#ff6b6b]/20 rounded-full blur-lg animate-bounce"></div>
            <div className="absolute bottom-20 left-20 w-40 h-40 bg-[#4ecdc4]/15 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-28 h-28 bg-[#ffe066]/20 rounded-full blur-xl animate-bounce"></div>

            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10">
                <Link href="/" className="flex items-center gap-4 text-white hover:text-white/80 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    <span className="font-bold text-lg">Voltar</span>
                </Link>
                <h1 className="text-2xl font-bold text-white">UniScore</h1>
                <div className="w-20"></div>
            </header>

            {/* Conteúdo principal */}
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
                <div className="w-full max-w-2xl relative z-10">
                    <div className="text-center mb-8">
                        <h2 className="text-5xl font-extrabold text-white mb-4 leading-tight">
                            <span className="bg-gradient-to-r from-[#ffe066] to-[#ff6b6b] bg-clip-text text-transparent">Avaliação</span>
                        </h2>
                        <p className="text-xl text-white/90 font-medium">
                            Compartilhe sua experiência e ajude outros estudantes
                        </p>
                    </div>
                    {content}
                </div>
            </div>
        </div>
    );
}
