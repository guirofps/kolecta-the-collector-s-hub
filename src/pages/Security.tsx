import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, Clock, AlertTriangle, CheckCircle2, Search, CreditCard,
  Truck, Package, Scale, ArrowRight, Gavel, Users,
} from 'lucide-react';

const protections = [
  {
    icon: CreditCard,
    title: 'Pagamento retido',
    desc: 'O valor pago é retido em custódia segura até a confirmação da entrega e verificação do item pelo comprador.',
  },
  {
    icon: Clock,
    title: 'Janela de 7 dias',
    desc: 'Após receber o item, o comprador tem 7 dias para verificar autenticidade e condição antes da liberação do pagamento.',
  },
  {
    icon: AlertTriangle,
    title: 'Sistema de disputas',
    desc: 'Se algo estiver errado, basta abrir uma disputa. A equipe Kolecta analisa evidências de ambos os lados e toma uma decisão justa.',
  },
  {
    icon: ShieldCheck,
    title: 'Vendedores verificados',
    desc: 'Vendedores passam por verificação de identidade, garantindo maior segurança em cada transação.',
  },
];

export default function SecurityPage() {
  return (
    <Layout>
      <div className="bg-gradient-dark">
        {/* Hero */}
        <section className="container mx-auto px-4 pt-12 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-heading uppercase tracking-widest text-primary">Proteção Kolecta</span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold italic uppercase leading-tight">
            Sua segurança é <span className="text-primary text-glow-primary">prioridade</span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            Entenda como protegemos compradores e vendedores em cada transação na Kolecta.
          </p>
        </section>

        {/* Protections */}
        <section className="container mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {protections.map((p, i) => (
              <div key={i} className="p-6 rounded-lg border border-border bg-gradient-card hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-md bg-primary/10">
                    <p.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-heading text-lg font-bold uppercase tracking-wider">{p.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Flow */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold italic uppercase text-center mb-10">
              Como funciona a <span className="text-primary">proteção</span>
            </h2>

            <div className="space-y-4">
              {[
                { step: '1', icon: CreditCard, title: 'Comprador paga', desc: 'O valor é retido em custódia segura — o vendedor ainda não recebe.' },
                { step: '2', icon: Truck, title: 'Vendedor envia', desc: 'O item é enviado com rastreamento e o comprador acompanha a entrega.' },
                { step: '3', icon: Package, title: 'Comprador recebe', desc: 'Após receber, inicia-se a janela de 7 dias para verificação.' },
                { step: '4', icon: CheckCircle2, title: 'Verificação', desc: 'O comprador confirma que o item está correto. Se houver problema, abre disputa.' },
                { step: '5', icon: ShieldCheck, title: 'Pagamento liberado', desc: 'Sem disputas, o pagamento é liberado automaticamente ao vendedor.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dispute process */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto rounded-lg border border-accent/20 bg-accent/5 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-accent" />
              <h2 className="font-heading text-xl font-bold uppercase tracking-wider">E se algo der errado?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Abra uma disputa durante o período de verificação. A equipe analisa evidências e decide:
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: Scale, label: 'Reembolso total', desc: 'Se o item não corresponder.' },
                { icon: Truck, label: 'Devolução', desc: 'Vendedor recebe o item de volta.' },
                { icon: CheckCircle2, label: 'Liberação', desc: 'Se a disputa for improcedente.' },
              ].map((d, i) => (
                <div key={i} className="p-4 rounded-md bg-card border border-border text-center">
                  <d.icon className="h-5 w-5 text-accent mx-auto mb-2" />
                  <p className="text-xs font-medium text-foreground">{d.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <Button variant="kolecta" size="lg" asChild>
              <Link to="/busca">
                <Search className="h-4 w-4" />
                Explorar com segurança
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
