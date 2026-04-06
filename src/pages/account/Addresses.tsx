import { useState, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
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
import { useAddresses } from '@/hooks/use-api';
import type { Address, CreateAddressPayload } from '@/lib/api';

// ── CEP mask ─────────────────────────────────────────────

function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// ── Blank form ───────────────────────────────────────────

const blankForm: CreateAddressPayload = {
  label: '',
  recipientName: '',
  zip: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  country: 'BR',
  isDefault: false,
};

// ═════════════════════════════════════════════════════════

export default function AddressesPage() {
  const { query, createMutation, updateMutation, removeMutation } = useAddresses();

  const addresses = query.data ?? [];

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAddressPayload>(blankForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // Delete confirm dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const addressToDelete = addresses.find((a) => a.id === deleteId);

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
      label: addr.label ?? '',
      recipientName: addr.recipientName,
      zip: addr.zip,
      street: addr.street,
      number: addr.number,
      complement: addr.complement ?? '',
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      country: addr.country,
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
        setForm((prev) => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }));
      }
    } catch { /* silently fail */ } finally {
      setCepLoading(false);
    }
  }, []);

  // ── Validate ───────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {};
    if (!form.recipientName.trim()) e.recipientName = 'Obrigatório';
    if (form.zip.replace(/\D/g, '').length !== 8) e.zip = 'CEP inválido';
    if (!form.street.trim()) e.street = 'Obrigatório';
    if (!form.number.trim()) e.number = 'Obrigatório';
    if (!form.neighborhood.trim()) e.neighborhood = 'Obrigatório';
    if (!form.city.trim()) e.city = 'Obrigatório';
    if (!form.state.trim()) e.state = 'Obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Save ───────────────────────────────────────────────
  async function handleSave() {
    setSubmitted(true);
    if (!validate()) return;

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, body: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    setDialogOpen(false);
  }

  // ── Set default ────────────────────────────────────────
  function setDefault(addr: Address) {
    updateMutation.mutate({ id: addr.id, body: { isDefault: true } });
  }

  // ── Delete ─────────────────────────────────────────────
  function confirmDelete() {
    if (!deleteId) return;
    removeMutation.mutate(deleteId);
    setDeleteId(null);
  }

  const inputCls = (field: string) =>
    `bg-background ${submitted && errors[field] ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`;

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ═══════════════════════════════════════════════════════

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
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

        {/* Loading state */}
        {query.isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {query.isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-destructive">Não foi possível carregar os endereços. Tente novamente.</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => query.refetch()}>Tentar novamente</Button>
          </div>
        )}

        {/* Empty state */}
        {!query.isLoading && !query.isError && addresses.length === 0 && (
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
            {addresses.map((addr) => (
              <Card key={addr.id} className="bg-gradient-card">
                <CardContent className="p-5 space-y-3">
                  {addr.isDefault && (
                    <Badge className="bg-kolecta-gold/10 text-kolecta-gold border-kolecta-gold/30 mb-1">
                      Endereço padrão
                    </Badge>
                  )}
                  {addr.label && (
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{addr.label}</p>
                  )}
                  <p className="font-heading text-base font-bold uppercase">{addr.recipientName}</p>
                  <div className="text-sm font-body text-muted-foreground space-y-0.5">
                    <p>{addr.street}, {addr.number}{addr.complement ? ` — ${addr.complement}` : ''}</p>
                    <p>{addr.neighborhood}</p>
                    <p>{addr.city}/{addr.state}</p>
                    <p>CEP {addr.zip}</p>
                  </div>
                  <Separator />
                  <div className="flex gap-2 flex-wrap">
                    {!addr.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefault(addr)}
                        disabled={updateMutation.isPending}
                      >
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
                      disabled={removeMutation.isPending}
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
              <Label htmlFor="addr-label">Identificação (opcional)</Label>
              <Input
                id="addr-label"
                value={form.label ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="Ex: Casa, Trabalho..."
              />
            </div>

            <div>
              <Label htmlFor="addr-name">Nome do destinatário *</Label>
              <Input
                id="addr-name"
                className={inputCls('recipientName')}
                value={form.recipientName}
                onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))}
                placeholder="Nome completo"
              />
              {submitted && errors.recipientName && <p className="text-xs text-destructive mt-1">{errors.recipientName}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="addr-cep">CEP *</Label>
                <Input
                  id="addr-cep"
                  className={inputCls('zip')}
                  value={form.zip}
                  onChange={(e) => setForm((p) => ({ ...p, zip: maskCEP(e.target.value) }))}
                  onBlur={() => fetchCep(form.zip)}
                  placeholder="00000-000"
                />
                {cepLoading && <p className="text-xs text-muted-foreground mt-1">Buscando…</p>}
                {submitted && errors.zip && <p className="text-xs text-destructive mt-1">{errors.zip}</p>}
              </div>
              <div>
                <Label htmlFor="addr-numero">Número *</Label>
                <Input
                  id="addr-numero"
                  className={inputCls('number')}
                  value={form.number}
                  onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                  placeholder="123"
                />
                {submitted && errors.number && <p className="text-xs text-destructive mt-1">{errors.number}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="addr-rua">Rua *</Label>
              <Input
                id="addr-rua"
                className={inputCls('street')}
                value={form.street}
                onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))}
                placeholder="Rua, Avenida..."
              />
              {submitted && errors.street && <p className="text-xs text-destructive mt-1">{errors.street}</p>}
            </div>

            <div>
              <Label htmlFor="addr-comp">Complemento</Label>
              <Input
                id="addr-comp"
                value={form.complement ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, complement: e.target.value }))}
                placeholder="Apto, Bloco..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="addr-bairro">Bairro *</Label>
                <Input
                  id="addr-bairro"
                  className={inputCls('neighborhood')}
                  value={form.neighborhood}
                  onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}
                  placeholder="Bairro"
                />
                {submitted && errors.neighborhood && <p className="text-xs text-destructive mt-1">{errors.neighborhood}</p>}
              </div>
              <div>
                <Label htmlFor="addr-cidade">Cidade *</Label>
                <Input
                  id="addr-cidade"
                  className={inputCls('city')}
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Cidade"
                />
                {submitted && errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
              </div>
              <div>
                <Label htmlFor="addr-estado">UF *</Label>
                <Input
                  id="addr-estado"
                  className={inputCls('state')}
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                  placeholder="UF"
                  maxLength={2}
                />
                {submitted && errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="addr-default"
                checked={form.isDefault ?? false}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isDefault: !!v }))}
              />
              <Label htmlFor="addr-default" className="text-sm font-body cursor-pointer">
                Definir como endereço padrão
              </Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={isSaving}>Cancelar</Button>
            </DialogClose>
            <Button variant="kolecta" className="glow-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold uppercase">
              Remover endereço?
            </DialogTitle>
          </DialogHeader>
          {addressToDelete && (
            <p className="text-sm text-muted-foreground">
              O endereço <span className="text-foreground font-medium">{addressToDelete.street}, {addressToDelete.number} — {addressToDelete.city}/{addressToDelete.state}</span> será removido permanentemente.
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={removeMutation.isPending}>
              {removeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
