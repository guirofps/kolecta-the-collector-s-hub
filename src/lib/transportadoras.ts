// Regras da escolha de transportadoras do vendedor.
//
// Separadas da tela porque a parte que engana está toda aqui: "nada marcado"
// significa TODAS, e não nenhuma. Uma lista vazia na tela pareceria o vendedor
// ter desligado o envio, quando na verdade é o estado de quem nunca abriu a aba.
//
// O backend valida de novo (ver sellers.service.ts). Isto aqui é para o vendedor
// enxergar o problema antes de clicar em salvar, não para confiar no navegador.

export interface TransportadoraDisponivel {
  id: number;
  carrier: string;
  service: string;
  /** Atende o país inteiro sem limitação de peso. */
  nacional: boolean;
  aviso: string | null;
}

/**
 * O que aparece marcado na tela.
 *
 * Lista vazia = não escolheu = a cotação usa todas. A tela precisa refletir
 * isso, senão o vendedor abre as configurações e vê tudo desmarcado achando que
 * está sem frete nenhum.
 */
export function marcadasNaTela(
  escolhidas: number[],
  disponiveis: TransportadoraDisponivel[],
): number[] {
  return escolhidas.length > 0 ? escolhidas : disponiveis.map((d) => d.id);
}

/**
 * Marca ou desmarca uma transportadora.
 *
 * Parte do que está VISÍVEL, não do que está gravado. Sem isso, desmarcar a
 * primeira em cima de uma lista vazia produziria outra lista vazia, que o
 * sistema lê como "todas", o clique não faria nada e o vendedor tentaria de
 * novo achando que a tela travou.
 */
export function alternarTransportadora(
  escolhidas: number[],
  disponiveis: TransportadoraDisponivel[],
  id: number,
  marcar: boolean,
): number[] {
  const base = marcadasNaTela(escolhidas, disponiveis);
  const nova = marcar ? [...base, id] : base.filter((x) => x !== id);
  return [...new Set(nova)];
}

/**
 * A seleção deixaria a loja invisível para quem mora longe?
 *
 * Só os Correios (PAC e SEDEX) atendem o país inteiro sem travas. Marcando só
 * regionais, o comprador de outro estado não vê frete, não consegue fechar a
 * compra e vai embora. Não aparece erro em tela nenhuma, dos dois lados: o
 * vendedor jura que a loja está no ar e não entende por que parou de vender.
 *
 * Lista vazia não é problema: significa "todas", e todas inclui os Correios.
 */
export function semCoberturaNacional(
  escolhidas: number[],
  disponiveis: TransportadoraDisponivel[],
): boolean {
  if (escolhidas.length === 0) return false;
  return !disponiveis.some((d) => d.nacional && escolhidas.includes(d.id));
}
