import { useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/mock-data';
import { Plus, Info, Save } from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────

interface CategoryFee {
  id: string;
  category: string;
  subcategory: string;
  commissionStd: number;
  commissionAuction: number;
  active: boolean;
}

const initialCategories: CategoryFee[] = [
  { id: 'c1', category: 'Carrinhos & Miniaturas', subcategory: 'Die-cast', commissionStd: 12, commissionAuction: 15, active: true },
  { id: 'c2', category: 'Carrinhos & Miniaturas', subcategory: 'Customizados', commissionStd: 12, commissionAuction: 15, active: true },
  { id: 'c3', category: 'Funko Pop', subcategory: 'Geral', commissionStd: 10, commissionAuction: 13, active: true },
  { id: 'c4', category: 'Cards Colecionáveis', subcategory: 'Pokémon', commissionStd: 10, commissionAuction: 13, active: true },
  { id: 'c5', category: 'Cards Colecionáveis', subcategory: 'Magic', commissionStd: 10, commissionAuction: 13, active: true },
  { id: 'c6', category: 'Action Figures', subcategory: 'Geral', commissionStd: 12, commissionAuction: 15, active: true },
  { id: 'c7', category: 'Vintage & Retrô', subcategory: 'Geral', commissionStd: 14, commissionAuction: 17, active: true },
  { id: 'c8', category: 'Modelismo', subcategory: 'Geral', commissionStd: 11, commissionAuction: 14, active: false },
];

const initialPlatformFees = {
  stripeFee: 3.99,
  withdrawalFee: 2.0,
  minWithdrawal: 20.0,
  payoutDays: 3,
  highlightBronze: 2.5,
  highlightSilver: 5.0,
  highlightGold: 9.9,
  auctionExtraCommission: 3.0,
};

interface SpecialRule {
  id: string;
  name: string;
  target: string;
  discount: number;
  validUntil: string;
  status: 'active' | 'expired';
}

const initialRules: SpecialRule[] = [
  { id: 'r1', name: 'Top Seller JDM Store', target: 'JDM Store (vendedor)', discount: 3, validUntil: '2025-06-30', status: 'active' },
  { id: 'r2', name: 'Parceiro Cards Premium', target: 'Grupo Cards Premium', discount: 2, validUntil: '2025-04-15', status: 'active' },
  { id: 'r3', name: 'Promoção lançamento Vintage', target: 'Vintage Toys (vendedor)', discount: 5, validUntil: '2024-12-31', status: 'expired' },
];

const mockChangeHistory = [
  { date: '2025-03-15', admin: 'Admin Carlos', field: 'Comissão Funko Pop (padrão)', oldValue: '12%', newValue: '10%' },
  { date: '2025-03-10', admin: 'Admin Ana', field: 'Taxa de saque mínimo', oldValue: 'R$ 1,50', newValue: 'R$ 2,00' },
  { date: '2025-03-05', admin: 'Admin Carlos', field: 'Prazo de repasse', oldValue: '5 dias', newValue: '3 dias' },
  { date: '2025-02-28', admin: 'Admin Ana', field: 'Taxa destaque Ouro/dia', oldValue: 'R$ 7,90', newValue: 'R$ 9,90' },
  { date: '2025-02-20', admin: 'Admin Carlos', field: 'Comissão modo lance adicional', oldValue: '2%', newValue: '3%' },
];

const feeTooltips: Record<string, string> = {
  stripeFee: 'Taxa cobrada pelo Stripe para processamento de pagamentos. Não editável.',
  withdrawalFee: 'Valor cobrado por cada solicitação de saque do vendedor.',
  minWithdrawal: 'Valor mínimo que o vendedor pode solicitar de saque.',
  payoutDays: 'Dias úteis após confirmação de entrega para liberar o repasse.',
  highlightBronze: 'Valor cobrado por dia de destaque no plano Bronze.',
  highlightSilver: 'Valor cobrado por dia de destaque no plano Prata.',
  highlightGold: 'Valor cobrado por dia de destaque no plano Ouro.',
  auctionExtraCommission: 'Percentual adicional cobrado em vendas via Modo Lance.',
};

// ── Component ──────────────────────────────────────────────

export default function CommissionsAndFees() {
  const { toast } = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [platformFees, setPlatformFees] = useState(initialPlatformFees);
  const [rules, setRules] = useState(initialRules);

  // Simulator
  const [simValue, setSimValue] = useState('500');
  const [simCategory, setSimCategory] = useState('c1');
  const [simType, setSimType] = useState<'standard' | 'auction'>('standard');
  const [simSpecial, setSimSpecial] = useState(false);

  // New rule dialog
  const [ruleDialog, setRuleDialog] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', type: 'seller', target: '', discount: '', validUntil: '', reason: '' });

  const avgStd = useMemo(() => {
    const active = categories.filter(c => c.active);
    return active.length ? (active.reduce((a, c) => a + c.commissionStd, 0) / active.length).toFixed(1) : '0';
  }, [categories]);

  const avgAuction = useMemo(() => {
    const active = categories.filter(c => c.active);
    return active.length ? (active.reduce((a, c) => a + c.commissionAuction, 0) / active.length).toFixed(1) : '0';
  }, [categories]);

  // Simulator calculation
  const simResult = useMemo(() => {
    const value = parseFloat(simValue) || 0;
    const cat = categories.find(c => c.id === simCategory);
    const baseCommission = simType === 'auction'
      ? (cat?.commissionAuction ?? 12) + platformFees.auctionExtraCommission
      : (cat?.commissionStd ?? 12);
    const discount = simSpecial ? 3 : 0;
    const effectiveCommission = Math.max(0, baseCommission - discount);
    const commissionValue = value * (effectiveCommission / 100);
    const stripeValue = value * (platformFees.stripeFee / 100);
    const net = value - commissionValue - stripeValue;
    return { gross: value, commission: commissionValue, stripe: stripeValue, net, effectiveRate: effectiveCommission };
  }, [simValue, simCategory, simType, simSpecial, categories, platformFees]);

  const updateCategory = (id: string, field: keyof CategoryFee, value: number | boolean) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.target || !newRule.discount || !newRule.validUntil) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setRules(prev => [...prev, {
      id: `r${Date.now()}`,
      name: newRule.name,
      target: `${newRule.target} (${newRule.type === 'seller' ? 'vendedor' : 'grupo'})`,
      discount: parseFloat(newRule.discount),
      validUntil: newRule.validUntil,
      status: 'active',
    }]);
    toast({ title: 'Regra criada com sucesso' });
    setRuleDialog(false);
    setNewRule({ name: '', type: 'seller', target: '', discount: '', validUntil: '', reason: '' });
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sticky top-0 z-10 bg-background/95 backdrop-blur py-4 -mt-4">
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Comissões e Taxas</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure as taxas cobradas da plataforma</p>
            <Badge variant="outline" className="mt-2 text-[10px] text-muted-foreground">Última atualização: 15/03/2025</Badge>
          </div>
          <Button className="glow-primary gap-2" onClick={() => toast({ title: 'Alterações salvas com sucesso' })}>
            <Save className="h-4 w-4" /> Salvar todas as alterações
          </Button>
        </div>

        {/* ── Comissões por categoria ─────────────────── */}
        <Card className="bg-gradient-card border-border mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Comissões por Categoria</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 text-xs"><Plus className="h-3 w-3" /> Adicionar categoria</Button>
            </div>
          </CardHeader>
          {/* API: GET /api/admin/fees/categories
              PUT /api/admin/fees/categories/:id
              POST /api/admin/fees/categories */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] uppercase">Categoria</TableHead>
                    <TableHead className="text-[11px] uppercase">Subcategoria</TableHead>
                    <TableHead className="text-[11px] uppercase text-center">Comissão padrão (%)</TableHead>
                    <TableHead className="text-[11px] uppercase text-center">Comissão modo lance (%)</TableHead>
                    <TableHead className="text-[11px] uppercase text-center">Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(cat => (
                    <TableRow key={cat.id} className={!cat.active ? 'opacity-50' : ''}>
                      <TableCell className="text-xs font-medium">{cat.category}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{cat.subcategory}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={cat.commissionStd}
                          onChange={e => updateCategory(cat.id, 'commissionStd', parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-xs text-center mx-auto"
                          min={0} max={100} step={0.5}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={cat.commissionAuction}
                          onChange={e => updateCategory(cat.id, 'commissionAuction', parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-xs text-center mx-auto"
                          min={0} max={100} step={0.5}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={cat.active} onCheckedChange={v => updateCategory(cat.id, 'active', v)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={2} className="text-xs font-heading uppercase">Média geral</TableCell>
                    <TableCell className="text-xs text-center font-heading font-bold text-kolecta-gold">{avgStd}%</TableCell>
                    <TableCell className="text-xs text-center font-heading font-bold text-kolecta-gold">{avgAuction}%</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Taxas fixas da plataforma ───────────────── */}
        <Card className="bg-gradient-card border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Taxas Fixas da Plataforma</CardTitle>
          </CardHeader>
          {/* API: GET /api/admin/fees/platform
              PUT /api/admin/fees/platform */}
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { key: 'stripeFee' as const, label: 'Taxa de processamento Stripe (%)', readOnly: true, suffix: '%', badge: 'Definido pelo Stripe' },
                { key: 'withdrawalFee' as const, label: 'Taxa de saque mínimo (R$)', suffix: 'R$' },
                { key: 'minWithdrawal' as const, label: 'Valor mínimo de saque (R$)', suffix: 'R$' },
                { key: 'payoutDays' as const, label: 'Prazo de repasse após entrega (dias úteis)', suffix: 'dias' },
                { key: 'highlightBronze' as const, label: 'Taxa de destaque Bronze/dia (R$)', suffix: 'R$' },
                { key: 'highlightSilver' as const, label: 'Taxa de destaque Prata/dia (R$)', suffix: 'R$' },
                { key: 'highlightGold' as const, label: 'Taxa de destaque Ouro/dia (R$)', suffix: 'R$' },
                { key: 'auctionExtraCommission' as const, label: 'Comissão modo lance adicional (%)', suffix: '%' },
              ] as const).map(item => (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">{item.label}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">{feeTooltips[item.key]}</TooltipContent>
                    </Tooltip>
                    {'badge' in item && item.badge && (
                      <Badge variant="outline" className="text-[9px] ml-1">{item.badge}</Badge>
                    )}
                  </div>
                  <Input
                    type="number"
                    value={platformFees[item.key]}
                    onChange={e => setPlatformFees(prev => ({ ...prev, [item.key]: parseFloat(e.target.value) || 0 }))}
                    readOnly={'readOnly' in item && item.readOnly}
                    className={`h-9 text-sm ${'readOnly' in item && item.readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                    step={0.01}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Regras de comissão especial ─────────────── */}
        <Card className="bg-gradient-card border-border mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Regras de Comissão Especial</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setRuleDialog(true)}>
                <Plus className="h-3 w-3" /> Nova regra
              </Button>
            </div>
          </CardHeader>
          {/* API: GET /api/admin/fees/special-rules
              POST /api/admin/fees/special-rules
              DELETE /api/admin/fees/special-rules/:id */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] uppercase">Nome da regra</TableHead>
                    <TableHead className="text-[11px] uppercase">Vendedor/grupo</TableHead>
                    <TableHead className="text-[11px] uppercase text-center">Desconto (%)</TableHead>
                    <TableHead className="text-[11px] uppercase">Validade</TableHead>
                    <TableHead className="text-[11px] uppercase">Status</TableHead>
                    <TableHead className="text-[11px] uppercase">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(rule => (
                    <TableRow key={rule.id} className={rule.status === 'expired' ? 'opacity-50' : ''}>
                      <TableCell className="text-xs font-medium">{rule.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{rule.target}</TableCell>
                      <TableCell className="text-xs text-center font-heading font-bold text-kolecta-gold">-{rule.discount}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{rule.validUntil}</TableCell>
                      <TableCell>
                        <Badge variant={rule.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                          {rule.status === 'active' ? 'Ativa' : 'Expirada'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => { setRules(prev => prev.filter(r => r.id !== rule.id)); toast({ title: 'Regra removida' }); }}>
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Simulador de taxas ──────────────────────── */}
        <Card className="bg-gradient-card border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Simulador de Taxas</CardTitle>
          </CardHeader>
          {/* Cálculo feito no front com base nas taxas carregadas, apenas para simulação visual */}
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor da venda (R$)</Label>
                <Input type="number" value={simValue} onChange={e => setSimValue(e.target.value)} className="h-9" step={0.01} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select value={simCategory} onValueChange={setSimCategory}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.active).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.category} — {c.subcategory}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de venda</Label>
                <Select value={simType} onValueChange={v => setSimType(v as 'standard' | 'auction')}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Preço fixo</SelectItem>
                    <SelectItem value="auction">Modo lance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={simSpecial} onCheckedChange={setSimSpecial} id="sim-special" />
                <Label htmlFor="sim-special" className="text-xs">Vendedor com regra especial</Label>
              </div>
            </div>

            <Separator className="mb-4" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Valor bruto</p>
                <p className="font-heading text-xl font-bold">{formatBRL(simResult.gross)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Comissão Kolecta ({simResult.effectiveRate.toFixed(1)}%)</p>
                <p className="font-heading text-xl font-bold">{formatBRL(simResult.commission)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Taxa Stripe ({platformFees.stripeFee}%)</p>
                <p className="font-heading text-xl font-bold">{formatBRL(simResult.stripe)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Líquido para o vendedor</p>
                <p className="font-heading text-xl font-bold text-kolecta-gold">{formatBRL(simResult.net)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Histórico de alterações ─────────────────── */}
        <Card className="bg-gradient-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Histórico de Alterações</CardTitle>
          </CardHeader>
          {/* API: GET /api/admin/fees/change-history */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] uppercase">Data</TableHead>
                    <TableHead className="text-[11px] uppercase">Admin</TableHead>
                    <TableHead className="text-[11px] uppercase">Campo alterado</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Valor anterior</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Novo valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockChangeHistory.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{entry.date}</TableCell>
                      <TableCell className="text-xs">{entry.admin}</TableCell>
                      <TableCell className="text-xs font-medium">{entry.field}</TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">{entry.oldValue}</TableCell>
                      <TableCell className="text-xs text-right font-medium text-kolecta-gold">{entry.newValue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Dialog: Nova regra ──────────────────────── */}
        <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Nova Regra de Comissão</DialogTitle>
              <DialogDescription>Crie uma regra de desconto personalizada para um vendedor ou grupo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da regra</Label>
                <Input value={newRule.name} onChange={e => setNewRule(prev => ({ ...prev, name: e.target.value }))} className="h-9" placeholder="Ex: Top Seller Q1" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={newRule.type} onValueChange={v => setNewRule(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">Vendedor específico</SelectItem>
                    <SelectItem value="group">Grupo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{newRule.type === 'seller' ? 'Vendedor' : 'Grupo'}</Label>
                <Input value={newRule.target} onChange={e => setNewRule(prev => ({ ...prev, target: e.target.value }))} className="h-9" placeholder={newRule.type === 'seller' ? 'Nome do vendedor' : 'Nome do grupo'} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Desconto na comissão padrão (%)</Label>
                <Input type="number" value={newRule.discount} onChange={e => setNewRule(prev => ({ ...prev, discount: e.target.value }))} className="h-9" min={0} max={100} step={0.5} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Válido até</Label>
                <Input type="date" value={newRule.validUntil} onChange={e => setNewRule(prev => ({ ...prev, validUntil: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Motivo interno</Label>
                <Textarea value={newRule.reason} onChange={e => setNewRule(prev => ({ ...prev, reason: e.target.value }))} rows={2} placeholder="Motivo para concessão do desconto" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRuleDialog(false)}>Cancelar</Button>
              <Button className="glow-primary" onClick={handleCreateRule}>Criar regra</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
