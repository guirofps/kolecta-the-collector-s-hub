import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, Clock, CheckCircle2, Loader2, ShieldCheck, ExternalLink,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useRecipient } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import type {
  CreateRecipientPayload,
  RecipientAddress,
  RecipientKycLink,
} from '@/lib/api';

// Só dígitos — para documentos/telefone/CEP/valores.
const digits = (v: string) => v.replace(/\D/g, '');
// CEP na tela com o traço; no payload vão só os 8 dígitos.
const formatCep = (v: string) => (v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v);
const cepValido = (v: string) => digits(v).length === 8;
const reaisToCents = (v: string) => Math.round(parseFloat(v.replace(',', '.')) || 0) * 100;

const EMPTY_ADDRESS: RecipientAddress = {
  street: '', streetNumber: '', neighborhood: '', city: '', state: '',
  zipCode: '', complementary: '', referencePoint: '',
};

/** Campos de endereço reutilizados (PF `address`, PJ `main_address` e sócio). */
function AddressFields({
  value, onChange, idPrefix, showZipError,
}: {
  value: RecipientAddress;
  onChange: (a: RecipientAddress) => void;
  idPrefix: string;
  showZipError?: boolean;
}) {
  const set = (k: keyof RecipientAddress, v: string) => onChange({ ...value, [k]: v });
  const zipInvalido = showZipError && !cepValido(value.zipCode);
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 sm:col-span-1">
        <Label htmlFor={`${idPrefix}-zip`}>CEP</Label>
        {/* O campo guardava só dígitos mas limitava a 8 CARACTERES: colar ou
            autopreencher "01310-100" cortava no traço e sobravam 7 dígitos,
            calados. Era o que estourava a validação lá no fim do formulário.
            Agora o corte é por dígito e o traço é só exibição. */}
        <Input id={`${idPrefix}-zip`} inputMode="numeric" placeholder="00000-000"
          aria-invalid={zipInvalido || undefined}
          className={zipInvalido ? 'border-destructive focus-visible:ring-destructive' : undefined}
          value={formatCep(value.zipCode)}
          onChange={(e) => set('zipCode', digits(e.target.value).slice(0, 8))} />
        {zipInvalido && (
          <p className="text-xs text-destructive mt-1">Informe os 8 dígitos do CEP.</p>
        )}
      </div>
      <div className="col-span-2 sm:col-span-1">
        <Label htmlFor={`${idPrefix}-state`}>UF</Label>
        <Input id={`${idPrefix}-state`} maxLength={2} placeholder="SP"
          value={value.state} onChange={(e) => set('state', e.target.value.toUpperCase())} />
      </div>
      <div className="col-span-2">
        <Label htmlFor={`${idPrefix}-street`}>Rua</Label>
        <Input id={`${idPrefix}-street`} value={value.street}
          onChange={(e) => set('street', e.target.value)} />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-number`}>Número</Label>
        <Input id={`${idPrefix}-number`} value={value.streetNumber}
          onChange={(e) => set('streetNumber', e.target.value)} />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-comp`}>Complemento</Label>
        <Input id={`${idPrefix}-comp`} value={value.complementary}
          onChange={(e) => set('complementary', e.target.value)} />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-hood`}>Bairro</Label>
        <Input id={`${idPrefix}-hood`} value={value.neighborhood}
          onChange={(e) => set('neighborhood', e.target.value)} />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-city`}>Cidade</Label>
        <Input id={`${idPrefix}-city`} value={value.city}
          onChange={(e) => set('city', e.target.value)} />
      </div>
      <div className="col-span-2">
        <Label htmlFor={`${idPrefix}-ref`}>Ponto de referência</Label>
        <Input id={`${idPrefix}-ref`} value={value.referencePoint}
          onChange={(e) => set('referencePoint', e.target.value)} />
      </div>
    </div>
  );
}

/** Card com o QR/link de prova de vida (biometria Pagar.me). */
function KycCard({ kyc }: { kyc: RecipientKycLink }) {
  return (
    <Card className="bg-gradient-card border-primary/30">
      <CardContent className="p-6 text-center space-y-4">
        <ShieldCheck className="h-12 w-12 text-primary mx-auto" />
        <h2 className="font-heading text-lg font-bold uppercase">Prova de vida</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Conclua a verificação de identidade para ativar recebimentos e saques.
          O link expira em ~20 minutos.
        </p>
        {kyc.qrCodeBase64 && (
          <img
            src={kyc.qrCodeBase64.startsWith('data:') ? kyc.qrCodeBase64 : `data:image/png;base64,${kyc.qrCodeBase64}`}
            alt="QR Code de verificação"
            className="mx-auto h-44 w-44 rounded-lg bg-white p-2"
          />
        )}
        <Button variant="kolecta" className="w-full" asChild>
          <a href={kyc.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" /> Abrir verificação
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function RecipientOnboardingPage() {
  const { statusQuery, onboardMutation, kycLinkMutation } = useRecipient();
  const { toast } = useToast();
  const status = statusQuery.data;

  const [type, setType] = useState<'individual' | 'company'>('individual');
  const [form, setForm] = useState({
    name: '', document: '', email: '', phone: '', siteUrl: '',
    // PF
    motherName: '', birthdate: '', monthlyIncome: '', professionalOccupation: '',
    // PJ
    annualRevenue: '', corporationType: '', foundingDate: '',
  });
  const [address, setAddress] = useState<RecipientAddress>(EMPTY_ADDRESS);
  const [bank, setBank] = useState({
    bank: '', branchNumber: '', branchCheckDigit: '', accountNumber: '',
    accountCheckDigit: '', accountType: 'checking' as 'checking' | 'savings',
  });
  const [partner, setPartner] = useState({
    name: '', email: '', document: '', motherName: '', birthdate: '',
    monthlyIncome: '', professionalOccupation: '', phone: '',
  });
  const [partnerAddress, setPartnerAddress] = useState<RecipientAddress>(EMPTY_ADDRESS);
  // Só marca campo em vermelho depois da primeira tentativa de envio.
  const [submetido, setSubmetido] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // KYC vindo do cadastro recém-enviado (a Pagar.me devolve link/QR no onboard).
  const freshKyc = onboardMutation.data?.kyc ?? kycLinkMutation.data ?? null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Barra o CEP incompleto aqui: o backend recusa com
    // "mainAddress.zipCode deve ter 8 dígitos", que aparece como um toast
    // vermelho no topo enquanto o campo culpado está lá embaixo, sem marca
    // nenhuma — e o formulário é longo.
    setSubmetido(true);
    const cepsFaltando = [
      { label: type === 'individual' ? 'seu endereço' : 'endereço da empresa', ok: cepValido(address.zipCode) },
      ...(type === 'company'
        ? [{ label: 'endereço do representante legal', ok: cepValido(partnerAddress.zipCode) }]
        : []),
    ].filter((c) => !c.ok);

    if (cepsFaltando.length > 0) {
      toast({
        title: 'CEP incompleto',
        description: `Informe os 8 dígitos do CEP: ${cepsFaltando.map((c) => c.label).join(' e ')}.`,
        variant: 'destructive',
      });
      return;
    }

    const payload: CreateRecipientPayload = {
      type,
      name: form.name,
      document: digits(form.document),
      email: form.email,
      siteUrl: form.siteUrl || undefined,
      phone: form.phone ? digits(form.phone) : undefined,
      bankAccount: {
        holderName: form.name,
        holderType: type === 'individual' ? 'individual' : 'company',
        holderDocument: digits(form.document),
        bank: bank.bank,
        branchNumber: bank.branchNumber,
        branchCheckDigit: bank.branchCheckDigit || undefined,
        accountNumber: bank.accountNumber,
        accountCheckDigit: bank.accountCheckDigit,
        accountType: bank.accountType,
      },
      ...(type === 'individual'
        ? {
            motherName: form.motherName,
            birthdate: form.birthdate,
            monthlyIncomeInCents: reaisToCents(form.monthlyIncome),
            professionalOccupation: form.professionalOccupation,
            address,
          }
        : {
            annualRevenueInCents: reaisToCents(form.annualRevenue),
            corporationType: form.corporationType,
            foundingDate: form.foundingDate,
            mainAddress: address,
            managingPartners: [
              {
                name: partner.name,
                email: partner.email,
                document: digits(partner.document),
                motherName: partner.motherName || undefined,
                birthdate: partner.birthdate,
                monthlyIncomeInCents: reaisToCents(partner.monthlyIncome),
                professionalOccupation: partner.professionalOccupation,
                selfDeclaredLegalRepresentative: true,
                phone: partner.phone ? digits(partner.phone) : undefined,
                address: partnerAddress,
              },
            ],
          }),
    };
    onboardMutation.mutate(payload);
  }

  // ── Estados pós-cadastro (já tem recebedor) ────────────────────────────────

  const isActive = status?.status === 'active';
  const isPending =
    status?.onboarded && !isActive &&
    ['registration', 'affiliation'].includes(status?.status ?? '');

  return (
    <Layout>
      <div className="container py-10 flex justify-center">
        <div className="w-full max-w-[620px] space-y-8">
          <div>
            <Button variant="ghost" size="sm" className="mb-4" asChild>
              <Link to="/painel/financeiro">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Link>
            </Button>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight">
              Configurar Recebimentos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre seus dados de recebedor para receber suas vendas via Pagar.me.
            </p>
          </div>

          {statusQuery.isLoading && (
            <Card className="bg-gradient-card"><CardContent className="p-8 flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </CardContent></Card>
          )}

          {/* Recebedor ATIVO */}
          {!statusQuery.isLoading && isActive && (
            <Card className="bg-gradient-card"><CardContent className="p-6 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
              <h2 className="font-heading text-xl font-bold uppercase">Recebedor ativo</h2>
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Ativo</Badge>
              <p className="text-sm text-muted-foreground">
                Recebimentos e saques habilitados. Documento: {status?.document ?? '—'}
              </p>
            </CardContent></Card>
          )}

          {/* Recebedor em análise (registration/affiliation) → mostra prova de vida */}
          {!statusQuery.isLoading && isPending && (
            <>
              <Card className="bg-gradient-card"><CardContent className="p-6 text-center space-y-4">
                <Clock className="h-16 w-16 text-primary mx-auto animate-pulse-glow" />
                <h2 className="font-heading text-xl font-bold uppercase">Verificação pendente</h2>
                <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">Em análise</Badge>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Falta concluir a prova de vida para ativar seus recebimentos.
                </p>
                <Button variant="secondary" className="w-full"
                  onClick={() => kycLinkMutation.mutate()} disabled={kycLinkMutation.isPending}>
                  {kycLinkMutation.isPending
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando link...</>
                    : 'Gerar novo link de verificação'}
                </Button>
              </CardContent></Card>
              {freshKyc && <KycCard kyc={freshKyc} />}
            </>
          )}

          {/* Recém-cadastrado nesta sessão → QR de prova de vida */}
          {!statusQuery.isLoading && !isActive && !isPending && onboardMutation.isSuccess && freshKyc && (
            <KycCard kyc={freshKyc} />
          )}

          {/* Cadastrado, mas sem link de prova de vida: a criação do recebedor
              deu certo e só a emissão do link falhou. Sem este bloco a tela
              ficaria vazia — o formulário some depois do envio e o KycCard
              acima depende do link existir. */}
          {!statusQuery.isLoading && !isActive && !isPending && onboardMutation.isSuccess && !freshKyc && (
            <Card className="bg-gradient-card border-amber-500/30">
              <CardContent className="p-6 text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h2 className="font-heading text-lg font-bold uppercase">Cadastro recebido</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Seu recebedor foi criado. Só falta a prova de vida — o link não
                  pôde ser gerado agora, mas seus dados já estão salvos e você
                  não precisa preencher o formulário de novo.
                </p>
                <Button variant="kolecta" className="w-full"
                  onClick={() => kycLinkMutation.mutate()} disabled={kycLinkMutation.isPending}>
                  {kycLinkMutation.isPending
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando link...</>
                    : 'Gerar link de verificação'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Formulário de cadastro (ainda não tem recebedor) */}
          {!statusQuery.isLoading && !status?.onboarded && !onboardMutation.isSuccess && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="bg-gradient-card"><CardContent className="p-6 space-y-4">
                <h2 className="font-heading text-lg font-bold uppercase">Tipo de recebedor</h2>
                <RadioGroup value={type} onValueChange={(v) => setType(v as any)} className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="individual" id="t-pf" />
                    <Label htmlFor="t-pf">Pessoa Física</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="company" id="t-pj" />
                    <Label htmlFor="t-pj">Pessoa Jurídica</Label>
                  </div>
                </RadioGroup>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="name">{type === 'individual' ? 'Nome completo' : 'Razão social / nome fantasia'}</Label>
                    <Input id="name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="doc">{type === 'individual' ? 'CPF' : 'CNPJ'}</Label>
                    <Input id="doc" required inputMode="numeric"
                      value={form.document} onChange={(e) => set('document', digits(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone (com DDD)</Label>
                    <Input id="phone" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', digits(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="site">Site (opcional)</Label>
                    <Input id="site" placeholder="https://..." value={form.siteUrl} onChange={(e) => set('siteUrl', e.target.value)} />
                  </div>

                  {type === 'individual' ? (
                    <>
                      <div>
                        <Label htmlFor="mother">Nome da mãe</Label>
                        <Input id="mother" required value={form.motherName} onChange={(e) => set('motherName', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="birth">Data de nascimento</Label>
                        <Input id="birth" type="date" required value={form.birthdate} onChange={(e) => set('birthdate', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="income">Renda mensal (R$)</Label>
                        <Input id="income" inputMode="decimal" required value={form.monthlyIncome} onChange={(e) => set('monthlyIncome', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="occ">Ocupação profissional</Label>
                        <Input id="occ" required value={form.professionalOccupation} onChange={(e) => set('professionalOccupation', e.target.value)} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="rev">Faturamento anual (R$)</Label>
                        <Input id="rev" inputMode="decimal" required value={form.annualRevenue} onChange={(e) => set('annualRevenue', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="corp">Tipo societário</Label>
                        <Input id="corp" placeholder="LTDA, MEI, SA..." required value={form.corporationType} onChange={(e) => set('corporationType', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="found">Data de fundação</Label>
                        <Input id="found" type="date" required value={form.foundingDate} onChange={(e) => set('foundingDate', e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </CardContent></Card>

              {/* Endereço */}
              <Card className="bg-gradient-card"><CardContent className="p-6 space-y-4">
                <h2 className="font-heading text-lg font-bold uppercase">
                  {type === 'individual' ? 'Endereço' : 'Endereço da empresa'}
                </h2>
                <AddressFields value={address} onChange={setAddress} idPrefix="addr" showZipError={submetido} />
              </CardContent></Card>

              {/* Representante legal (PJ) */}
              {type === 'company' && (
                <Card className="bg-gradient-card"><CardContent className="p-6 space-y-4">
                  <h2 className="font-heading text-lg font-bold uppercase">Representante legal</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor="p-name">Nome completo</Label>
                      <Input id="p-name" required value={partner.name} onChange={(e) => setPartner((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="p-doc">CPF</Label>
                      <Input id="p-doc" required inputMode="numeric" value={partner.document} onChange={(e) => setPartner((p) => ({ ...p, document: digits(e.target.value) }))} />
                    </div>
                    <div>
                      <Label htmlFor="p-email">E-mail</Label>
                      <Input id="p-email" type="email" required value={partner.email} onChange={(e) => setPartner((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="p-mother">Nome da mãe</Label>
                      <Input id="p-mother" value={partner.motherName} onChange={(e) => setPartner((p) => ({ ...p, motherName: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="p-birth">Data de nascimento</Label>
                      <Input id="p-birth" type="date" required value={partner.birthdate} onChange={(e) => setPartner((p) => ({ ...p, birthdate: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="p-income">Renda mensal (R$)</Label>
                      <Input id="p-income" inputMode="decimal" required value={partner.monthlyIncome} onChange={(e) => setPartner((p) => ({ ...p, monthlyIncome: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="p-occ">Ocupação profissional</Label>
                      <Input id="p-occ" required value={partner.professionalOccupation} onChange={(e) => setPartner((p) => ({ ...p, professionalOccupation: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="p-phone">Telefone (com DDD)</Label>
                      <Input id="p-phone" required inputMode="numeric" placeholder="11999999999"
                        value={partner.phone} onChange={(e) => setPartner((p) => ({ ...p, phone: digits(e.target.value) }))} />
                    </div>
                  </div>
                  <Separator />
                  <p className="text-sm font-heading font-bold uppercase text-muted-foreground">Endereço do representante</p>
                  <AddressFields value={partnerAddress} onChange={setPartnerAddress} idPrefix="p-addr" showZipError={submetido} />
                </CardContent></Card>
              )}

              {/* Conta bancária */}
              <Card className="bg-gradient-card"><CardContent className="p-6 space-y-4">
                <h2 className="font-heading text-lg font-bold uppercase">Conta bancária</h2>
                <p className="text-xs text-muted-foreground">
                  A conta deve ser do mesmo {type === 'individual' ? 'CPF' : 'CNPJ'} informado acima.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="b-bank">Banco (código, 3 dígitos)</Label>
                    <Input id="b-bank" required inputMode="numeric" maxLength={3} placeholder="341"
                      value={bank.bank} onChange={(e) => setBank((b) => ({ ...b, bank: digits(e.target.value) }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="b-branch">Agência</Label>
                      <Input id="b-branch" required value={bank.branchNumber} onChange={(e) => setBank((b) => ({ ...b, branchNumber: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="b-branch-dv">Dígito</Label>
                      <Input id="b-branch-dv" value={bank.branchCheckDigit} onChange={(e) => setBank((b) => ({ ...b, branchCheckDigit: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="b-acc">Conta</Label>
                      <Input id="b-acc" required value={bank.accountNumber} onChange={(e) => setBank((b) => ({ ...b, accountNumber: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="b-acc-dv">Dígito</Label>
                      <Input id="b-acc-dv" required value={bank.accountCheckDigit} onChange={(e) => setBank((b) => ({ ...b, accountCheckDigit: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Tipo de conta</Label>
                    <RadioGroup value={bank.accountType} onValueChange={(v) => setBank((b) => ({ ...b, accountType: v as any }))} className="flex gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="checking" id="acc-c" />
                        <Label htmlFor="acc-c">Corrente</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="savings" id="acc-s" />
                        <Label htmlFor="acc-s">Poupança</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </CardContent></Card>

              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Após o cadastro você concluirá uma <strong>prova de vida</strong> (biometria)
                  para ativar recebimentos e saques.
                </p>
              </div>

              <Button type="submit" variant="kolecta" size="lg" className="w-full glow-primary"
                disabled={onboardMutation.isPending}>
                {onboardMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                  : 'Cadastrar recebedor'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
