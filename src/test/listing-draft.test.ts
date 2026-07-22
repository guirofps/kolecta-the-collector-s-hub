import { describe, it, expect, beforeEach } from 'vitest';
import { draftFromListing, saveDraft, loadDraft, clearDraft } from '@/lib/listing-draft';
import type { Listing } from '@/lib/api';

const base = {
  id: 'l1',
  sellerId: 's1',
  categoryId: 'cat-diecast',
  title: 'Mini GT Honda NSX 1:64',
  description: 'Peca lacrada, direto da caixa fechada.',
  brand: 'Mini GT',
  line: 'LB-Works',
  scale: '1:64',
  year: '2024',
  edition: '#1055',
  condition: 'novo-lacrado',
  type: 'direct',
  priceInCents: 18990,
  images: JSON.stringify(['https://x/1.jpg', 'https://x/2.jpg']),
  status: 'active',
  weightGrams: 200,
  widthCm: 10,
  heightCm: 5,
  lengthCm: 15,
} as unknown as Listing;

describe('duplicar anuncio', () => {
  beforeEach(() => clearDraft());

  it('copia o trabalho chato: categoria, condicao, descricao e dimensoes', () => {
    const d = draftFromListing(base);
    expect(d.form.category).toBe('cat-diecast');
    expect(d.form.condition).toBe('novo-lacrado');
    expect(d.form.description).toBe('Peca lacrada, direto da caixa fechada.');
    expect(d.form.weightGrams).toBe('200');
    expect(d.form.lengthCm).toBe('15');
  });

  it('NAO copia as fotos: item diferente pede foto diferente', () => {
    const d = draftFromListing(base);
    expect(d.form.photos).toEqual([]);
  });

  it('converte o preco de centavos para reais', () => {
    expect(draftFromListing(base).form.price).toBe('189.9');
  });

  it('marca a origem como copia e guarda o titulo de referencia', () => {
    const d = draftFromListing(base);
    expect(d.origin).toBe('duplicate');
    expect(d.sourceTitle).toBe('Mini GT Honda NSX 1:64');
  });

  it('sobrevive ao ciclo de salvar e carregar', () => {
    saveDraft(draftFromListing(base));
    const back = loadDraft();
    expect(back?.origin).toBe('duplicate');
    expect(back?.form.title).toBe('Mini GT Honda NSX 1:64');
  });

  it('anuncio sem preco e sem dimensoes nao quebra', () => {
    const magro = { ...base, priceInCents: null, weightGrams: null, images: null } as unknown as Listing;
    const d = draftFromListing(magro);
    expect(d.form.price).toBe('');
    expect(d.form.weightGrams).toBe('');
    expect(d.form.photos).toEqual([]);
  });

  it('clearDraft limpa de verdade', () => {
    saveDraft(draftFromListing(base));
    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});
