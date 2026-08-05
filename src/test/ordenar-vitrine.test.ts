import { describe, it, expect } from 'vitest';
import { ordenarPorPosicao } from '@/lib/ordenar-vitrine';

const item = (id: string, position: number | null, createdAt: string) =>
  ({ id, position, createdAt });

describe('ordenarPorPosicao', () => {
  it('quem tem posição vem primeiro, do menor para o maior', () => {
    const r = ordenarPorPosicao([
      item('c', 2, '2026-01-01'),
      item('a', 0, '2026-01-01'),
      item('b', 1, '2026-01-01'),
    ]);
    expect(r.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('quem não foi ordenado (position null) cai no fim', () => {
    const r = ordenarPorPosicao([
      item('sem', null, '2026-05-01'),
      item('com', 5, '2020-01-01'),
    ]);
    expect(r.map((x) => x.id)).toEqual(['com', 'sem']);
  });

  it('entre os sem posição, o mais recente vem antes', () => {
    const r = ordenarPorPosicao([
      item('velho', null, '2026-01-01'),
      item('novo', null, '2026-08-01'),
    ]);
    expect(r.map((x) => x.id)).toEqual(['novo', 'velho']);
  });

  it('não muta o array original', () => {
    const entrada = [item('b', 1, 'x'), item('a', 0, 'x')];
    const copia = [...entrada];
    ordenarPorPosicao(entrada);
    expect(entrada).toEqual(copia);
  });
});
