import { useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { formatBRL } from '@/lib/currency';
import { Info, Clock, Percent, ShieldCheck } from 'lucide-react';

/**
 * Modelo de taxas REAL (fonte: kolecta-backend).
 * - Taxa base da plataforma: PLATFORM_FEE_PERCENT (default 11%).
 * - Membro Fundador ativo: 9% durante 6 meses (FOUNDER_COMMISSION_PERCENT).
 * - Estimativa Stripe: ~4% (3,99% + R$0,39), simplificada no backend.
 * A taxa é única (flat), não por categoria. Config por categoria / regras
 * especiais / histórico ainda não existem no produto.
 */
const BASE_FEE = 11;
const FOUNDER_FEE = 9;
const STRIPE_FEE_EST = 4;

function ComingSoonCard({ title, label }: { title: string; label: string }) {
  return (
    <Card className="bg-gradient-card border-border mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Clock className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-md">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CommissionsAndFees() {
  const [simValue, setSimValue] = useState('500');
  const [simFounder, setSimFounder] = useState(false);

  const sim = useMemo(() => {
    const value = parseFloat(simValue) || 0;
    const feePct = simFounder ? FOUNDER_FEE : BASE_FEE;
    const commission = value * (feePct / 100);
    const stripe = value * (STRIPE_FEE_EST / 100);
    const net = value - commission - stripe;
    return { gross: value, feePct, commission, stripe, net };
  }, [simValue, simFounder]);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold italic uppercase">Comissões e Taxas</h1>
          <p className="text-sm text-muted-foreground mt-1">Modelo de taxas atual da plataforma</p>
        </div>

        {/* Modelo real de taxas */}
        <Card className="bg-gradient-card border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Modelo Vigente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="h-4 w-4 text-kolecta-gold" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Taxa base</span>
                </div>
                <p className="font-heading text-3xl font-extrabold italic text-kolecta-gold">{BASE_FEE}%</p>
                <p className="text-xs text-muted-foreground mt-1">Comissão padrão sobre cada venda concluída.</p>
              </div>
              <div className="rounded-lg border border-kolecta-gold/30 bg-kolecta-gold/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4 text-kolecta-gold" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Membro Fundador</span>
                </div>
                <p className="font-heading text-3xl font-extrabold italic text-kolecta-gold">{FOUNDER_FEE}%</p>
                <p className="text-xs text-muted-foreground mt-1">Fundador ativo, pelos primeiros 6 meses.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Processamento</span>
                </div>
                <p className="font-heading text-3xl font-extrabold italic">~{STRIPE_FEE_EST}%</p>
                <p className="text-xs text-muted-foreground mt-1">Estimativa do provedor de pagamento (3,99% + R$0,39).</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              A taxa é única para todas as categorias. A comissão de fundador é resolvida automaticamente
              no fechamento de cada pedido/leilão (backend), sem configuração manual.
            </p>
          </CardContent>
        </Card>

        {/* Simulador */}
        <Card className="bg-gradient-card border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Simulador de Taxas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor da venda (R$)</Label>
                <Input type="number" value={simValue} onChange={(e) => setSimValue(e.target.value)} className="h-9" step={0.01} min={0} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={simFounder} onCheckedChange={setSimFounder} id="sim-founder" />
                <Label htmlFor="sim-founder" className="text-xs">Vendedor Membro Fundador (ativo, dentro dos 6 meses)</Label>
              </div>
            </div>

            <Separator className="mb-4" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Valor bruto</p>
                <p className="font-heading text-xl font-bold">{formatBRL(sim.gross)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Comissão Kolecta ({sim.feePct}%)</p>
                <p className="font-heading text-xl font-bold">{formatBRL(sim.commission)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Processamento (~{STRIPE_FEE_EST}%)</p>
                <p className="font-heading text-xl font-bold">{formatBRL(sim.stripe)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Líquido para o vendedor</p>
                <p className="font-heading text-xl font-bold text-kolecta-gold">{formatBRL(sim.net)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Em breve — produtos não construídos */}
        <ComingSoonCard
          title="Comissão por Categoria"
          label="Em breve — hoje a taxa é única para todas as categorias. A configuração de comissões diferentes por categoria ainda não faz parte do produto."
        />
        <ComingSoonCard
          title="Regras de Comissão Especial"
          label="Em breve — descontos personalizados por vendedor/grupo exigem um motor de regras que ainda não foi implementado no backend."
        />
        <ComingSoonCard
          title="Histórico de Alterações"
          label="Em breve — o registro de auditoria de mudanças de taxa será adicionado quando a edição de taxas pelo admin estiver disponível."
        />
      </div>
    </AdminLayout>
  );
}
