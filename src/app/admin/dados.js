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
    getAggregateFromServer,
    average,
    writeBatch
} from "firebase/firestore";
import { listarEventos } from "../../lib/eventos";
import { contar, avaliacoesPorTema } from "../../lib/estatisticas";
import { contadores } from "../../lib/forum";
import { rotuloMotivo, rotuloTipoDenuncia } from "../../lib/denuncias";
import { tPadrao, criarFormatadores, IDIOMA_PADRAO } from "../../i18n/traduzir";

// `idioma`: locale do Intl (padrão pt-BR). Na interface, passe o idioma ativo.
export function formatarDataHora(valor, idioma = IDIOMA_PADRAO) {
    if (!valor) return "";
    return criarFormatadores(idioma).formatarDataHora(valor);
}

export function formatarDataEvento(data, idioma = IDIOMA_PADRAO) {
    if (!data || typeof data !== "string") return "";
    return criarFormatadores(idioma).formatarData(data) || data;
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

    const porTema = await avaliacoesPorTema(eventos);

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

// Cabeçalhos/valores traduzidos por `t`; datas no `idioma` (padrão pt-BR).
// Os valores gravados (tema, tipo, público, status) saem como estão no banco.
export function colunasAvaliacoes(nomesEventos = {}, t = tPadrao, idioma = IDIOMA_PADRAO) {
    return [
        { chave: "id", rotulo: t("admin.csv.id") },
        { chave: "eventoId", rotulo: t("admin.csv.idEvento") },
        { rotulo: t("admin.csv.evento"), valor: av => nomesEventos[av.eventoId] || "" },
        { chave: "universidadeId", rotulo: t("admin.csv.idUniversidade") },
        { chave: "usuario", rotulo: t("admin.csv.usuario") },
        { chave: "usuarioId", rotulo: t("admin.csv.uidUsuario") },
        { chave: "nota", rotulo: t("admin.csv.nota") },
        { chave: "titulo", rotulo: t("admin.csv.titulo") },
        { chave: "comentario", rotulo: t("admin.csv.comentario") },
        ...CRITERIOS.map(c => ({
            rotulo: t("admin.csv.criterio", { criterio: c }),
            valor: av => (av.criterios && av.criterios[c] != null ? av.criterios[c] : "")
        })),
        { rotulo: t("admin.csv.ocultaModeracao"), valor: av => (av.moderado ? t("comum.sim") : t("comum.nao")) },
        { rotulo: t("admin.csv.criadaEm"), valor: av => formatarDataHora(av.criadoEm, idioma) }
    ];
}

export function colunasEventos(t = tPadrao, idioma = IDIOMA_PADRAO) {
    return [
        { chave: "id", rotulo: t("admin.csv.id") },
        { chave: "nome", rotulo: t("admin.csv.nome") },
        { rotulo: t("admin.csv.data"), valor: ev => formatarDataEvento(ev.data, idioma) },
        { chave: "local", rotulo: t("admin.csv.local") },
        { chave: "tema", rotulo: t("admin.csv.tema") },
        { chave: "tipo", rotulo: t("admin.csv.tipo") },
        { chave: "publicoAlvo", rotulo: t("admin.csv.publicoAlvo") },
        { rotulo: t("admin.csv.preco"), valor: ev => criarFormatadores(idioma).formatarNumero(Number(ev.preco) || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }) },
        { chave: "universidadeNome", rotulo: t("admin.csv.universidade") },
        { chave: "universidadeId", rotulo: t("admin.csv.idUniversidade") },
        { rotulo: t("admin.csv.origem"), valor: ev => (ev.legado ? t("admin.csv.origemLegado") : t("admin.csv.origemFirestore")) }
    ];
}

export function colunasDenuncias(t = tPadrao, idioma = IDIOMA_PADRAO) {
    return [
        { chave: "id", rotulo: t("admin.csv.id") },
        { rotulo: t("admin.csv.tipo"), valor: d => rotuloTipoDenuncia(d.tipo, t) },
        { chave: "alvoId", rotulo: t("admin.csv.idConteudo") },
        { chave: "alvoPostId", rotulo: t("admin.csv.idPost") },
        { rotulo: t("admin.csv.motivo"), valor: d => rotuloMotivo(d.motivo, t) },
        { chave: "detalhe", rotulo: t("admin.csv.detalhe") },
        { chave: "denuncianteUid", rotulo: t("admin.csv.uidDenunciante") },
        { chave: "status", rotulo: t("admin.csv.status") },
        { rotulo: t("admin.csv.criadaEm"), valor: d => formatarDataHora(d.criadoEm, idioma) },
        { chave: "resolvidoPor", rotulo: t("admin.csv.resolvidaPor") },
        { rotulo: t("admin.csv.resolvidaEm"), valor: d => formatarDataHora(d.resolvidoEm, idioma) }
    ];
}

// Versões em pt-BR (compatibilidade)
export const COLUNAS_EVENTOS = colunasEventos();
export const COLUNAS_DENUNCIAS = colunasDenuncias();

// Grava totalCurtidas/totalComentarios nos posts sem contadores ou com
// contadores errados (posts anteriores à ordenação no servidor, que ficam
// de fora de "mais curtidos" e "mais comentados" até terem os campos).
// Devolve quantos posts foram corrigidos.
export async function recalcularContadoresForum() {
    const snap = await getDocs(collection(db, "forumPosts"));
    const pendentes = snap.docs.filter(d => {
        const certo = contadores(d.data());
        return d.data().totalCurtidas !== certo.totalCurtidas
            || d.data().totalComentarios !== certo.totalComentarios;
    });
    // Lotes de até 500 escritas (limite do Firestore)
    for (let i = 0; i < pendentes.length; i += 500) {
        const batch = writeBatch(db);
        pendentes.slice(i, i + 500).forEach(d => batch.update(d.ref, contadores(d.data())));
        await batch.commit();
    }
    return pendentes.length;
}
