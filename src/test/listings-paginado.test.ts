import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '@/lib/api';

/**
 * A vitrine precisa do catálogo INTEIRO (o backend não filtra por categoria), e
 * um teto fixo escondia o que passava dele. `getAllPaged` busca página a página
 * até a API devolver uma página curta, sem limite: cobre qualquer tamanho de
 * catálogo, custando uma requisição a mais por página.
 */

const PAGE = 500;

// Simula a API: `total` itens, respondendo por limit/offset como o backend real.
function mockApiCom(total: number) {
  return vi.fn((url: string) => {
    const u = new URL(url, 'http://x');
    const limit = Number(u.searchParams.get('limit'));
    const offset = Number(u.searchParams.get('offset'));
    const fatia = Array.from(
      { length: Math.max(0, Math.min(limit, total - offset)) },
      (_, i) => ({ id: `l${offset + i}` }),
    );
    return Promise.resolve({ json: () => Promise.resolve({ data: fatia }), ok: true, status: 200 });
  });
}

beforeEach(() => {
  // getAllPaged usa o mesmo `request` → fetch. Interceptamos o fetch global.
  vi.stubGlobal('localStorage', {
    getItem: () => null, setItem: () => {}, removeItem: () => {},
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('getAllPaged', () => {
  it('traz tudo quando cabe numa página só', async () => {
    vi.stubGlobal('fetch', mockApiCom(300));
    const todos = await api.listings.getAllPaged(PAGE);
    expect(todos).toHaveLength(300);
  });

  it('junta várias páginas até a API acabar', async () => {
    // 657 = 500 + 157: duas páginas, a segunda curta encerra o laço.
    const fetchMock = mockApiCom(657);
    vi.stubGlobal('fetch', fetchMock);
    const todos = await api.listings.getAllPaged(PAGE);
    expect(todos).toHaveLength(657);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Sem id repetido: as páginas não se sobrepõem.
    expect(new Set(todos.map((l) => l.id)).size).toBe(657);
  });

  it('cresce com o catálogo: 2.100 itens = 5 páginas, sem esconder nada', async () => {
    const fetchMock = mockApiCom(2100);
    vi.stubGlobal('fetch', fetchMock);
    const todos = await api.listings.getAllPaged(PAGE);
    expect(todos).toHaveLength(2100);
    expect(fetchMock).toHaveBeenCalledTimes(5); // 500*4 + 100
  });

  it('catálogo exatamente múltiplo pede uma página a mais para saber que acabou', async () => {
    // 1000 = 500 + 500 + 0: a terceira volta vazia (curta) e encerra.
    const fetchMock = mockApiCom(1000);
    vi.stubGlobal('fetch', fetchMock);
    const todos = await api.listings.getAllPaged(PAGE);
    expect(todos).toHaveLength(1000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('trava de segurança impede laço infinito se a API nunca encurtar', async () => {
    // API sempre devolve página cheia (bug hipotético): o teto de páginas corta.
    const fetchSempreCheio = vi.fn((url: string) => {
      const limit = Number(new URL(url, 'http://x').searchParams.get('limit'));
      const fatia = Array.from({ length: limit }, (_, i) => ({ id: `x${i}` }));
      return Promise.resolve({ json: () => Promise.resolve({ data: fatia }), ok: true, status: 200 });
    });
    vi.stubGlobal('fetch', fetchSempreCheio);
    const todos = await api.listings.getAllPaged(PAGE, 3);
    expect(fetchSempreCheio).toHaveBeenCalledTimes(3); // parou no teto
    expect(todos.length).toBeGreaterThan(0);
  });
});
