// Exportação de relatórios (RF08) sem dependências externas.
//  - CSV: separador vírgula, todos os campos entre aspas (aspas internas
//    duplicadas, RFC 4180), quebras de linha CRLF e BOM UTF-8 para o Excel
//    reconhecer acentos.
//  - PDF: feito pela impressão do navegador (ver src/app/admin/relatorio/page.js).

// Converte um valor qualquer em texto para a célula
function paraTexto(valor) {
    if (valor === null || valor === undefined) return "";
    if (typeof valor?.toDate === "function") return valor.toDate().toISOString(); // Timestamp do Firestore
    if (valor instanceof Date) return isNaN(valor) ? "" : valor.toISOString();
    if (typeof valor === "object") return JSON.stringify(valor);
    return String(valor);
}

function celula(valor) {
    let texto = paraTexto(valor);
    // Evita "injeção de fórmula" ao abrir no Excel/Sheets
    if (/^[=+\-@\t\r]/.test(texto)) texto = "'" + texto;
    return `"${texto.replace(/"/g, '""')}"`;
}

// colunas: [{ chave: "nome", rotulo: "Nome", valor?: (linha) => any }]
export function gerarCsv(linhas, colunas) {
    const cabecalho = colunas.map(c => celula(c.rotulo)).join(",");
    const corpo = (linhas || []).map(linha =>
        colunas.map(c => celula(c.valor ? c.valor(linha) : linha?.[c.chave])).join(",")
    );
    return [cabecalho, ...corpo].join("\r\n");
}

export function baixarArquivo(conteudo, nomeArquivo, tipo = "text/csv;charset=utf-8") {
    const blob = new Blob(["﻿", conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function baixarCsv(linhas, colunas, nomeBase) {
    const hoje = new Date().toISOString().slice(0, 10);
    baixarArquivo(gerarCsv(linhas, colunas), `${nomeBase}-${hoje}.csv`);
}
