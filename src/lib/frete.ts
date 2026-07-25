// Dados de envio: peso e dimensões do pacote.
//
// Eram opcionais, com uma "estimativa padrão de colecionável" quando ficavam em
// branco. Por isso tanto anúncio entrou sem: a maioria pulava o bloco. E a
// estimativa erra dos dois lados, sempre no bolso de alguém.
//
// Fonte única da validação, usada pelo wizard de criação e pela tela de edição.
// Separadas, a edição deixaria salvar o que a criação bloqueia, e o vendedor
// reprovado por frete incompleto reenviaria sem corrigir.

export interface DadosEnvio {
  weightGrams: string;
  widthCm: string;
  heightCm: string;
  lengthCm: string;
}

/** Número positivo? Aceita vírgula, recusa vazio, zero, negativo e texto. */
export function medidaValida(valor: string | number | null | undefined): boolean {
  if (valor === null || valor === undefined || valor === '') return false;
  const n = Number(String(valor).replace(',', '.'));
  return Number.isFinite(n) && n > 0;
}

/**
 * O que impede publicar, em texto pronto para mostrar. `null` quando está tudo
 * preenchido.
 *
 * Diz qual medida falta em vez de "preencha os dados de envio": com quatro
 * campos lado a lado, a mensagem genérica faz o vendedor procurar qual.
 */
export function freteFaltando(dados: DadosEnvio): string | null {
  if (!medidaValida(dados.weightGrams)) {
    return 'Informe o peso do pacote embalado, em gramas';
  }
  const faltando = [
    !medidaValida(dados.widthCm) && 'a largura',
    !medidaValida(dados.heightCm) && 'a altura',
    !medidaValida(dados.lengthCm) && 'o comprimento',
  ].filter(Boolean) as string[];

  if (faltando.length === 0) return null;
  return `Informe ${faltando.join(', ')} do pacote em cm`;
}

/**
 * Aviso da embalagem, em um lugar só para as duas telas dizerem o mesmo.
 *
 * O erro comum é medir a peça em vez do pacote. Miniatura pequena numa caixa
 * grande paga o preço da caixa, e quem descobre no balcão dos Correios já
 * vendeu pelo frete errado.
 */
export const AVISO_EMBALAGEM = {
  titulo: 'Meça a caixa fechada, pronta para postar',
  texto:
    'não a peça. Inclua plástico bolha, calço e a embalagem externa. Item pequeno numa caixa grande paga o preço da caixa.',
} as const;
