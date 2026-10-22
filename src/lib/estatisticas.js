// Estatísticas agregadas no servidor (contagens e médias sem baixar documentos).
//
// - avaliacoesPorTema(eventos): usada pelo painel admin e pelo relatório público;
// - carregarRelatorioPublico(): dados do /relatorio. Só lê coleções públicas
//   (avaliacoes, eventos, forumPosts): universidades e usuários exigem login.

import { db } from "../firebase";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getCountFromServer,
    getAggregateFromServer,
    average,
    count,
    Timestamp
} from "firebase/firestore";
import { listarEventos } from "./eventos";

export const SEM_TEMA = "Sem tema";

// Perguntas de 1 a 5 estrelas exibidas no bloco "Impacto Intercultural".
// "Não se aplica" é gravado como null e fica fora da média.
export const ASPECTOS_IMPACTO = [
    { id: "cosmovisao", campo: "intercultural.ampliacaoCosmivisao" },
    { id: "conexao", campo: "intercultural.conexaoIntercultural" },
    { id: "diversidade", campo: "intercultural.diversidadePromovida" },
    { id: "interculturalidade", campo: "criterios.interculturalidade" },
    { id: "impacto", campo: "criterios.impacto" }
];

const MESES_GRAFICO = 12;
const RECENTES = 5;

export async function contar(q) {
    try {
        const snap = await getCountFromServer(q);
        return snap.data().count;
    } catch (err) {
        console.error("Erro ao contar documentos:", err);
        return null;
    }
}

async function media(q, campo) {
    try {
        const snap = await getAggregateFromServer(q, { media: average(campo) });
        return snap.data().media;
    } catch (err) {
        console.error(`Erro ao calcular média de ${campo}:`, err);
        return null;
    }
}

// Divide uma lista em pedaços (o operador "in" aceita até 30 valores)
function emPedacos(lista, tamanho) {
    const pedacos = [];
    for (let i = 0; i < lista.length; i += tamanho) pedacos.push(lista.slice(i, i + tamanho));
    return pedacos;
}

// Avaliações por tema: o tema está no evento; agrupa os ids dos eventos por
// tema e agrega as avaliações com eventoId "in" (até 30 ids por consulta).
// Devolve [{ tema, eventos, avaliacoes, media }], do tema mais avaliado ao menos.
export async function avaliacoesPorTema(eventos) {
    const avaliacoesRef = collection(db, "avaliacoes");
    const idsPorTema = {};
    eventos.forEach(ev => {
        const tema = ev.tema || SEM_TEMA;
        (idsPorTema[tema] = idsPorTema[tema] || []).push(ev.id);
    });

    const porTema = await Promise.all(Object.entries(idsPorTema).map(async ([tema, ids]) => {
        let total = 0;
        let soma = 0;
        try {
            const partes = await Promise.all(emPedacos(ids, 30).map(pedaco =>
                getAggregateFromServer(
                    query(avaliacoesRef, where("eventoId", "in", pedaco)),
                    { total: count(), media: average("nota") }
                ).then(s => s.data())
            ));
            partes.forEach(p => {
                total += p.total;
                if (p.media !== null && p.media !== undefined) soma += p.media * p.total;
            });
        } catch (err) {
            console.error(`Erro ao agregar avaliações do tema ${tema}:`, err);
            return { tema, eventos: ids.length, avaliacoes: null, media: null };
        }
        return { tema, eventos: ids.length, avaliacoes: total, media: total ? soma / total : null };
    }));
    porTema.sort((a, b) => (b.avaliacoes || 0) - (a.avaliacoes || 0) || a.tema.localeCompare(b.tema));
    return porTema;
}

// Primeiro dia do mês, `deslocamento` meses a partir de `base` (negativo = passado)
function inicioDoMes(base, deslocamento = 0) {
    return new Date(base.getFullYear(), base.getMonth() + deslocamento, 1);
}

function hojeISO(agora) {
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${agora.getFullYear()}-${mes}-${dia}`;
}

// Avaliações criadas em cada um dos últimos 12 meses (o atual incluído)
async function avaliacoesPorMes(avaliacoesRef, agora) {
    const meses = Array.from({ length: MESES_GRAFICO }, (_, i) => inicioDoMes(agora, i - MESES_GRAFICO + 1));
    return Promise.all(meses.map(async inicio => {
        const fim = inicioDoMes(inicio, 1);
        const total = await contar(query(
            avaliacoesRef,
            where("criadoEm", ">=", Timestamp.fromDate(inicio)),
            where("criadoEm", "<", Timestamp.fromDate(fim))
        ));
        return { inicio, total };
    }));
}

// Últimas avaliações visíveis (as ocultas pela moderação ficam de fora)
async function avaliacoesRecentes(avaliacoesRef) {
    try {
        const snap = await getDocs(query(avaliacoesRef, orderBy("criadoEm", "desc"), limit(RECENTES * 3)));
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(av => !av.moderado)
            .slice(0, RECENTES);
    } catch (err) {
        console.error("Erro ao carregar avaliações recentes:", err);
        return [];
    }
}

function contarPor(lista, chave) {
    const contagem = {};
    lista.forEach(item => {
        const valor = item[chave] || null;
        if (valor) contagem[valor] = (contagem[valor] || 0) + 1;
    });
    return Object.entries(contagem)
        .map(([valor, total]) => ({ valor, total }))
        .sort((a, b) => b.total - a.total || a.valor.localeCompare(b.valor));
}

export async function carregarRelatorioPublico(agora = new Date()) {
    const avaliacoesRef = collection(db, "avaliacoes");
    const [
        totalAvaliacoes,
        avaliacoesOcultas,
        avaliacoesNoMes,
        mediaGeral,
        posts,
        eventos,
        porMes,
        impacto,
        recentes
    ] = await Promise.all([
        contar(avaliacoesRef),
        contar(query(avaliacoesRef, where("moderado", "==", true))),
        contar(query(avaliacoesRef, where("criadoEm", ">=", Timestamp.fromDate(inicioDoMes(agora))))),
        media(avaliacoesRef, "nota"),
        contar(collection(db, "forumPosts")),
        listarEventos().catch(err => { console.error("Erro ao listar eventos:", err); return []; }),
        avaliacoesPorMes(avaliacoesRef, agora),
        Promise.all(ASPECTOS_IMPACTO.map(async a => ({ id: a.id, media: await media(avaliacoesRef, a.campo) }))),
        avaliacoesRecentes(avaliacoesRef)
    ]);

    const hoje = hojeISO(agora);
    const universidades = new Set(
        eventos.map(ev => ev.universidadeId || ev.universidadeNome).filter(Boolean)
    );

    return {
        avaliacoes: totalAvaliacoes === null || avaliacoesOcultas === null
            ? totalAvaliacoes
            : totalAvaliacoes - avaliacoesOcultas,
        avaliacoesNoMes,
        mediaGeral,
        posts,
        eventos: eventos.length,
        eventosFuturos: eventos.filter(ev => ev.data && ev.data >= hoje).length,
        universidadesComEventos: universidades.size,
        porMes,
        impacto,
        porTema: await avaliacoesPorTema(eventos),
        porTipo: contarPor(eventos, "tipo"),
        recentes,
        eventosPorId: Object.fromEntries(eventos.map(ev => [ev.id, ev])),
        geradoEm: agora
    };
}
