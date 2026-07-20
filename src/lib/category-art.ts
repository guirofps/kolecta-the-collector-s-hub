// ─── Arte das categorias ─────────────────────────────────────
// Fonte ÚNICA da imagem de cada categoria (duotone dourado sobre preto).
// Usada na landing de fundador e nos botões de categoria do criar anúncio,
// para as duas telas nunca divergirem.
//
// A chave é o `slug` da categoria (o mesmo que vem da API).

import photoDiecast from '@/assets/categories/photo-diecast.webp';
import photoCards from '@/assets/categories/photo-cards.webp';
import photoActionFigures from '@/assets/categories/photo-action-figures.webp';
import photoFunko from '@/assets/categories/photo-funko.webp';
import photoMangas from '@/assets/categories/photo-mangas.webp';

export const CATEGORY_ART: Record<string, string> = {
  'miniaturas-diecast': photoDiecast,
  'cards-colecionaveis': photoCards,
  'action-figures': photoActionFigures,
  'funko-pop': photoFunko,
  'mangas-hqs': photoMangas,
};

/** Arte da categoria, ou `undefined` se for uma categoria sem arte própria. */
export function categoryArt(slug?: string | null): string | undefined {
  return slug ? CATEGORY_ART[slug] : undefined;
}
