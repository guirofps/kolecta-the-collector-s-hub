import { useState, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield, MapPin, Truck, CreditCard, ChevronRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useCart, CartItem } from '@/contexts/CartContext';
import { formatBRL } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

// ── Helpers ──────────────────────────────────────────────

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

// ── Shipping mocks per seller ────────────────────────────

interface ShippingOption {
  id: string;
  label: string;
  price: number;
  days: string;
}

function getShippingOptions(sellerSlug: string): ShippingOption[] {
  return [
    { id: `${sellerSlug}-pac`, label: 'PAC', price: 18.9, days: '8–12 dias úteis' },
    { id: `${sellerSlug}-sedex`, label: 'SEDEX', price: 34.5, days: '3–5 dias úteis' },
    { id: `${sellerSlug}-retirada`, label: 'Retirada', price: 0, days: 'Combinar com vendedor' },
  ];
}

// ── Group items by seller ────────────────────────────────

function groupBySeller(items: CartItem[]) {
  const groups: Record<string, { sellerName: string; sellerSlug: string; items: CartItem[] }> = {};
  for (const item of items) {
    const sid = item.product.seller.id;
    if (!groups[sid]) {
      groups[sid] = { sellerName: item.product.seller.name, sellerSlug: item.product.seller.slug, items: [] };
    }
    groups[sid].items.push(item);
  }
  return Object.values(groups);
}

// ── Field error helper ───────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-1">{msg}</p>;
}

// ═════════════════════════════════════════════════════════
// CHECKOUT PAGE
// ═════════════════════════════════════════════════════════

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const navigate = useNavigate();

  // ── Address state ──────────────────────────────────────
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

  // ── Shipping state (per seller) ────────────────────────
  const [selectedShipping, setSelectedShipping] = useState<Record<string, string>>({});

  // ── Payment state ──────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState('cartao');

  // ── Validation state ───────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // ── ViaCEP lookup ──────────────────────────────────────

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
    } catch {
      // silently fail
    } finally {
      setCepLoading(false);
    }
  }, []);

  // ── Compute shipping total ─────────────────────────────

  let shippingTotal = 0;
  let allShippingSelected = true;
  for (const group of groups) {
    const sel = selectedShipping[group.sellerSlug];
    if (!sel) {
      allShippingSelected = false;
    } else {
      const opt = getShippingOptions(group.sellerSlug).find(o => o.id === sel);
      if (opt) shippingTotal += opt.price;
    }
  }
  const grandTotal = totalPrice + shippingTotal;

  // ── Validation ─────────────────────────────────────────

  function validate() {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    if (cpf.replace(/\D/g, '').length !== 11) e.cpf = 'CPF inválido';
    if (cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP inválido';
    if (!rua.trim()) e.rua = 'Rua é obrigatória';
    if (!numero.trim()) e.numero = 'Número é obrigatório';
    if (!bairro.trim()) e.bairro = 'Bairro é obrigatório';
    if (!cidade.trim()) e.cidade = 'Cidade é obrigatória';
    if (!estado.trim()) e.estado = 'Estado é obrigatório';
    if (!allShippingSelected) e.shipping = 'Selecione o frete para cada vendedor';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleFinalize() {
    setSubmitted(true);
    if (validate()) {
      navigate('/pedido/confirmacao');
    }
  }

  const inputCls = (field: string) =>
    `bg-background ${submitted && errors[field] ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`;

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <Layout>
      <div className="container py-8">
        {/* Page title */}
        <h1 className="font-heading text-3xl font-bold uppercase tracking-tight mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── LEFT COLUMN ─────────────────────────────── */}
          <div className="lg:col-span-7 space-y-6">

            {/* SEÇÃO 1 — Endereço */}
            <Card className="bg-gradient-card">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Endereço de Entrega</h2>
                </div>

                <Button variant="outline-gold" size="sm" className="mb-2" disabled>
                  Usar endereço salvo
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome completo */}
                  <div className="sm:col-span-2">
                    <Label htmlFor="nome">Nome completo *</Label>
                    <Input id="nome" className={inputCls('nome')} value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" />
                    <FieldError msg={submitted ? errors.nome : undefined} />
                  </div>

                  {/* CPF */}
                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input id="cpf" className={inputCls('cpf')} value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
                    <FieldError msg={submitted ? errors.cpf : undefined} />
                  </div>

                  {/* CEP */}
                  <div>
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="cep"
                      className={inputCls('cep')}
                      value={cep}
                      onChange={e => setCep(maskCEP(e.target.value))}
                      onBlur={() => fetchCep(cep)}
                      placeholder="00000-000"
                    />
                    {cepLoading && <p className="text-xs text-muted-foreground mt-1">Buscando endereço…</p>}
                    <FieldError msg={submitted ? errors.cep : undefined} />
                  </div>

                  {/* Rua */}
                  <div className="sm:col-span-2">
                    <Label htmlFor="rua">Rua *</Label>
                    <Input id="rua" className={inputCls('rua')} value={rua} onChange={e => setRua(e.target.value)} placeholder="Rua, Avenida..." />
                    <FieldError msg={submitted ? errors.rua : undefined} />
                  </div>

                  {/* Número */}
                  <div>
                    <Label htmlFor="numero">Número *</Label>
                    <Input id="numero" className={inputCls('numero')} value={numero} onChange={e => setNumero(e.target.value)} placeholder="123" />
                    <FieldError msg={submitted ? errors.numero : undefined} />
                  </div>

                  {/* Complemento */}
                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input id="complemento" value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Apto, Bloco..." />
                  </div>

                  {/* Bairro */}
                  <div>
                    <Label htmlFor="bairro">Bairro *</Label>
                    <Input id="bairro" className={inputCls('bairro')} value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" />
                    <FieldError msg={submitted ? errors.bairro : undefined} />
                  </div>

                  {/* Cidade */}
                  <div>
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Input id="cidade" className={inputCls('cidade')} value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
                    <FieldError msg={submitted ? errors.cidade : undefined} />
                  </div>

                  {/* Estado */}
                  <div>
                    <Label htmlFor="estado">Estado *</Label>
                    <Input id="estado" className={inputCls('estado')} value={estado} onChange={e => setEstado(e.target.value)} placeholder="UF" maxLength={2} />
                    <FieldError msg={submitted ? errors.estado : undefined} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SEÇÃO 2 — Método de Entrega */}
            <Card className="bg-gradient-card">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Método de Entrega</h2>
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
                              {opt.price === 0 ? 'Grátis' : formatBRL(opt.price)}
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

            {/* SEÇÃO 3 — Pagamento */}
            <Card className="bg-gradient-card">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Pagamento</h2>
                </div>

                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                  {/* Cartão de crédito */}
                  <label htmlFor="pay-cartao" className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/40 transition-colors cursor-pointer">
                    <RadioGroupItem value="cartao" id="pay-cartao" />
                    <span className="font-body text-sm font-medium">Cartão de Crédito</span>
                  </label>

                  {/* Pix — desabilitado */}
                  <label className="flex items-center gap-3 p-3 rounded-md border border-border opacity-50 cursor-not-allowed">
                    <RadioGroupItem value="pix" id="pay-pix" disabled />
                    <span className="font-body text-sm font-medium">Pix</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">Em breve</Badge>
                  </label>

                  {/* Boleto — desabilitado */}
                  <label className="flex items-center gap-3 p-3 rounded-md border border-border opacity-50 cursor-not-allowed">
                    <RadioGroupItem value="boleto" id="pay-boleto" disabled />
                    <span className="font-body text-sm font-medium">Boleto Bancário</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">Em breve</Badge>
                  </label>
                </RadioGroup>

                {paymentMethod === 'cartao' && (
                  <>
                    {/* STRIPE ELEMENTS: este div será substituído pelo componente <CardElement /> do @stripe/react-stripe-js. O backend deve fornecer o clientSecret via POST /api/checkout/create-payment-intent antes de renderizar este componente */}
                    <div className="flex items-center justify-center h-[120px] rounded-md border-2 border-dashed border-glow-gold bg-muted/30">
                      <p className="text-sm text-muted-foreground text-center px-4">
                        Dados do cartão — integração Stripe pendente
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN — Resumo ───────────────────── */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <Card className="bg-gradient-card">
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Resumo do Pedido</h2>

                  {/* Compact item list */}
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.product.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                          <img src={item.product.images[0]} alt={item.product.title} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-xs font-bold uppercase truncate">{item.product.title}</p>
                          <p className="text-[10px] text-muted-foreground">Qtd: {item.quantity}</p>
                        </div>
                        <span className="font-heading text-sm font-bold text-primary shrink-0">
                          {formatBRL((item.product.price ?? 0) * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Subtotal */}
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatBRL(totalPrice)}</span>
                  </div>

                  {/* Frete */}
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted-foreground">Frete</span>
                    <span>{allShippingSelected ? formatBRL(shippingTotal) : 'a calcular'}</span>
                  </div>

                  <div className="line-tech" />

                  {/* Total */}
                  <div className="flex justify-between items-center">
                    <span className="font-heading text-lg font-bold uppercase">Total</span>
                    <span className="font-heading text-2xl font-bold text-primary">
                      {formatBRL(grandTotal)}
                    </span>
                  </div>

                  {/* CTA */}
                  <Button
                    variant="kolecta"
                    size="lg"
                    className="w-full glow-primary"
                    onClick={handleFinalize}
                  >
                    Finalizar Pedido
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>

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
