import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import {
  Search, ShieldCheck, Package, Gavel, ArrowRight, CheckCircle2, CreditCard, Truck, Clock,
} from 'lucide-react';

const buySteps = [
  { icon: Search, title: 'Encontre', desc: 'Navegue por milhares de colecionáveis ou busque itens específicos.' },
  { icon: CreditCard, title: 'Compre ou dê lance', desc: 'Compra direta com preço fixo ou participe do Modo Lance.' },
  { icon: Package, title: 'Receba e verifique', desc: 'Receba em casa, verifique e confirme em até 7 dias.' },
];

const sellSteps = [
  { icon: Package, title: 'Anuncie', desc: 'Crie um anúncio com fotos, descrição e preço ou regras de lance.' },
  { icon: CheckCircle2, title: 'Aprovação', desc: 'Nosso time revisa e aprova seu anúncio rapidamente.' },
  { icon: Truck, title: 'Venda e envie', desc: 'Quando vender, envie o item e receba o pagamento após verificação.' },
];

const modoLanceSteps = [
  { icon: Gavel, title: 'Encontre um item', desc: 'Procure itens com o badge "Modo Lance" e veja o lance atual.' },
  { icon: CreditCard, title: 'Dê seu lance', desc: 'Envie um lance acima do mínimo. Cada lance é um compromisso de compra.' },
  { icon: Clock, title: 'Aguarde o resultado', desc: 'Se vencer, o pagamento é processado automaticamente. Anti-sniper protege os últimos segundos.' },
];

function StepSection({ title, subtitle, steps, accent }: {
  title: string; subtitle: string; steps: typeof buySteps; accent?: boolean;
}) {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className={`font-heading text-2xl md:text-3xl font-extrabold italic uppercase text-center mb-2 ${accent ? 'text-accent' : ''}`}>
          {title}
        </h2>
        <p className="text-center text-sm text-muted-foreground mb-10">{subtitle}</p>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="text-center p-6 rounded-lg border border-border bg-card">
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="font-heading text-2xl font-bold text-primary">{i + 1}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-bold uppercase tracking-wider mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <Layout>
      <div className="bg-gradient-dark">
        {/* Hero */}
        <section className="container mx-auto px-4 pt-12 pb-8 text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold italic uppercase leading-tight">
            Como <span className="text-primary text-glow-primary">funciona</span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            A Kolecta conecta colecionadores com segurança. Entenda o fluxo completo de compra, venda e Modo Lance.
          </p>
        </section>

        <StepSection title="Comprando" subtitle="3 passos para adquirir seu colecionável" steps={buySteps} />

        <div className="line-tech max-w-xl mx-auto" />

        <StepSection title="Modo Lance" subtitle="Participe de disputas por itens exclusivos" steps={modoLanceSteps} accent />

        <div className="line-tech max-w-xl mx-auto" />

        <StepSection title="Vendendo" subtitle="Alcance milhares de colecionadores" steps={sellSteps} />

        {/* Protection note */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto p-8 rounded-lg border border-primary/20 bg-primary/5 text-center glow-primary">
              <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-4" />
              <h2 className="font-heading text-2xl font-extrabold italic uppercase mb-3">
                Proteção em cada <span className="text-primary">transação</span>
              </h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
                Pagamento retido em custódia, janela de 7 dias para verificação e sistema de disputas justo protegem todos na Kolecta.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button variant="kolecta" size="lg" asChild>
                  <Link to="/busca">
                    <Search className="h-4 w-4" />
                    Começar a explorar
                  </Link>
                </Button>
                <Button variant="outline-gold" size="lg" asChild>
                  <Link to="/seguranca">
                    <ShieldCheck className="h-4 w-4" />
                    Saiba mais sobre proteção
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
