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
