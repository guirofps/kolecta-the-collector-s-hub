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
