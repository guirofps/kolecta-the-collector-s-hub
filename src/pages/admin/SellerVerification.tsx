import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Clock, Search, CheckCircle2, XCircle, ShieldCheck, FileText, Camera, CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected';
type DocStatus = 'approved' | 'pending' | 'rejected';

interface DocItem {
  type: string;
  label: string;
  status: DocStatus;
  imageUrl: string;
}

interface SellerVerificationItem {
  id: string;
  name: string;
  initials: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  birthDate: string;
  city: string;
  state: string;
  registeredAt: string;
  requestedAt: string;
  status: VerificationStatus;
  documents: DocItem[];
  previousOrders: number;
  previousDisputes: number;
  rejectionReason?: string;
  rejectionDetails?: string;
}

/* ─── Mock Data ─── */
function pastDate(hours: number) {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

const mockVerifications: SellerVerificationItem[] = [
  {
    id: 'sv-1', name: 'Rafael Oliveira', initials: 'RO', email: 'rafael@email.com',
    cpfCnpj: '***.***.***-45', phone: '(11) 9****-4321', birthDate: '1990-05-15',
    city: 'São Paulo', state: 'SP', registeredAt: pastDate(720), requestedAt: pastDate(12),
    status: 'pending',
    documents: [
      { type: 'id', label: 'RG/CNH', status: 'pending', imageUrl: '/placeholder.svg' },
      { type: 'address', label: 'Comprovante de residência', status: 'pending', imageUrl: '/placeholder.svg' },
      { type: 'selfie', label: 'Selfie com documento', status: 'pending', imageUrl: '/placeholder.svg' },
    ],
    previousOrders: 0, previousDisputes: 0,
  },
  {
    id: 'sv-2', name: 'Mariana Costa', initials: 'MC', email: 'mariana@email.com',
    cpfCnpj: '***.***.***-78', phone: '(21) 9****-8765', birthDate: '1985-11-02',
    city: 'Rio de Janeiro', state: 'RJ', registeredAt: pastDate(1440), requestedAt: pastDate(8),
    status: 'pending',
    documents: [
      { type: 'id', label: 'RG/CNH', status: 'approved', imageUrl: '/placeholder.svg' },
      { type: 'address', label: 'Comprovante de residência', status: 'pending', imageUrl: '/placeholder.svg' },
      { type: 'selfie', label: 'Selfie com documento', status: 'pending', imageUrl: '/placeholder.svg' },
    ],
    previousOrders: 3, previousDisputes: 0,
  },
  {
    id: 'sv-3', name: 'Pedro Santos', initials: 'PS', email: 'pedro@email.com',
    cpfCnpj: '**.***.***/**01-90', phone: '(31) 9****-1234', birthDate: '1978-03-22',
    city: 'Belo Horizonte', state: 'MG', registeredAt: pastDate(2160), requestedAt: pastDate(72),
    status: 'pending',
    documents: [
      { type: 'id', label: 'RG/CNH', status: 'pending', imageUrl: '/placeholder.svg' },
      { type: 'address', label: 'Comprovante de residência', status: 'pending', imageUrl: '/placeholder.svg' },
      { type: 'selfie', label: 'Selfie com documento', status: 'pending', imageUrl: '/placeholder.svg' },
    ],
    previousOrders: 12, previousDisputes: 1,
  },
  {
    id: 'sv-4', name: 'Juliana Lima', initials: 'JL', email: 'juliana@email.com',
    cpfCnpj: '***.***.***-12', phone: '(41) 9****-5678', birthDate: '1992-08-10',
    city: 'Curitiba', state: 'PR', registeredAt: pastDate(480), requestedAt: pastDate(4),
    status: 'in_review',
    documents: [
      { type: 'id', label: 'RG/CNH', status: 'approved', imageUrl: '/placeholder.svg' },
      { type: 'address', label: 'Comprovante de residência', status: 'approved', imageUrl: '/placeholder.svg' },
      { type: 'selfie', label: 'Selfie com documento', status: 'pending', imageUrl: '/placeholder.svg' },
    ],
    previousOrders: 5, previousDisputes: 0,
  },
  {
    id: 'sv-5', name: 'Fernando Alves', initials: 'FA', email: 'fernando@email.com',
    cpfCnpj: '***.***.***-33', phone: '(51) 9****-9012', birthDate: '1988-12-01',
    city: 'Porto Alegre', state: 'RS', registeredAt: pastDate(2880), requestedAt: pastDate(48),
    status: 'approved',
    documents: [
      { type: 'id', label: 'RG/CNH', status: 'approved', imageUrl: '/placeholder.svg' },
      { type: 'address', label: 'Comprovante de residência', status: 'approved', imageUrl: '/placeholder.svg' },
      { type: 'selfie', label: 'Selfie com documento', status: 'approved', imageUrl: '/placeholder.svg' },
    ],
    previousOrders: 20, previousDisputes: 0,
  },
  {
    id: 'sv-6', name: 'Camila Rocha', initials: 'CR', email: 'camila@email.com',
    cpfCnpj: '***.***.***-56', phone: '(85) 9****-3456', birthDate: '1995-07-18',
    city: 'Fortaleza', state: 'CE', registeredAt: pastDate(960), requestedAt: pastDate(24),
    status: 'approved',
    documents: [
      { type: 'id', label: 'RG/CNH', status: 'approved', imageUrl: '/placeholder.svg' },
      { type: 'address', label: 'Comprovante de residência', status: 'approved', imageUrl: '/placeholder.svg' },
      { type: 'selfie', label: 'Selfie com documento', status: 'approved', imageUrl: '/placeholder.svg' },
    ],
    previousOrders: 8, previousDisputes: 0,
  },
  {
    id: 'sv-7', name: 'Diego Martins', initials: 'DM', email: 'diego@email.com',
    cpfCnpj: '***.***.***-99', phone: '(62) 9****-7890', birthDate: '1983-01-30',
    city: 'Goiânia', state: 'GO', registeredAt: pastDate(360), requestedAt: pastDate(36),
    status: 'rejected',
    documents: [
      { type: 'id', label: 'RG/CNH', status: 'rejected', imageUrl: '/placeholder.svg' },
      { type: 'address', label: 'Comprovante de residência', status: 'approved', imageUrl: '/placeholder.svg' },
      { type: 'selfie', label: 'Selfie com documento', status: 'rejected', imageUrl: '/placeholder.svg' },
    ],
    previousOrders: 0, previousDisputes: 0,
    rejectionReason: 'Documento ilegível',
    rejectionDetails: 'A foto do RG está muito desfocada e a selfie não corresponde ao documento enviado.',
  },
];

const rejectionReasons = [
  'Documento ilegível',
  'Documento expirado',
  'Informações inconsistentes',
  'Selfie não corresponde',
  'Documento não aceito',
  'Outro',
];

const docIcons: Record<string, React.ElementType> = {
  id: FileText,
  address: CreditCard,
  selfie: Camera,
};

function hoursAgo(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'agora';
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}

function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

const statusConfig: Record<VerificationStatus, { label: string; cls: string }> = {
  pending: { label: 'Aguardando', cls: 'bg-amber-500/20 text-amber-600 border-amber-500/30' },
  in_review: { label: 'Em análise', cls: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  approved: { label: 'Aprovado', cls: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
  rejected: { label: 'Rejeitado', cls: 'bg-destructive/20 text-destructive' },
};

const docStatusCls: Record<DocStatus, string> = {
  approved: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  rejected: 'bg-destructive/20 text-destructive',
};

/* ─── Main Component ─── */
export default function SellerVerificationPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SellerVerificationItem[]>([]);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('all');
  const [sort, setSort] = useState('oldest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analyzeItem, setAnalyzeItem] = useState<SellerVerificationItem | null>(null);

  // Dialog state
  const [decision, setDecision] = useState<'approve' | 'reject' | 'request_docs'>('approve');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDetails, setRejectDetails] = useState('');
  const [missingDocs, setMissingDocs] = useState<Set<string>>(new Set());
  const [docInstructions, setDocInstructions] = useState('');
  const [activateNow, setActivateNow] = useState(true);
  const [docTab, setDocTab] = useState('id');
  const [docStatuses, setDocStatuses] = useState<Record<string, DocStatus>>({});

  useEffect(() => {
    const t = setTimeout(() => { setItems(mockVerifications); setLoading(false); }, 500);
    return () => clearTimeout(t);
  }, []);

  const counts = useMemo(() => ({
    pending: items.filter(i => i.status === 'pending').length,
    in_review: items.filter(i => i.status === 'in_review').length,
    approved: items.filter(i => i.status === 'approved' && daysAgo(i.requestedAt) < 1).length,
    rejected: items.filter(i => i.status === 'rejected' && daysAgo(i.requestedAt) < 1).length,
  }), [items]);

  const filtered = useMemo(() => {
    const statusMap: Record<string, VerificationStatus> = { pending: 'pending', in_review: 'in_review', approved: 'approved', rejected: 'rejected' };
    let list = items.filter(i => i.status === statusMap[tab]);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q) || i.cpfCnpj.includes(q));
    }
    if (period === 'today') list = list.filter(i => daysAgo(i.requestedAt) < 1);
    else if (period === '7d') list = list.filter(i => daysAgo(i.requestedAt) <= 7);
    else if (period === '30d') list = list.filter(i => daysAgo(i.requestedAt) <= 30);
    list.sort((a, b) => sort === 'oldest'
      ? new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
      : new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
    return list;
  }, [items, tab, search, period, sort]);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const openAnalysis = (item: SellerVerificationItem) => {
    setAnalyzeItem(item);
    setDecision('approve');
    setRejectReason(''); setRejectDetails(''); setDocInstructions('');
    setMissingDocs(new Set());
    setActivateNow(true);
    setDocTab(item.documents[0]?.type ?? 'id');
    const ds: Record<string, DocStatus> = {};
    item.documents.forEach(d => { ds[d.type] = d.status; });
    setDocStatuses(ds);
  };

  const handleDecision = () => {
    if (!analyzeItem) return;
    if (decision === 'reject' && (!rejectReason || !rejectDetails)) {
      toast({ title: 'Preencha o motivo e a justificativa', variant: 'destructive' });
      return;
    }
    if (decision === 'request_docs' && missingDocs.size === 0) {
      toast({ title: 'Selecione pelo menos um documento', variant: 'destructive' });
      return;
    }
    const newStatus: VerificationStatus = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'pending';
    setItems(prev => prev.map(i => i.id === analyzeItem.id ? { ...i, status: newStatus } : i));
    const msgs = { approve: 'Vendedor aprovado', reject: 'Vendedor rejeitado', request_docs: 'Documentos solicitados' };
    toast({ title: msgs[decision] });
    setAnalyzeItem(null);
  };

  const handleBulkApprove = () => {
    setItems(prev => prev.map(i => selected.has(i.id) ? { ...i, status: 'approved' } : i));
    toast({ title: `${selected.size} vendedores aprovados` });
    setSelected(new Set());
  };

  const handleBulkRequestDocs = () => {
    toast({ title: `Documentos solicitados para ${selected.size} vendedores` });
    setSelected(new Set());
  };

  const summaryCards = [
    { label: 'Aguardando análise', value: counts.pending, icon: Clock, color: 'text-amber-500' },
    { label: 'Em análise', value: counts.in_review, icon: Search, color: 'text-blue-500' },
    { label: 'Aprovados hoje', value: counts.approved, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Rejeitados hoje', value: counts.rejected, icon: XCircle, color: 'text-[hsl(var(--kolecta-red))]' },
  ];

  /* ─── Render ─── */
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* 1. Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold">Verificação de Vendedores</h1>
          <p className="text-muted-foreground">Analise e aprove solicitações de vendedores</p>
        </div>

        {/* 2. Summary */}
        {/* API: GET /api/admin/sellers/verification/summary */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map(c => (
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

        {/* 3. Tabs */}
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setSelected(new Set()); }}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="pending">Aguardando <Badge className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-600">{items.filter(i => i.status === 'pending').length}</Badge></TabsTrigger>
            <TabsTrigger value="in_review">Em análise <Badge className="ml-1.5 text-[10px] bg-blue-500/20 text-blue-600">{items.filter(i => i.status === 'in_review').length}</Badge></TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
          </TabsList>

          {/* 4. Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar nome, email ou CPF/CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">Mais antigos primeiro</SelectItem>
                <SelectItem value="newest">Mais recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 5. Content for all tabs */}
          {['pending', 'in_review', 'approved', 'rejected'].map(tabKey => (
            <TabsContent key={tabKey} value={tabKey}>
              {loading ? (
                <div className="space-y-4 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {tabKey === 'pending' && 'Nenhuma solicitação aguardando análise'}
                    {tabKey === 'in_review' && 'Nenhuma solicitação em análise'}
                    {tabKey === 'approved' && 'Nenhum vendedor aprovado neste período'}
                    {tabKey === 'rejected' && 'Nenhum vendedor rejeitado neste período'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  {/* API: GET /api/admin/sellers/verification?status=&period= */}
                  {filtered.map(item => {
                    const queueDays = daysAgo(item.requestedAt);
                    const queueUrgent = queueDays > 2;
                    return (
                      <Card key={item.id} className="bg-gradient-card">
                        <CardContent className="flex items-start gap-3 p-4">
                          {(tab === 'pending' || tab === 'in_review') && (
                            <Checkbox
                              checked={selected.has(item.id)}
                              onCheckedChange={() => toggleSelect(item.id)}
                              className="mt-1 shrink-0"
                            />
                          )}
                          <Avatar className="h-11 w-11 shrink-0">
                            <AvatarFallback className="bg-muted text-muted-foreground font-heading text-sm">{item.initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-heading text-base font-bold">{item.name}</span>
                              <Badge className={statusConfig[item.status].cls}>{statusConfig[item.status].label}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                              <span>{item.email}</span>
                              <span>{item.cpfCnpj}</span>
                              <span>Solicitado {hoursAgo(item.requestedAt)}</span>
                              {item.status === 'pending' && (
                                <span className={queueUrgent ? 'text-[hsl(var(--kolecta-red))] font-medium' : ''}>
                                  Fila: {queueDays < 1 ? '< 1 dia' : `${queueDays} dias`}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {item.documents.map(doc => {
                                const Icon = docIcons[doc.type] ?? FileText;
                                return (
                                  <Badge key={doc.type} variant="outline" className={cn('text-[10px] gap-1', docStatusCls[doc.status])}>
                                    <Icon className="h-3 w-3" /> {doc.label}
                                  </Badge>
                                );
                              })}
                            </div>
                            {item.rejectionReason && (
                              <p className="text-xs text-destructive mt-1">Motivo: {item.rejectionReason}</p>
                            )}
                          </div>
                          {(item.status === 'pending' || item.status === 'in_review') && (
                            <Button variant="kolecta" size="sm" className="shrink-0" onClick={() => openAnalysis(item)}>
                              Analisar
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* 7. Bulk actions */}
        {/* API: POST /api/admin/sellers/bulk-verification */}
        {selected.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4 shadow-lg">
            <div className="container mx-auto flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>
              <div className="flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleBulkApprove}>
                  Aprovar selecionados
                </Button>
                <Button size="sm" variant="outline" className="border-amber-500 text-amber-600" onClick={handleBulkRequestDocs}>
                  Solicitar documentos
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Analysis Dialog ─── */}
      {analyzeItem && (
        <Dialog open onOpenChange={() => setAnalyzeItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="font-heading text-xl">Análise — {analyzeItem.name}</DialogTitle>
              <DialogDescription className="sr-only">Análise de verificação do vendedor</DialogDescription>
            </DialogHeader>
            <ScrollArea className="px-6 pb-6 max-h-[calc(90vh-120px)]">
              <div className="space-y-6 py-4">
                {/* Personal data */}
                <div>
                  <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Dados Pessoais</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Nome:</span> {analyzeItem.name}</div>
                    <div><span className="text-muted-foreground">CPF/CNPJ:</span> {analyzeItem.cpfCnpj}</div>
                    <div><span className="text-muted-foreground">Nascimento:</span> {new Date(analyzeItem.birthDate).toLocaleDateString('pt-BR')}</div>
                    <div><span className="text-muted-foreground">Email:</span> {analyzeItem.email}</div>
                    <div><span className="text-muted-foreground">Telefone:</span> {analyzeItem.phone}</div>
                    <div><span className="text-muted-foreground">Cidade/UF:</span> {analyzeItem.city}/{analyzeItem.state}</div>
                    <div><span className="text-muted-foreground">Cadastro:</span> {new Date(analyzeItem.registeredAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>

                <Separator className="line-tech" />

                {/* Documents */}
                <div>
                  <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Documentos</h3>
                  <Tabs value={docTab} onValueChange={setDocTab}>
                    <TabsList className="mb-3">
                      {analyzeItem.documents.map(d => (
                        <TabsTrigger key={d.type} value={d.type} className="text-xs gap-1">
                          {d.label}
                          <span className={cn('h-2 w-2 rounded-full ml-1', docStatuses[d.type] === 'approved' ? 'bg-emerald-500' : docStatuses[d.type] === 'rejected' ? 'bg-destructive' : 'bg-amber-500')} />
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {analyzeItem.documents.map(d => (
                      <TabsContent key={d.type} value={d.type}>
                        <div className="space-y-3">
                          <div className="bg-muted rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                            <img src={d.imageUrl} alt={d.label} className="max-h-[240px] rounded cursor-zoom-in" />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => setDocStatuses(prev => ({ ...prev, [d.type]: 'approved' }))}
                              disabled={docStatuses[d.type] === 'approved'}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar documento
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDocStatuses(prev => ({ ...prev, [d.type]: 'rejected' }))}
                              disabled={docStatuses[d.type] === 'rejected'}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reprovar documento
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                <Separator className="line-tech" />

                {/* Activity History */}
                <div>
                  <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Histórico de Atividade</h3>
                  {analyzeItem.previousOrders > 0 ? (
                    <div className="text-sm space-y-1">
                      <p>{analyzeItem.previousOrders} pedidos realizados</p>
                      <p>{analyzeItem.previousDisputes} disputas</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Primeiro cadastro na plataforma</p>
                  )}
                </div>

                <Separator className="line-tech" />

                {/* Decision */}
                {/* API: POST /api/admin/sellers/:id/verification-decision
                    Body: { decision: approve|reject|request_docs, reason?, missingDocs? } */}
                <div>
                  <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Decisão Final</h3>
                  <RadioGroup value={decision} onValueChange={(v) => setDecision(v as typeof decision)} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="approve" id="d-approve" />
                      <Label htmlFor="d-approve">Aprovar vendedor</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="reject" id="d-reject" />
                      <Label htmlFor="d-reject">Rejeitar</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="request_docs" id="d-docs" />
                      <Label htmlFor="d-docs">Solicitar mais documentos</Label>
                    </div>
                  </RadioGroup>

                  {decision === 'reject' && (
                    <div className="mt-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label>Motivo da rejeição</Label>
                        <Select value={rejectReason} onValueChange={setRejectReason}>
                          <SelectTrigger><SelectValue placeholder="Selecione um motivo" /></SelectTrigger>
                          <SelectContent>
                            {rejectionReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Justificativa</Label>
                        <Textarea value={rejectDetails} onChange={(e) => setRejectDetails(e.target.value)} placeholder="Descreva o motivo da rejeição..." rows={3} />
                      </div>
                    </div>
                  )}

                  {decision === 'request_docs' && (
                    <div className="mt-4 space-y-3">
                      <Label>Documentos faltantes</Label>
                      {analyzeItem.documents.map(d => (
                        <div key={d.type} className="flex items-center gap-2">
                          <Checkbox
                            checked={missingDocs.has(d.type)}
                            onCheckedChange={() => {
                              setMissingDocs(prev => { const n = new Set(prev); n.has(d.type) ? n.delete(d.type) : n.add(d.type); return n; });
                            }}
                          />
                          <span className="text-sm">{d.label}</span>
                        </div>
                      ))}
                      <div className="space-y-1.5">
                        <Label>Instruções para o vendedor</Label>
                        <Textarea value={docInstructions} onChange={(e) => setDocInstructions(e.target.value)} placeholder="Instruções adicionais..." rows={3} />
                      </div>
                    </div>
                  )}

                  {decision === 'approve' && (
                    <div className="mt-4 flex items-center gap-2">
                      <Switch checked={activateNow} onCheckedChange={setActivateNow} />
                      <Label>Ativar loja imediatamente</Label>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-0 border-t border-border">
              <Button variant="ghost" onClick={() => setAnalyzeItem(null)}>Cancelar</Button>
              <Button variant="kolecta" onClick={handleDecision}>Confirmar decisão</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
