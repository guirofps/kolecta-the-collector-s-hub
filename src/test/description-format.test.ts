import { describe, it, expect } from 'vitest';
import { formatarDescricao, temDescricao } from '@/lib/description-format';

// Texto real de um anúncio em produção, o que motivou este formatador.
const ALEX_PEREIRA = 'Alex Pereira (Poatan) Rookie Card (RC) nº 111 da coleção 2023 Panini Prizm UFC, autografada originalmente pelo próprio atleta. Diferenciais desta peça ✓ Rookie Card (RC) oficial de Alex Pereira. ✓ Coleção 2023 Panini Prizm UFC. ✓ Card nº 111. ✓ Autógrafo original realizado pelo próprio Alex "Poatan" Pereira diretamente na carta (ON-CARD). ✓ Excelente estado de conservação, sempre protegida desde o primeiro dia em penny sleeve e top loader.';

describe('formatação da descrição', () => {
  it('transforma os marcadores no meio da frase em lista', () => {
    const blocos = formatarDescricao(ALEX_PEREIRA);
    const lista = blocos.find((b) => b.tipo === 'lista');
    expect(lista).toBeDefined();
    expect(lista!.tipo === 'lista' && lista!.itens).toHaveLength(5);
  });

  it('mantém o texto de abertura como parágrafo, antes da lista', () => {
    const blocos = formatarDescricao(ALEX_PEREIRA);
    expect(blocos[0].tipo).toBe('paragrafo');
    expect(blocos[0].tipo === 'paragrafo' && blocos[0].texto)
      .toContain('Alex Pereira (Poatan) Rookie Card');
    expect(blocos[1].tipo).toBe('lista');
  });

  it('não perde conteúdo nem inventa texto', () => {
    const blocos = formatarDescricao(ALEX_PEREIRA);
    const junto = blocos
      .map((b) => (b.tipo === 'lista' ? b.itens.join(' ') : b.texto))
      .join(' ');
    // Trechos que precisam sobreviver à reorganização.
    expect(junto).toContain('ON-CARD');
    expect(junto).toContain('penny sleeve e top loader');
    expect(junto).toContain('2023 Panini Prizm UFC');
    expect(junto).not.toContain('✓');
  });

  it('respeita quebra de linha que o vendedor digitou', () => {
    const blocos = formatarDescricao('Primeiro parágrafo.\n\nSegundo parágrafo.');
    expect(blocos).toHaveLength(2);
    expect(blocos[0].tipo === 'paragrafo' && blocos[0].texto).toBe('Primeiro parágrafo.');
    expect(blocos[1].tipo === 'paragrafo' && blocos[1].texto).toBe('Segundo parágrafo.');
  });

  it('aceita hífen e asterisco como marcador', () => {
    const blocos = formatarDescricao('Inclui:\n- Caixa original\n- Manual\n- Certificado');
    const lista = blocos.find((b) => b.tipo === 'lista');
    expect(lista!.tipo === 'lista' && lista!.itens).toEqual([
      'Caixa original', 'Manual', 'Certificado',
    ]);
  });

  // Hífen no meio de número é medida, não item de lista.
  it('não confunde medida e prazo com item de lista', () => {
    const blocos = formatarDescricao('Envio em 1-2 dias úteis. Mede 3*4cm.');
    expect(blocos).toHaveLength(1);
    expect(blocos[0].tipo).toBe('paragrafo');
    expect(blocos[0].tipo === 'paragrafo' && blocos[0].texto)
      .toBe('Envio em 1-2 dias úteis. Mede 3*4cm.');
  });

  it('marcador solto não vira lista de um item', () => {
    const blocos = formatarDescricao('Peça rara. ✓ Lacrada.');
    expect(blocos.every((b) => b.tipo === 'paragrafo')).toBe(true);
  });

  it('normaliza espaço e linha em branco em excesso', () => {
    const blocos = formatarDescricao('Um    texto   assim.\n\n\n\n\nE outro.');
    expect(blocos).toHaveLength(2);
    expect(blocos[0].tipo === 'paragrafo' && blocos[0].texto).toBe('Um texto assim.');
  });

  it('aguenta vazio, nulo e só espaço', () => {
    expect(formatarDescricao('')).toEqual([]);
    expect(formatarDescricao(null)).toEqual([]);
    expect(formatarDescricao(undefined)).toEqual([]);
    expect(formatarDescricao('   \n\n  ')).toEqual([]);
    expect(temDescricao(null)).toBe(false);
    expect(temDescricao('Tem texto')).toBe(true);
  });

  it('funciona com vários marcadores diferentes na mesma descrição', () => {
    const blocos = formatarDescricao('Detalhes • Item um • Item dois → Item três');
    const lista = blocos.find((b) => b.tipo === 'lista');
    expect(lista!.tipo === 'lista' && lista!.itens.length).toBeGreaterThanOrEqual(3);
  });
});
