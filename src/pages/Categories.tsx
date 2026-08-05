import Layout from '@/components/layout/Layout';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Link } from 'react-router-dom';
import { useCategories } from '@/hooks/use-api';
import { categoryArt } from '@/lib/category-art';

// Acessórios não é card próprio: virou subcategoria dentro de Miniaturas (ver
// CategoryPage). Fica de fora da grade de categorias, mas segue existindo como
// slug de dados, então /categoria/acessorios ainda resolve por link direto.
const SLUGS_ANINHADOS = ['acessorios'];

// Descrições curadas por slug — o endpoint /api/categories ainda não retorna `description`.
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'miniaturas-diecast': 'Die-cast, miniaturas escala, réplicas e customizados',
  'cards-colecionaveis': 'Pokémon, Magic, Dragon Ball, Sport Cards e outros',
  'action-figures': 'Action figures articulados, statues e resin',
  'funko-pop': 'Figuras vinil, edições especiais e exclusivos',
  'mangas-hqs': 'Mangá, HQs nacionais e importadas, edições especiais',
  acessorios: 'Rodas de resina, expositores, decais e peças de customização',
};

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-extrabold italic uppercase mb-8">Categorias</h1>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 rounded-lg border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(categories ?? []).filter((cat) => !SLUGS_ANINHADOS.includes(cat.slug)).map((cat) => {
              const art = categoryArt(cat.slug);
              return (
                <Link
                  key={cat.id}
                  to={`/categoria/${cat.slug}`}
                  className="group overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/40"
                >
                  {/* Arte duotone da categoria (mesma da landing, via category-art) */}
                  {art ? (
                    <div className="relative aspect-[4/3] overflow-hidden bg-black">
                      <img
                        src={art}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-kolecta-dark">
                      <CategoryIcon slug={cat.slug} size={48} />
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="font-heading text-lg font-bold uppercase tracking-wider text-foreground transition-colors group-hover:text-primary">
                      {cat.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{CATEGORY_DESCRIPTIONS[cat.slug] ?? ''}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
