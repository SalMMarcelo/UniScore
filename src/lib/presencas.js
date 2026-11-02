// Presença verificada por check-in com QR (contrato em docs/checkin-presenca.md).
//
// Documentos:
//  - eventos/{eventoId}/privado/checkin: segredo do check-in { codigo, ativo, expiraEm, atualizadoEm }.
//    Só a universidade dona do evento (e moderadores) lê e grava.
//  - presencas/{eventoId}_{uid}: presença confirmada { eventoId, usuarioId, codigo, criadoEm }.
//    Criada pelo próprio participante com o código lido no QR; as regras conferem o código,
//    se o check-in está ativo e se ainda não expirou.

import { auth, db } from "../firebase";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    getCountFromServer,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TAMANHO_CODIGO = 24;
export const FORMATO_CODIGO = /^[A-Za-z0-9]{16,64}$/;

// Erros de registrarPresenca, traduzidos na interface (checkin.erros.<codigo>)
export const ERROS_PRESENCA = {
    CODIGO_INVALIDO: "codigo-invalido",
    CHECKIN_ENCERRADO: "checkin-encerrado",
    NAO_LOGADO: "nao-logado"
};

function refCheckin(eventoId) {
    return doc(db, "eventos", String(eventoId), "privado", "checkin");
}

export function idPresenca(eventoId, uid) {
    return `${eventoId}_${uid}`;
}

function paraDate(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return valor;
    if (typeof valor.toDate === "function") return valor.toDate();
    const data = new Date(valor);
    return isNaN(data) ? null : data;
}

// Código aleatório de 24 caracteres [A-Za-z0-9] (crypto.getRandomValues, sem viés de módulo)
export function gerarCodigo() {
    const limite = 256 - (256 % ALFABETO.length);
    let codigo = "";
    while (codigo.length < TAMANHO_CODIGO) {
        const bytes = new Uint8Array(TAMANHO_CODIGO * 2);
        crypto.getRandomValues(bytes);
        for (const b of bytes) {
            if (b < limite) codigo += ALFABETO[b % ALFABETO.length];
            if (codigo.length === TAMANHO_CODIGO) break;
        }
    }
    return codigo;
}

// Validade padrão: fim do dia seguinte à data do evento ("YYYY-MM-DD"), no fuso local.
// Sem data válida, fim do dia seguinte a hoje.
export function validadePadrao(dataEvento) {
    const m = typeof dataEvento === "string" && dataEvento.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const base = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, 23, 59, 59);
}

// { codigo, ativo, expiraEm: Date } ou null se o check-in nunca foi configurado.
// Só a universidade dona do evento (ou moderador) consegue ler.
export async function obterCheckin(eventoId) {
    const snap = await getDoc(refCheckin(eventoId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
        codigo: typeof d.codigo === "string" ? d.codigo : "",
        ativo: d.ativo === true,
        expiraEm: paraDate(d.expiraEm)
    };
}

// Cria ou atualiza o check-in. Sem `codigo`, mantém o atual (ou gera um, se ainda não houver).
// Devolve o check-in salvo: { codigo, ativo, expiraEm }.
export async function salvarCheckin(eventoId, { ativo, expiraEm, codigo } = {}) {
    let codigoFinal = codigo;
    if (!codigoFinal) {
        const atual = await obterCheckin(eventoId);
        codigoFinal = atual && FORMATO_CODIGO.test(atual.codigo) ? atual.codigo : gerarCodigo();
    }
    const validade = paraDate(expiraEm);
    if (!validade) throw new Error("expiraEm invalido");
    // Documento inteiro (set sem merge): as regras exigem exatamente estes campos
    await setDoc(refCheckin(eventoId), {
        codigo: codigoFinal,
        ativo: ativo === true,
        expiraEm: Timestamp.fromDate(validade),
        atualizadoEm: serverTimestamp()
    });
    return { codigo: codigoFinal, ativo: ativo === true, expiraEm: validade };
}

// Gera um código novo (o anterior deixa de valer), mantendo ativo e validade
export async function rotacionarCodigo(eventoId) {
    const atual = await obterCheckin(eventoId);
    return salvarCheckin(eventoId, {
        ativo: atual ? atual.ativo : false,
        expiraEm: (atual && atual.expiraEm) || validadePadrao(null),
        codigo: gerarCodigo()
    });
}

// Endereço aberto pelo QR
export function urlCheckin(eventoId, codigo, origem = typeof window !== "undefined" ? window.location.origin : "") {
    const params = new URLSearchParams({ evento: String(eventoId), c: String(codigo) });
    return `${origem}/checkin?${params.toString()}`;
}

function erroPresenca(codigo) {
    const err = new Error(codigo);
    err.code = codigo;
    return err;
}

// Lê a presença do próprio usuário. Documento inexistente pode ser negado pelas regras
// (resource == null); nesse caso conta como "sem presença".
async function lerPresenca(eventoId, uid) {
    try {
        const snap = await getDoc(doc(db, "presencas", idPresenca(eventoId, uid)));
        return snap.exists() ? snap.data() : null;
    } catch (err) {
        if (err && err.code === "permission-denied") return null;
        throw err;
    }
}

// Grava presencas/{eventoId}_{uid}. Presença já existente conta como sucesso.
// Erros (err.code): "nao-logado", "codigo-invalido" (QR malformado) e "checkin-encerrado"
// (as regras recusaram: código trocado, check-in inativo ou expirado; o participante não lê o
// segredo, então a interface não distingue esses casos).
export async function registrarPresenca(eventoId, codigo) {
    const user = auth.currentUser;
    if (!user) throw erroPresenca(ERROS_PRESENCA.NAO_LOGADO);
    const id = String(eventoId || "");
    if (!id || id.includes("/") || !FORMATO_CODIGO.test(String(codigo || ""))) {
        throw erroPresenca(ERROS_PRESENCA.CODIGO_INVALIDO);
    }

    if (await lerPresenca(id, user.uid)) return { jaExistia: true };

    try {
        await setDoc(doc(db, "presencas", idPresenca(id, user.uid)), {
            eventoId: id,
            usuarioId: user.uid,
            codigo: String(codigo),
            criadoEm: serverTimestamp()
        });
    } catch (err) {
        if (err && err.code === "permission-denied") {
            // Corrida: outra aba pode ter gravado a presença (atualizar é proibido)
            if (await lerPresenca(id, user.uid)) return { jaExistia: true };
            throw erroPresenca(ERROS_PRESENCA.CHECKIN_ENCERRADO);
        }
        throw err;
    }
    return { jaExistia: false };
}

// O usuário tem presença confirmada no evento?
export async function temPresenca(eventoId, uid) {
    if (!eventoId || !uid) return false;
    try {
        return !!(await lerPresenca(String(eventoId), uid));
    } catch (err) {
        console.error("Erro ao verificar presença:", err);
        return false;
    }
}

// Número de presenças confirmadas no evento (universidade dona e moderadores)
export async function contarPresencas(eventoId) {
    const snap = await getCountFromServer(
        query(collection(db, "presencas"), where("eventoId", "==", String(eventoId)))
    );
    return snap.data().count;
}
