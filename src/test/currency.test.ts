import { describe, it, expect } from 'vitest';
import { parsePriceToCents } from '@/lib/currency';

describe('parsePriceToCents', () => {
  it('decimal com ponto (o que input type=number entrega) NAO infla', () => {
    // Bug antigo: "10.5" virava 10500 centavos (R$105,00).
    expect(parsePriceToCents('10.5')).toBe(1050);
    expect(parsePriceToCents('10.50')).toBe(1050);
    expect(parsePriceToCents('0.99')).toBe(99);
    expect(parsePriceToCents('189.9')).toBe(18990);
  });

  it('inteiros funcionam como antes', () => {
    expect(parsePriceToCents('10')).toBe(1000);
    expect(parsePriceToCents('1500')).toBe(150000);
  });

  it('formato BR com virgula continua aceito', () => {
    expect(parsePriceToCents('10,50')).toBe(1050);
    expect(parsePriceToCents('1.234,56')).toBe(123456);
  });

  it('recusa vazio, invalido e negativo', () => {
    expect(parsePriceToCents('')).toBeUndefined();
    expect(parsePriceToCents('   ')).toBeUndefined();
    expect(parsePriceToCents(null)).toBeUndefined();
    expect(parsePriceToCents(undefined)).toBeUndefined();
    expect(parsePriceToCents('abc')).toBeUndefined();
    expect(parsePriceToCents('-5')).toBeUndefined();
  });

  it('arredonda fracoes de centavo', () => {
    expect(parsePriceToCents('10.555')).toBe(1056);
  });
});
