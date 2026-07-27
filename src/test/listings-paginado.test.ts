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

/**
 * Perfil da loja: o mesmo princípio, sem teto. Este endpoint devolve
 * `meta.totalPages`, então dá para ir até a última página com precisão, sem a
 * heurística de "página curta".
 */
describe('getAllListings (perfil da loja)', () => {
  function mockSeller(total: number, pageSize: number) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return vi.fn((url: string) => {
      const u = new URL(url, 'http://x');
      const page = Number(u.searchParams.get('page'));
      const limit = Number(u.searchParams.get('limit'));
      const inicio = (page - 1) * limit;
      const data = Array.from(
        { length: Math.max(0, Math.min(limit, total - inicio)) },
        (_, i) => ({ id: `s${inicio + i}` }),
      );
      return Promise.resolve({
        json: () => Promise.resolve({ data, meta: { page, limit, total, totalPages } }),
        ok: true, status: 200,
      });
    });
  }

  it('traz todos os anúncios do vendedor, além de uma página', async () => {
    // 75 no ar, páginas de 100: cabe numa página, mas o teste do multi-página
    // é o que importa. Uso pageSize pequeno para forçar várias.
    const fetchMock = mockSeller(75, 25);
    vi.stubGlobal('fetch', fetchMock);
    const todos = await api.sellers.getAllListings('vendedor-x', { pageSize: 25 });
    expect(todos).toHaveLength(75);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 25*3 = 75
    expect(new Set(todos.map((l) => l.id)).size).toBe(75);
  });

  it('para na última página pelo meta, sem pedir a mais', async () => {
    const fetchMock = mockSeller(12, 100);
    vi.stubGlobal('fetch', fetchMock);
    const todos = await api.sellers.getAllListings('vendedor-y');
    expect(todos).toHaveLength(12);
    expect(fetchMock).toHaveBeenCalledTimes(1); // totalPages=1, uma página só
  });
});
