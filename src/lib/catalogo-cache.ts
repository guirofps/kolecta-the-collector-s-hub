// Catálogo guardado entre visitas.
//
// `GET /api/listings` leva de 3 a 7 segundos, e o custo é fixo da consulta: até
// pedir UM anúncio custa 3,3s (medições em docs/pendencias-backend.md). Isso é
// backend, e enquanto não muda, toda visita começava com vários segundos de
// esqueleto cinza.
//
// Aqui a última listagem fica no navegador. Na volta, a vitrine pinta na hora
// com o que já se sabe e a lista atual chega por trás, sem tela de carregamento
// no meio. Quem entra pela primeira vez continua esperando: para esse caso só o
// backend resolve.

import type { Listing } from './api';

const CHAVE = 'kolecta:catalogo:v1';

/**
 * Além disto, o cache é ignorado. Preço, disponibilidade e o que saiu do ar
 * mudam, e mostrar vitrine de ontem é pior do que esperar.
 */
const VALIDADE_MS = 24 * 60 * 60 * 1000;

/**
 * Teto do que vale guardar. `localStorage` é síncrono: ler alguns MB trava a
 * pintura da página, justamente o que isto quer evitar. O catálogo de hoje dá
 * cerca de 900 KB, então 2 MB deixa margem sem virar problema.
 */
const TETO_BYTES = 2 * 1024 * 1024;

interface Guardado {
  em: number;
  listings: Listing[];
}

/** A última listagem conhecida, ou `undefined` se não houver nada aproveitável. */
export function lerCatalogo(agora: number = Date.now()): Listing[] | undefined {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return undefined;
    const dados = JSON.parse(bruto) as Guardado;
    if (!dados?.listings?.length) return undefined;
    if (agora - dados.em > VALIDADE_MS) {
      localStorage.removeItem(CHAVE);
      return undefined;
    }
    return dados.listings;
  } catch {
    // Cache corrompido ou navegador sem localStorage (aba anônima com
    // armazenamento bloqueado). Seguir sem cache é sempre seguro.
    return undefined;
  }
}

export function guardarCatalogo(listings: Listing[], agora: number = Date.now()): void {
  try {
    if (!listings?.length) return;
    const texto = JSON.stringify({ em: agora, listings } satisfies Guardado);
    if (texto.length > TETO_BYTES) return;
    localStorage.setItem(CHAVE, texto);
  } catch {
    // Cota estourada é o caso comum. Não guardar é aceitável; quebrar não.
  }
}
