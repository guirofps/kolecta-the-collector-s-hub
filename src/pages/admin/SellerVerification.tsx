import { useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Clock, Search, CheckCircle2, ShieldCheck, ShoppingBag,
} from 'lucide-react';
import { useAdminSellersDetailed, useVerifySeller } from '@/hooks/use-api';
import type { AdminSellerDetailed } from '@/lib/api';

function initialsOf(name: string | null, fallback: string) {
  const src = (name ?? '').trim();
  if (!src) return fallback.slice(0, 2).toUpperCase();
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || fallback.slice(0, 2).toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

const recipientLabels: Record<string, { label: string; cls: string }> = {
  registration: { label: 'Recebedor: cadastro', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  affiliation: { label: 'Recebedor: análise', cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  active: { label: 'Recebedor ativo', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  refused: { label: 'Recebedor recusado', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
};

export default function SellerVerificationPage() {
  const { data: sellers = [], isLoading } = useAdminSellersDetailed();
  const verifySeller = useVerifySeller();

  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{ seller: AdminSellerDetailed; verify: boolean } | null>(null);

  const filtered = useMemo(() => {
    const wantVerified = tab === 'approved';
    let list = sellers.filter((s) => s.isVerified === wantVerified);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        (s.cpfCnpj ?? '').includes(q),
      );
    }
    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [sellers, tab, search]);

  const pendingCount = sellers.filter((s) => !s.isVerified).length;
  const approvedCount = sellers.filter((s) => s.isVerified).length;

  const summaryCards = [
    { label: 'Aguardando verificação', value: pendingCount, icon: Clock, color: 'text-amber-500' },
    { label: 'Vendedores verificados', value: approvedCount, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Total de vendedores', value: sellers.length, icon: ShieldCheck, color: 'text-primary' },
  ];

  const doConfirm = () => {
    if (!confirm) return;
    verifySeller.mutate({ sellerProfileId: confirm.seller.id, verified: confirm.verify });
    setConfirm(null);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold">Verificação de Vendedores</h1>
          <p className="text-muted-foreground">
            Aprove vendedores para exibir o selo de verificação. Os dados de cadastro (nome, e-mail, CPF/CNPJ)
            vêm da conta do vendedor.
          </p>
        </div>

        {/* Summary */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {summaryCards.map((c) => (
              <Card key={c.label} className="bg-gradient-card">
                <CardContent className="flex items-center gap-3 p-4">
                  <c.icon className={`h-7 w-7 ${c.color}`} />
                  <div>
                    <p className={`font-heading text-3xl font-bold ${c.color}`}>{c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs + search */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="pending">
                Aguardando
                <Badge className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-600">{pendingCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approved">
                Verificados
                <Badge className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-600">{approvedCount}</Badge>
              </TabsTrigger>
            </TabsList>
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nome, e-mail ou CPF/CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {['pending', 'approved'].map((tabKey) => (
            <TabsContent key={tabKey} value={tabKey} className="mt-4">
              {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {tabKey === 'pending' ? 'Nenhum vendedor aguardando verificação' : 'Nenhum vendedor verificado'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((s) => {
                    const rec = s.recipientStatus ? recipientLabels[s.recipientStatus] : null;
                    return (
                      <Card key={s.id} className="bg-gradient-card">
                        <CardContent className="flex items-start gap-3 p-4">
                          <Avatar className="h-11 w-11 shrink-0">
                            <AvatarFallback className="bg-muted text-muted-foreground font-heading text-sm">
                              {initialsOf(s.name, s.userId)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-heading text-base font-bold">{s.name ?? 'Sem nome'}</span>
                              {s.isVerified ? (
                                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 gap-1">
                                  <ShieldCheck className="h-3 w-3" /> Verificado
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Aguardando</Badge>
                              )}
                              {rec && <Badge variant="outline" className={`text-[10px] ${rec.cls}`}>{rec.label}</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                              <span>{s.email ?? '—'}</span>
                              <span>CPF/CNPJ: {s.cpfCnpj ?? '—'}</span>
                              <span>Cadastro: {fmtDate(s.createdAt)}</span>
                              <span className="flex items-center gap-1">
                                <ShoppingBag className="h-3 w-3" /> {s.previousOrders} pedidos
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {s.isVerified ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirm({ seller: s, verify: false })}
                                disabled={verifySeller.isPending}
                              >
                                Remover verificação
                              </Button>
                            ) : (
                              <Button
                                variant="kolecta"
                                size="sm"
                                onClick={() => setConfirm({ seller: s, verify: true })}
                                disabled={verifySeller.isPending}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verificar
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Confirmation dialog */}
      {confirm && (
        <Dialog open onOpenChange={() => setConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">
                {confirm.verify ? 'Verificar vendedor' : 'Remover verificação'}
              </DialogTitle>
              <DialogDescription>
                {confirm.verify
                  ? `Confirmar a verificação de "${confirm.seller.name ?? confirm.seller.userId}"? O selo de vendedor verificado passará a aparecer na loja e nos anúncios.`
                  : `Remover a verificação de "${confirm.seller.name ?? confirm.seller.userId}"? O selo deixará de ser exibido.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
              <Button
                variant={confirm.verify ? 'kolecta' : 'destructive'}
                onClick={doConfirm}
                disabled={verifySeller.isPending}
              >
                {confirm.verify ? 'Confirmar verificação' : 'Remover verificação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
