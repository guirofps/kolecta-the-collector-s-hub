import { describe, it, expect } from 'vitest';
import {
  gerarTemplateCsv, lerCsv, validarLinha, validarPlanilha,
  lerPreco, lerFotos, COLUNAS,
} from '@/lib/import-listing';

/** Linha completa e válida, para os testes mudarem só o que interessa. */
const OK: Record<string, string> = {
  title: 'Hot Wheels Nissan Skyline GT-R R34 Premium',
  category: 'miniaturas-diecast',
  condition: 'novo-lacrado',
  description: 'Lacrado, nunca aberto. Card protegido desde o primeiro dia.',
  price: '149.90',
  images: 'https://s.com/1.jpg, https://s.com/2.jpg, https://s.com/3.jpg',
  brand: 'Hot Wheels',
  scale: '1:64',
  weight_grams: '150',
  width_cm: '15',
  height_cm: '10',
  length_cm: '5',
};

const errosDe = (over: Partial<Record<string, string>> = {}) =>
  validarLinha({ ...OK, ...over }, 2);

describe('modelo da planilha', () => {
  // A causa raiz dos 363 anúncios errados: o modelo antigo não pedia estes.
  it('pede os campos que o anúncio realmente precisa', () => {
    const chaves = COLUNAS.map((c) => c.chave);
    expect(chaves).toContain('category');
    expect(chaves).toContain('images');
    expect(chaves).toContain('weight_grams');
    expect(chaves).toContain('width_cm');
  });

  it('marca como obrigatório o que trava a publicação', () => {
    const obrig = COLUNAS.filter((c) => c.obrigatoria).map((c) => c.chave);
    for (const k of ['title', 'category', 'condition', 'description', 'price', 'images', 'weight_grams']) {
      expect(obrig, `${k} deveria ser obrigatório`).toContain(k);
    }
  });

  it('gera CSV com BOM, para o Excel não quebrar o acento', () => {
    const csv = gerarTemplateCsv();
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('category');
    // O vocabulário antigo não pode voltar a aparecer no modelo.
    expect(csv).not.toMatch(/\bmint\b/);
    expect(csv).toContain('novo-lacrado');
  });

  it('o próprio modelo passa na validação', () => {
    const linhas = lerCsv(gerarTemplateCsv());
    const r = validarPlanilha(linhas);
    expect(r.erros, JSON.stringify(r.erros)).toHaveLength(0);
    expect(r.validas).toBe(1);
  });
});

describe('SKU', () => {
  // Pedido dos lojistas: casar a venda aqui com o controle de estoque deles.
  it('existe na planilha, mas nunca como obrigatório', () => {
    const sku = COLUNAS.find((c) => c.chave === 'sku');
    expect(sku).toBeDefined();
    // Colecionador pessoa física não trabalha com SKU: exigir travaria ele.
    expect(sku!.obrigatoria).toBe(false);
  });

  it('planilha sem SKU continua válida', () => {
    expect(validarLinha({ ...OK, sku: '' }, 2)).toHaveLength(0);
  });

  it('planilha com SKU continua válida', () => {
    expect(validarLinha({ ...OK, sku: 'HW-R34-001' }, 2)).toHaveLength(0);
  });
});

describe('leitura do CSV', () => {
  it('não embaralha coluna quando a descrição tem vírgula', () => {
    const csv = 'title,description,price\n"Item bonito","Lacrado, sem uso, perfeito",99.90\n';
    const linhas = lerCsv(csv);
    expect(linhas[0].description).toBe('Lacrado, sem uso, perfeito');
    expect(linhas[0].price).toBe('99.90');
  });

  it('aceita ponto e vírgula, que é o padrão do Excel em PT-BR', () => {
    const linhas = lerCsv('title;price\nMeu item;10\n');
    expect(linhas[0].price).toBe('10');
  });

  it('descarta linha vazia do fim do arquivo', () => {
    expect(lerCsv('title,price\nItem,10\n\n\n')).toHaveLength(1);
  });
});

describe('validação da linha', () => {
  it('aceita a linha completa', () => {
    expect(errosDe()).toHaveLength(0);
  });

  it('cobra a categoria, que era o campo que faltava no modelo antigo', () => {
    const e = errosDe({ category: '' });
    expect(e.some((x) => x.campo === 'category')).toBe(true);
  });

  it('recusa o vocabulário antigo de condição', () => {
    // "mint" era o que o modelo antigo mandava usar.
    const e = errosDe({ condition: 'mint' });
    expect(e.some((x) => x.campo === 'condition')).toBe(true);
    expect(e.find((x) => x.campo === 'condition')!.mensagem).toContain('novo-lacrado');
  });

  it('exige o mínimo de fotos', () => {
    const e = errosDe({ images: 'https://s.com/1.jpg' });
    expect(e.some((x) => x.campo === 'images')).toBe(true);
  });

  it('exige peso e medidas, senão o frete sai errado', () => {
    const e = errosDe({ weight_grams: '', width_cm: '0' });
    expect(e.some((x) => x.campo === 'weight_grams')).toBe(true);
    expect(e.some((x) => x.campo === 'width_cm')).toBe(true);
  });

  it('cobra o campo obrigatório da categoria escolhida', () => {
    // Miniatura exige escala; card exige jogo.
    expect(errosDe({ scale: '' }).some((x) => x.campo === 'scale')).toBe(true);
    const card = errosDe({ category: 'cards-colecionaveis', jogo: '', brand: '', scale: '' });
    expect(card.some((x) => x.campo === 'jogo')).toBe(true);
    // E não pode cobrar escala de card, que a categoria nem pergunta.
    expect(card.some((x) => x.campo === 'scale')).toBe(false);
  });

  it('não cobra campo de categoria quando a categoria é inválida', () => {
    // Senão o vendedor vê 5 erros quando o problema é um só.
    const e = errosDe({ category: 'inexistente', brand: '', scale: '' });
    expect(e.filter((x) => x.campo === 'scale')).toHaveLength(0);
  });

  it('aponta a linha certa do arquivo', () => {
    const e = validarLinha({ ...OK, title: '' }, 7);
    expect(e[0].linha).toBe(7);
  });
});

describe('leitura de preço e fotos', () => {
  it.each([
    ['149.90', 149.9],
    ['149,90', 149.9],
    ['R$ 1.499,90', 1499.9],
  ])('lê o preço %s', (entrada, esperado) => {
    expect(lerPreco(entrada)).toBe(esperado);
  });

  it.each(['', '0', 'abc', '-5'])('recusa o preço %s', (entrada) => {
    expect(lerPreco(entrada)).toBeNull();
  });

  it('só aceita URL de verdade nas fotos', () => {
    expect(lerFotos('https://a.com/1.jpg, foto2.jpg, https://a.com/3.jpg')).toHaveLength(2);
  });
});

describe('validação da planilha', () => {
  it('separa o que está válido do que tem erro', () => {
    const r = validarPlanilha([OK, { ...OK, title: '' }, OK]);
    expect(r.totalLinhas).toBe(3);
    expect(r.validas).toBe(2);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0].linha).toBe(3); // 2ª linha de dados = linha 3 no Excel
  });
});
