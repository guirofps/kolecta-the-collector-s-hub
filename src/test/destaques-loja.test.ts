import { describe, it, expect } from 'vitest';
import {
  MAX_DESTAQUES,
  alternarDestaque,
  destaquesAtivos,
  estaDestacado,
  separarDestaques,
} from '@/lib/destaques-loja';
import type { Listing } from '@/lib/api';

const anuncio = (id: string, storePinnedAt: string | null, status = 'active') =>
  ({ id, storePinnedAt, status }) as unknown as Listing;

describe('destaquesAtivos', () => {
  it('conta só o que está destacado E ativo', () => {
    const r = destaquesAtivos([
      anuncio('a', '2026-08-01'),
      anuncio('b', null),
      anuncio('c', '2026-08-02', 'paused'),
      anuncio('d', '2026-08-03', 'sold'),
    ]);
    expect(r.map((x) => x.id)).toEqual(['a']);
  });

  // O item pausado mantém a marca no banco (volta destacado se for reativado),
  // mas não pode ocupar vaga: senão o vendedor vê "4/4" contando itens que a
  // loja nem mostra e não consegue destacar mais nada.
  it('destacado que foi pausado não ocupa vaga', () => {
    const lista = [
      anuncio('a', '1'),
      anuncio('b', '2'),
      anuncio('c', '3'),
      anuncio('d', '4', 'paused'),
    ];
    expect(destaquesAtivos(lista).length).toBe(3);
  });
});

describe('estaDestacado', () => {
  it('lê a marca do anúncio', () => {
    expect(estaDestacado(anuncio('a', '2026-08-01'))).toBe(true);
    expect(estaDestacado(anuncio('a', null))).toBe(false);
  });
});

describe('separarDestaques', () => {
  const loja = [
    anuncio('p1', '2026-08-01'),
    anuncio('p2', '2026-08-02'),
    anuncio('p3', null),
    anuncio('p4', null),
  ];

  it('sem filtro: faixa com os fixados, grade com o resto', () => {
    const r = separarDestaques(loja, loja, false);
    expect(r.mostrarFaixa).toBe(true);
    expect(r.destaques.map((x) => x.id)).toEqual(['p1', 'p2']);
    expect(r.grade.map((x) => x.id)).toEqual(['p3', 'p4']);
  });

  it('nenhum destaque: sem faixa, grade inteira', () => {
    const semFixo = [anuncio('p3', null), anuncio('p4', null)];
    const r = separarDestaques(semFixo, semFixo, false);
    expect(r.mostrarFaixa).toBe(false);
    expect(r.grade.length).toBe(2);
  });

  // Filtrando, a faixa some e os destaques VOLTAM para a grade — não podem
  // sumir da tela só porque o comprador buscou.
  it('filtrando: sem faixa e nada se perde', () => {
    const filtrados = [anuncio('p1', '2026-08-01')];
    const r = separarDestaques(loja, filtrados, true);
    expect(r.mostrarFaixa).toBe(false);
    expect(r.grade.map((x) => x.id)).toEqual(['p1']);
  });

  it('loja inteira destacada: grade vazia, sem repetir card', () => {
    const tudoFixo = [anuncio('p1', '1'), anuncio('p2', '2')];
    const r = separarDestaques(tudoFixo, tudoFixo, false);
    expect(r.destaques.length).toBe(2);
    expect(r.grade).toEqual([]);
  });

  // A faixa sai na ordem em que o backend mandou (fixados primeiro, na ordem
  // que o vendedor arrastou) — o front não reordena por conta própria.
  it('preserva a ordem que veio da API', () => {
    const vindos = [anuncio('b', '2'), anuncio('a', '1'), anuncio('c', null)];
    const r = separarDestaques(vindos, vindos, false);
    expect(r.destaques.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('alternarDestaque', () => {
  it('acrescenta quem não estava', () => {
    expect(alternarDestaque(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('remove quem já estava', () => {
    expect(alternarDestaque(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('recusa passar do máximo', () => {
    const cheio = ['a', 'b', 'c', 'd'].slice(0, MAX_DESTAQUES);
    expect(alternarDestaque(cheio, 'novo')).toBeNull();
  });

  // Estando cheio, ainda tem que dar para TIRAR — senão o vendedor fica preso
  // com quatro destaques e nenhuma saída.
  it('mesmo cheio, sempre dá para desafixar', () => {
    const cheio = ['a', 'b', 'c', 'd'].slice(0, MAX_DESTAQUES);
    expect(alternarDestaque(cheio, cheio[0])).toEqual(cheio.slice(1));
  });

  it('não duplica id', () => {
    const r = alternarDestaque(['a'], 'a');
    expect(r).toEqual([]);
  });
});
