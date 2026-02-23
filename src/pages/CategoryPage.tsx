import { useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/ProductCard';
import { mockCategories, getProductsByCategory } from '@/lib/mock-data';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const category = mockCategories.find((c) => c.slug === slug);
  const products = getProductsByCategory(slug || '');

  if (!category) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold text-muted-foreground uppercase">Categoria não encontrada</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">{category.icon}</span>
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">{category.name}</h1>
            <p className="text-sm text-muted-foreground">{products.length} itens · {category.description}</p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Nenhum item nesta categoria ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
