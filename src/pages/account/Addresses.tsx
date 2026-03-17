import { useState, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';

// ── Types ────────────────────────────────────────────────

interface Address {
  id: string;
  name: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  isDefault: boolean;
}

// ── CEP mask ─────────────────────────────────────────────

function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// ── Mock data ────────────────────────────────────────────

const seedAddresses: Address[] = [
  {
    id: 'a1', name: 'Lucas Mendes', cep: '01310-100',
    rua: 'Av. Paulista', numero: '1578', complemento: 'Sala 42',
    bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP', isDefault: true,
  },
  {
    id: 'a2', name: 'Lucas Mendes', cep: '80250-060',
    rua: 'Rua Comendador Araújo', numero: '503', complemento: '',
    bairro: 'Centro', cidade: 'Curitiba', estado: 'PR', isDefault: false,
  },
];

// ── Blank form ───────────────────────────────────────────

const blankForm = { name: '', cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', isDefault: false };

// ═════════════════════════════════════════════════════════

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>(seedAddresses);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // Delete confirm dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const addressToDelete = addresses.find(a => a.id === deleteId);

  // ── Open create dialog ─────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setForm(blankForm);
    setErrors({});
    setSubmitted(false);
    setDialogOpen(true);
  }

  // ── Open edit dialog ───────────────────────────────────
  function openEdit(addr: Address) {
    setEditingId(addr.id);
    setForm({
      name: addr.name, cep: addr.cep, rua: addr.rua,
      numero: addr.numero, complemento: addr.complemento,
      bairro: addr.bairro, cidade: addr.cidade, estado: addr.estado,
      isDefault: addr.isDefault,
    });
    setErrors({});
    setSubmitted(false);
    setDialogOpen(true);
  }

  // ── ViaCEP ─────────────────────────────────────────────
  const fetchCep = useCallback(async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        }));
      }
    } catch { /* silently fail */ } finally {
      setCepLoading(false);
    }
  }, []);

  // ── Validate ───────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Obrigatório';
    if (form.cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP inválido';
    if (!form.rua.trim()) e.rua = 'Obrigatório';
    if (!form.numero.trim()) e.numero = 'Obrigatório';
    if (!form.bairro.trim()) e.bairro = 'Obrigatório';
    if (!form.cidade.trim()) e.cidade = 'Obrigatório';
    if (!form.estado.trim()) e.estado = 'Obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Save ───────────────────────────────────────────────
  function handleSave() {
    setSubmitted(true);
    if (!validate()) return;

    if (editingId) {
      setAddresses(prev => prev.map(a => {
        if (a.id === editingId) return { ...a, ...form };
        if (form.isDefault) return { ...a, isDefault: false };
        return a;
      }));
    } else {
      const newAddr: Address = { id: `a${Date.now()}`, ...form };
      setAddresses(prev => {
        const list = form.isDefault ? prev.map(a => ({ ...a, isDefault: false })) : prev;
        return [...list, newAddr];
      });
    }
    setDialogOpen(false);
  }

  // ── Set default ────────────────────────────────────────
  function setDefault(id: string) {
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
  }

  // ── Delete ─────────────────────────────────────────────
  function confirmDelete() {
    if (!deleteId) return;
    setAddresses(prev => prev.filter(a => a.id !== deleteId));
    setDeleteId(null);
  }

  const inputCls = (field: string) =>
    `bg-background ${submitted && errors[field] ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`;

  // ═══════════════════════════════════════════════════════

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        {/* API: GET /api/addresses — lista endereços do usuário
            POST /api/addresses — cria novo endereço
            PUT /api/addresses/:id — atualiza endereço
            DELETE /api/addresses/:id — remove endereço
            PATCH /api/addresses/:id/default — define como padrão */}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight">Meus Endereços</h1>
          </div>
          <Button variant="kolecta" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar endereço
          </Button>
        </div>

        {/* Empty state */}
        {addresses.length === 0 && (
          <EmptyState
            icon={MapPin}
            title="Você ainda não tem endereços cadastrados"
            action={
              <Button variant="kolecta" onClick={openCreate}>
                Adicionar primeiro endereço
              </Button>
            }
          />
        )}

        {/* Grid */}
        {addresses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map(addr => (
              <Card key={addr.id} className="bg-gradient-card">
                <CardContent className="p-5 space-y-3">
                  {addr.isDefault && (
                    <Badge className="bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/30 mb-1">
                      Endereço padrão
                    </Badge>
                  )}
                  <p className="font-heading text-base font-bold uppercase">{addr.name}</p>
                  <div className="text-sm font-body text-muted-foreground space-y-0.5">
                    <p>{addr.rua}, {addr.numero}{addr.complemento ? ` — ${addr.complemento}` : ''}</p>
                    <p>{addr.bairro}</p>
                    <p>{addr.cidade}/{addr.estado}</p>
                    <p>CEP {addr.cep}</p>
                  </div>
                  <Separator />
                  <div className="flex gap-2 flex-wrap">
                    {!addr.isDefault && (
                      <Button variant="ghost" size="sm" onClick={() => setDefault(addr.id)}>
                        Definir como padrão
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(addr)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(addr.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Dialog ────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold uppercase">
              {editingId ? 'Editar Endereço' : 'Novo Endereço'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="addr-name">Nome do destinatário *</Label>
              <Input id="addr-name" className={inputCls('name')} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" />
              {submitted && errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="addr-cep">CEP *</Label>
                <Input
                  id="addr-cep"
                  className={inputCls('cep')}
                  value={form.cep}
                  onChange={e => setForm(p => ({ ...p, cep: maskCEP(e.target.value) }))}
                  onBlur={() => fetchCep(form.cep)}
                  placeholder="00000-000"
                />
                {cepLoading && <p className="text-xs text-muted-foreground mt-1">Buscando…</p>}
                {submitted && errors.cep && <p className="text-xs text-destructive mt-1">{errors.cep}</p>}
              </div>
              <div>
                <Label htmlFor="addr-numero">Número *</Label>
                <Input id="addr-numero" className={inputCls('numero')} value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder="123" />
                {submitted && errors.numero && <p className="text-xs text-destructive mt-1">{errors.numero}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="addr-rua">Rua *</Label>
              <Input id="addr-rua" className={inputCls('rua')} value={form.rua} onChange={e => setForm(p => ({ ...p, rua: e.target.value }))} placeholder="Rua, Avenida..." />
              {submitted && errors.rua && <p className="text-xs text-destructive mt-1">{errors.rua}</p>}
            </div>

            <div>
              <Label htmlFor="addr-comp">Complemento</Label>
              <Input id="addr-comp" value={form.complemento} onChange={e => setForm(p => ({ ...p, complemento: e.target.value }))} placeholder="Apto, Bloco..." />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="addr-bairro">Bairro *</Label>
                <Input id="addr-bairro" className={inputCls('bairro')} value={form.bairro} onChange={e => setForm(p => ({ ...p, bairro: e.target.value }))} placeholder="Bairro" />
                {submitted && errors.bairro && <p className="text-xs text-destructive mt-1">{errors.bairro}</p>}
              </div>
              <div>
                <Label htmlFor="addr-cidade">Cidade *</Label>
                <Input id="addr-cidade" className={inputCls('cidade')} value={form.cidade} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))} placeholder="Cidade" />
                {submitted && errors.cidade && <p className="text-xs text-destructive mt-1">{errors.cidade}</p>}
              </div>
              <div>
                <Label htmlFor="addr-estado">UF *</Label>
                <Input id="addr-estado" className={inputCls('estado')} value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} placeholder="UF" maxLength={2} />
                {submitted && errors.estado && <p className="text-xs text-destructive mt-1">{errors.estado}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="addr-default"
                checked={form.isDefault}
                onCheckedChange={v => setForm(p => ({ ...p, isDefault: !!v }))}
              />
              <Label htmlFor="addr-default" className="text-sm font-body cursor-pointer">
                Definir como endereço padrão
              </Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button variant="kolecta" className="glow-primary" onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold uppercase">
              Remover endereço?
            </DialogTitle>
          </DialogHeader>
          {addressToDelete && (
            <p className="text-sm text-muted-foreground">
              O endereço <span className="text-foreground font-medium">{addressToDelete.rua}, {addressToDelete.numero} — {addressToDelete.cidade}/{addressToDelete.estado}</span> será removido permanentemente.
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
