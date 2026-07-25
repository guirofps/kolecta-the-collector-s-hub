import { describe, it, expect } from 'vitest';
import { isPubliclyVisible, onlyPublic } from '@/lib/listing-visibility';

/**
 * Regra: só `active` vai à vitrine pública.
 *
 * O bug que originou isto: as telas públicas mostravam o que a API devolvesse,
 * sem olhar o status. Anúncio recém-criado, ainda esperando moderação, aparecia
 * no perfil do vendedor. De fora parecia que tinha sido aprovado sozinho.
 */
describe('visibilidade pública do anúncio', () => {
  it('deixa passar o aprovado', () => {
    expect(isPubliclyVisible({ status: 'active' })).toBe(true);
  });

  it.each([
    'draft',
    'pending_review',
    'rejected',
    'cancelled',
    'paused',
    'sold',
  ])('esconde o status %s', (status) => {
    expect(isPubliclyVisible({ status })).toBe(false);
  });

  // O ponto da regra ser por permissão e não por negação: status novo que o
  // backend invente nasce escondido, que é o lado seguro de errar.
  it('esconde status desconhecido em vez de mostrar por engano', () => {
    expect(isPubliclyVisible({ status: 'algo_que_o_backend_inventou' })).toBe(false);
    expect(isPubliclyVisible({ status: '' })).toBe(false);
  });

  it('filtra a lista mantendo a ordem', () => {
    const lista = [
      { id: 'a', status: 'active' },
      { id: 'b', status: 'pending_review' },
      { id: 'c', status: 'active' },
      { id: 'd', status: 'draft' },
    ];
    expect(onlyPublic(lista).map((l) => l.id)).toEqual(['a', 'c']);
  });

  it('aguenta lista vazia', () => {
    expect(onlyPublic([])).toEqual([]);
  });
});

/**
 * Leilão parado não é vitrine.
 *
 * O acervo tem dezenas de leilões `active` com fim em 2099: criados junto do
 * anúncio e nunca iniciados. Eles passavam no filtro de status, apareciam com o
 * selo "Modo Lance" e, ao clicar, não havia lance a dar.
 */
describe('leilão na vitrine pública', () => {
  const base = {
    id: 'a1', sellerId: 's1', status: 'active', type: 'auction' as const,
    auctionStatus: 'active', condition: 'novo', title: 'Hot Wheels',
    images: null, createdAt: '2026-07-01T00:00:00Z',
  };

  it('leilão em andamento aparece', () => {
    const fim = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(onlyPublic([{ ...base, endsAt: fim } as never])).toHaveLength(1);
  });

  it('leilão nunca iniciado (2099) não aparece', () => {
    expect(onlyPublic([{ ...base, endsAt: '2099-01-01T00:00:00Z' } as never])).toHaveLength(0);
  });

  it('leilão encerrado não aparece', () => {
    const fim = new Date(Date.now() - 1000).toISOString();
    expect(onlyPublic([{ ...base, endsAt: fim } as never])).toHaveLength(0);
  });

  it('venda direta segue só pela regra de status', () => {
    // A regra nova não pode ter efeito colateral em quem não é leilão.
    expect(onlyPublic([{ ...base, type: 'direct', endsAt: null } as never])).toHaveLength(1);
  });
});
