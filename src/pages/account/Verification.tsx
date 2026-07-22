import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Info } from 'lucide-react';

// B3/D8: esta página era 100% cenográfica — etapas de KYC (documento, selfie)
// que só mexiam em estado local, sem backend. A verificação real de vendedor
// acontece no onboarding do recebedor (Pagar.me). Para comprador, não há KYC
// (pagamento é via Pix). Substituída por um estado honesto até existir fluxo real.
export default function VerificationPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Verificação</h1>
            <p className="text-sm text-muted-foreground">Status da sua conta na Kolecta</p>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">Para comprar</strong> não é preciso
                verificação de identidade — o pagamento é feito via Pix.
              </p>
              <p>
                <strong className="text-foreground">Para vender</strong>, a verificação
                (KYC) é feita ao cadastrar seus dados de recebimento no Painel do Vendedor.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button variant="kolecta" asChild>
            <Link to="/painel/financeiro">Ir para recebimentos</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/conta">Voltar à conta</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
