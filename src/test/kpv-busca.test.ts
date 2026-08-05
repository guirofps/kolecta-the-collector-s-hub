import { describe, it, expect } from 'vitest';
import { termoBuscaExterna } from '@/lib/kpv-busca';
import { ehConjunto } from '@/lib/kpv-identidade';
import { candidatoServe } from '@/lib/kpv-fonte';
import type { IdentidadeKPV } from '@/lib/kpv-identidade';

/**
 * O diagnóstico mostrou que peça "invisível" no eBay na verdade existia: a
 * busca é que falhava, por estar em português e cheia de ruído. "Velozes e
 * Furiosos" dava zero; "Fast Furious" acha aos milhares.
 */
describe('termoBuscaExterna', () => {
  it('traduz o que o mercado global indexa em inglês', () => {
    expect(termoBuscaExterna('Hot Wheels', 'Velozes e Furiosos Dodge Charger'))
      .toBe('hot wheels fast furious dodge charger');
  });

  it('traduz cor, que o eBay escreve em inglês', () => {
    const t = termoBuscaExterna('Hot Wheels', 'Nissan Skyline azul');
    expect(t).toContain('blue');
    expect(t).not.toContain('azul');
  });

  it('tira o ruído que transforma título em frase', () => {
    const t = termoBuscaExterna('Hot Wheels', 'Chevrolet 1969 oficial da coleção pré venda');
    expect(t).toBe('hot wheels chevrolet 1969');
  });

  it('tira "edição limitada" e vira "limited"', () => {
    const t = termoBuscaExterna('Mini GT', 'Skyline GT-R edição limitada');
    expect(t).toContain('limited');
    expect(t).not.toMatch(/edi/);
  });

  it('não repete a marca quando ela também aparece no modelo', () => {
    const t = termoBuscaExterna('M2 Machines', 'machines gmc sierra 1996');
    expect(t.match(/machines/g)?.length).toBe(1);
  });

  it('mantém o termo curto: no máximo oito palavras', () => {
    const t = termoBuscaExterna('Hot Wheels', 'a b c d e f g h i j k l');
    expect(t.split(' ').length).toBeLessThanOrEqual(8);
  });

  it('inclui a linha específica quando o vendedor pôs o carro nela', () => {
    // Modelo quase vazio, carro no campo linha: a busca precisa da linha.
    const t = termoBuscaExterna('Minichamps', 'Mexico 1991', 'McLaren MP4/6 Senna');
    expect(t).toContain('mclaren');
    expect(t).toContain('senna');
  });

  it('ignora linha genérica que atrapalha a busca', () => {
    const t = termoBuscaExterna('Hot Wheels', 'Ford F-250', 'Temática');
    expect(t).not.toMatch(/tematica/);
  });
});

describe('ehConjunto', () => {
  it('reconhece kit de dois veículos descrito por extenso', () => {
    expect(ehConjunto('ford f 100 transportando um ford bronco')).toBe(true);
    expect(ehConjunto('gmc sierra uma van safari e um reboque')).toBe(true);
  });

  it('não confunde peça única com conjunto', () => {
    expect(ehConjunto('nissan skyline gt-r')).toBe(false);
    expect(ehConjunto('porsche 911 turbo')).toBe(false);
  });
});

const id = (over: Partial<IdentidadeKPV> = {}): IdentidadeKPV => ({
  marca: 'M2 Machines',
  modelo: 'ford f 100 custom 1970',
  variante: 'regular',
  escala: 'SO_1_64',
  linha: null,
  ...over,
});

/**
 * O casamento mais perigoso da varredura: um kit "F-100 transportando um
 * Bronco" batendo com um "M2 Hauler Fanta F-100". Mesmo veículo principal,
 * produtos diferentes. Conjunto só compara com conjunto.
 */
describe('candidatoServe: conjunto vs peça única', () => {
  it('recusa quando só um lado é conjunto', () => {
    const nossa = id({ modelo: 'ford f 100 1970 transportando um ford bronco' });
    const cand = id({ modelo: 'hauler fanta 1970 ford f 100' });
    expect(candidatoServe(nossa, cand).serve).toBe(false);
  });

  it('aceita quando nenhum dos dois é conjunto', () => {
    const nossa = id({ modelo: 'ford f 100 custom 1970' });
    const cand = id({ modelo: 'ford f 100 custom 1970' });
    expect(candidatoServe(nossa, cand).serve).toBe(true);
  });
});

/**
 * O carro no campo errado: vendedor pôs "McLaren MP4/6 Senna" na LINHA e deixou
 * o modelo como "Mexico 1991". Sem olhar a linha, o modelo não casa com o
 * anúncio certo do eBay. Enriquecer por linha, com max, resolve sem regressão.
 */
describe('candidatoServe: linha completa o modelo (carro no campo errado)', () => {
  const nossa: IdentidadeKPV = {
    marca: 'Minichamps', modelo: 'mexico 1991', variante: 'regular',
    escala: 'SO_1_18', linha: 'McLaren Honda MP4/6 Ayrton Senna',
  };
  const idMini = (over: Partial<IdentidadeKPV>): IdentidadeKPV => ({
    marca: 'Minichamps', modelo: '', variante: 'regular', escala: 'SO_1_18', linha: null, ...over,
  });

  it('casa o modelo fraco com o candidato via linha', () => {
    const cand = idMini({ modelo: 'mclaren mp4 6 senna 1991' });
    expect(candidatoServe(nossa, cand).serve).toBe(true);
  });

  it('não inventa match: candidato de outro carro segue recusado', () => {
    const cand = idMini({ modelo: 'ferrari f50 1995' });
    expect(candidatoServe(nossa, cand).serve).toBe(false);
  });
});
