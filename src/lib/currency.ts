/**
 * Formatação de moeda (BRL) — fonte única de verdade.
 *
 * ATENÇÃO À UNIDADE: esta função recebe o valor em **REAIS** (não centavos).
 * Valores vindos do backend/API estão em centavos (`*InCents`) — divida por 100
 * antes de passar aqui: `formatBRL(order.totalInCents / 100)`.
 */
export function formatBRL(reais: number): string {
  return (reais ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Converte o texto de um campo de preço para centavos.
 *
 * Aceita os dois formatos que podem chegar de um input:
 * - `type="number"`: o navegador SEMPRE entrega decimal com ponto ("10.5");
 * - texto livre em formato BR ("1.234,56").
 *
 * A regra: se houver vírgula, é formato BR (ponto = milhar). Sem vírgula, o
 * ponto é decimal. O bug antigo assumia sempre BR e transformava "10.5" em
 * 10500 centavos (R$105,00), inflando qualquer preço com centavos.
 *
 * Devolve `undefined` para entrada vazia/inválida/negativa, para o chamador
 * poder bloquear em vez de enviar lixo.
 */
export function parsePriceToCents(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const s = v.trim();
  if (!s) return undefined;

  const normalized = s.includes(',')
    ? s.replace(/\./g, '').replace(',', '.') // "1.234,56" -> "1234.56"
    : s; // "10.5" já é decimal com ponto

  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}
