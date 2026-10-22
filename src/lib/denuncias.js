// Denúncias de conteúdo (RF07).
//
// Coleção "denuncias" (regras em firestore.rules, bloco /denuncias):
// { tipo: 'post' | 'comentario' | 'avaliacao', alvoId, alvoPostId (só comentario),
//   motivo, detalhe (opcional, até 500), denuncianteUid, criadoEm (serverTimestamp),
//   status: 'aberta' | 'resolvida' | 'descartada', resolvidoPor, resolvidoEm }
//
// O id do documento é `${tipo}_${alvoId}_${uid}` (exigido pelas regras), então
// cada usuário só denuncia o mesmo conteúdo uma vez. Usuários comuns não podem
// ler denúncias; só moderadores (isModerator()).

import { db } from "../firebase";
import { doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { tPadrao } from "../i18n/traduzir";

// `valor` é gravado; `rotulo` é o texto pt-BR. Na interface use
// rotuloMotivo(valor, t) / rotuloTipoDenuncia(tipo, t) (chaves valores.*).
export const MOTIVOS = [
    { valor: "ofensivo", rotulo: "Conteúdo ofensivo" },
    { valor: "spam", rotulo: "Spam ou propaganda" },
    { valor: "discriminacao", rotulo: "Discriminação ou discurso de ódio" },
    { valor: "informacao_falsa", rotulo: "Informação falsa" },
    { valor: "outro", rotulo: "Outro motivo" }
];

export const LIMITE_DETALHE = 500;

export const TIPOS_DENUNCIA = {
    post: "Post do fórum",
    comentario: "Comentário do fórum",
    avaliacao: "Avaliação"
};

export function rotuloMotivo(valor, t = tPadrao) {
    const motivo = MOTIVOS.find(m => m.valor === valor);
    return motivo ? t(`valores.motivosDenuncia.${motivo.valor}`) : valor || "";
}

export function rotuloTipoDenuncia(tipo, t = tPadrao) {
    return TIPOS_DENUNCIA[tipo] ? t(`valores.tiposDenuncia.${tipo}`) : tipo || "";
}

// Erro com chave de tradução (err.chaveI18n) para a interface traduzir
function erroTraduzivel(chave) {
    const err = new Error(tPadrao(chave));
    err.chaveI18n = chave;
    return err;
}

// Mantém só caracteres aceitos pelas regras em alvoId/alvoPostId: [A-Za-z0-9_-]
function limparId(valor) {
    return String(valor || "").replace(/[^A-Za-z0-9_-]/g, "");
}

// Chave estável de um comentário dentro de forumPosts.comentarios.
// Comentários não têm id próprio; usamos autorUid + instante de criação
// (gravado em ISO por src/app/forum/page.js). Sem data válida, cai no índice.
export function chaveComentario(comentario, indice) {
    const ms = Date.parse(comentario?.criadoEm);
    const autor = limparId(comentario?.autorUid) || "anon";
    return Number.isFinite(ms) ? `${autor}-${ms}` : `idx${indice}`;
}

// Localiza o índice de um comentário pela chave (ou -1)
export function indiceComentario(comentarios, chave) {
    if (!Array.isArray(comentarios)) return -1;
    return comentarios.findIndex((c, i) => chaveComentario(c, i) === chave);
}

export function idDenuncia(tipo, alvoId, uid) {
    return `${tipo}_${alvoId}_${uid}`;
}

// Lembrança local (só conveniência de UI) das denúncias já enviadas neste navegador
const CHAVE_LOCAL = "uniscore:denuncias-enviadas";

function lerEnviadas() {
    try {
        const bruto = window.localStorage.getItem(CHAVE_LOCAL);
        const lista = bruto ? JSON.parse(bruto) : [];
        return Array.isArray(lista) ? lista : [];
    } catch (_) {
        return [];
    }
}

function lembrarEnviada(id) {
    try {
        const lista = lerEnviadas();
        if (!lista.includes(id)) {
            lista.push(id);
            window.localStorage.setItem(CHAVE_LOCAL, JSON.stringify(lista.slice(-500)));
        }
    } catch (_) {}
}

export function jaDenunciadoLocalmente(id) {
    return lerEnviadas().includes(id);
}

// Envia uma denúncia. Retorna "enviada" ou "duplicada".
// Lança erro em outras falhas (rede, dados inválidos...).
export async function enviarDenuncia({ uid, tipo, alvoId, alvoPostId, motivo, detalhe }) {
    if (!uid) throw erroTraduzivel("erros.denuncia.precisaLogin");
    if (!TIPOS_DENUNCIA[tipo]) throw erroTraduzivel("erros.denuncia.tipoInvalido");
    if (!MOTIVOS.some(m => m.valor === motivo)) throw erroTraduzivel("erros.denuncia.escolhaMotivo");

    const alvo = limparId(alvoId);
    if (!alvo) throw erroTraduzivel("erros.denuncia.conteudoInvalido");

    const dados = {
        tipo,
        alvoId: alvo,
        motivo,
        denuncianteUid: uid,
        criadoEm: serverTimestamp(),
        status: "aberta"
    };
    if (tipo === "comentario") dados.alvoPostId = limparId(alvoPostId);
    const texto = String(detalhe || "").trim().slice(0, LIMITE_DETALHE);
    if (texto) dados.detalhe = texto;

    const id = idDenuncia(tipo, alvo, uid);
    try {
        await setDoc(doc(db, "denuncias", id), dados);
        lembrarEnviada(id);
        return "enviada";
    } catch (err) {
        // Se o documento já existe, o setDoc vira "update", que as regras
        // negam a não moderadores: é o caso "já denunciado".
        // (Os dados foram validados acima, então permission-denied aqui
        // quase sempre significa denúncia repetida.)
        if (err?.code === "permission-denied") {
            lembrarEnviada(id);
            return "duplicada";
        }
        throw err;
    }
}

// Moderadores: marca várias denúncias como 'resolvida' ou 'descartada'
export async function fecharDenuncias(ids, status, emailModerador) {
    if (!ids?.length) return;
    const batch = writeBatch(db);
    ids.forEach(id => {
        batch.update(doc(db, "denuncias", id), {
            status,
            resolvidoPor: emailModerador || null,
            resolvidoEm: serverTimestamp()
        });
    });
    await batch.commit();
}
