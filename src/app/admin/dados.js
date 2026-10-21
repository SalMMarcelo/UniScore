// Consultas e formatos compartilhados pelo painel administrativo (/admin)
// e pelo relatório para impressão (/admin/relatorio).
// Todas as leituras aqui dependem de isModerator() nas regras do Firestore.

import { db } from "../../firebase";
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
    count
} from "firebase/firestore";
import { listarEventos } from "../../lib/eventos";
import { rotuloMotivo, TIPOS_DENUNCIA } from "../../lib/denuncias";

export function formatarDataHora(valor) {
    if (!valor) return "";
    const data = typeof valor.toDate === "function" ? valor.toDate() : new Date(valor);
    return isNaN(data?.getTime?.()) ? "" : data.toLocaleString("pt-BR");
}

export function formatarDataEvento(data) {
    if (!data || typeof data !== "string") return "";
    const [ano, mes, dia] = data.split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

async function contar(q) {
    try {
        const snap = await getCountFromServer(q);
        return snap.data().count;
    } catch (err) {
        console.error("Erro ao contar documentos:", err);
        return null;
    }
}

// Divide uma lista em pedaços (o operador "in" aceita até 30 valores)
function emPedacos(lista, tamanho) {
    const pedacos = [];
    for (let i = 0; i < lista.length; i += tamanho) pedacos.push(lista.slice(i, i + tamanho));
    return pedacos;
}

// Contagens reais via agregações no servidor (não baixa os documentos).
// Usuários (users/usuarios) não são contados: as regras só deixam cada
// usuário ler o próprio documento, nem moderadores podem listá-los.
export async function carregarEstatisticas() {
    const avaliacoesRef = collection(db, "avaliacoes");
    const [
        totalAvaliacoes,
        avaliacoesOcultas,
        totalPosts,
        postsOcultos,
        uniPendentes,
        uniAprovadas,
        uniTotal,
        denunciasAbertas,
        denunciasTotal,
        mediaGeral,
        eventos
    ] = await Promise.all([
        contar(avaliacoesRef),
        contar(query(avaliacoesRef, where("moderado", "==", true))),
        contar(collection(db, "forumPosts")),
        contar(query(collection(db, "forumPosts"), where("moderado", "==", true))),
        contar(query(collection(db, "universidades"), where("status", "==", "pendente"))),
        contar(query(collection(db, "universidades"), where("status", "==", "aprovado"))),
        contar(collection(db, "universidades")),
        contar(query(collection(db, "denuncias"), where("status", "==", "aberta"))),
        contar(collection(db, "denuncias")),
        getAggregateFromServer(avaliacoesRef, { media: average("nota") })
            .then(s => s.data().media)
            .catch(err => { console.error("Erro ao calcular média:", err); return null; }),
        listarEventos()
    ]);

    // Avaliações por tema: o tema está no evento; agrupa os ids dos eventos por
    // tema e agrega as avaliações com eventoId "in" (até 30 ids por consulta).
    const idsPorTema = {};
    eventos.forEach(ev => {
        const tema = ev.tema || "Sem tema";
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

    return {
        avaliacoes: totalAvaliacoes,
        avaliacoesOcultas,
        mediaGeral,
        eventos: eventos.length,
        eventosLegados: eventos.filter(ev => ev.legado).length,
        posts: totalPosts,
        postsOcultos,
        universidades: uniTotal,
        universidadesPendentes: uniPendentes,
        universidadesAprovadas: uniAprovadas,
        denunciasAbertas,
        denuncias: denunciasTotal,
        porTema,
        geradoEm: new Date()
    };
}

export async function carregarAvaliacoes(maximo) {
    const partes = [collection(db, "avaliacoes"), orderBy("criadoEm", "desc")];
    if (maximo) partes.push(limit(maximo));
    const snap = await getDocs(query(...partes));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function carregarDenuncias({ status, maximo } = {}) {
    const partes = [collection(db, "denuncias")];
    // status + criadoEm usa o índice composto denuncias (status ASC, criadoEm DESC)
    if (status) partes.push(where("status", "==", status));
    partes.push(orderBy("criadoEm", "desc"));
    if (maximo) partes.push(limit(maximo));
    const snap = await getDocs(query(...partes));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Mapa id do evento -> nome, para exibir avaliações
export function nomesDosEventos(eventos) {
    return Object.fromEntries((eventos || []).map(ev => [ev.id, ev.nome]));
}

// ─── Colunas dos CSVs ─────────────────────────────────────────────────────
const CRITERIOS = ["acessibilidade", "conforto", "interculturalidade", "politizacao", "impacto"];

export function colunasAvaliacoes(nomesEventos = {}) {
    return [
        { chave: "id", rotulo: "ID" },
        { chave: "eventoId", rotulo: "ID do evento" },
        { rotulo: "Evento", valor: av => nomesEventos[av.eventoId] || "" },
        { chave: "universidadeId", rotulo: "ID da universidade" },
        { chave: "usuario", rotulo: "Usuário" },
        { chave: "usuarioId", rotulo: "UID do usuário" },
        { chave: "nota", rotulo: "Nota" },
        { chave: "titulo", rotulo: "Título" },
        { chave: "comentario", rotulo: "Comentário" },
        ...CRITERIOS.map(c => ({
            rotulo: `Critério: ${c}`,
            valor: av => (av.criterios && av.criterios[c] != null ? av.criterios[c] : "")
        })),
        { rotulo: "Oculta pela moderação", valor: av => (av.moderado ? "sim" : "não") },
        { rotulo: "Criada em", valor: av => formatarDataHora(av.criadoEm) }
    ];
}

export const COLUNAS_EVENTOS = [
    { chave: "id", rotulo: "ID" },
    { chave: "nome", rotulo: "Nome" },
    { rotulo: "Data", valor: ev => formatarDataEvento(ev.data) },
    { chave: "local", rotulo: "Local" },
    { chave: "tema", rotulo: "Tema" },
    { chave: "tipo", rotulo: "Tipo" },
    { chave: "publicoAlvo", rotulo: "Público-alvo" },
    { rotulo: "Preço (R$)", valor: ev => (Number(ev.preco) || 0).toFixed(2).replace(".", ",") },
    { chave: "universidadeNome", rotulo: "Universidade" },
    { chave: "universidadeId", rotulo: "ID da universidade" },
    { rotulo: "Origem", valor: ev => (ev.legado ? "legado (events.json)" : "Firestore") }
];

export const COLUNAS_DENUNCIAS = [
    { chave: "id", rotulo: "ID" },
    { rotulo: "Tipo", valor: d => TIPOS_DENUNCIA[d.tipo] || d.tipo },
    { chave: "alvoId", rotulo: "ID do conteúdo" },
    { chave: "alvoPostId", rotulo: "ID do post (comentário)" },
    { rotulo: "Motivo", valor: d => rotuloMotivo(d.motivo) },
    { chave: "detalhe", rotulo: "Detalhe" },
    { chave: "denuncianteUid", rotulo: "UID do denunciante" },
    { chave: "status", rotulo: "Status" },
    { rotulo: "Criada em", valor: d => formatarDataHora(d.criadoEm) },
    { chave: "resolvidoPor", rotulo: "Resolvida por" },
    { rotulo: "Resolvida em", valor: d => formatarDataHora(d.resolvidoEm) }
];
