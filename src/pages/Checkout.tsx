import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, MapPin, Truck, CreditCard, ChevronRight, Loader2, AlertTriangle, Copy } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useCart, CartItem } from '@/contexts/CartContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useCreateCheckout, useWallet } from '@/hooks/use-api';
import { useAddresses } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { formatBRL } from '@/lib/currency';
import { isValidCpf } from '@/lib/cpf';
import { useToast } from '@/hooks/use-toast';

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

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

// ── Shipping ──────────────────────────────────────────────────────────────

// `price` em CENTAVOS (mantém a aritmética do resumo); `serviceId` é o id do
// serviço no Melhor Envio, reaproveitado depois na geração da etiqueta.
interface ShippingOption {
  id: string;
  label: string;
  price: number;
  days: string;
  serviceId?: number;
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
  orderId: string;
  totalInCents: number;
  walletDeducted?: number;
  chargeAmount?: number;
  paidViaWallet?: boolean;
  // Cobrança PIX (Pagar.me)
  qrCode?: string;
  qrCodeUrl?: string;
  expiresAt?: string;
  sellerGroup: ReturnType<typeof groupBySeller>[0];
}

// ═════════════════════════════════════════════════════════════════════════
// CHECKOUT PAGE
// ═════════════════════════════════════════════════════════════════════════

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const groups = groupBySeller(items);
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
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState(false);
  const [isCepFilled, setIsCepFilled] = useState(false);
  const [cepInlineError, setCepInlineError] = useState('');

  // ── Shipping state ────────────────────────────────────────────────────
  const [selectedShipping, setSelectedShipping] = useState<Record<string, string>>({});
  // Opções de frete reais por vendedor (sellerSlug → opções), vindas da cotação.
  const [shippingOptions, setShippingOptions] = useState<Record<string, ShippingOption[]>>({});

  // ── Validation ────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // ── Wallet balance toggle ─────────────────────────────────────────────
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const { data: wallet } = useWallet();
  const { toast } = useToast();

  // ── Copiar código PIX ─────────────────────────────────────────────────
  async function handleCopyPix(code?: string) {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    toast({ title: 'Código PIX copiado!' });
  }

  // ── ViaCEP ────────────────────────────────────────────────────────────
  const fetchCep = useCallback(async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepInlineError('');
    setCepLoading(true);
    setCepError(false);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError(true);
        setIsCepFilled(false);
        return;
      }

      setRua(data.logradouro || '');
      setBairro(data.bairro || '');
      setCidade(data.localidade || '');
      setEstado(data.uf || '');
      setIsCepFilled(true);

      // Cotação real de frete por vendedor (Melhor Envio). A origem e o pacote
      // são resolvidos no backend a partir do listing_id.
      const results = await Promise.all(
        groups.map(async (g) => {
          try {
            const opts = await api.shipping.quote({
              to_cep: digits,
              listing_id: g.items[0]?.product.id,
            });
            const mapped: ShippingOption[] = opts.map((o) => ({
              id: `${g.sellerSlug}-${o.raw?.id ?? o.service}`,
              label: o.carrier ? `${o.carrier} ${o.service}` : o.service,
              price: Math.round(o.price * 100),
              days: `${o.delivery_time_days} dias úteis`,
              serviceId: typeof o.raw?.id === 'number' ? o.raw.id : undefined,
            }));
            return { slug: g.sellerSlug, options: mapped };
          } catch {
            return { slug: g.sellerSlug, options: [] as ShippingOption[] };
          }
        }),
      );

      const optionsBySlug: Record<string, ShippingOption[]> = {};
      const newSelected: Record<string, string> = {};
      let anyEmpty = false;
      for (const { slug, options } of results) {
        optionsBySlug[slug] = options;
        if (options.length === 0) { anyEmpty = true; continue; }
        const cheapest = options.reduce((prev, curr) => (curr.price < prev.price ? curr : prev));
        newSelected[slug] = cheapest.id;
      }
      setShippingOptions(optionsBySlug);
      setSelectedShipping(prev => ({ ...prev, ...newSelected }));
      // Se nenhum vendedor retornou opções, sinaliza o erro visual de frete.
      if (anyEmpty && Object.values(optionsBySlug).every(o => o.length === 0)) {
        setCepError(true);
      }
    } catch {
      setCepError(true);
      setIsCepFilled(false);
    } finally {
      setCepLoading(false);
    }
  }, [groups]);

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

  if (items.length === 0) return <Navigate to="/carrinho" replace />;

  // Shipping totals
  let shippingTotal = 0;
  let allShippingSelected = true;
  for (const group of groups) {
    const sel = selectedShipping[group.sellerSlug];
    if (!sel) { allShippingSelected = false; }
    else {
      const opt = (shippingOptions[group.sellerSlug] ?? []).find(o => o.id === sel);
      if (opt) shippingTotal += opt.price;
      else allShippingSelected = false;
    }
  }
  // shippingTotal está em centavos; totalPrice em reais → normaliza p/ reais.
  const grandTotal = totalPrice + shippingTotal / 100;

  // ── Validate stage 1 ─────────────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {};
    // CPF + telefone exigidos sempre (Pagar.me exige para o PIX), independente
    // de endereço salvo ou manual.
    if (!isValidCpf(cpf)) e.cpf = 'CPF inválido';
    if (phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone inválido';
    if (selectedAddressId === 'custom') {
      if (!nome.trim()) e.nome = 'Nome é obrigatório';
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
    // CPF + telefone do comprador (só dígitos) — exigidos pela Pagar.me na transação.
    const buyerCpf = cpf.replace(/\D/g, '') || undefined;
    const buyerPhone = phone.replace(/\D/g, '') || undefined;

    const result = await createCheckout.mutateAsync({ items: listingItems, addressId, useWalletBalance, buyerCpf, buyerPhone });

    // Se pagou integralmente via wallet, redireciona direto para confirmação
    if (result.paidViaWallet) {
      window.location.href = `/pedido/confirmacao?order_id=${result.orderId}&redirect_status=succeeded`;
      return;
    }

    setSessions(prev => [...prev, { ...result, sellerGroup: group }]);
    setStage('payment');
  }

  const inputCls = (field: string) => {
    const base = `bg-background ${submitted && errors[field] ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`;
    const autoFilledFields = ['rua', 'bairro', 'cidade', 'estado'];
    if (isCepFilled && autoFilledFields.includes(field)) {
      return `${base} border-[#F5C300]/40 transition-colors`;
    }
    return base;
  };

  const activeSession = sessions[sessions.length - 1];

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

                    {/* Dados de cobrança (PIX) — sempre exigidos, independente do
                        endereço escolhido; a Pagar.me exige CPF + telefone. */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-md border border-primary/20 bg-primary/5">
                      <div>
                        <Label htmlFor="cpf">CPF *</Label>
                        <Input id="cpf" className={inputCls('cpf')} value={cpf}
                          onChange={e => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
                        <FieldError msg={submitted ? errors.cpf : undefined} />
                      </div>
                      <div>
                        <Label htmlFor="phone">Telefone (com DDD) *</Label>
                        <Input id="phone" className={inputCls('phone')} value={phone}
                          onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(11) 99999-9999" />
                        <FieldError msg={submitted ? errors.phone : undefined} />
                      </div>
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

                        <div className="sm:col-span-2">
                          <Label htmlFor="cep">CEP *</Label>
                          <Input id="cep" className={inputCls('cep')} value={cep}
                            onChange={e => {
                              const val = e.target.value;
                              setCep(maskCEP(val));
                              if (val.replace(/\D/g, '').length === 8) {
                                fetchCep(val);
                              }
                            }}
                            onBlur={() => {
                              if (cep.replace(/\D/g, '').length < 8 && cep.replace(/\D/g, '').length > 0) {
                                setCepInlineError('CEP deve ter 8 dígitos');
                              } else {
                                setCepInlineError('');
                              }
                            }} placeholder="00000-000" />
                          <FieldError msg={submitted && errors.cep ? errors.cep : cepInlineError} />
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

                    {cepLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-16 w-full animate-pulse bg-muted/60 rounded-md relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent" />
                        ))}
                      </div>
                    ) : cepError ? (
                      <div className="flex items-center gap-3 p-4 rounded-md border border-destructive/50 bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium">Não encontramos opções de envio para este CEP.</p>
                      </div>
                    ) : groups.map((group, idx) => {
                      const options = shippingOptions[group.sellerSlug] ?? [];
                      return (
                        <div key={group.sellerSlug}>
                          <p className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            {group.sellerName}
                          </p>
                          {isCepFilled && options.length === 0 && (
                            <p className="text-sm text-muted-foreground mb-2">
                              Sem opções de frete para este vendedor.
                            </p>
                          )}
                          <RadioGroup
                            value={selectedShipping[group.sellerSlug] || ''}
                            onValueChange={(val) =>
                              setSelectedShipping(prev => ({ ...prev, [group.sellerSlug]: val }))
                            }
                            className="space-y-2"
                          >
                            {options.map(opt => {
                              const isActive = selectedShipping[group.sellerSlug] === opt.id;
                              return (
                                <label
                                  key={opt.id}
                                  htmlFor={opt.id}
                                  className={`flex items-center gap-3 p-3 rounded-md border transition-all cursor-pointer ${isActive ? 'border-[#F5C300]/60 bg-[#F5C300]/5' : 'border-border hover:border-primary/40'}`}
                                >
                                  <RadioGroupItem 
                                    value={opt.id} 
                                    id={opt.id} 
                                    className={isActive ? 'text-[#F5C300] border-[#F5C300]' : ''} 
                                  />
                                  <div className="flex-1">
                                    <span className="font-body text-sm font-medium">{opt.label}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({opt.days})</span>
                                  </div>
                                  <span className="font-heading font-bold text-sm text-primary">
                                    {opt.price === 0 ? 'Grátis' : formatBRL(opt.price / 100)}
                                  </span>
                                </label>
                              );
                            })}
                          </RadioGroup>
                          {idx < groups.length - 1 && <div className="line-tech my-4" />}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── STAGE 2: Pagamento via PIX (Pagar.me) ───────────── */}
            {stage === 'payment' && activeSession && (
              <Card className="bg-gradient-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-xl font-bold uppercase tracking-wide">
                      Pague com PIX
                    </h2>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Vendedor: <span className="text-foreground font-medium">{activeSession.sellerGroup.sellerName}</span>
                  </div>

                  {activeSession.walletDeducted ? (
                    <div className="text-xs rounded-md border border-primary/20 bg-primary/5 p-3">
                      Abatido do saldo: <span className="text-primary font-bold">{formatBRL((activeSession.walletDeducted ?? 0) / 100)}</span>.
                      Falta pagar via PIX: <span className="text-primary font-bold">{formatBRL((activeSession.chargeAmount ?? 0) / 100)}</span>.
                    </div>
                  ) : null}

                  <div className="flex flex-col items-center gap-4 py-2">
                    {activeSession.qrCodeUrl && (
                      <img
                        src={activeSession.qrCodeUrl}
                        alt="QR Code PIX"
                        className="h-52 w-52 rounded-lg border border-border bg-white p-2"
                      />
                    )}
                    <div className="w-full space-y-1">
                      <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">
                        PIX copia e cola
                      </label>
                      <div className="flex gap-2">
                        <Input readOnly value={activeSession.qrCode ?? ''} className="font-mono text-xs" />
                        <Button type="button" variant="outline" size="icon" onClick={() => handleCopyPix(activeSession.qrCode)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Escaneie o QR Code ou copie o código no app do seu banco.
                      Assim que o pagamento for confirmado, seu pedido é processado automaticamente.
                    </p>
                  </div>

                  <Button
                    variant="kolecta"
                    size="lg"
                    className="w-full glow-primary"
                    onClick={() => {
                      window.location.href = `/pedido/confirmacao?order_id=${activeSession.orderId}`;
                    }}
                  >
                    Já paguei — acompanhar pedido
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>

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
                    <span className="transition-all duration-200">{allShippingSelected ? formatBRL(shippingTotal / 100) : 'a calcular'}</span>
                  </div>

                  <div className="line-tech" />

                  <div className="flex justify-between items-center">
                    <span className="font-heading text-lg font-bold uppercase">Total</span>
                    <span className="font-heading text-2xl font-bold text-primary transition-all duration-200">
                      {formatBRL(grandTotal)}
                    </span>
                  </div>

                  {/* Wallet toggle */}
                  {wallet && wallet.balanceInCents > 0 && stage === 'address-shipping' && (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Usar saldo da carteira</p>
                          <p className="text-xs text-muted-foreground">
                            Disponível: <span className="text-primary font-bold">{formatBRL(wallet.balanceInCents / 100)}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={useWalletBalance}
                          onClick={() => setUseWalletBalance(!useWalletBalance)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useWalletBalance ? 'bg-primary' : 'bg-muted'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useWalletBalance ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      {useWalletBalance && (
                        <div className="text-xs text-muted-foreground">
                          {wallet.balanceInCents >= grandTotal * 100
                            ? '✅ Seu saldo cobre o valor total. Nenhum cartão será necessário.'
                            : `Será abatido ${formatBRL(wallet.balanceInCents / 100)} do saldo. O restante será cobrado no cartão.`
                          }
                        </div>
                      )}
                    </>
                  )}

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
                    <span className="text-sm font-body">Pagamento seguro via PIX · Pagar.me</span>
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
