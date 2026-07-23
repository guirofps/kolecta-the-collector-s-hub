import { describe, it, expect } from 'vitest';
import {
  CATEGORY_FIELDS, fieldsForCategory, subcategoriaField,
  normalizeSubcategoria, parseAttributes, formatFieldValue, isFieldApplicable,
} from '@/lib/category-fields';

const MINIS = CATEGORY_FIELDS['miniaturas-diecast'].find((f) => f.subcategoria)!.options!;

describe('campos por categoria', () => {
  it('toda categoria tem exatamente uma subcategoria', () => {
    for (const [slug, campos] of Object.entries(CATEGORY_FIELDS)) {
      const marcados = campos.filter((c) => c.subcategoria);
      expect(marcados, `${slug} deveria ter 1 subcategoria`).toHaveLength(1);
    }
  });

  it('toda subcategoria tem lista fechada com escape', () => {
    for (const slug of Object.keys(CATEGORY_FIELDS)) {
      const sub = subcategoriaField(slug)!;
      expect(sub.options, `${slug} sem opções`).toBeDefined();
      expect(sub.options!.length).toBeGreaterThan(3);
      // Sem uma saída, o vendedor com item fora da lista trava e não anuncia.
      expect(sub.options!.some((o) => /^Outr[ao]$/.test(o)), `${slug} sem "Outra"`).toBe(true);
    }
  });

  it('categoria desconhecida não quebra', () => {
    expect(fieldsForCategory('nao-existe')).toEqual([]);
    expect(fieldsForCategory(null)).toEqual([]);
    expect(subcategoriaField('nao-existe')).toBeNull();
  });
});

describe('normalização da subcategoria', () => {
  // Grafias reais tiradas do banco de produção.
  it.each([
    ['Hotweels', 'Hot Wheels'],
    ['Hotwheels', 'Hot Wheels'],
    ['Hot wells', 'Hot Wheels'],
    ['HOT WELLS', 'Hot Wheels'],
    ['Hot Wheels', 'Hot Wheels'],
    ['hot wheels', 'Hot Wheels'],
  ])('junta a grafia %s em %s', (entrada, esperado) => {
    expect(normalizeSubcategoria(entrada, MINIS)).toBe(esperado);
  });

  it('aceita variação de acento e caixa', () => {
    expect(normalizeSubcategoria('MAJORETTE', MINIS)).toBe('Majorette');
    expect(normalizeSubcategoria('majorette', MINIS)).toBe('Majorette');
  });

  it('acha a marca dentro do título colado no campo errado', () => {
    const colado = 'Miniatura Carro Ferrari 296 Gt3 71 2025 Shell Legends 1:41 Burago Cor Vermelho';
    expect(normalizeSubcategoria(colado, MINIS)).toBe('Bburago');
  });

  it('devolve null quando o valor não é uma marca conhecida', () => {
    // Montadora do carro, não fabricante da miniatura: o vendedor errou o campo.
    expect(normalizeSubcategoria('Mercedes-benz', MINIS)).toBeNull();
    expect(normalizeSubcategoria('Nissan', MINIS)).toBeNull();
    expect(normalizeSubcategoria('', MINIS)).toBeNull();
    expect(normalizeSubcategoria('   ', MINIS)).toBeNull();
  });

  it('nunca devolve o proprio "Outra" por engano', () => {
    expect(normalizeSubcategoria('qualquer coisa estranha', MINIS)).not.toBe('Outra');
  });
});

describe('leitura dos atributos', () => {
  it('aguenta JSON quebrado sem estourar', () => {
    expect(parseAttributes('{isso nao e json')).toEqual({});
    expect(parseAttributes(null)).toEqual({});
    expect(parseAttributes('[1,2,3]')).toEqual({});
  });

  it('formata lista e trata vazio como ausente', () => {
    expect(formatFieldValue(['Chase', 'Flocked'])).toBe('Chase, Flocked');
    expect(formatFieldValue([])).toBeNull();
    expect(formatFieldValue('  ')).toBeNull();
    expect(formatFieldValue(null)).toBeNull();
  });

  it('campo dependente só conta quando a condição bate', () => {
    const nota = CATEGORY_FIELDS['cards-colecionaveis'].find((f) => f.key === 'nota')!;
    expect(isFieldApplicable(nota, { gradada: 'Sim' })).toBe(true);
    expect(isFieldApplicable(nota, { gradada: 'Não' })).toBe(false);
    expect(isFieldApplicable(nota, {})).toBe(false);
  });
});
