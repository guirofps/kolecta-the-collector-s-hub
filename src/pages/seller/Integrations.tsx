import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useBlingStatus, useBlingDisconnect } from '@/hooks/use-api';
import { CheckCircle2, XCircle, ExternalLink, Plug, PlugZap } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export default function IntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const { data: blingStatus, isLoading } = useBlingStatus();
  const disconnectMutation = useBlingDisconnect();

  // Feedback após callback OAuth
  useEffect(() => {
    const bling = searchParams.get('bling');
    if (bling === 'success') {
      toast({ title: 'Bling conectado com sucesso!' });
      setSearchParams({});
    } else if (bling === 'error') {
      toast({ title: 'Erro ao conectar com Bling', description: 'Tente novamente.', variant: 'destructive' });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast]);

  function handleConnect() {
    // Redireciona para o backend que redireciona para o OAuth do Bling
    const devUserId = localStorage.getItem('dev_user_id') || 'seller-001';
    window.location.href = `${BACKEND_URL}/api/bling/connect`;
  }

  const isConnected = blingStatus?.connected && !blingStatus?.expired;
  const isExpired = blingStatus?.connected && blingStatus?.expired;

  return (
    <SellerLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-heading text-3xl font-bold">Integrações</h1>
          <p className="text-muted-foreground mt-1">
            Conecte ferramentas externas à sua conta Kolecta
          </p>
        </div>

        {/* Bling card */}
        <Card className="bg-gradient-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0066cc]/10 flex items-center justify-center">
                  <span className="font-heading font-extrabold text-[#0066cc] text-sm">B</span>
                </div>
                <div>
                  <CardTitle className="font-heading text-base">Bling ERP</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sincroniza pedidos pagos automaticamente
                  </p>
                </div>
              </div>

              {isLoading ? (
                <Skeleton className="h-6 w-20 rounded-full" />
              ) : isConnected ? (
                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 border text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </Badge>
              ) : isExpired ? (
                <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 border text-xs gap-1">
                  <XCircle className="h-3 w-3" /> Token expirado
                </Badge>
              ) : (
                <Badge className="bg-secondary text-muted-foreground border border-border text-xs gap-1">
                  <XCircle className="h-3 w-3" /> Desconectado
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Descrição */}
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Pedido pago na Kolecta → criado automaticamente no Bling
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Comprador sincronizado como contato no Bling
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Emita NF-e pelo próprio Bling após a sincronização
              </li>
            </ul>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              {isLoading ? (
                <Skeleton className="h-9 w-36 rounded-md" />
              ) : isConnected ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={disconnectMutation.isPending}
                  onClick={() => disconnectMutation.mutate()}
                >
                  <Plug className="h-4 w-4 mr-1.5" />
                  {disconnectMutation.isPending ? 'Desconectando...' : 'Desconectar'}
                </Button>
              ) : (
                <Button variant="kolecta" size="sm" onClick={handleConnect}>
                  <PlugZap className="h-4 w-4 mr-1.5" />
                  {isExpired ? 'Reconectar Bling' : 'Conectar Bling'}
                </Button>
              )}

              <a
                href="https://www.bling.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                bling.com.br
              </a>
            </div>

            {isConnected && (
              <p className="text-xs text-muted-foreground">
                Cada pedido pago na Kolecta é sincronizado automaticamente com seu Bling.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Placeholder para futuras integrações */}
        <Card className="bg-card border-border border-dashed opacity-50">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Plug className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Mais integrações em breve</p>
              <p className="text-xs text-muted-foreground">Tiny ERP, Olist, Melhor Envio...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
