import Layout from '@/components/layout/Layout';
import { Link } from 'react-router-dom';
import { mockCategories } from '@/lib/mock-data';

export default function CategoriesPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-extrabold italic uppercase mb-8">Categorias</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {mockCategories.map((cat) => (
            <Link
              key={cat.id}
              to={`/categoria/${cat.slug}`}
              className="group p-6 rounded-lg border border-border bg-card hover:border-primary/40 transition-all"
            >
              <span className="text-4xl block mb-3">{cat.icon}</span>
              <h2 className="font-heading text-lg font-bold uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">{cat.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
              <span className="text-xs text-muted-foreground mt-2 block">{cat.count} itens</span>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
