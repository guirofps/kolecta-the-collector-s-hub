// ─── Rascunho do anúncio ─────────────────────────────────────
// Guarda o progresso do wizard no navegador, para fechar a aba não perder o
// anúncio. Também é o canal usado pelo "Duplicar": a lista de anúncios grava
// uma cópia aqui e manda o vendedor para o wizard, que abre já preenchido.

import type { Listing } from '@/lib/api';

export const DRAFT_KEY = 'kolecta:listing-draft';

/** De onde veio o rascunho: retomada normal ou cópia de outro anúncio. */
export type DraftOrigin = 'draft' | 'duplicate';

export interface ListingDraft {
  form: Record<string, unknown>;
  step: number;
  origin?: DraftOrigin;
  /** Título do anúncio de origem, para a mensagem do "Duplicar". */
  sourceTitle?: string;
}

export function loadDraft(): ListingDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || !d.form) return null;
    return d as ListingDraft;
  } catch {
    return null;
  }
}

export function saveDraft(d: ListingDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // storage cheio ou indisponível: rascunho é conveniência, não requisito
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignora */
  }
}

function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((u) => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Monta um rascunho a partir de um anúncio existente ("Duplicar").
 *
 * Copia o trabalho chato (categoria, condição, descrição, peso e dimensões) e
 * DEIXA AS FOTOS DE FORA de propósito: item diferente pede foto diferente, e
 * sem foto o wizard trava o envio, o que evita publicar cópia com a imagem
 * errada. O título vem junto para o vendedor só ajustar o que muda.
 */
export function draftFromListing(l: Listing): ListingDraft {
  const form = {
    type: l.type ?? 'direct',
    title: l.title ?? '',
    category: l.categoryId ?? '',
    condition: l.condition ?? '',
    categoryFields: {},
    brand: l.brand ?? '',
    line: l.line ?? '',
    scale: l.scale ?? '',
    year: l.year ?? '',
    edition: l.edition ?? '',
    description: l.description ?? '',
    photos: [] as string[], // sempre vazio: ver comentário acima
    price: l.priceInCents != null ? String(l.priceInCents / 100) : '',
    startingBid: '',
    minIncrement: '10',
    duration: '336',
    reservePrice: '',
    antiSniper: true,
    weightGrams: l.weightGrams != null ? String(l.weightGrams) : '',
    widthCm: l.widthCm != null ? String(l.widthCm) : '',
    heightCm: l.heightCm != null ? String(l.heightCm) : '',
    lengthCm: l.lengthCm != null ? String(l.lengthCm) : '',
  };

  // Volta ao passo 2 (detalhes): o tipo já veio do original e as fotos, que
  // faltam, são o passo 3.
  return { form, step: 2, origin: 'duplicate', sourceTitle: l.title ?? '' };
}

/** Só para referência: o anúncio original tinha fotos? */
export function hadPhotos(l: Listing): boolean {
  return parseImages(l.images).length > 0;
}
