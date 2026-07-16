import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Star, Zap, Crown, Megaphone, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMyListings, useMyFounder } from '@/hooks/use-api';
import { isListingFeatured } from '@/lib/api';
import type { Listing } from '@/lib/api';

/* ─── Planos de mídia paga (Bronze/Prata/Ouro) ───────────────────────────────
   Produto de ads pagos ainda NÃO implementado (sem backend). Exibido como
   "Em breve". O destaque real hoje vem dos créditos do Programa Fundador
   (listings.featuredUntil), mostrado na aba "Destaques ativos". */
interface Plan {
  id: string;
  name: string;
  price: number;
  icon: React.ElementType;
  popular?: boolean;
  benefits: string[];
}

const plans: Plan[] = [
  {
    id: 'bronze', name: 'Bronze', price: 19.90, icon: Zap,
    benefits: ['Destaque na categoria', 'Badge "Destaque" no card', 'Posição prioritária na busca'],
  },
  {
    id: 'prata', name: 'Prata', price: 39.90, icon: Star,
    benefits: ['Tudo do Bronze', 'Banner na página inicial', 'Destaque nos resultados de busca', 'Relatório de impressões'],
  },
  {
    id: 'ouro', name: 'Ouro', price: 69.90, icon: Crown, popular: true,
    benefits: ['Tudo do Prata', 'Posição #1 na categoria', 'Banner premium na home', 'Selo "Top Vendedor"', 'Suporte prioritário'],
  },
];

function firstImage(images: string | null): string {
  if (!images) return '/placeholder.svg';
  try {
    const arr = JSON.parse(images);
    return Array.isArray(arr) && arr[0] ? arr[0] : '/placeholder.svg';
  } catch {
    return '/placeholder.svg';
  }
}

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

/* ─── Main Component ─── */
export default function SellerMediaPage() {
  const { data: listings = [], isLoading } = useMyListings();
  const { data: founder } = useMyFounder();

  const featured = (listings as Listing[]).filter(isListingFeatured);
  const creditsAvailable = founder?.credits?.available ?? 0;

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* 1. Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold">Mídia & Destaque</h1>
          <p className="text-muted-foreground">Aumente a visibilidade dos seus anúncios</p>
        </div>

        {/* Créditos de Fundador (destaque real) */}
        {founder?.founderStatus === 'active' && (
          <Card className="bg-[hsl(var(--kolecta-gold)/0.08)] border-[hsl(var(--kolecta-gold)/0.3)]">
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <Sparkles className="h-5 w-5 text-[hsl(var(--kolecta-gold))]" />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold">
                  {creditsAvailable} {creditsAvailable === 1 ? 'crédito' : 'créditos'} de destaque disponíveis
                </p>
                <p className="text-xs text-muted-foreground">
                  Cada crédito destaca 1 anúncio por 7 dias. Use-os na sua lista de anúncios.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/painel/anuncios">Ir para anúncios</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 2. Plan Cards — ads pagos (em breve) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`bg-gradient-card relative opacity-80 ${plan.popular ? 'border-[hsl(var(--kolecta-gold)/0.4)]' : ''}`}
            >
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-muted text-muted-foreground text-[10px]">
                Em breve
              </Badge>
              <CardContent className="pt-6 space-y-4 text-center">
                <plan.icon className={`h-10 w-10 mx-auto ${plan.popular ? 'text-[hsl(var(--kolecta-gold))]' : 'text-muted-foreground'}`} />
                <h3 className="font-heading text-2xl font-bold">{plan.name}</h3>
                <ul className="text-sm space-y-2 text-left">
                  {plan.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" disabled>
                  Em breve
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 3. Tabs */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Destaques ativos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isLoading ? (
              <div className="space-y-4 mt-4">{[1, 2].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
            ) : featured.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-1">Nenhum destaque ativo</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Use um crédito do Programa Fundador na sua lista de anúncios para destacar um item por 7 dias.
                </p>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {featured.map((l) => {
                  const remaining = l.featuredUntil ? daysLeft(l.featuredUntil) : 0;
                  return (
                    <Card key={l.id} className="bg-gradient-card">
                      <CardContent className="flex flex-col sm:flex-row gap-4 p-4">
                        <img src={firstImage(l.images)} alt={l.title} className="w-20 h-20 rounded object-cover shrink-0" />
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <h3 className="font-heading text-lg font-bold truncate">{l.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="secondary" className="capitalize">
                              {l.featuredSource === 'founder_credit' ? 'Fundador' : 'Destaque'}
                            </Badge>
                            {l.featuredUntil && (
                              <span className="text-muted-foreground">
                                até {new Date(l.featuredUntil).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            <span className="font-heading font-bold text-[hsl(var(--kolecta-gold))]">{remaining}d restantes</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="self-start shrink-0" asChild>
                          <Link to={`/produto/${l.id}`}>Ver anúncio</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <div className="flex flex-col items-center py-16 text-center mt-4">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Histórico de destaques em breve</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SellerLayout>
  );
}
