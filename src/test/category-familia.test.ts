import { describe, it, expect } from 'vitest';
import { resolverFamilia } from '@/lib/category-familia';

// Espelha o banco real: a categoria 'acessorios' tem id próprio (UUID), as
// demais têm id === slug.
const ID_ACESSORIOS = '4d13a9fe-1f5a-4cb3-be9f-dc36263a3814';
const idPorSlug = (s: string) =>
  s === 'acessorios' ? ID_ACESSORIOS : ['miniaturas-diecast', 'cards-colecionaveis'].includes(s) ? s : undefined;

const publicos = [
  { categoryId: 'miniaturas-diecast' },
  { categoryId: 'miniaturas-diecast' },
  { categoryId: 'miniaturas-diecast' },
  { categoryId: ID_ACESSORIOS },   // uma roda
  { categoryId: ID_ACESSORIOS },   // outra roda
  { categoryId: 'cards-colecionaveis' },
];

describe('resolverFamilia', () => {
  it('em Miniaturas, família miniaturas: lista miniaturas e mostra o seletor', () => {
    const v = resolverFamilia({ slug: 'miniaturas-diecast', familia: 'miniaturas', idPorSlug, publicos });
    expect(v.ehMiniaturas).toBe(true);
    expect(v.emAcessorios).toBe(false);
    expect(v.slugAtivo).toBe('miniaturas-diecast');
    expect(v.categoriaIdAtiva).toBe('miniaturas-diecast');
    expect(v.totalMiniaturas).toBe(3);
    expect(v.totalAcessorios).toBe(2);
    expect(v.mostrarSeletor).toBe(true);
  });

  it('em Miniaturas, família acessorios: troca id e slug para acessórios', () => {
    const v = resolverFamilia({ slug: 'miniaturas-diecast', familia: 'acessorios', idPorSlug, publicos });
    expect(v.emAcessorios).toBe(true);
    expect(v.slugAtivo).toBe('acessorios');
    expect(v.categoriaIdAtiva).toBe(ID_ACESSORIOS);
  });

  it('sem acessório publicado, não mostra o seletor nem entra em acessórios', () => {
    const soMinis = [{ categoryId: 'miniaturas-diecast' }];
    const v = resolverFamilia({ slug: 'miniaturas-diecast', familia: 'acessorios', idPorSlug, publicos: soMinis });
    expect(v.totalAcessorios).toBe(0);
    expect(v.mostrarSeletor).toBe(false);
    // Pediu acessórios, mas não há: cai de volta em miniaturas, nunca em branco.
    expect(v.emAcessorios).toBe(false);
    expect(v.categoriaIdAtiva).toBe('miniaturas-diecast');
  });

  it('fora de Miniaturas, a família não liga (nenhum seletor, sem acessórios)', () => {
    const v = resolverFamilia({ slug: 'cards-colecionaveis', familia: 'acessorios', idPorSlug, publicos });
    expect(v.ehMiniaturas).toBe(false);
    expect(v.emAcessorios).toBe(false);
    expect(v.mostrarSeletor).toBe(false);
    expect(v.categoriaIdAtiva).toBe('cards-colecionaveis');
  });

  it('categoria desconhecida não quebra', () => {
    const v = resolverFamilia({ slug: 'inexistente', familia: 'miniaturas', idPorSlug, publicos });
    expect(v.categoriaIdAtiva).toBeUndefined();
    expect(v.mostrarSeletor).toBe(false);
  });
});
