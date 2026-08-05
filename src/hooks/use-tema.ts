import { useCallback, useEffect, useState } from 'react';
import {
  CHAVE_TEMA, aplicarTema, normalizarTema, proximoTema, resolverTema,
  type Tema, type TemaEfetivo,
} from '@/lib/tema';

const CONSULTA = '(prefers-color-scheme: dark)';

function prefereEscuro(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(CONSULTA).matches;
}

function lerEscolha(): Tema {
  try {
    return normalizarTema(localStorage.getItem(CHAVE_TEMA));
  } catch {
    // Navegação anônima com storage bloqueado não pode derrubar o site.
    return 'sistema';
  }
}

/**
 * Tema claro/escuro com persistência.
 *
 * Enquanto a pessoa está em "sistema", o site ACOMPANHA a troca do aparelho ao
 * vivo: quem tem o celular no modo automático vê o site escurecer junto com o
 * resto às seis da tarde, sem recarregar. Depois de escolher explicitamente,
 * a escolha manda e o aparelho é ignorado.
 */
export function useTema() {
  const [escolha, setEscolha] = useState<Tema>(lerEscolha);
  const [sistemaEscuro, setSistemaEscuro] = useState<boolean>(prefereEscuro);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(CONSULTA);
    const aoMudar = (e: MediaQueryListEvent) => setSistemaEscuro(e.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  const efetivo: TemaEfetivo = resolverTema(escolha, sistemaEscuro);

  useEffect(() => {
    aplicarTema(efetivo, document.documentElement);
  }, [efetivo]);

  const definir = useCallback((novo: Tema) => {
    setEscolha(novo);
    try {
      if (novo === 'sistema') localStorage.removeItem(CHAVE_TEMA);
      else localStorage.setItem(CHAVE_TEMA, novo);
    } catch {
      // Sem storage a escolha vale só nesta sessão, o que é melhor que quebrar.
    }
  }, []);

  const alternar = useCallback(() => {
    setEscolha((atual) => {
      const novo = proximoTema(atual, sistemaEscuro);
      try { localStorage.setItem(CHAVE_TEMA, novo); } catch { /* idem */ }
      return novo;
    });
  }, [sistemaEscuro]);

  return { escolha, efetivo, definir, alternar };
}
