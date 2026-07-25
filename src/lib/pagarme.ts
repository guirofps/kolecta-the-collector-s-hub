/**
 * Tokenização de cartão no cliente (escopo PCI).
 *
 * O número do cartão NUNCA passa pelo backend da Kolecta: o formulário envia os
 * dados direto para a Pagar.me usando a CHAVE PÚBLICA (pk_...), que devolve um
 * `card_token` de uso único. Só o token vai para o nosso `/api/orders/checkout`.
 *
 * Endpoint: POST https://api.pagar.me/core/v5/tokens?appId=<public_key>
 */

const PAGARME_PUBLIC_KEY = import.meta.env.VITE_PAGARME_PUBLIC_KEY as
  | string
  | undefined;

const TOKENS_URL = 'https://api.pagar.me/core/v5/tokens';

/**
 * Cartão está FECHADO por padrão.
 *
 * A Pagar.me reprova por antifraude todas as cobranças no cartão — inclusive a
 * pré-autorização do lance, que é 100% cartão. Enquanto o limiar da conta não
 * for ajustado, a plataforma oferece só Pix.
 *
 * Precisa das duas coisas: a chave pública no build E o interruptor ligado
 * (`VITE_CARTAO_HABILITADO=true`). Fechar por omissão é de propósito — se a
 * variável sumir num redeploy, o pior caso é continuar só com Pix, e não voltar
 * a oferecer um pagamento que sempre falha.
 */
export const isCardPaymentEnabled =
  Boolean(PAGARME_PUBLIC_KEY) &&
  (import.meta.env.VITE_CARTAO_HABILITADO as string | undefined) === 'true';

export interface CardInput {
  /** Só dígitos. */
  number: string;
  holderName: string;
  /** "MM/AA" ou "MM/AAAA". */
  expiry: string;
  cvv: string;
}

/** Erro amigável de tokenização (mensagem já pronta para toast). */
export class CardTokenizationError extends Error {}

/** MM/AA(AA) → { month, year(4 dígitos) }. */
function parseExpiry(expiry: string): { month: number; year: number } {
  const digits = expiry.replace(/\D/g, '');
  const month = Number(digits.slice(0, 2));
  let year = Number(digits.slice(2));
  if (digits.length <= 4) year += 2000; // AA → 20AA
  return { month, year };
}

/**
 * Gera o token do cartão na Pagar.me. Lança `CardTokenizationError` com uma
 * mensagem pronta para exibir quando os dados são inválidos/recusados.
 */
export async function tokenizeCard(card: CardInput): Promise<string> {
  if (!PAGARME_PUBLIC_KEY) {
    throw new CardTokenizationError(
      'Pagamento com cartão indisponível no momento. Use PIX.',
    );
  }

  const { month, year } = parseExpiry(card.expiry);

  let res: Response;
  try {
    res = await fetch(
      `${TOKENS_URL}?appId=${encodeURIComponent(PAGARME_PUBLIC_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'card',
          card: {
            number: card.number.replace(/\D/g, ''),
            holder_name: card.holderName.trim(),
            exp_month: month,
            exp_year: year,
            cvv: card.cvv.replace(/\D/g, ''),
          },
        }),
      },
    );
  } catch {
    throw new CardTokenizationError(
      'Não foi possível validar o cartão. Verifique sua conexão e tente novamente.',
    );
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok || !body?.id) {
    // A Pagar.me devolve errors[] com o motivo (número inválido, etc).
    const detail =
      body?.errors?.[0]?.message ||
      body?.message ||
      'Dados do cartão inválidos.';
    throw new CardTokenizationError(detail);
  }

  return body.id as string;
}
