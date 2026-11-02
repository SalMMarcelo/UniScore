// Dados do dashboard da universidade (contrato em docs/dashboard-real.md).
//
// Avaliações da universidade = união, sem repetir, de:
//  1. avaliacoes com universidadeId == conta.universidadeId (quando a conta tem vínculo);
//  2. avaliacoes com eventoId em algum evento da conta (eventos com universidadeUid == auth.uid).
// Avaliações com moderado == true (ocultas pela moderação) ficam de fora.
//
// Usa só os dados da conta em universidades/{uid} (nomeUniversidade, universidadeId): nada do
// catálogo de universidades. Regras envolvidas: avaliacoes e eventos têm leitura pública;
// presencas pode ser contada pela universidade aprovada dona do evento (where eventoId ==).
//
// As funções de agregação são puras (recebem listas, devolvem números) para facilitar a leitura.

import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { contarPresencas } from "./presencas";

export const CRITERIOS_DASHBOARD = ["acessibilidade", "conforto", "interculturalidade", "politizacao", "impacto"];
export const TAMANHO_LOTE_IN = 30; // limite do operador "in" do Firestore
export const LIMITE_RECENTES = 10;
const DIA_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Funções puras
// ---------------------------------------------------------------------------

// Timestamp do Firestore, Date, número ou string -> Date (ou null)
export function paraDate(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
    if (typeof valor.toDate === "function") return valor.toDate();
    if (typeof valor.seconds === "number") return new Date(valor.seconds * 1000);
    const data = new Date(valor);
    return isNaN(data.getTime()) ? null : data;
}

// Nota inteira de 1 a 5, ou null se o valor gravado não for uma nota válida
export function notaValida(valor) {
    const n = Number(valor);
    if (!Number.isFinite(n)) return null;
    const r = Math.round(n);
    return r >= 1 && r <= 5 ? r : null;
}

function media(valores) {
    return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
}

// Divide uma lista em lotes de `tamanho` (para o operador "in")
export function emLotes(lista, tamanho = TAMANHO_LOTE_IN) {
    const lotes = [];
    for (let i = 0; i < lista.length; i += tamanho) lotes.push(lista.slice(i, i + tamanho));
    return lotes;
}

// Junta várias listas de avaliações sem repetir (pelo id) e tira as ocultas pela moderação
export function unirAvaliacoes(...listas) {
    const porId = new Map();
    for (const lista of listas) {
        for (const av of lista || []) {
            if (!av || !av.id || av.moderado === true) continue;
            if (!porId.has(av.id)) porId.set(av.id, av);
        }
    }
    return [...porId.values()];
}

// Mais recentes primeiro (sem data vão para o fim)
export function ordenarPorData(avaliacoes) {
    return [...avaliacoes].sort((a, b) => {
        const da = paraDate(a.criadoEm)?.getTime() ?? -Infinity;
        const dbb = paraDate(b.criadoEm)?.getTime() ?? -Infinity;
        return dbb - da;
    });
}

// Cartões: total, nota média, eventos avaliados e avaliações com presença verificada
export function calcularResumo(avaliacoes) {
    const notas = avaliacoes.map(av => notaValida(av.nota)).filter(n => n !== null);
    const eventos = new Set(avaliacoes.map(av => av.eventoId).filter(id => id !== undefined && id !== null && id !== "").map(String));
    const verificadas = avaliacoes.filter(av => av.presencaVerificada === true).length;
    const total = avaliacoes.length;
    return {
        total,
        notaMedia: media(notas),
        eventosAvaliados: eventos.size,
        verificadas,
        percentualVerificadas: total ? verificadas / total : null
    };
}

// Total de presenças e taxa de avaliação = verificadas ÷ presenças (null quando não há presenças)
export function calcularPresencas(presencasPorEvento, verificadas) {
    const valores = Object.values(presencasPorEvento || {}).filter(v => Number.isFinite(v));
    const total = valores.reduce((a, b) => a + b, 0);
    return {
        total,
        taxaAvaliacao: total > 0 ? verificadas / total : null
    };
}

// Média de cada critério real, ignorando null ("não se aplica") e valores fora de 1-5
export function mediasPorCriterio(avaliacoes) {
    return CRITERIOS_DASHBOARD.map(id => {
        const valores = avaliacoes
            .map(av => (av.criterios && typeof av.criterios === "object" ? av.criterios[id] : null))
            .map(v => (v === null || v === undefined ? null : notaValida(v)))
            .filter(v => v !== null);
        return { id, media: media(valores), quantidade: valores.length };
    });
}

// Contagem de notas de 5 a 1 e percentual sobre as avaliações com nota válida
export function distribuicaoNotas(avaliacoes) {
    const contagem = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    for (const av of avaliacoes) {
        const n = notaValida(av.nota);
        if (n === null) continue;
        contagem[n] += 1;
        total += 1;
    }
    return [5, 4, 3, 2, 1].map(estrelas => ({
        estrelas,
        quantidade: contagem[estrelas],
        percentual: total ? contagem[estrelas] / total : 0
    }));
}

// Avaliações dos últimos 30 dias x 30 dias anteriores. null quando algum período está vazio.
export function comparativo30Dias(avaliacoes, agora = new Date()) {
    const fim = agora.getTime();
    const inicioAtual = fim - 30 * DIA_MS;
    const inicioAnterior = fim - 60 * DIA_MS;
    let atual = 0;
    let anterior = 0;
    for (const av of avaliacoes) {
        const t = paraDate(av.criadoEm)?.getTime();
        if (t === undefined) continue;
        if (t > inicioAtual && t <= fim) atual += 1;
        else if (t > inicioAnterior && t <= inicioAtual) anterior += 1;
    }
    if (!atual || !anterior) return null;
    return { atual, anterior, variacao: (atual - anterior) / anterior };
}

// Linhas da tabela "por evento": eventos da conta e eventos que aparecem nas avaliações.
// nomes: { [eventoId]: nome }; presencasPorEvento: { [eventoId]: número } (só eventos da conta).
export function resumoPorEvento(avaliacoes, eventosConta, nomes, presencasPorEvento) {
    const linhas = new Map();
    const linha = id => {
        if (!linhas.has(id)) {
            linhas.set(id, { eventoId: id, nome: nomes?.[id] || "", notas: [], avaliacoes: 0, verificadas: 0, presencas: null });
        }
        return linhas.get(id);
    };
    for (const ev of eventosConta || []) {
        const l = linha(String(ev.id));
        const p = presencasPorEvento?.[String(ev.id)];
        l.presencas = Number.isFinite(p) ? p : null;
    }
    for (const av of avaliacoes) {
        if (av.eventoId === undefined || av.eventoId === null || av.eventoId === "") continue;
        const l = linha(String(av.eventoId));
        l.avaliacoes += 1;
        if (av.presencaVerificada === true) l.verificadas += 1;
        const n = notaValida(av.nota);
        if (n !== null) l.notas.push(n);
    }
    return [...linhas.values()]
        .map(({ notas, ...resto }) => ({ ...resto, notaMedia: media(notas) }))
        .sort((a, b) => b.avaliacoes - a.avaliacoes || a.nome.localeCompare(b.nome));
}

// As últimas `limite` avaliações (mais recentes primeiro)
export function avaliacoesRecentes(avaliacoes, limite = LIMITE_RECENTES) {
    return ordenarPorData(avaliacoes).slice(0, limite);
}

// Tudo o que o dashboard mostra, a partir dos dados já buscados
export function agregarDashboard({ avaliacoes, eventosConta, nomesEventos, presencasPorEvento, agora = new Date() }) {
    const resumo = calcularResumo(avaliacoes);
    return {
        resumo,
        // null: presenças não puderam ser contadas (conta não aprovada ou erro)
        presencas: presencasPorEvento ? calcularPresencas(presencasPorEvento, resumo.verificadas) : null,
        criterios: mediasPorCriterio(avaliacoes),
        distribuicao: distribuicaoNotas(avaliacoes),
        comparativo: comparativo30Dias(avaliacoes, agora),
        porEvento: resumoPorEvento(avaliacoes, eventosConta, nomesEventos, presencasPorEvento),
        recentes: avaliacoesRecentes(avaliacoes)
    };
}

// ---------------------------------------------------------------------------
// Relatório para impressão (docs/relatorio-universidade.md)
// ---------------------------------------------------------------------------

export const PERIODOS_RELATORIO = ["30d", "12m", "tudo"];
export const LIMITE_RECENTES_RELATORIO = 20;

// Início do período (Date, exclusivo) ou null para "tudo"
export function inicioDoPeriodo(periodo, agora = new Date()) {
    if (periodo === "30d") return new Date(agora.getTime() - 30 * DIA_MS);
    if (periodo === "12m") {
        const umAnoAntes = new Date(agora);
        umAnoAntes.setFullYear(umAnoAntes.getFullYear() - 1);
        return umAnoAntes;
    }
    return null;
}

// Avaliações com criadoEm dentro do período: "30d" (últimos 30 dias), "12m" (últimos 12 meses)
// ou "tudo" (sem filtro). Com filtro, avaliações sem data ficam de fora.
export function filtrarPorPeriodo(avaliacoes, periodo, agora = new Date()) {
    const inicioData = inicioDoPeriodo(periodo, agora);
    if (!inicioData) return avaliacoes;
    const inicio = inicioData.getTime();
    const fim = agora.getTime();
    return avaliacoes.filter(av => {
        const t = paraDate(av.criadoEm)?.getTime();
        return t !== undefined && t > inicio && t <= fim;
    });
}

// Dados do relatório a partir do que carregarDashboard devolveu, só com as avaliações do período.
// As presenças (check-ins) não têm filtro de período: são sempre a contagem total.
export function agregarRelatorio(dados, periodo, agora = new Date()) {
    const avaliacoes = filtrarPorPeriodo(dados.avaliacoes || [], periodo, agora);
    const agregado = agregarDashboard({
        avaliacoes,
        eventosConta: dados.eventosConta || [],
        nomesEventos: dados.nomesEventos || {},
        presencasPorEvento: dados.presencasPorEvento ?? null,
        agora
    });
    return {
        ...agregado,
        avaliacoes,
        recentes: avaliacoesRecentes(avaliacoes, LIMITE_RECENTES_RELATORIO)
    };
}

// ---------------------------------------------------------------------------
// Busca no Firestore
// ---------------------------------------------------------------------------

function docsParaLista(snap) {
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Eventos cadastrados pela conta (leitura pública)
export async function buscarEventosDaConta(uid) {
    const snap = await getDocs(query(collection(db, "eventos"), where("universidadeUid", "==", uid)));
    return docsParaLista(snap);
}

async function buscarAvaliacoesPorUniversidade(universidadeId) {
    if (!universidadeId) return [];
    const snap = await getDocs(query(collection(db, "avaliacoes"), where("universidadeId", "==", String(universidadeId))));
    return docsParaLista(snap);
}

async function buscarAvaliacoesPorEventos(eventoIds) {
    const lotes = emLotes(eventoIds.map(String));
    const resultados = await Promise.all(
        lotes.map(lote => getDocs(query(collection(db, "avaliacoes"), where("eventoId", "in", lote))))
    );
    return resultados.flatMap(docsParaLista);
}

// Presenças por evento da conta. Evento cuja contagem falhou fica sem valor (mostrado como "—");
// se todas falharem, devolve null.
async function contarPresencasPorEvento(eventoIds) {
    if (!eventoIds.length) return {};
    const contagens = await Promise.allSettled(eventoIds.map(id => contarPresencas(id)));
    const resultado = {};
    contagens.forEach((c, i) => {
        if (c.status === "fulfilled") resultado[eventoIds[i]] = c.value;
        else console.error("Erro ao contar presenças do evento", eventoIds[i], c.reason);
    });
    return Object.keys(resultado).length ? resultado : null;
}

// Nomes dos eventos que aparecem nas avaliações mas não são da conta: eventos do Firestore
// (leitura pública) ou legados de public/events.json (ids numéricos).
async function buscarNomesEventos(ids) {
    const nomes = {};
    if (!ids.length) return nomes;
    const legados = ids.filter(id => /^[0-9]+$/.test(id));
    const doFirestore = ids.filter(id => !/^[0-9]+$/.test(id) && !id.includes("/"));

    await Promise.all([
        (async () => {
            if (!legados.length) return;
            try {
                const res = await fetch("/events.json");
                const lista = res.ok ? await res.json() : [];
                for (const ev of Array.isArray(lista) ? lista : []) {
                    if (legados.includes(String(ev.id)) && ev.nome) nomes[String(ev.id)] = String(ev.nome);
                }
            } catch (err) {
                console.error("Erro ao carregar /events.json:", err);
            }
        })(),
        ...doFirestore.map(async id => {
            try {
                const snap = await getDoc(doc(db, "eventos", id));
                if (snap.exists() && snap.data().nome) nomes[id] = String(snap.data().nome);
            } catch (err) {
                console.error("Erro ao buscar o evento", id, err);
            }
        })
    ]);
    return nomes;
}

// Busca tudo e devolve os dados agregados do dashboard.
//  - uid: auth.uid da conta;
//  - universidadeId: vínculo da conta (universidades/{uid}.universidadeId) ou null;
//  - eventosConta: eventos da conta já carregados pela página, ou null para buscar aqui;
//  - contarPresencasDosEventos: false quando a conta não está aprovada (as regras negariam).
export async function carregarDashboard({ uid, universidadeId, eventosConta = null, contarPresencasDosEventos = true }) {
    const eventos = eventosConta ?? (await buscarEventosDaConta(uid));
    const idsConta = eventos.map(ev => String(ev.id));

    const [porUniversidade, porEventos, presencasPorEvento] = await Promise.all([
        buscarAvaliacoesPorUniversidade(universidadeId),
        buscarAvaliacoesPorEventos(idsConta),
        contarPresencasDosEventos ? contarPresencasPorEvento(idsConta) : Promise.resolve(null)
    ]);

    const avaliacoes = unirAvaliacoes(porUniversidade, porEventos);

    const nomesEventos = Object.fromEntries(eventos.map(ev => [String(ev.id), ev.nome || ""]));
    const idsSemNome = [...new Set(avaliacoes.map(av => av.eventoId).filter(Boolean).map(String))]
        .filter(id => !nomesEventos[id]);
    Object.assign(nomesEventos, await buscarNomesEventos(idsSemNome));

    return {
        avaliacoes,
        nomesEventos,
        // Dados brutos para reagregar por período (relatório)
        eventosConta: eventos,
        presencasPorEvento,
        ...agregarDashboard({ avaliacoes, eventosConta: eventos, nomesEventos, presencasPorEvento })
    };
}
