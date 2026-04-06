import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, MapPin, Truck, CreditCard, ChevronRight, Loader2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useCart, CartItem } from '@/contexts/CartContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '@/components/checkout/StripePaymentForm';
import { useCreateCheckout } from '@/hooks/use-api';
import { useAddresses } from '@/hooks/use-api';

// ── Stripe singleton — inicializa uma vez ─────────────────────────────────

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

// ── Helpers ───────────────────────────────────────────────────────────────

function maskCEP(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function maskCPF(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatBRL(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Shipping ──────────────────────────────────────────────────────────────

interface ShippingOption { id: string; label: string; price: number; days: string; }

function getShippingOptions(sellerSlug: string): ShippingOption[] {
  return [
    { id: `${sellerSlug}-pac`, label: 'PAC', price: 1890, days: '8–12 dias úteis' },
    { id: `${sellerSlug}-sedex`, label: 'SEDEX', price: 3450, days: '3–5 dias úteis' },
    { id: `${sellerSlug}-retirada`, label: 'Retirada', price: 0, days: 'Combinar com vendedor' },
  ];
}

function groupBySeller(items: CartItem[]) {
  const groups: Record<string, { sellerName: string; sellerSlug: string; sellerId: string; items: CartItem[] }> = {};
  for (const item of items) {
    const sid = item.product.seller.id;
    if (!groups[sid]) {
      groups[sid] = {
        sellerName: item.product.seller.name,
        sellerSlug: item.product.seller.slug,
        sellerId: item.product.seller.id,
        items: [],
      };
    }
    groups[sid].items.push(item);
  }
  return Object.values(groups);
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-1">{msg}</p>;
}

// ── Stages ────────────────────────────────────────────────────────────────

type Stage = 'address-shipping' | 'payment';

interface CheckoutSession {
  clientSecret: string;
  orderId: string;
  totalInCents: number;
  sellerGroup: ReturnType<typeof groupBySeller>[0];
}

// ═════════════════════════════════════════════════════════════════════════
// CHECKOUT PAGE
// ═════════════════════════════════════════════════════════════════════════

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const createCheckout = useCreateCheckout();
  const { query: addressQuery } = useAddresses();
  const savedAddresses = addressQuery.data ?? [];

  // ── Stage ────────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('address-shipping');
  // Para MVP: um seller por vez, processa o primeiro grupo
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [sessions, setSessions] = useState<CheckoutSession[]>([]);

  // ── Address state ─────────────────────────────────────────────────────
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'custom'>('custom');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  // ── Shipping state ────────────────────────────────────────────────────
  const [selectedShipping, setSelectedShipping] = useState<Record<string, string>>({});

  // ── Validation ────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // ── ViaCEP ────────────────────────────────────────────────────────────
  const fetchCep = useCallback(async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setRua(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setEstado(data.uf || '');
      }
    } catch { /* silently fail */ } finally {
      setCepLoading(false);
    }
  }, []);

  // ── Pre-fill from saved address ───────────────────────────────────────
  function applySavedAddress(addrId: string) {
    setSelectedAddressId(addrId);
    const addr = savedAddresses.find(a => a.id === addrId);
    if (!addr) return;
    setNome(addr.recipientName);
    setCep(addr.zip);
    setRua(addr.street);
    setNumero(addr.number);
    setComplemento(addr.complement ?? '');
    setBairro(addr.neighborhood);
    setCidade(addr.city);
    setEstado(addr.state);
  }

  // Cart groups
  const groups = groupBySeller(items);

  if (items.length === 0) return <Navigate to="/carrinho" replace />;

  // Shipping totals
  let shippingTotal = 0;
  let allShippingSelected = true;
  for (const group of groups) {
    const sel = selectedShipping[group.sellerSlug];
    if (!sel) { allShippingSelected = false; }
    else {
      const opt = getShippingOptions(group.sellerSlug).find(o => o.id === sel);
      if (opt) shippingTotal += opt.price;
    }
  }
  const grandTotal = totalPrice + shippingTotal;

  // ── Validate stage 1 ─────────────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {};
    if (selectedAddressId === 'custom') {
      if (!nome.trim()) e.nome = 'Nome é obrigatório';
      if (cpf.replace(/\D/g, '').length !== 11) e.cpf = 'CPF inválido';
      if (cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP inválido';
      if (!rua.trim()) e.rua = 'Rua é obrigatória';
      if (!numero.trim()) e.numero = 'Número é obrigatório';
      if (!bairro.trim()) e.bairro = 'Bairro é obrigatório';
      if (!cidade.trim()) e.cidade = 'Cidade é obrigatória';
      if (!estado.trim()) e.estado = 'Estado é obrigatório';
    }
    if (!allShippingSelected) e.shipping = 'Selecione o frete para cada vendedor';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Advance to payment (calls backend) ───────────────────────────────
  async function handleGoToPayment() {
    setSubmitted(true);
    if (!validate()) return;

    const group = groups[currentGroupIndex];

    // Um listingId por item do grupo (MVP: 1 item por seller)
    const listingItems = group.items.map(i => ({ listingId: i.product.id }));
    const addressId = selectedAddressId !== 'custom' ? selectedAddressId : undefined;

    const result = await createCheckout.mutateAsync({ items: listingItems, addressId });

    setSessions(prev => [...prev, { ...result, sellerGroup: group }]);
    setStage('payment');
  }

  const inputCls = (field: string) =>
    `bg-background ${submitted && errors[field] ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`;

  const activeSession = sessions[sessions.length - 1];

  // ── Appearance para o Elements ────────────────────────────────────────
  const stripeAppearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#E5C547',
      colorBackground: 'hsl(222 47% 11%)',
      colorText: 'hsl(210 40% 96%)',
      colorDanger: 'hsl(0 84% 60%)',
      fontFamily: '"Inter", system-ui, sans-serif',
      borderRadius: '8px',
    },
  };

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-heading text-3xl font-bold uppercase tracking-tight mb-8">
          Checkout
          {stage === 'payment' && (
            <span className="text-primary"> · Pagamento</span>
          )}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── LEFT ────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-6">

            {/* ── STAGE 1: Endereço + Frete ───────────────────────── */}
            {stage === 'address-shipping' && (
              <>
                {/* Endereço */}
                <Card className="bg-gradient-card">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h2 className="font-heading text-xl font-bold uppercase tracking-wide">
                        Endereço de Entrega
                      </h2>
                    </div>

                    {/* Endereços salvos */}
                    {savedAddresses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Endereços salvos</p>
                        <RadioGroup
                          value={selectedAddressId}
                          onValueChange={(v) => v === 'custom' ? setSelectedAddressId('custom') : applySavedAddress(v)}
                        >
                          {savedAddresses.map(addr => (
                            <label
                              key={addr.id}
                              htmlFor={`addr-${addr.id}`}
                              className="flex items-start gap-3 p-3 rounded-md border border-border hover:border-primary/40 cursor-pointer transition-colors"
                            >
                              <RadioGroupItem value={addr.id} id={`addr-${addr.id}`} className="mt-0.5" />
                              <div className="text-sm leading-snug">
                                <p className="font-medium">{addr.recipientName}</p>
                                <p className="text-muted-foreground">
                                  {addr.street}, {addr.number} — {addr.city}/{addr.state}
                                </p>
                              </div>
                              {addr.isDefault && (
                                <Badge variant="outline" className="ml-auto text-[10px] shrink-0">Padrão</Badge>
                              )}
                            </label>
                          ))}
                          <label
                            htmlFor="addr-custom"
                            className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/40 cursor-pointer transition-colors"
                          >
                            <RadioGroupItem value="custom" id="addr-custom" />
                            <span className="text-sm font-medium">Outro endereço</span>
                          </label>
                        </RadioGroup>
                      </div>
                    )}

                    {/* Form manual (sempre visível se sem endereços salvos, ou se "Outro" selecionado) */}
                    {(savedAddresses.length === 0 || selectedAddressId === 'custom') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="sm:col-span-2">
                          <Label htmlFor="nome">Nome completo *</Label>
                          <Input id="nome" className={inputCls('nome')} value={nome}
                            onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" />
                          <FieldError msg={submitted ? errors.nome : undefined} />
                        </div>

                        <div>
                          <Label htmlFor="cpf">CPF *</Label>
                          <Input id="cpf" className={inputCls('cpf')} value={cpf}
                            onChange={e => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
                          <FieldError msg={submitted ? errors.cpf : undefined} />
                        </div>

                        <div>
                          <Label htmlFor="cep">CEP *</Label>
                          <Input id="cep" className={inputCls('cep')} value={cep}
                            onChange={e => setCep(maskCEP(e.target.value))}
                            onBlur={() => fetchCep(cep)} placeholder="00000-000" />
                          {cepLoading && <p className="text-xs text-muted-foreground mt-1">Buscando…</p>}
                          <FieldError msg={submitted ? errors.cep : undefined} />
                        </div>

                        <div className="sm:col-span-2">
                          <Label htmlFor="rua">Rua *</Label>
                          <Input id="rua" className={inputCls('rua')} value={rua}
                            onChange={e => setRua(e.target.value)} placeholder="Rua, Avenida..." />
                          <FieldError msg={submitted ? errors.rua : undefined} />
                        </div>

                        <div>
                          <Label htmlFor="numero">Número *</Label>
                          <Input id="numero" className={inputCls('numero')} value={numero}
                            onChange={e => setNumero(e.target.value)} placeholder="123" />
                          <FieldError msg={submitted ? errors.numero : undefined} />
                        </div>

                        <div>
                          <Label htmlFor="complemento">Complemento</Label>
                          <Input id="complemento" value={complemento}
                            onChange={e => setComplemento(e.target.value)} placeholder="Apto, Bloco..." />
                        </div>

                        <div>
                          <Label htmlFor="bairro">Bairro *</Label>
                          <Input id="bairro" className={inputCls('bairro')} value={bairro}
                            onChange={e => setBairro(e.target.value)} placeholder="Bairro" />
                          <FieldError msg={submitted ? errors.bairro : undefined} />
                        </div>

                        <div>
                          <Label htmlFor="cidade">Cidade *</Label>
                          <Input id="cidade" className={inputCls('cidade')} value={cidade}
                            onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
                          <FieldError msg={submitted ? errors.cidade : undefined} />
                        </div>

                        <div>
                          <Label htmlFor="estado">Estado *</Label>
                          <Input id="estado" className={inputCls('estado')} value={estado}
                            onChange={e => setEstado(e.target.value)} placeholder="UF" maxLength={2} />
                          <FieldError msg={submitted ? errors.estado : undefined} />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Frete */}
                <Card className="bg-gradient-card">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-5 w-5 text-primary" />
                      <h2 className="font-heading text-xl font-bold uppercase tracking-wide">
                        Método de Entrega
                      </h2>
                    </div>

                    {submitted && errors.shipping && (
                      <p className="text-xs text-destructive">{errors.shipping}</p>
                    )}

                    {groups.map((group, idx) => {
                      const options = getShippingOptions(group.sellerSlug);
                      return (
                        <div key={group.sellerSlug}>
                          <p className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            {group.sellerName}
                          </p>
                          <RadioGroup
                            value={selectedShipping[group.sellerSlug] || ''}
                            onValueChange={(val) =>
                              setSelectedShipping(prev => ({ ...prev, [group.sellerSlug]: val }))
                            }
                            className="space-y-2"
                          >
                            {options.map(opt => (
                              <label
                                key={opt.id}
                                htmlFor={opt.id}
                                className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/40 transition-colors cursor-pointer"
                              >
                                <RadioGroupItem value={opt.id} id={opt.id} />
                                <div className="flex-1">
                                  <span className="font-body text-sm font-medium">{opt.label}</span>
                                  <span className="text-xs text-muted-foreground ml-2">({opt.days})</span>
                                </div>
                                <span className="font-heading font-bold text-sm text-primary">
                                  {opt.price === 0 ? 'Grátis' : formatBRL(opt.price / 100)}
                                </span>
                              </label>
                            ))}
                          </RadioGroup>
                          {idx < groups.length - 1 && <div className="line-tech my-4" />}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── STAGE 2: Stripe Payment Element ─────────────────── */}
            {stage === 'payment' && activeSession && (
              <Card className="bg-gradient-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-xl font-bold uppercase tracking-wide">
                      Pagamento
                    </h2>
                  </div>

                  <div className="text-sm text-muted-foreground mb-4">
                    Vendedor: <span className="text-foreground font-medium">{activeSession.sellerGroup.sellerName}</span>
                  </div>

                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret: activeSession.clientSecret,
                      appearance: stripeAppearance,
                      locale: 'pt-BR',
                    }}
                  >
                    <StripePaymentForm
                      orderId={activeSession.orderId}
                      totalInCents={activeSession.totalInCents}
                    />
                  </Elements>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => { setStage('address-shipping'); setSessions([]); }}
                  >
                    ← Voltar ao endereço
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── RIGHT COLUMN — Resumo ─────────────────────────────── */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <Card className="bg-gradient-card">
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-heading text-xl font-bold uppercase tracking-wide">
                    Resumo do Pedido
                  </h2>

                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.product.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                          <img src={item.product.images[0]} alt={item.product.title}
                            className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-xs font-bold uppercase truncate">{item.product.title}</p>
                          <p className="text-[10px] text-muted-foreground">Qtd: {item.quantity}</p>
                        </div>
                        <span className="font-heading text-sm font-bold text-primary shrink-0">
                          {formatBRL(((item.product.price ?? 0) * item.quantity))}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatBRL(totalPrice)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Frete</span>
                    <span>{allShippingSelected ? formatBRL(shippingTotal / 100) : 'a calcular'}</span>
                  </div>

                  <div className="line-tech" />

                  <div className="flex justify-between items-center">
                    <span className="font-heading text-lg font-bold uppercase">Total</span>
                    <span className="font-heading text-2xl font-bold text-primary">
                      {formatBRL(grandTotal)}
                    </span>
                  </div>

                  {/* CTA Stage 1 */}
                  {stage === 'address-shipping' && (
                    <Button
                      variant="kolecta"
                      size="lg"
                      className="w-full glow-primary"
                      onClick={handleGoToPayment}
                      disabled={createCheckout.isPending}
                    >
                      {createCheckout.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Preparando pagamento...
                        </>
                      ) : (
                        <>
                          Ir para pagamento
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}

                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-body">Pagamento seguro via Stripe</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
