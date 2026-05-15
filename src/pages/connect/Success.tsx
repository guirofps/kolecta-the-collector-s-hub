import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ConnectSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('accountId');

  useEffect(() => {
    // Redireciona automaticamente após 5 segundos
    const timer = setTimeout(() => {
      navigate('/painel/financeiro');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Layout>
      <div className="container py-20 flex justify-center">
        <div className="w-full max-w-[480px] text-center space-y-8">
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center animate-pulse-glow opacity-20">
              <div className="w-32 h-32 bg-emerald-500 rounded-full blur-3xl"></div>
            </div>
            <CheckCircle2 className="h-24 w-24 text-emerald-500 mx-auto relative z-10" />
          </div>

          <div className="space-y-2">
            <h1 className="font-heading text-4xl font-bold uppercase tracking-tight">
              Conta Conectada!
            </h1>
            <p className="text-muted-foreground">
              Sua conta Stripe foi vinculada com sucesso. Você já pode receber seus pagamentos.
            </p>
          </div>

          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4 text-sm font-medium text-emerald-500 flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              ID da Conta: {accountId?.slice(0, 8)}...
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Button 
              variant="kolecta" 
              size="lg" 
              className="w-full glow-primary"
              onClick={() => navigate('/painel/financeiro')}
            >
              Ir para o Financeiro
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Redirecionando em alguns segundos...
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
