import { useState, useCallback, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, MapPin, Truck, CreditCard, QrCode, ChevronRight, Loader2, AlertTriangle, Copy } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useCart, CartItem } from '@/contexts/CartContext';
import { trackEvent } from '@/lib/analytics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useCreateCheckout, useInstallmentsSimulation } from '@/hooks/use-api';
import { useAddresses } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { formatBRL } from '@/lib/currency';
import { isValidCpf } from '@/lib/cpf';
import { tokenizeCard, CardTokenizationError, isCardPaymentEnabled } from '@/lib/pagarme';
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

function maskCardNumber(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function maskExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

// Opção de parcelamento vinda da simulação do backend.
interface InstallmentOption {
  installments: number;
  installmentInCents: number;
  totalInCents: number;
  interestInCents: number;
  hasInterest: boolean;
}

type PaymentMethod = 'pix' | 'credit_card';

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

// Opção de retirada em mãos — sempre disponível, grátis, sem Melhor Envio.
// Ao ser escolhida, o pedido é criado como pickup (delivery_method='pickup'):
// sem etiqueta, e o saldo libera na hora quando o comprador confirma.
const PICKUP_OPTION: ShippingOption = {
  id: 'pickup',
  label: 'Retirada pessoal',
  price: 0,
  days: 'combinar com o vendedor',
};

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

  // Funil de tráfego: etapa "iniciou checkout" (só uma vez, ao abrir a tela com
  // itens). Ver lib/analytics.
  useEffect(() => {
    if (items.length > 0) trackEvent('checkout_start', { itens: items.length, total: totalPrice });
    // Uma vez por montagem: itens no carrinho não mudam o "iniciou".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  // Quem aceita entrega em mãos, por vendedor. A opção era oferecida para TODO
  // mundo, inclusive vendedor de outro estado, que depois tinha que explicar ao
  // comprador que não dava. Vem junto da cotação, sem requisição extra.
  const [pickupPorVendedor, setPickupPorVendedor] = useState<Record<string, boolean>>({});

  // ── Validation ────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Pagar com saldo da carteira foi REMOVIDO do checkout (31/07/2026).
  // A Pagar.me não faz transferência entre usuários — o saldo só sai por saque.
  // Abater a compra do saldo cobrava o vendedor sem passar pelo split: a
  // cobrança caía inteira na conta da Kolecta e a divisão existia só no nosso
  // ledger. A carteira segue existindo para depósito e saque.
  const { toast } = useToast();

  // ── Payment method (PIX vs cartão) ────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);
  const [cardProcessing, setCardProcessing] = useState(false);
  const [cardError, setCardError] = useState('');
  const simulateInstallments = useInstallmentsSimulation();

  // ── Copiar código PIX ─────────────────────────────────────────────────
  async function handleCopyPix(code?: string) {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    toast({ title: 'Código PIX copiado!' });
  }

  // ── Cotação de frete (Melhor Envio) ───────────────────────────────────
  // Separada do ViaCEP de propósito: o endereço SALVO já vem completo e não
  // precisa de consulta de CEP, mas precisa de cotação igual. Enquanto isso
  // morava dentro do fetchCep, escolher um endereço salvo preenchia tudo e não
  // trazia frete nenhum — só digitar o CEP na mão cotava.
  const cotarFretes = useCallback(async (digits: string) => {
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const results = await Promise.all(
        groups.map(async (g) => {
          try {
            const resp = await api.shipping.quote({
              to_cep: digits,
              listing_id: g.items[0]?.product.id,
              // Frete pelo peso total: N unidades em 1 envio.
              quantity: g.items[0]?.quantity ?? 1,
            });
            const opts = resp.options;
            const mapped: ShippingOption[] = opts.map((o) => ({
              id: `${g.sellerSlug}-${o.raw?.id ?? o.service}`,
              label: o.carrier ? `${o.carrier} ${o.service}` : o.service,
              price: Math.round(o.price * 100),
              days: `${o.delivery_time_days} dias úteis`,
              serviceId: typeof o.raw?.id === 'number' ? o.raw.id : undefined,
            }));
            return { slug: g.sellerSlug, options: mapped, pickup: resp.pickup !== false };
          } catch {
            return { slug: g.sellerSlug, options: [] as ShippingOption[], pickup: true };
          }
        }),
      );

      const optionsBySlug: Record<string, ShippingOption[]> = {};
      const pickupBySlug: Record<string, boolean> = {};
      const newSelected: Record<string, string> = {};
      let anyEmpty = false;
      for (const { slug, options, pickup } of results) {
        optionsBySlug[slug] = options;
        pickupBySlug[slug] = pickup;
        if (options.length === 0) { anyEmpty = true; continue; }
        const cheapest = options.reduce((prev, curr) => (curr.price < prev.price ? curr : prev));
        newSelected[slug] = cheapest.id;
      }
      setShippingOptions(optionsBySlug);
      setPickupPorVendedor(pickupBySlug);
      setSelectedShipping(prev => ({ ...prev, ...newSelected }));
      // Se nenhum vendedor retornou opções, sinaliza o erro visual de frete.
      if (anyEmpty && Object.values(optionsBySlug).every(o => o.length === 0)) {
        setCepError(true);
      }
    } finally {
      setCepLoading(false);
    }
  }, [groups]);

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

      await cotarFretes(digits);
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
    // O endereço salvo já está completo — não precisa do ViaCEP, mas precisa
    // da cotação. Sem esta chamada o comprador escolhia o endereço e a lista de
    // fretes ficava vazia, sem nenhum aviso.
    void cotarFretes(addr.zip.replace(/\D/g, ''));
  }

  // Pré-seleciona o endereço padrão assim que endereços e carrinho chegam.
  // O checkout abria em "custom" mesmo para quem já tem endereço salvo, então
  // o comprador precisava escolher na mão só para o frete aparecer.
  // Espera `groups` porque a cotação é por vendedor: rodar com o carrinho ainda
  // vazio devolveria zero opções e travaria a tela sem erro nenhum.
  const [enderecoPreSelecionado, setEnderecoPreSelecionado] = useState(false);
  useEffect(() => {
    if (enderecoPreSelecionado) return;
    if (savedAddresses.length === 0 || groups.length === 0) return;
    const padrao = savedAddresses.find(a => a.isDefault) ?? savedAddresses[0];
    if (!padrao) return;
    setEnderecoPreSelecionado(true);
    applySavedAddress(padrao.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAddresses, groups, enderecoPreSelecionado]);

  // Opções de frete do vendedor, mais a retirada em mãos quando ELE aceita.
  // Antes a retirada entrava sempre, e o comprador escolhia buscar em mãos numa
  // loja do outro lado do país.
  //
  // Enquanto a cotação não voltou o vendedor ainda não está no mapa, e aí a
  // retirada aparece: é o comportamento de antes e evita a opção piscar na tela.
  const optionsFor = (slug: string): ShippingOption[] => [
    ...(shippingOptions[slug] ?? []),
    ...(pickupPorVendedor[slug] === false ? [] : [PICKUP_OPTION]),
  ];

  // Shipping totals
  let shippingTotal = 0;
  let allShippingSelected = true;
  for (const group of groups) {
    const sel = selectedShipping[group.sellerSlug];
    if (!sel) { allShippingSelected = false; }
    else {
      const opt = optionsFor(group.sellerSlug).find(o => o.id === sel);
      if (opt) shippingTotal += opt.price;
      else allShippingSelected = false;
    }
  }
  // shippingTotal está em centavos; totalPrice em reais → normaliza p/ reais.
  const grandTotal = totalPrice + shippingTotal / 100;

  // Valor a cobrar no gateway (estimativa para o seletor de parcelas). Desde a
  // remoção do pagamento com saldo, é sempre o total: nada abate a compra.
  const totalInCents = Math.round(grandTotal * 100);
  const chargeEstimate = totalInCents;

  // Simula as parcelas quando cartão está selecionado e há valor a cobrar.
  useEffect(() => {
    if (paymentMethod !== 'credit_card' || chargeEstimate <= 0) {
      setInstallmentOptions([]);
      return;
    }
    let cancelled = false;
    simulateInstallments(chargeEstimate)
      .then((res) => {
        if (cancelled) return;
        setInstallmentOptions(res.options);
        // Reajusta a seleção se o nº de parcelas atual não couber no novo valor.
        setInstallments((cur) =>
          res.options.some((o) => o.installments === cur) ? cur : 1,
        );
      })
      .catch(() => {
        if (!cancelled) setInstallmentOptions([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, chargeEstimate]);

  if (items.length === 0) return <Navigate to="/carrinho" replace />;

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

  // ── Validate card fields (só quando cartão selecionado) ──────────────
  function validateCard(): string | null {
    if (cardNumber.replace(/\D/g, '').length < 13) return 'Número do cartão inválido';
    if (!cardName.trim()) return 'Informe o nome impresso no cartão';
    const exp = cardExp.replace(/\D/g, '');
    if (exp.length < 4) return 'Validade inválida (MM/AA)';
    const mm = Number(exp.slice(0, 2));
    if (mm < 1 || mm > 12) return 'Mês de validade inválido';
    if (cardCvv.replace(/\D/g, '').length < 3) return 'CVV inválido';
    return null;
  }

  // ── Advance to payment (calls backend) ───────────────────────────────
  async function handleGoToPayment() {
    setSubmitted(true);
    setCardError('');
    if (!validate()) return;

    const group = groups[currentGroupIndex];

    // Um listingId por item do grupo (MVP: 1 item por seller), com a quantidade
    // escolhida. O backend cobra preço*qtd e baixa o estoque por qtd.
    const listingItems = group.items.map(i => ({ listingId: i.product.id, quantity: i.quantity }));
    // Os DOIS caminhos são válidos — a política de entrega é do comprador.
    // Endereço salvo vai por id; o digitado vai inteiro e o backend o salva na
    // conta dele. Antes o digitado era descartado: pedido sem destino, cartão
    // recusado pela Pagar.me (falta o billing_address) e etiqueta impossível.
    const usandoSalvo = selectedAddressId !== 'custom';
    const addressId = usandoSalvo ? selectedAddressId : undefined;
    const shippingAddress = usandoSalvo
      ? undefined
      : {
          recipientName: nome.trim(),
          street: rua.trim(),
          number: numero.trim(),
          complement: complemento.trim() || undefined,
          neighborhood: bairro.trim() || undefined,
          city: cidade.trim(),
          state: estado.trim(),
          zip: cep.replace(/\D/g, ''),
          country: 'BR',
        };
    // CPF + telefone do comprador (só dígitos) — exigidos pela Pagar.me na transação.
    const buyerCpf = cpf.replace(/\D/g, '') || undefined;
    const buyerPhone = phone.replace(/\D/g, '') || undefined;

    // Frete escolhido para ESTE vendedor (opt.price já está em centavos). Antes
    // não era enviado, então o comprador via o total com frete mas só o item
    // era cobrado.
    const selectedShipId = selectedShipping[group.sellerSlug];
    const isPickup = selectedShipId === 'pickup';
    const shipOpt = optionsFor(group.sellerSlug).find(o => o.id === selectedShipId);
    const shippingInCents = shipOpt ? Math.round(shipOpt.price) : 0;
    const deliveryMethod: 'shipping' | 'pickup' = isPickup ? 'pickup' : 'shipping';

    // O cartão é tokenizado no cliente ANTES de criar o pedido (o número nunca
    // vai ao back).
    const payWithCard = paymentMethod === 'credit_card' && chargeEstimate > 0;
    let cardToken: string | undefined;
    if (payWithCard) {
      const cardErr = validateCard();
      if (cardErr) {
        setCardError(cardErr);
        return;
      }
      setCardProcessing(true);
      try {
        cardToken = await tokenizeCard({
          number: cardNumber,
          holderName: cardName,
          expiry: cardExp,
          cvv: cardCvv,
        });
      } catch (err) {
        setCardProcessing(false);
        const msg =
          err instanceof CardTokenizationError
            ? err.message
            : 'Não foi possível validar o cartão.';
        setCardError(msg);
        toast({ title: 'Cartão inválido', description: msg, variant: 'destructive' });
        return;
      }
    }

    try {
      const result = await createCheckout.mutateAsync({
        items: listingItems,
        addressId,
        shippingAddress,
        shippingInCents,
        // Qual transportadora, não só quanto custou: a etiqueta automática
        // precisa emitir no MESMO serviço que o comprador escolheu e pagou.
        shippingServiceId: isPickup ? undefined : shipOpt?.serviceId,
        shippingServiceName: isPickup ? undefined : shipOpt?.label,
        deliveryMethod,
        buyerCpf,
        buyerPhone,
        ...(payWithCard
          ? { paymentMethod: 'credit_card' as const, cardToken, installments }
          : {}),
      });

      // Wallet integral OU cartão aprovado → confirma na hora e vai pra confirmação.
      if (result.paidViaWallet || result.paidViaCard) {
        window.location.href = `/pedido/confirmacao?order_id=${result.orderId}&redirect_status=succeeded`;
        return;
      }

      // PIX → mostra o QR na etapa de pagamento.
      setSessions(prev => [...prev, { ...result, sellerGroup: group }]);
      setStage('payment');
    } catch {
      // O toast de erro já é disparado pelo onError do useCreateCheckout
      // (inclui a mensagem do gateway, ex.: "Cartão recusado pelo emissor").
    } finally {
      setCardProcessing(false);
    }
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
                    ) : (
                      <>
                        {cepError && (
                          <div className="flex items-center gap-3 p-4 rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-600">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <p className="text-sm font-medium">Sem opções de envio para este CEP — você ainda pode escolher <strong>Retirada pessoal</strong>.</p>
                          </div>
                        )}
                        {groups.map((group, idx) => {
                      const options = optionsFor(group.sellerSlug);
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
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Forma de Pagamento — só quando o cartão está habilitado. Sem
                    chave pública, o fluxo continua PIX puro (sem seletor). */}
                {chargeEstimate > 0 && isCardPaymentEnabled && (
                  <Card className="bg-gradient-card">
                    <CardContent className="p-6 space-y-5">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <h2 className="font-heading text-xl font-bold uppercase tracking-wide">
                          Forma de Pagamento
                        </h2>
                      </div>

                      <RadioGroup
                        value={paymentMethod}
                        onValueChange={(v) => {
                          const m = v as PaymentMethod;
                          setPaymentMethod(m);
                          setCardError('');
                        }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                      >
                        {([
                          { id: 'pix', label: 'PIX', desc: 'Aprovação na hora', Icon: QrCode },
                          { id: 'credit_card', label: 'Cartão de crédito', desc: 'Em até 12x', Icon: CreditCard },
                        ] as const).map(({ id, label, desc, Icon }) => {
                          const active = paymentMethod === id;
                          return (
                            <label
                              key={id}
                              htmlFor={`pm-${id}`}
                              className={`flex items-center gap-3 p-3 rounded-md border transition-all cursor-pointer ${active ? 'border-[#F5C300]/60 bg-[#F5C300]/5' : 'border-border hover:border-primary/40'}`}
                            >
                              <RadioGroupItem value={id} id={`pm-${id}`} className={active ? 'text-[#F5C300] border-[#F5C300]' : ''} />
                              <Icon className="h-5 w-5 text-primary shrink-0" />
                              <div className="leading-tight">
                                <p className="font-body text-sm font-medium">{label}</p>
                                <p className="text-xs text-muted-foreground">{desc}</p>
                              </div>
                            </label>
                          );
                        })}
                      </RadioGroup>

                      {/* Formulário do cartão */}
                      {paymentMethod === 'credit_card' && (
                        <div className="space-y-4 pt-1">
                          <div>
                            <Label htmlFor="cardNumber">Número do cartão *</Label>
                            <Input id="cardNumber" inputMode="numeric" autoComplete="cc-number"
                              className="bg-background font-mono" value={cardNumber}
                              onChange={e => setCardNumber(maskCardNumber(e.target.value))}
                              placeholder="0000 0000 0000 0000" />
                          </div>
                          <div>
                            <Label htmlFor="cardName">Nome impresso no cartão *</Label>
                            <Input id="cardName" autoComplete="cc-name" className="bg-background uppercase"
                              value={cardName} onChange={e => setCardName(e.target.value)}
                              placeholder="COMO ESTÁ NO CARTÃO" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="cardExp">Validade *</Label>
                              <Input id="cardExp" inputMode="numeric" autoComplete="cc-exp"
                                className="bg-background font-mono" value={cardExp}
                                onChange={e => setCardExp(maskExpiry(e.target.value))} placeholder="MM/AA" />
                            </div>
                            <div>
                              <Label htmlFor="cardCvv">CVV *</Label>
                              <Input id="cardCvv" inputMode="numeric" autoComplete="cc-csc" maxLength={4}
                                className="bg-background font-mono" value={cardCvv}
                                onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="123" />
                            </div>
                          </div>

                          {/* Parcelas */}
                          <div>
                            <Label htmlFor="installments">Parcelas</Label>
                            <select
                              id="installments"
                              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                              value={installments}
                              onChange={e => setInstallments(Number(e.target.value))}
                            >
                              {installmentOptions.length === 0 && (
                                <option value={1}>1x de {formatBRL(chargeEstimate / 100)} sem juros</option>
                              )}
                              {installmentOptions.map(opt => (
                                <option key={opt.installments} value={opt.installments}>
                                  {opt.installments}x de {formatBRL(opt.installmentInCents / 100)}
                                  {opt.hasInterest
                                    ? ` (total ${formatBRL(opt.totalInCents / 100)})`
                                    : ' sem juros'}
                                </option>
                              ))}
                            </select>
                            {installmentOptions.find(o => o.installments === installments)?.hasInterest && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Juros do parcelamento cobrados no cartão.
                              </p>
                            )}
                          </div>

                          {cardError && (
                            <p className="text-xs text-destructive">{cardError}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            Dados do cartão enviados de forma segura à Pagar.me. Não armazenamos o cartão.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
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

                  {/* CTA Stage 1 */}
                  {stage === 'address-shipping' && (
                    <Button
                      variant="kolecta"
                      size="lg"
                      className="w-full glow-primary"
                      onClick={handleGoToPayment}
                      disabled={createCheckout.isPending || cardProcessing}
                    >
                      {createCheckout.isPending || cardProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {cardProcessing ? 'Processando cartão...' : 'Preparando pagamento...'}
                        </>
                      ) : (
                        <>
                          {paymentMethod === 'credit_card' && chargeEstimate > 0
                            ? 'Pagar com cartão'
                            : 'Ir para pagamento'}
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}

                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-body">Pagamento seguro · Pagar.me</span>
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
