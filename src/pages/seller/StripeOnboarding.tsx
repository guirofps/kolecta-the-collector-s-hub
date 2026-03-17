import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, Clock, CheckCircle2, ExternalLink,
  Zap, Calendar, Percent,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type AccountStatus = 'disconnected' | 'pending' | 'active';

export default function StripeOnboardingPage() {
  const [status, setStatus] = useState<AccountStatus>('disconnected');

  return (
    <Layout>
      <div className="container py-10 flex justify-center">
        <div className="w-full max-w-[560px] space-y-8">

          {/* ── Header ────────────────────────────────── */}
          <div>
            <Button variant="ghost" size="sm" className="mb-4" asChild>
              <Link to="/painel-vendedor/financeiro">
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

              {/* Estado A — disconnected */}
              {status === 'disconnected' && (
                <div className="text-center space-y-4">
                  <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
                  <h2 className="font-heading text-xl font-bold uppercase">Conta não conectada</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Você precisa conectar uma conta bancária para receber os pagamentos das suas vendas na Kolecta.
                  </p>
                  {/* STRIPE CONNECT: ao clicar, chamar POST /api/stripe/create-connect-account
                      O backend retorna { accountLinkUrl: string }
                      Redirecionar para accountLinkUrl via window.location.href
                      Após retorno do Stripe, o backend recebe webhook e atualiza status */}
                  <Button variant="kolecta" size="lg" className="w-full glow-primary">
                    Conectar conta bancária
                  </Button>
                </div>
              )}

              {/* Estado B — pending */}
              {status === 'pending' && (
                <div className="text-center space-y-4">
                  <Clock className="h-16 w-16 text-primary mx-auto animate-pulse-glow" />
                  <h2 className="font-heading text-xl font-bold uppercase">Verificação em andamento</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Sua conta está sendo verificada pela Stripe. Isso pode levar até 2 dias úteis.
                  </p>
                  <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">Em análise</Badge>
                  {/* STRIPE CONNECT: botão Retomar chama POST /api/stripe/create-account-link
                      para gerar novo accountLinkUrl e redirecionar */}
                  <Button variant="secondary" className="w-full">
                    Retomar cadastro
                  </Button>
                </div>
              )}

              {/* Estado C — active */}
              {status === 'active' && (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
                  <h2 className="font-heading text-xl font-bold uppercase">Conta conectada</h2>
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Ativo</Badge>
                  <div className="text-sm font-body space-y-1 text-muted-foreground">
                    <p>Banco: <span className="text-foreground font-medium">Nubank ••••4321</span></p>
                    <p>Conectado em: <span className="text-foreground font-medium">10 de março de 2025</span></p>
                  </div>
                  {/* STRIPE CONNECT: botão Gerenciar chama GET /api/stripe/login-link
                      que retorna loginLinkUrl do Stripe Express Dashboard */}
                  <Button variant="ghost" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Gerenciar no Stripe
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
                  desc: null, // custom render
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

          {/* DEV ONLY: remover antes do deploy em produção */}
          <div className="border border-dashed border-border rounded-md p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-heading text-center">
              Dev — alternar estado
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="ghost" size="sm" onClick={() => setStatus('disconnected')}>
                Disconnected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStatus('pending')}>
                Pending
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStatus('active')}>
                Active
              </Button>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
