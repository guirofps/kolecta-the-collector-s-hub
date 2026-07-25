import { describe, it, expect } from 'vitest';
import { freteFaltando, medidaValida, AVISO_EMBALAGEM } from '@/lib/frete';

/**
 * Peso e dimensões eram opcionais e o wizard prometia "estimativa padrão de
 * colecionável" para quem deixasse em branco. Resultado: uma pilha de anúncios
 * sem dado de envio, e frete calculado por chute na hora da venda.
 */

const completo = { weightGrams: '300', widthCm: '16', heightCm: '6', lengthCm: '12' };

describe('medidaValida', () => {
  it('aceita número positivo, inclusive com vírgula', () => {
    expect(medidaValida('300')).toBe(true);
    expect(medidaValida('16,5')).toBe(true);
    expect(medidaValida(300)).toBe(true);
  });

  it('recusa vazio, zero, negativo e texto', () => {
    // Zero passava antes: o campo aceitava "0" e o frete saía de graça.
    expect(medidaValida('')).toBe(false);
    expect(medidaValida('0')).toBe(false);
    expect(medidaValida('-5')).toBe(false);
    expect(medidaValida('abc')).toBe(false);
    expect(medidaValida(null)).toBe(false);
    expect(medidaValida(undefined)).toBe(false);
  });
});

describe('freteFaltando', () => {
  it('libera quando está tudo preenchido', () => {
    expect(freteFaltando(completo)).toBeNull();
  });

  it('cobra o peso primeiro', () => {
    expect(freteFaltando({ ...completo, weightGrams: '' })).toMatch(/peso/i);
  });

  it('diz QUAL medida falta, não "preencha os dados de envio"', () => {
    // São quatro campos lado a lado: mensagem genérica faz procurar qual é.
    expect(freteFaltando({ ...completo, widthCm: '' })).toBe(
      'Informe a largura do pacote em cm',
    );
    expect(freteFaltando({ ...completo, heightCm: '' })).toMatch(/altura/);
    expect(freteFaltando({ ...completo, lengthCm: '' })).toMatch(/comprimento/);
  });

  it('junta as medidas quando falta mais de uma', () => {
    const msg = freteFaltando({ ...completo, widthCm: '', lengthCm: '' });
    expect(msg).toContain('a largura');
    expect(msg).toContain('o comprimento');
    expect(msg).not.toContain('a altura');
  });

  it('zero não passa por preenchido', () => {
    expect(freteFaltando({ ...completo, weightGrams: '0' })).toMatch(/peso/i);
    expect(freteFaltando({ ...completo, heightCm: '0' })).toMatch(/altura/);
  });
});

describe('aviso da embalagem', () => {
  it('manda medir o pacote, não a peça', () => {
    // O erro que motivou o aviso: item pequeno numa caixa grande, frete
    // calculado pela peça e prejuízo na postagem.
    const texto = `${AVISO_EMBALAGEM.titulo} ${AVISO_EMBALAGEM.texto}`;
    expect(texto).toMatch(/caixa fechada/i);
    expect(texto).toMatch(/não a peça/i);
    expect(texto).toMatch(/embalagem/i);
  });
});
