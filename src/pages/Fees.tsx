import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  ShieldCheck, ArrowRight, Gavel, Tag, Calculator,
  CreditCard, Truck, CheckCircle2, Clock, AlertTriangle,
  FileText, Search, Scale, ChevronRight,
} from 'lucide-react';

/* ── Fee Constants ── */
const FEES = {
  direct: { commission: 0.12, operational: 2, label: 'Venda Direta' },
  auction: { commission: 0.13, operational: 2, label: 'Modo Lance' },
};

/* ── Timeline Steps ── */
const timelineSteps = [
  { icon: CreditCard, label: 'Pagamento aprovado', color: 'text-primary' },
  { icon: Truck, label: 'Envio', color: 'text-primary' },
  { icon: CheckCircle2, label: 'Entrega confirmada', color: 'text-primary' },
  { icon: Clock, label: 'Verificação de 7 dias', color: 'text-accent' },
  { icon: ShieldCheck, label: 'Repasse liberado', color: 'text-primary' },
];

/* ── Dispute Steps ── */
const disputeSteps = [
  { icon: AlertTriangle, label: 'Abrir disputa' },
  { icon: FileText, label: 'Enviar evidências' },
  { icon: Search, label: 'Análise' },
  { icon: Scale, label: 'Decisão' },
];

/* ── FAQ ── */
const faqItems = [
  {
    q: 'Quando recebo o pagamento da minha venda?',
    a: 'O pagamento é liberado automaticamente 7 dias após a confirmação de entrega pelo comprador, desde que não haja disputa aberta no período.',
  },
  {
    q: 'A comissão é cobrada sobre o frete?',
    a: 'Não. A comissão do marketplace incide apenas sobre o valor do item, não sobre o frete ou outros custos adicionais.',
  },
  {
    q: 'Por que a comissão do Modo Lance é maior?',
    a: 'O Modo Lance envolve infraestrutura adicional de lances em tempo real, monitoramento anti-fraude e extensão anti-sniper, justificando 1% a mais de comissão.',
  },
  {
    q: 'Posso contestar uma disputa?',
    a: 'Sim. Ao receber uma disputa, você terá prazo para enviar evidências (fotos, comprovantes de envio, etc.). A equipe Kolecta analisa ambos os lados antes de decidir.',
  },
  {
    q: 'Existe taxa para criar uma conta de vendedor?',
    a: 'Não. Criar conta e anunciar na Kolecta é gratuito. As taxas são cobradas apenas quando uma venda é concluída com sucesso.',
  },
  {
    q: 'Como funciona o saque do saldo disponível?',
    a: 'Após a liberação do repasse, o valor fica disponível para saque via Pix ou transferência bancária, com processamento em até 1 dia útil.',
  },
];

/* ── Calculator Component ── */
function FeeCalculator() {
  const [type, setType] = useState<'direct' | 'auction'>('direct');
  const [value, setValue] = useState(500);

  const fee = FEES[type];
  const commissionAmount = value * fee.commission;
  const totalFees = commissionAmount + fee.operational;
  const sellerReceives = Math.max(0, value - totalFees);

  return (
    <div className="rounded-lg border border-border bg-gradient-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="font-heading text-lg font-bold uppercase tracking-wider">Calculadora de Taxas</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
              Tipo de venda
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType('direct')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md border text-sm font-medium transition-all ${
                  type === 'direct'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20'
                }`}
              >
                <Tag className="h-4 w-4" />
                Venda Direta
              </button>
              <button
                onClick={() => setType('auction')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md border text-sm font-medium transition-all ${
                  type === 'auction'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20'
                }`}
              >
                <Gavel className="h-4 w-4" />
                Modo Lance
              </button>
            </div>
          </div>

          {/* Value input */}
          <div>
            <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
              Valor do item (R$)
            </label>
            <input
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(Math.max(0, Number(e.target.value)))}
              className="w-full h-12 rounded-md border border-border bg-input px-4 text-lg font-heading font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
            {/* Quick values */}
            <div className="flex gap-2 mt-2">
              {[100, 250, 500, 1000, 2500].map((v) => (
                <button
                  key={v}
                  onClick={() => setValue(v)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    value === v
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  R${v}
                </button>
              ))}
            </div>
          </div>

          {/* Fixed fee display */}
          <div className="flex items-center justify-between py-3 px-4 rounded-md bg-secondary/50 border border-border">
            <span className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Taxa operacional</span>
            <span className="font-heading font-bold text-foreground">R$ {fee.operational.toFixed(2)}</span>
          </div>
        </div>

        {/* Outputs */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 px-4 rounded-md bg-card border border-border">
              <span className="text-sm text-muted-foreground">Comissão ({(fee.commission * 100).toFixed(0)}%)</span>
              <span className="font-heading font-bold text-foreground">R$ {commissionAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 rounded-md bg-card border border-border">
              <span className="text-sm text-muted-foreground">Taxa operacional</span>
              <span className="font-heading font-bold text-foreground">R$ {fee.operational.toFixed(2)}</span>
            </div>
            <div className="line-tech my-1" />
            <div className="flex items-center justify-between py-3 px-4 rounded-md bg-card border border-border">
              <span className="text-sm text-muted-foreground">Total de taxas estimadas</span>
              <span className="font-heading font-bold text-accent">R$ {totalFees.toFixed(2)}</span>
            </div>
          </div>

          {/* Highlight */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 glow-primary">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-heading uppercase tracking-widest text-primary">Valor estimado ao vendedor</span>
            </div>
            <span className="font-heading text-3xl font-extrabold text-primary">
              R$ {sellerReceives.toFixed(2)}
            </span>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Liberação estimada: entrega + 7 dias</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function FeesPage() {
  return (
    <Layout>
      <div className="bg-gradient-dark">
        {/* ─── Hero ─── */}
        <section className="container mx-auto px-4 pt-12 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-heading uppercase tracking-widest text-primary">Transparência total</span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold italic uppercase leading-tight">
            Taxas transparentes,{' '}
            <span className="text-primary text-glow-primary">proteção real</span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            O pagamento é retido durante a verificação para proteger comprador e vendedor.
          </p>
        </section>

        {/* ─── Fee Cards ─── */}
        <section className="container mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Direct Sale */}
            <div className="rounded-lg border border-border bg-gradient-card p-6 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-md bg-primary/10">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider">Venda Direta</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 px-4 rounded-md bg-secondary/50">
                  <span className="text-sm text-muted-foreground">Comissão do marketplace</span>
                  <span className="font-heading text-2xl font-extrabold text-primary">12%</span>
                </div>
                <div className="flex items-center justify-between py-3 px-4 rounded-md bg-secondary/50">
                  <span className="text-sm text-muted-foreground">Taxa operacional</span>
                  <span className="font-heading text-2xl font-extrabold text-foreground">R$ 2,00</span>
                </div>
              </div>
            </div>

            {/* Auction */}
            <div className="rounded-lg border border-border bg-gradient-card p-6 hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-md bg-accent/10">
                  <Gavel className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider">Modo Lance</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 px-4 rounded-md bg-secondary/50">
                  <span className="text-sm text-muted-foreground">Comissão do marketplace</span>
                  <span className="font-heading text-2xl font-extrabold text-accent">13%</span>
                </div>
                <div className="flex items-center justify-between py-3 px-4 rounded-md bg-secondary/50">
                  <span className="text-sm text-muted-foreground">Taxa operacional</span>
                  <span className="font-heading text-2xl font-extrabold text-foreground">R$ 2,00</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6 max-w-2xl mx-auto">
            Taxas de pagamento podem variar por método e são consideradas no cálculo final.
          </p>
        </section>

        {/* ─── Timeline: When Seller Gets Paid ─── */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold italic uppercase text-center mb-3">
              Quando o vendedor <span className="text-primary">recebe</span>
            </h2>
            <p className="text-center text-muted-foreground text-sm mb-10 max-w-xl mx-auto">
              Após a entrega, o comprador tem 7 dias para confirmar autenticidade e condição do item. Se não houver disputa, o repasse é liberado automaticamente.
            </p>

            {/* Timeline visual */}
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-0">
              {/* Connecting line (desktop) */}
              <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-px bg-border" />
              <div className="hidden md:block absolute top-6 left-[10%] right-[60%] h-px bg-primary/50" />

              {timelineSteps.map((step, i) => (
                <div key={i} className="relative flex md:flex-col items-center gap-3 md:gap-2 flex-1 z-10">
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    step.color === 'text-accent'
                      ? 'border-accent/50 bg-accent/10'
                      : 'border-primary/50 bg-primary/10'
                  }`}>
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground md:text-center md:mt-2 whitespace-nowrap">
                    {step.label}
                  </span>
                  {i < timelineSteps.length - 1 && (
                    <ChevronRight className="hidden md:hidden h-4 w-4 text-muted-foreground md:absolute md:right-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Disputes ─── */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto rounded-lg border border-border bg-gradient-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              <h2 className="font-heading text-xl font-bold uppercase tracking-wider">Disputas</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
              A abertura de uma disputa pausa a liberação do pagamento até que a equipe Kolecta analise o caso. Ambas as partes podem enviar evidências.
            </p>

            {/* Dispute flow */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {disputeSteps.map((step, i) => (
                <div key={i} className="relative flex flex-col items-center text-center gap-3 p-4 rounded-md bg-secondary/30 border border-border">
                  <div className="w-10 h-10 rounded-full border border-accent/30 bg-accent/5 flex items-center justify-center">
                    <step.icon className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground">{step.label}</span>
                  {i < disputeSteps.length - 1 && (
                    <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-5">
              Decisões possíveis: <span className="text-foreground">reembolso total</span>, <span className="text-foreground">devolução do item</span> ou <span className="text-foreground">liberação do pagamento</span> ao vendedor.
            </p>
          </div>
        </section>

        {/* ─── Calculator ─── */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto">
            <FeeCalculator />
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold italic uppercase text-center mb-8">
              Perguntas <span className="text-primary">frequentes</span>
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg bg-card px-5 data-[state=open]:border-primary/30">
                  <AccordionTrigger className="text-sm font-medium text-foreground hover:text-primary py-4">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-3xl mx-auto rounded-lg border border-primary/20 bg-primary/5 p-8 md:p-12 text-center glow-primary">
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold italic uppercase mb-3">
              Pronto para <span className="text-primary">vender</span>?
            </h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Crie seu primeiro anúncio gratuitamente e alcance milhares de colecionadores.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="kolecta" size="lg" asChild>
                <Link to="/painel-vendedor/anuncios/novo">
                  Começar a vender
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button variant="outline-gold" size="lg" asChild>
                <Link to="/seguranca">
                  <ShieldCheck className="h-4 w-4 mr-1" />
                  Entender a proteção
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
