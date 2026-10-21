


"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { isAdminEmail } from "../lib/admin";
import { notaSegura } from "../lib/notas";
import { listarEventos } from "../lib/eventos";
import MenuMobile from "../components/MenuMobile";
import SeletorIdioma from "../components/SeletorIdioma";
import { useI18n } from "../i18n/I18nProvider";

// Imagens do carrossel (títulos/textos em home.slides.<n>)
const SLIDES = [
  { imagem: "/imagens-carrosel/imagem1.webp", classe: "object-cover" },
  { imagem: "/imagens-carrosel/imagem2.avif", classe: "object-cover" },
  { imagem: "/imagens-carrosel/imagem3.jpg", classe: "object-cover" },
  { imagem: "/imagens-carrosel/imagem4.webp", classe: "object-cover" },
  { imagem: "/imagens-carrosel/imagem5.jpg", classe: "object-contain bg-gray-100" },
  { imagem: "/imagens-carrosel/imagem6.jpg", classe: "object-cover" },
  { imagem: "/imagens-carrosel/imagem7.jpg", classe: "object-cover" },
  { imagem: "/imagens-carrosel/imagem8.png", classe: "object-cover" }
];

function SuccessMessage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const sucesso = searchParams.get("sucesso") === "1";

  if (!sucesso) return null;

  return (
    <div role="status" className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded relative max-w-lg mx-auto mt-6 mb-2 text-center">
      {t("home.sucessoAvaliacao")}
    </div>
  );
}

// Média das notas (inteiras 1-5) das avaliações de um evento
function mediaDoEvento(avaliacoes, eventoId) {
  const notas = avaliacoes
    .filter(av => String(av.eventoId) === String(eventoId))
    .map(av => notaSegura(av.nota))
    .filter(n => n >= 1);
  return notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
}

function EventosDaUniversidade({ uni, todosEventos, avaliacoes }) {
  const { t, formatarData } = useI18n();
  // Eventos do Firestore e legados (public/events.json) vinculados a esta universidade
  const eventos = todosEventos
    .filter(ev => ev.universidadeId === String(uni.id))
    .map(ev => ({ ...ev, avaliacao: mediaDoEvento(avaliacoes, ev.id) }));
  if (!eventos.length) {
    return (<div className="text-gray-500 bg-gray-50 rounded-lg p-6 text-center">{t("home.nenhumEventoUniversidade")}</div>);
  }
  return (
    <div className="space-y-6">
      {eventos.map(ev => (
        <div key={ev.id} className="bg-white rounded-2xl shadow-md border-2 border-gray-200 hover:border-green-500 transition-all duration-300 overflow-hidden group">
          <div className="p-6 flex flex-col md:flex-row items-center hover:shadow-xl transition">
            <Link href={`/evento/${ev.id}/detalhes`} className="shrink-0" tabIndex={-1} aria-hidden="true">
              {ev.imagem ? (
                <img src={ev.imagem} alt="" className="w-32 h-32 rounded-xl object-cover border-2 border-gray-300 bg-gray-100 cursor-pointer group-hover:scale-105 transition-transform duration-200" />
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-gray-300 bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 flex items-center justify-center text-white text-4xl font-bold cursor-pointer group-hover:scale-105 transition-transform duration-200">
                  {ev.nome?.charAt(0)?.toUpperCase() || "E"}
                </div>
              )}
            </Link>
            <div className="flex-1 ml-0 md:ml-6 mt-4 md:mt-0 w-full">
              <Link href={`/evento/${ev.id}/detalhes`} className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{ev.nome}</Link>
              <div className="flex items-center gap-1 mt-2" role="img" aria-label={t("geral.estrelas", { n: notaSegura(ev.avaliacao) })}>
                {Array(notaSegura(ev.avaliacao)).fill().map((_, i) => (
                  <svg aria-hidden="true" key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
                {Array(5 - notaSegura(ev.avaliacao)).fill().map((_, i) => (
                  <svg aria-hidden="true" key={i} className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
              <div className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                {formatarData(ev.data)}
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/avaliar?eventoId=${encodeURIComponent(ev.id)}`} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors">
                  {t("geral.avaliar")}
                </Link>
                <Link href={`/evento/${ev.id}/detalhes`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors">
                  {t("geral.comentarios")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { t, formatarData } = useI18n();
  const [search, setSearch] = useState("");
  const [universidades, setUniversidades] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUni, setSelectedUni] = useState(null);
  const [user, setUser] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  // Carrossel: pausa manual (botão), pausa ao passar o mouse/focar e movimento reduzido
  const [carrosselPausado, setCarrosselPausado] = useState(false);
  const [carrosselEmInteracao, setCarrosselEmInteracao] = useState(false);
  const [reduzirMovimento, setReduzirMovimento] = useState(false);
  const router = useRouter();

  const totalSlides = SLIDES.length;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const previousSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    const q = query(collection(db, "avaliacoes"), orderBy("criadoEm", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Avaliações ocultadas pela moderação não aparecem
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(av => !av.moderado);
      setAvaliacoes(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Respeita prefers-reduced-motion: sem avanço automático
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const atualizar = () => setReduzirMovimento(media.matches);
    atualizar();
    media.addEventListener?.("change", atualizar);
    return () => media.removeEventListener?.("change", atualizar);
  }, []);

  const carrosselRodando = !carrosselPausado && !carrosselEmInteracao && !reduzirMovimento;

  // Auto-play do carrossel (WCAG 2.2.2: pode ser pausado)
  useEffect(() => {
    if (!carrosselRodando) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [carrosselRodando]);

  // Eventos reais (Firestore) + legados (public/events.json)
  useEffect(() => {
    let cancelado = false;
    listarEventos()
      .then((lista) => { if (!cancelado) setEventos(lista); })
      .catch((err) => console.error("Erro ao carregar eventos:", err));
    return () => { cancelado = true; };
  }, []);

  useEffect(() => {
    fetch("/universidades.json")
      .then((res) => res.json())
      .then((data) => setUniversidades(data));
  }, []);

  useEffect(() => {
    if (!search) {
      setSuggestions([]);
      return;
    }
    setSuggestions(
      universidades.filter((uni) =>
        uni.nome.toLowerCase().includes(search.toLowerCase()) ||
        uni.sigla.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, universidades]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans relative overflow-x-hidden">
      {/* Header - Profissional e Limpo */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-4 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label={t("geral.paginaInicial")}>
            <img src="/uniscore_star_logo.png" alt="UniScore" className="h-12 md:h-20 w-auto max-w-[180px] md:max-w-[260px]" />
          </Link>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium" aria-label={t("menu.navPrincipal")}>
          <Link href="/forum" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-2">
            <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            {t("menu.forum")}
          </Link>
          <Link href="/avaliar" className="text-gray-600 hover:text-green-600 transition-colors flex items-center gap-2">
            <svg aria-hidden="true" className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            {t("menu.escrevaAvaliacao")}
          </Link>
          <Link href="/eventos" className="text-gray-600 hover:text-purple-600 transition-colors flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {t("menu.buscarEventos")}
          </Link>
          <Link href="/ranking" className="text-gray-600 hover:text-yellow-600 transition-colors flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">🏆</span>
            {t("menu.ranking")}
          </Link>
        </nav>
        <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
          <SeletorIdioma className="hidden md:inline-flex" />
          {!user ? (
            <>
              <Link href="/login" className="text-gray-700 hover:text-gray-900 px-3 md:px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2">
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                </svg>
                {t("menu.entrar")}
              </Link>
              <Link href="/cadastro" className="bg-green-700 hover:bg-green-800 text-white px-4 md:px-5 py-2 rounded-lg font-semibold text-sm shadow-sm transition-all">
                {t("geral.cadastreSe")}
              </Link>
            </>
          ) : (
            <>
              {isAdminEmail(user.email) && (
                <Link href="/admin" className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-all">
                  {t("geral.painelAdmin")}
                </Link>
              )}
              <a href="/perfil" className="rounded-full bg-gray-100 w-9 h-9 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer border border-gray-300" title={t("geral.perfil")} aria-label={t("geral.perfil")}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <svg aria-hidden="true" className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                )}
              </a>
            </>
          )}
          <Link href="/para-universidades" className="hidden sm:inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm shadow-sm transition-all">
            {t("menu.paraUniversidades")}
          </Link>
          {user && (
            <button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white px-4 md:px-5 py-2 rounded-lg font-semibold text-sm shadow-sm transition-all"
              onClick={async () => {
                await signOut(auth);
                window.location.href = "/login";
              }}
            >
              {t("geral.sair")}
            </button>
          )}
          <MenuMobile />
        </div>
      </header>

      <main id="conteudo">

      {/* Hero Section - Moderno com paleta */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-20 px-4 text-center overflow-hidden">
        {/* Grid pattern sutil */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
            {t("home.heroAntes")}
            <span className="block mt-2 bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">{t("home.heroDestaque")}</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-blue-100 mb-10 font-medium max-w-3xl mx-auto">
            {t("home.heroTexto")}
          </p>

          {/* Barra de busca profissional: Enter ou o botão abre /eventos?q=... (RF06) */}
          <div className="w-full max-w-2xl mx-auto relative">
            <form
              role="search"
              className="relative bg-white rounded-xl shadow-2xl focus-within:ring-4 focus-within:ring-yellow-400"
              onSubmit={e => {
                e.preventDefault();
                const termo = search.trim();
                router.push(termo ? `/eventos?q=${encodeURIComponent(termo)}` : "/eventos");
              }}
            >
              <label htmlFor="busca-home" className="sr-only">{t("home.buscaRotulo")}</label>
              <input
                id="busca-home"
                type="search"
                autoComplete="off"
                className="w-full bg-transparent border-0 outline-none px-6 py-4 pr-16 text-gray-800 text-lg placeholder-gray-500 focus:ring-0"
                placeholder={t("home.buscaPlaceholder")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") setSearch("");
                }}
              />
              <button
                type="submit"
                aria-label={t("home.buscaBotao")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 p-3 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </button>
            </form>

            {search && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl z-20 overflow-hidden border border-gray-200" aria-label={t("home.sugestoes")}>
                {suggestions.map(uni => (
                  <li key={uni.id} className="border-b border-gray-100 last:border-0">
                    <button
                      type="button"
                      className="w-full px-6 py-4 cursor-pointer hover:bg-gray-50 focus:bg-gray-100 transition-colors"
                      onClick={() => router.push(`/universidade/${uni.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <img src={uni.imagem} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 shadow-sm" />
                        <div className="flex-1 text-left">
                          <span className="font-bold text-gray-800 text-base">{uni.nome}</span>
                          <span className="text-sm text-gray-500 ml-3">{uni.sigla}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Link href="/eventos" className="inline-flex items-center gap-1 mt-4 text-blue-100 hover:text-white font-semibold underline-offset-4 hover:underline transition-colors">
              {t("home.buscarComFiltros")}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Stats rápidos */}
          <div className="grid grid-cols-3 gap-2 sm:gap-6 max-w-3xl mx-auto mt-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-3xl font-bold text-white mb-1">12.8k+</div>
              <div className="text-sm text-blue-100">{t("home.statAvaliacoes")}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-3xl font-bold text-white mb-1">67</div>
              <div className="text-sm text-blue-100">{t("home.statUniversidades")}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-3xl font-bold text-white mb-1">28k+</div>
              <div className="text-sm text-blue-100">{t("home.statUsuarios")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Avaliações */}
      <section className="w-full py-6 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-gradient-to-r from-green-700 to-green-800 rounded-xl py-5 px-6 md:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg aria-hidden="true" className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
              </div>
              <span className="text-white font-semibold text-lg">{t("home.ctaParticipou")}</span>
            </div>
            <Link href="/avaliar" className="bg-white text-green-700 hover:bg-gray-50 font-bold px-6 py-2 rounded-lg transition-colors shadow-md">
              {t("home.ctaAvaliarAgora")}
            </Link>
          </div>
        </div>
      </section>

      {/* CTA - Universidades */}
      <section className="w-full py-6 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl py-6 px-6 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t("home.ctaReputacaoTitulo")}
              </h2>
              <p className="text-gray-800 text-base">
                {t("home.ctaReputacaoTexto")}
              </p>
            </div>
            <Link href="/para-universidades" className="bg-gray-900 text-white hover:bg-black px-8 py-3 rounded-lg font-bold text-base transition-colors shadow-md md:ml-6">
              {t("home.ctaComecar")}
            </Link>
          </div>
        </div>
      </section>

      {/* Carrossel de Imagens - Design limpo */}
      <section className="w-full py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">{t("home.descubraTitulo")}</h2>
            <p className="text-lg text-gray-600">{t("home.descubraTexto")}</p>
          </div>
          
          <div
            className="relative overflow-hidden rounded-2xl shadow-xl bg-white"
            role="region"
            aria-roledescription={t("home.carrossel")}
            aria-label={t("home.carrosselRotulo")}
            onMouseEnter={() => setCarrosselEmInteracao(true)}
            onMouseLeave={() => setCarrosselEmInteracao(false)}
            onFocus={() => setCarrosselEmInteracao(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setCarrosselEmInteracao(false);
            }}
          >
            <div
              className="carousel-container flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              aria-live={carrosselRodando ? "off" : "polite"}
            >
              {SLIDES.map((slide, index) => (
                <div
                  key={slide.imagem}
                  className="carousel-slide min-w-full relative"
                  role="group"
                  aria-roledescription={t("home.slide")}
                  aria-label={t("home.slideNdeTotal", { n: index + 1, total: totalSlides })}
                  aria-hidden={currentSlide !== index}
                >
                  <img src={slide.imagem} alt="" className={`w-full h-64 sm:h-96 ${slide.classe}`} />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-6 pb-10 sm:p-8">
                    <h3 className="text-white text-xl sm:text-2xl font-bold mb-2">{t(`home.slides.${index + 1}.titulo`)}</h3>
                    <p className="text-white/90 text-base">{t(`home.slides.${index + 1}.texto`)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pausar / retomar a rotação automática */}
            <button
              type="button"
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full transition-all shadow-lg"
              onClick={() => setCarrosselPausado((v) => !v)}
              aria-label={carrosselPausado ? t("home.retomarRotacao") : t("home.pausarRotacao")}
            >
              {carrosselPausado ? (
                <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              )}
            </button>

            {/* Botões de navegação */}
            <button
              type="button"
              className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full transition-all shadow-lg"
              onClick={previousSlide}
              aria-label={t("home.slideAnterior")}
            >
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <button
              type="button"
              className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full transition-all shadow-lg"
              onClick={nextSlide}
              aria-label={t("home.proximoSlide")}
            >
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>

            {/* Indicadores */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {Array.from({ length: totalSlides }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? 'bg-white w-6' : 'bg-white/70 hover:bg-white/90'
                    }`}
                  onClick={() => goToSlide(index)}
                  aria-label={t("home.irParaSlide", { n: index + 1, total: totalSlides })}
                  aria-current={index === currentSlide ? "true" : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </section>



      <div className="px-4 py-8 max-w-5xl mx-auto">
        <Suspense fallback={null}>
          <SuccessMessage />
        </Suspense>
        {/* Universidade selecionada */}
        {selectedUni ? (
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 mb-8">
            <div className="flex items-center gap-6 mb-4">
              <img src={selectedUni.imagem} alt={selectedUni.nome} className="w-20 h-20 rounded-full object-cover border-4 border-[#00b0ff]" />
              <div>
                <div className="text-2xl font-bold text-gray-800">{selectedUni.nome} <span className="text-xs text-gray-600 ml-2">{selectedUni.sigla}</span></div>
                <div className="text-gray-600 mt-2">{selectedUni.descricao}</div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-4">{t("home.eventosDaUniversidade")}</h3>
            <EventosDaUniversidade uni={selectedUni} todosEventos={eventos} avaliacoes={avaliacoes} />
          </div>
        ) : null}

        {/* Bloco explicativo - Design moderno */}
        <section className="max-w-6xl mx-auto mb-12 px-4">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <div className="mb-4">
                <img src="/uniscore_star_logo.png" alt="" className="h-20 w-auto" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900">
                {t("home.somosAntes")} <span className="text-red-500">UniScore</span>
              </h2>
              <p className="text-base text-gray-700 mb-4 leading-relaxed">
                {t("home.somosTexto1")}
              </p>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                {t("home.somosTexto2")}
              </p>
              <Link href="/o-que-fazemos" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors">
                {t("home.saibaMais")}
              </Link>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 shadow-lg text-white">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <svg aria-hidden="true" className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">{t("home.objetivoTitulo")}</h3>
              <p className="text-blue-100 mb-6 leading-relaxed">
                {t("home.objetivoTexto")}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold mb-1">12.8k+</div>
                  <div className="text-sm text-blue-100">{t("home.statAvaliacoes")}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold mb-1">67</div>
                  <div className="text-sm text-blue-100">{t("home.statUniversidades")}</div>
                </div>
              </div>
              <Link href="/relatorio" className="block text-center bg-white text-blue-700 hover:bg-gray-100 px-6 py-3 rounded-lg font-bold shadow-md transition-colors w-full">
                {t("home.verRelatorio")}
              </Link>
            </div>
          </div>
        </section>

        {/* Avaliações Recentes - Design moderno */}
        <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {t("home.recentesAntes")} <span className="text-yellow-500">{t("home.recentesDestaque")}</span>
            </h2>
            <Link href="/relatorio" className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-2">
              {t("home.verTodas")}
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
          
          {avaliacoes.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg aria-hidden="true" className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <p className="text-lg">{t("home.nenhumaAvaliacao")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {avaliacoes.map(av => (
                <div key={av.id} className="bg-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    {av.photoURL ? (
                      <img src={av.photoURL} alt="" className="rounded-full w-12 h-12 object-cover border-2 border-gray-300" />
                    ) : (
                      <div aria-hidden="true" className="rounded-full bg-gradient-to-br from-blue-500 to-blue-600 w-12 h-12 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {av.usuario?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div className="font-bold text-gray-900 flex-1">{av.usuario || t("geral.usuario")}</div>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-3" role="img" aria-label={t("geral.estrelas", { n: notaSegura(av.nota) })}>
                    {Array(notaSegura(av.nota)).fill().map((_, i) => (
                      <svg aria-hidden="true" key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                    {Array(5 - notaSegura(av.nota)).fill().map((_, i) => (
                      <svg aria-hidden="true" key={i} className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                  </div>
                  
                  {av.titulo && (
                    <h3 className="font-bold text-gray-900 mb-2 text-sm">{av.titulo}</h3>
                  )}
                  <p className="text-gray-700 mb-3 line-clamp-3 text-sm leading-relaxed">{av.comentario}</p>
                  
                  {av.imagem && typeof av.imagem === "string" && (
                    <img src={av.imagem} alt={av.titulo ? t("home.imagemAvaliacaoTitulo", { titulo: av.titulo }) : t("home.imagemAvaliacao")} className="w-full h-32 object-cover rounded-lg mb-3 border border-gray-200" />
                  )}
                  
                  <div className="text-xs text-gray-600 bg-gray-100 rounded-lg p-2 mt-auto">
                    <div className="flex items-center gap-1 mb-1">
                      <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      {t("home.evento")}{" "}
                      {av.eventoId ? (
                        <Link href={`/evento/${encodeURIComponent(av.eventoId)}/detalhes`} className="hover:text-blue-600 hover:underline">
                          {eventos.find(ev => ev.id === String(av.eventoId))?.nome || av.eventoId}
                        </Link>
                      ) : "-"}
                    </div>
                    <div className="text-gray-600">
                      {formatarData(av.criadoEm)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </main>

      {/* Botão Flutuante do Fórum */}
      <Link href="/forum" aria-label={t("home.participarForum")} className="fixed bottom-6 right-6 bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 z-50 group border-2 border-white">
        <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
        <span className="absolute right-full top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1 rounded-lg mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-lg">
          {t("home.participarForum")}
        </span>
      </Link>

      {/* Rodapé */}
      <footer className="bg-gray-900 text-gray-300 pt-16 pb-8 mt-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Coluna 1 - Logo e Descrição */}
            <div className="md:col-span-1">
              <img src="/uniscore_star_logo.png" alt="UniScore" className="h-20 w-auto mb-4" />
              <p className="text-gray-300 text-sm leading-relaxed">
                {t("rodape.descricao")}
              </p>
            </div>

            {/* Coluna 2 - Links Rápidos */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">{t("rodape.linksRapidos")}</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {t("rodape.paginaInicial")}
                  </Link>
                </li>
                <li>
                  <Link href="/avaliar" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {t("rodape.avaliarEvento")}
                  </Link>
                </li>
                <li>
                  <Link href="/forum" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                    {t("rodape.forum")}
                  </Link>
                </li>
                <li>
                  <Link href="/o-que-fazemos" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t("rodape.oQueFazemos")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Coluna 3 - Para Universidades */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">{t("rodape.paraInstituicoes")}</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/para-universidades" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {t("rodape.paraUniversidades")}
                  </Link>
                </li>
                <li>
                  <Link href="/cadastro-universidades" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    {t("rodape.cadastreUniversidade")}
                  </Link>
                </li>
                <li>
                  <Link href="/login-universidades" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    {t("rodape.loginInstitucional")}
                  </Link>
                </li>
                <li>
                  <Link href="/relatorio" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t("rodape.relatorios")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Coluna 4 - Contato e Redes Sociais */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">{t("rodape.contato")}</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-gray-300">
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  contato@uniscore.com
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  (11) 98765-4321
                </li>
              </ul>
              <div className="flex gap-4">
                <a href="#" aria-label={t("rodape.redeSocial", { rede: "Facebook" })} className="bg-gray-800 hover:bg-blue-600 p-2 rounded-full transition-colors">
                  <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" aria-label={t("rodape.redeSocial", { rede: "X (Twitter)" })} className="bg-gray-800 hover:bg-blue-400 p-2 rounded-full transition-colors">
                  <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="#" aria-label={t("rodape.redeSocial", { rede: "Instagram" })} className="bg-gray-800 hover:bg-pink-600 p-2 rounded-full transition-colors">
                  <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="#" aria-label={t("rodape.redeSocial", { rede: "LinkedIn" })} className="bg-gray-800 hover:bg-blue-700 p-2 rounded-full transition-colors">
                  <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Linha divisória */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm">
                {t("rodape.direitos", { ano: new Date().getFullYear() })}
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">{t("rodape.privacidade")}</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">{t("rodape.termos")}</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">{t("rodape.cookies")}</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
