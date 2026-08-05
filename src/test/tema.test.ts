import { describe, it, expect } from 'vitest';
import {
  normalizarTema, resolverTema, proximoTema, aplicarTema, rotuloTema, TEMAS,
} from '@/lib/tema';

describe('normalizar a escolha guardada', () => {
  it('aceita os três valores conhecidos', () => {
    for (const t of TEMAS) expect(normalizarTema(t)).toBe(t);
  });

  it('lixo no storage cai em "sistema" em vez de quebrar', () => {
    for (const v of [null, undefined, '', 'dark', 'noturno', 42, {}]) {
      expect(normalizarTema(v), String(v)).toBe('sistema');
    }
  });
});

describe('resolver o que vai para a tela', () => {
  it('escolha explícita ignora o aparelho', () => {
    expect(resolverTema('claro', true)).toBe('claro');
    expect(resolverTema('escuro', false)).toBe('escuro');
  });

  it('"sistema" segue o aparelho', () => {
    expect(resolverTema('sistema', true)).toBe('escuro');
    expect(resolverTema('sistema', false)).toBe('claro');
  });
});

describe('o que o botão faz', () => {
  it('alterna a partir do que está NA TELA, não da escolha guardada', () => {
    // Quem está em "sistema" com o aparelho no escuro vê o site escuro. O
    // clique tem que clarear. Se o botão olhasse só a escolha guardada, ele
    // mandaria para "escuro" e nada mudaria na tela.
    expect(proximoTema('sistema', true)).toBe('claro');
    expect(proximoTema('sistema', false)).toBe('escuro');
  });

  it('inverte a escolha explícita', () => {
    expect(proximoTema('claro', false)).toBe('escuro');
    expect(proximoTema('escuro', false)).toBe('claro');
  });

  it('clicar duas vezes volta ao ponto de partida', () => {
    for (const sistema of [true, false]) {
      const inicio = resolverTema('sistema', sistema);
      const um = proximoTema('sistema', sistema);
      const dois = proximoTema(um, sistema);
      expect(resolverTema(dois, sistema), `sistema=${sistema}`).toBe(inicio);
    }
  });
});

describe('aplicar no documento', () => {
  it('põe e tira a classe dark', () => {
    const el = document.createElement('html');
    aplicarTema('escuro', el);
    expect(el.classList.contains('dark')).toBe(true);
    aplicarTema('claro', el);
    expect(el.classList.contains('dark')).toBe(false);
  });

  it('ajusta color-scheme, senão campo e barra de rolagem vêm brancos', () => {
    const el = document.createElement('html');
    aplicarTema('escuro', el);
    expect(el.style.colorScheme).toBe('dark');
    aplicarTema('claro', el);
    expect(el.style.colorScheme).toBe('light');
  });

  it('aplicar duas vezes o mesmo tema não acumula nada', () => {
    const el = document.createElement('html');
    aplicarTema('escuro', el);
    aplicarTema('escuro', el);
    expect(el.className.split(/\s+/).filter((c) => c === 'dark')).toHaveLength(1);
  });
});

describe('rótulo do botão', () => {
  it('anuncia o DESTINO, não o estado atual', () => {
    // É a confusão clássica desse controle: a pessoa precisa saber para onde
    // o clique leva.
    expect(rotuloTema('escuro')).toMatch(/claro/);
    expect(rotuloTema('claro')).toMatch(/escuro/);
  });
});
