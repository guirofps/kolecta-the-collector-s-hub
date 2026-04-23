import { Link } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, Clock, CheckCircle2, ExternalLink,
  Zap, Calendar, Percent, Loader2,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConnect } from '@/hooks/use-api';

export default function StripeOnboardingPage() {
  const { statusQuery, onboardMutation, loginLinkMutation } = useConnect();

  const status = statusQuery.data?.status ?? 'disconnected';
  const isLoading = statusQuery.isLoading;

  return (
    <Layout>
      <div className="container py-10 flex justify-center">
        <div className="w-full max-w-[560px] space-y-8">

          {/* ── Header ────────────────────────────────── */}
          <div>
            <Button variant="ghost" size="sm" className="mb-4" asChild>
              <Link to="/painel/financeiro">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Link>
            </Button>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight">
              Configurar Recebimentos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte sua conta bancária para receber os pagamentos das suas vendas automaticamente via Stripe
            </p>
          </div>

          {/* ── Status Card ───────────────────────────── */}
          <Card className="bg-gradient-card">
            <CardContent className="p-6">

              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Verificando status da conta...</p>
                </div>
              )}

              {/* Estado A — disconnected */}
              {!isLoading && status === 'disconnected' && (
                <div className="text-center space-y-4">
                  <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
                  <h2 className="font-heading text-xl font-bold uppercase">Conta não conectada</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Você precisa conectar uma conta bancária para receber os pagamentos das suas vendas na Kolecta.
                  </p>
                  <Button
                    variant="kolecta"
                    size="lg"
                    className="w-full glow-primary"
                    onClick={() => onboardMutation.mutate()}
                    disabled={onboardMutation.isPending}
                  >
                    {onboardMutation.isPending
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecionando...</>
                      : 'Conectar conta bancária'
                    }
                  </Button>
                </div>
              )}

              {/* Estado B — pending */}
              {!isLoading && status === 'pending' && (
                <div className="text-center space-y-4">
                  <Clock className="h-16 w-16 text-primary mx-auto animate-pulse-glow" />
                  <h2 className="font-heading text-xl font-bold uppercase">Verificação em andamento</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Sua conta está sendo verificada pela Stripe. Isso pode levar até 2 dias úteis.
                  </p>
                  <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">Em análise</Badge>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => onboardMutation.mutate()}
                    disabled={onboardMutation.isPending}
                  >
                    {onboardMutation.isPending
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecionando...</>
                      : 'Retomar cadastro'
                    }
                  </Button>
                </div>
              )}

              {/* Estado C — active */}
              {!isLoading && status === 'active' && (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
                  <h2 className="font-heading text-xl font-bold uppercase">Conta conectada</h2>
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Ativo</Badge>
                  <div className="text-sm font-body space-y-1 text-muted-foreground">
                    <p>Pagamentos e saques habilitados via Stripe Express.</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => loginLinkMutation.mutate()}
                    disabled={loginLinkMutation.isPending}
                  >
                    {loginLinkMutation.isPending
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Abrindo painel...</>
                      : <><ExternalLink className="h-4 w-4 mr-2" /> Gerenciar no Stripe</>
                    }
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Como funciona ─────────────────────────── */}
          <Card className="bg-gradient-card">
            <CardContent className="p-6 space-y-5">
              <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Como funciona</h2>

              {[
                {
                  icon: Zap,
                  title: 'Recebimento automático',
                  desc: 'Os pagamentos são repassados automaticamente após confirmação da entrega',
                },
                {
                  icon: Calendar,
                  title: 'Prazo de repasse',
                  desc: 'D+2 úteis após entrega confirmada pelo comprador',
                },
                {
                  icon: Percent,
                  title: 'Taxa da plataforma',
                  desc: null,
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <item.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-heading text-sm font-bold uppercase">{item.title}</p>
                    {item.desc ? (
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Consulte{' '}
                        <Link to="/taxas-e-comissoes" className="text-primary hover:underline">
                          /taxas-e-comissoes
                        </Link>{' '}
                        para ver as comissões vigentes
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  );
}
