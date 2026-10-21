"use client";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { notaSegura } from "../../lib/notas";
import { listarEventos, TEMAS, TIPOS } from "../../lib/eventos";
import {
  carregarEstatisticas,
  estatisticaDoEvento,
  filtrarEventos,
  ordenarEventos,
  filtrosDaUrl,
  filtrosParaUrl,
  FILTROS_VAZIOS,
  ORDENACOES,
  ORDENACAO_PADRAO
} from "../../lib/busca";

// Busca e filtros de eventos (RF06).
// Os filtros ficam sincronizados com a query string (?q=...&tema=...), para
// que uma busca possa ser compartilhada por link.

const CAMINHO_ESTRELA = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

const classeCampo = "w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const classeRotulo = "block text-sm font-semibold text-gray-700 mb-1";

function formatarData(data) {
  return data ? data.split("-").reverse().join("/") : "";
}

function formatarPreco(preco) {
  if (!preco || preco <= 0) return "Gratuito";
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function contarFiltrosAtivos(f) {
  return [
    f.tema,
    f.tipo,
    f.universidadeId,
    f.dataInicio,
    f.dataFim,
    Number(f.notaMinima) > 0,
    Number(f.minAvaliacoes) > 0,
    f.apenasGratuitos
  ].filter(Boolean).length;
}

function Estrelas({ media, total }) {
  const cheias = notaSegura(media);
  return (
    <div className="flex items-center gap-1" aria-label={total ? `Nota média ${media.toFixed(1).replace(".", ",")} de 5` : "Sem avaliações"}>
      {Array(cheias).fill().map((_, i) => (
        <svg key={`c${i}`} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d={CAMINHO_ESTRELA} />
        </svg>
      ))}
      {Array(5 - cheias).fill().map((_, i) => (
        <svg key={`v${i}`} className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d={CAMINHO_ESTRELA} />
        </svg>
      ))}
      <span className="text-sm text-gray-600 ml-1">
        {total > 0 && <span className="font-semibold text-gray-800 mr-1">{media.toFixed(1).replace(".", ",")}</span>}
        ({total} {total === 1 ? "avaliação" : "avaliações"})
      </span>
    </div>
  );
}

function CartaoEvento({ ev, estatistica }) {
  const detalhes = `/evento/${encodeURIComponent(ev.id)}/detalhes`;
  return (
    <article className="bg-white rounded-2xl shadow-md border-2 border-gray-200 hover:border-green-500 transition-all duration-300 overflow-hidden group flex flex-col">
      <Link href={detalhes} className="block" tabIndex={-1} aria-hidden="true">
        {ev.imagem ? (
          <img src={ev.imagem} alt="" className="w-full h-44 object-cover bg-gray-100 group-hover:scale-105 transition-transform duration-200" />
        ) : (
          <div className="w-full h-44 bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 flex items-center justify-center text-white text-5xl font-bold">
            {ev.nome?.charAt(0)?.toUpperCase() || "E"}
          </div>
        )}
      </Link>
      <div className="p-5 flex flex-col flex-1">
        <Link href={detalhes} className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors">
          {ev.nome || "Evento sem nome"}
        </Link>
        {ev.universidadeNome && (
          <p className="text-sm text-gray-600 mt-1">{ev.universidadeNome}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 mt-2">
          {ev.data && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatarData(ev.data)}
            </span>
          )}
          <span className={ev.preco > 0 ? "font-semibold text-gray-800" : "font-semibold text-green-600"}>
            {formatarPreco(ev.preco)}
          </span>
        </div>
        {(ev.tema || ev.tipo) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {ev.tema && <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">{ev.tema}</span>}
            {ev.tipo && <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">{ev.tipo}</span>}
          </div>
        )}
        <div className="mt-3">
          <Estrelas media={estatistica.media} total={estatistica.total} />
        </div>
        <div className="mt-auto pt-4 flex gap-2">
          <Link
            href={`/avaliar?eventoId=${encodeURIComponent(ev.id)}`}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors text-sm"
          >
            Avaliar
          </Link>
          <Link
            href={detalhes}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors text-sm"
          >
            Ver detalhes
          </Link>
        </div>
      </div>
    </article>
  );
}

function TelaCarregando() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando...</p>
      </div>
    </div>
  );
}

function BuscarEventosConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Estado inicial lido da URL (somente na montagem)
  const [inicial] = useState(() => filtrosDaUrl(searchParams));

  const [filtros, setFiltros] = useState(inicial.filtros);
  const [ordem, setOrdem] = useState(inicial.ordem);
  const [eventos, setEventos] = useState([]);
  const [stats, setStats] = useState(new Map());
  const [universidades, setUniversidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Última query string escrita (ou lida) por esta página
  const ultimaQuery = useRef(searchParams.toString());

  // Carrega eventos e estatísticas de avaliações
  useEffect(() => {
    let cancelado = false;
    Promise.all([listarEventos(), carregarEstatisticas()])
      .then(([lista, estatisticas]) => {
        if (cancelado) return;
        setEventos(lista);
        setStats(estatisticas);
      })
      .catch(err => console.error("Erro ao carregar eventos:", err))
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, []);

  useEffect(() => {
    fetch("/universidades.json")
      .then(res => (res.ok ? res.json() : []))
      .then(data => setUniversidades(Array.isArray(data) ? data : []))
      .catch(err => console.error("Erro ao carregar universidades:", err));
  }, []);

  // URL alterada externamente (ex.: nova busca vinda da home com a página já aberta)
  useEffect(() => {
    const atual = searchParams.toString();
    if (atual === ultimaQuery.current) return;
    ultimaQuery.current = atual;
    const lidos = filtrosDaUrl(searchParams);
    setFiltros(lidos.filtros);
    setOrdem(lidos.ordem);
  }, [searchParams]);

  // Estado -> URL (com pequeno atraso para não reescrever a cada tecla)
  useEffect(() => {
    const qs = filtrosParaUrl(filtros, ordem);
    if (qs === ultimaQuery.current) return;
    const timer = setTimeout(() => {
      ultimaQuery.current = qs;
      router.replace(qs ? `/eventos?${qs}` : "/eventos", { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [filtros, ordem, router]);

  const resultados = useMemo(
    () => ordenarEventos(filtrarEventos(eventos, stats, filtros), stats, ordem),
    [eventos, stats, filtros, ordem]
  );

  const alterar = campo => e => {
    const valor = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFiltros(f => ({ ...f, [campo]: valor }));
  };

  const limparFiltros = () => {
    setFiltros(f => ({ ...FILTROS_VAZIOS, texto: f.texto }));
  };

  const filtrosAtivos = contarFiltrosAtivos(filtros);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 text-gray-900 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            <span className="font-bold text-xl">UniScore</span>
          </Link>
          <nav className="hidden md:flex gap-8 text-sm font-medium">
            <Link href="/forum" className="text-gray-600 hover:text-blue-600 transition-colors">Fórum</Link>
            <Link href="/avaliar" className="text-gray-600 hover:text-green-600 transition-colors">Escreva uma avaliação</Link>
          </nav>
          <div className="w-20"></div>
        </div>
      </header>

      {/* Hero + busca */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Buscar eventos</h1>
          <form
            role="search"
            onSubmit={e => e.preventDefault()}
            className="relative bg-white rounded-xl shadow-2xl"
          >
            <label htmlFor="busca-texto" className="sr-only">Buscar por nome ou descrição do evento</label>
            <input
              id="busca-texto"
              type="search"
              className="w-full bg-transparent border-0 outline-none px-6 py-4 pr-16 text-gray-800 text-lg placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-yellow-400"
              placeholder="Nome do evento, palavra-chave ou universidade..."
              value={filtros.texto}
              onChange={alterar("texto")}
            />
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 p-3 rounded-lg" aria-hidden="true">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </span>
          </form>
        </div>
      </section>

      <main className="container mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row gap-6">
        {/* Painel de filtros */}
        <aside className="md:w-72 shrink-0">
          <button
            type="button"
            className="md:hidden w-full flex items-center justify-between bg-white border border-gray-300 rounded-lg px-4 py-3 font-semibold text-gray-800 shadow-sm"
            aria-expanded={mostrarFiltros}
            aria-controls="painel-filtros"
            onClick={() => setMostrarFiltros(v => !v)}
          >
            <span>Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ""}</span>
            <svg className={`w-5 h-5 transition-transform ${mostrarFiltros ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            id="painel-filtros"
            className={`${mostrarFiltros ? "block" : "hidden"} md:block mt-3 md:mt-0 bg-white rounded-2xl shadow-md border border-gray-200 p-5 space-y-4`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Filtros</h2>
              {filtrosAtivos > 0 && (
                <button type="button" onClick={limparFiltros} className="text-sm text-blue-600 hover:text-blue-800 font-semibold">
                  Limpar filtros
                </button>
              )}
            </div>

            <div>
              <label htmlFor="filtro-tema" className={classeRotulo}>Tema</label>
              <select id="filtro-tema" className={classeCampo} value={filtros.tema} onChange={alterar("tema")}>
                <option value="">Todos os temas</option>
                {TEMAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="filtro-tipo" className={classeRotulo}>Tipo</label>
              <select id="filtro-tipo" className={classeCampo} value={filtros.tipo} onChange={alterar("tipo")}>
                <option value="">Todos os tipos</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="filtro-universidade" className={classeRotulo}>Universidade</label>
              <select id="filtro-universidade" className={classeCampo} value={filtros.universidadeId} onChange={alterar("universidadeId")}>
                <option value="">Todas as universidades</option>
                {universidades.map(uni => (
                  <option key={uni.id} value={String(uni.id)}>
                    {uni.nome}{uni.sigla && uni.sigla !== uni.nome ? ` (${uni.sigla})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="filtro-data-inicio" className={classeRotulo}>De</label>
                <input
                  id="filtro-data-inicio"
                  type="date"
                  className={classeCampo}
                  value={filtros.dataInicio}
                  max={filtros.dataFim || undefined}
                  onChange={alterar("dataInicio")}
                />
              </div>
              <div>
                <label htmlFor="filtro-data-fim" className={classeRotulo}>Até</label>
                <input
                  id="filtro-data-fim"
                  type="date"
                  className={classeCampo}
                  value={filtros.dataFim}
                  min={filtros.dataInicio || undefined}
                  onChange={alterar("dataFim")}
                />
              </div>
            </div>

            <div>
              <label htmlFor="filtro-nota" className={classeRotulo}>Nota mínima</label>
              <select id="filtro-nota" className={classeCampo} value={String(filtros.notaMinima)} onChange={alterar("notaMinima")}>
                <option value="0">Qualquer nota</option>
                {[1, 2, 3, 4].map(n => <option key={n} value={String(n)}>{n} estrela{n > 1 ? "s" : ""} ou mais</option>)}
                <option value="5">5 estrelas</option>
              </select>
            </div>

            <div>
              <label htmlFor="filtro-min-avaliacoes" className={classeRotulo}>Mínimo de avaliações</label>
              <input
                id="filtro-min-avaliacoes"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                className={classeCampo}
                value={Number(filtros.minAvaliacoes) > 0 ? filtros.minAvaliacoes : ""}
                placeholder="0"
                onChange={e => {
                  const n = parseInt(e.target.value, 10);
                  setFiltros(f => ({ ...f, minAvaliacoes: Number.isFinite(n) && n > 0 ? n : 0 }));
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="filtro-gratuitos"
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={filtros.apenasGratuitos}
                onChange={alterar("apenasGratuitos")}
              />
              <label htmlFor="filtro-gratuitos" className="text-sm font-semibold text-gray-700">Apenas eventos gratuitos</label>
            </div>
          </div>
        </aside>

        {/* Resultados */}
        <section className="flex-1 min-w-0" aria-labelledby="titulo-resultados">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h2 id="titulo-resultados" className="text-gray-700" aria-live="polite">
              {carregando
                ? "Carregando eventos..."
                : `${resultados.length} ${resultados.length === 1 ? "evento encontrado" : "eventos encontrados"}`}
            </h2>
            <div className="flex items-center gap-2">
              <label htmlFor="ordenacao" className="text-sm font-semibold text-gray-700 whitespace-nowrap">Ordenar por</label>
              <select
                id="ordenacao"
                className={`${classeCampo} sm:w-52`}
                value={ordem}
                onChange={e => setOrdem(e.target.value || ORDENACAO_PADRAO)}
              >
                {ORDENACOES.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
              </select>
            </div>
          </div>

          {carregando ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" role="status" aria-label="Carregando"></div>
            </div>
          ) : resultados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <p className="text-lg font-semibold text-gray-800">Nenhum evento encontrado.</p>
              <p className="text-gray-600 mt-2">
                {eventos.length === 0
                  ? "Ainda não há eventos cadastrados."
                  : "Tente outras palavras-chave ou remova alguns filtros."}
              </p>
              {(filtrosAtivos > 0 || filtros.texto) && (
                <button
                  type="button"
                  onClick={() => setFiltros({ ...FILTROS_VAZIOS })}
                  className="mt-5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm shadow-sm transition-all"
                >
                  Limpar busca e filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {resultados.map(ev => (
                <CartaoEvento key={ev.id} ev={ev} estatistica={estatisticaDoEvento(stats, ev.id)} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// useSearchParams exige um limite <Suspense> no App Router
export default function BuscarEventos() {
  return (
    <Suspense fallback={<TelaCarregando />}>
      <BuscarEventosConteudo />
    </Suspense>
  );
}
