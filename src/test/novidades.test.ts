import { describe, it, expect, beforeEach } from 'vitest';
import { AVISOS, jaViu, marcarVisto, proximoAviso } from '@/lib/novidades';

describe('aviso de novidade: uma vez por pessoa', () => {
  beforeEach(() => localStorage.clear());

  it('começa não visto', () => {
    expect(jaViu(AVISOS.tema)).toBe(false);
    expect(jaViu(AVISOS.kpv)).toBe(false);
  });

  it('depois de marcar, não aparece mais', () => {
    marcarVisto(AVISOS.tema);
    expect(jaViu(AVISOS.tema)).toBe(true);
    // O outro aviso não é afetado: cada um tem a sua chave.
    expect(jaViu(AVISOS.kpv)).toBe(false);
  });
});

describe('só um aviso na tela por vez', () => {
  beforeEach(() => localStorage.clear());

  it('o tema tem prioridade quando os dois estão pendentes', () => {
    // Cair direto num anúncio dispararia os dois. Dois balões apontando para
    // cantos diferentes é ruído; o tema (global) vem primeiro.
    expect(proximoAviso([AVISOS.tema, AVISOS.kpv])).toBe(AVISOS.tema);
  });

  it('visto o tema, a vez é do aviso do anúncio', () => {
    marcarVisto(AVISOS.tema);
    expect(proximoAviso([AVISOS.tema, AVISOS.kpv])).toBe(AVISOS.kpv);
  });

  it('nada pendente devolve null', () => {
    marcarVisto(AVISOS.tema);
    marcarVisto(AVISOS.kpv);
    expect(proximoAviso([AVISOS.tema, AVISOS.kpv])).toBeNull();
  });

  it('só oferece o que a página de fato tem', () => {
    // Uma página sem card de KPV não deve pedir o aviso do KPV.
    expect(proximoAviso([AVISOS.tema])).toBe(AVISOS.tema);
    marcarVisto(AVISOS.tema);
    expect(proximoAviso([AVISOS.tema])).toBeNull();
  });
});

describe('resistência a storage bloqueado', () => {
  it('sem localStorage, conta como já visto e não insiste', () => {
    const original = globalThis.localStorage;
    // Simula aba anônima com storage negado.
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('bloqueado'); },
    });
    try {
      expect(jaViu(AVISOS.tema)).toBe(true);
      expect(() => marcarVisto(AVISOS.tema)).not.toThrow();
      expect(proximoAviso([AVISOS.tema, AVISOS.kpv])).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true, value: original, writable: true,
      });
    }
  });
});
