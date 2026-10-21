// Converte qualquer valor de nota armazenado em um inteiro seguro entre 0 e 5.
// Evita RangeError em Array(n) quando a nota vem negativa, fracionada ou inválida.
export function notaSegura(nota) {
  return Math.max(0, Math.min(5, Math.round(Number(nota) || 0)));
}
