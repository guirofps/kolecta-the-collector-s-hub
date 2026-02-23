import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  phase?: 'MVP' | 'Fase 2';
}

export default function PlaceholderPage({ title, description, phase = 'MVP' }: PlaceholderPageProps) {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 text-center">
        <Construction className="h-12 w-12 text-primary mx-auto mb-6" />
        <h1 className="font-heading text-3xl font-extrabold italic uppercase mb-3">{title}</h1>
        {description && <p className="text-muted-foreground max-w-md mx-auto mb-2">{description}</p>}
        <span className="inline-block text-[10px] font-heading uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full mb-6">
          {phase}
        </span>
        <div>
          <Button variant="outline-gold" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
