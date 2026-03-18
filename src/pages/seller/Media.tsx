import { useState, useEffect } from 'react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/mock-data';
import { Check, Star, Zap, Crown, Megaphone, Eye, MousePointerClick } from 'lucide-react';

/* ─── Types & Mock ─── */
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

const periodPrices: Record<string, number> = { '7': 1, '15': 1.8, '30': 3 };
const periodLabels: Record<string, string> = { '7': '7 dias', '15': '15 dias', '30': '30 dias' };

interface ActiveHighlight {
  id: string;
  productName: string;
  productImage: string;
  plan: string;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
}

interface HistoryItem {
  id: string;
  date: string;
  productName: string;
  plan: string;
  amount: number;
  period: string;
  status: 'active' | 'completed' | 'cancelled';
}

const mockActiveHighlights: ActiveHighlight[] = [
  {
    id: 'ah-1', productName: 'Capacete Arai RX-7V Racing', productImage: '/placeholder.svg',
    plan: 'Ouro', startDate: '2025-03-10', endDate: '2025-04-09',
    impressions: 4520, clicks: 312,
  },
  {
    id: 'ah-2', productName: 'Jaqueta Alpinestars GP Plus', productImage: '/placeholder.svg',
    plan: 'Bronze', startDate: '2025-03-15', endDate: '2025-03-22',
    impressions: 890, clicks: 67,
  },
];

const mockHistory: HistoryItem[] = [
  { id: 'h-1', date: '2025-03-10', productName: 'Capacete Arai RX-7V Racing', plan: 'Ouro', amount: 209.70, period: '30 dias', status: 'active' },
  { id: 'h-2', date: '2025-03-15', productName: 'Jaqueta Alpinestars GP Plus', plan: 'Bronze', amount: 19.90, period: '7 dias', status: 'active' },
  { id: 'h-3', date: '2025-02-01', productName: 'Slider Procton Racing', plan: 'Prata', amount: 71.82, period: '15 dias', status: 'completed' },
  { id: 'h-4', date: '2025-01-20', productName: 'Luva Dainese Carbon 3', plan: 'Bronze', amount: 19.90, period: '7 dias', status: 'completed' },
  { id: 'h-5', date: '2025-01-05', productName: 'Escapamento Akrapovic', plan: 'Ouro', amount: 209.70, period: '30 dias', status: 'cancelled' },
];

const mockListings = [
  { id: 'l-1', name: 'Capacete Arai RX-7V Racing' },
  { id: 'l-2', name: 'Jaqueta Alpinestars GP Plus' },
  { id: 'l-3', name: 'Slider Procton Racing' },
  { id: 'l-4', name: 'Luva Dainese Carbon 3 Long' },
];

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

/* ─── Main Component ─── */
export default function SellerMediaPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [hireDialog, setHireDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('7');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const planObj = plans.find(p => p.id === selectedPlan);
  const totalPrice = planObj ? planObj.price * (periodPrices[selectedPeriod] ?? 1) : 0;

  const handleHire = () => {
    if (!selectedListing || !selectedPlan) return;
    toast({ title: 'Destaque contratado com sucesso!' });
    setHireDialog(false);
    setSelectedListing(''); setSelectedPlan(''); setSelectedPeriod('7');
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
      completed: 'bg-muted text-muted-foreground',
      cancelled: 'bg-destructive/20 text-destructive',
    };
    const labels: Record<string, string> = { active: 'Ativo', completed: 'Concluído', cancelled: 'Cancelado' };
    return <Badge className={map[status] ?? ''}>{labels[status] ?? status}</Badge>;
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* 1. Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold">Mídia & Destaque</h1>
          <p className="text-muted-foreground">Aumente a visibilidade dos seus anúncios</p>
        </div>

        {/* 2. Plan Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`bg-gradient-card relative ${plan.popular ? 'border-[hsl(var(--kolecta-gold)/0.4)] glow-primary' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[hsl(var(--kolecta-gold))] text-[hsl(var(--kolecta-carbon))] text-[10px]">
                    Mais popular
                  </Badge>
                )}
                <CardContent className="pt-6 space-y-4 text-center">
                  <plan.icon className={`h-10 w-10 mx-auto ${plan.popular ? 'text-[hsl(var(--kolecta-gold))]' : 'text-muted-foreground'}`} />
                  <h3 className="font-heading text-2xl font-bold">{plan.name}</h3>
                  <p className="font-heading text-3xl font-bold text-[hsl(var(--kolecta-gold))]">
                    {formatBRL(plan.price)}<span className="text-sm text-muted-foreground font-body">/semana</span>
                  </p>
                  <ul className="text-sm space-y-2 text-left">
                    {plan.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  {/* API: POST /api/seller/media/plans/:planId/subscribe */}
                  <Button
                    variant={plan.popular ? 'kolecta' : 'outline'}
                    className="w-full"
                    onClick={() => { setSelectedPlan(plan.id); setHireDialog(true); }}
                  >
                    Contratar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 3. Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="active">Destaques ativos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loading ? (
              <div className="space-y-4 mt-4">{[1, 2].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
            ) : mockActiveHighlights.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum destaque ativo</p>
                <Button variant="kolecta" onClick={() => setHireDialog(true)}>Contratar um plano</Button>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {mockActiveHighlights.map((h) => {
                  const remaining = daysLeft(h.endDate);
                  return (
                    <Card key={h.id} className="bg-gradient-card">
                      <CardContent className="flex flex-col sm:flex-row gap-4 p-4">
                        <img src={h.productImage} alt={h.productName} className="w-20 h-20 rounded object-cover shrink-0" />
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <h3 className="font-heading text-lg font-bold truncate">{h.productName}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="secondary">{h.plan}</Badge>
                            <span className="text-muted-foreground">
                              {new Date(h.startDate).toLocaleDateString('pt-BR')} — {new Date(h.endDate).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="font-heading font-bold text-[hsl(var(--kolecta-gold))]">{remaining}d restantes</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {h.impressions.toLocaleString('pt-BR')} impressões</span>
                            <span className="flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5" /> {h.clicks} cliques</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="self-start shrink-0">Renovar</Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {loading ? (
              <Skeleton className="h-48 rounded-lg mt-4" />
            ) : (
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockHistory.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm">{new Date(h.date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="font-heading font-medium text-sm">{h.productName}</TableCell>
                        <TableCell><Badge variant="secondary">{h.plan}</Badge></TableCell>
                        <TableCell className="text-right font-heading font-bold">{formatBRL(h.amount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{h.period}</TableCell>
                        <TableCell>{statusBadge(h.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Hire Dialog */}
      <Dialog open={hireDialog} onOpenChange={setHireDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Contratar destaque</DialogTitle>
            <DialogDescription className="sr-only">Formulário de contratação de destaque</DialogDescription>
          </DialogHeader>
          {/* API: POST /api/seller/media/highlights
              Body: { listingId, plan, period }
              Debita do saldo disponível do vendedor */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Escolha o anúncio</label>
              <Select value={selectedListing} onValueChange={setSelectedListing}>
                <SelectTrigger><SelectValue placeholder="Selecione um anúncio" /></SelectTrigger>
                <SelectContent>
                  {mockListings.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Plano</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {formatBRL(p.price)}/semana</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(periodLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Separator className="line-tech" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor total</span>
              <span className="font-heading text-2xl font-bold text-[hsl(var(--kolecta-gold))]">{formatBRL(totalPrice)}</span>
            </div>
            <p className="text-xs text-muted-foreground">O valor será debitado do seu saldo disponível</p>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setHireDialog(false)}>Cancelar</Button>
            <Button variant="kolecta" onClick={handleHire} disabled={!selectedListing || !selectedPlan}>
              Confirmar destaque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
}
