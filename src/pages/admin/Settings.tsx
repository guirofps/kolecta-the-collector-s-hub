import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Settings2, UserPlus, Gavel, Bell, Database, Clock,
  CreditCard, Truck, ShieldCheck, Mail, KeyRound,
} from 'lucide-react';

const integrations = [
  { icon: ShieldCheck, name: 'Autenticação — Clerk', desc: 'Login, cadastro e gestão de usuários.' },
  { icon: CreditCard, name: 'Pagamentos', desc: 'Processamento de pagamentos e repasses (Stripe / migração Pagar.me).' },
  { icon: Truck, name: 'Frete — Melhor Envio', desc: 'Cotação de frete e emissão de etiquetas.' },
  { icon: Mail, name: 'E-mail transacional', desc: 'Envio de e-mails de boas-vindas, verificação e notificações.' },
];

const comingSoon = [
  { icon: Settings2, title: 'Geral', label: 'Nome, descrição, e-mails de suporte, fuso, moeda e modo manutenção — edição pelo painel ainda não implementada.' },
  { icon: UserPlus, title: 'Cadastros e verificação', label: 'Chaves para abrir/fechar cadastros e regras de verificação ainda não são configuráveis aqui.' },
  { icon: Gavel, title: 'Modo Lance', label: 'Durações, prazos e extensão automática são definidos no backend; edição pelo painel virá depois.' },
  { icon: Bell, title: 'Notificações do sistema', label: 'Preferências de notificação por e-mail do admin ainda não persistem no backend.' },
  { icon: Database, title: 'Dados e backup', label: 'Exportação LGPD e backups ainda não estão expostos no painel.' },
];

export default function AdminSettings() {
  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold italic uppercase">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Integrações e configurações do sistema</p>
        </div>

        {/* Integrações — geridas por variáveis de ambiente */}
        <Card className="bg-gradient-card border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Integrações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
              <KeyRound className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                As credenciais destas integrações são geridas por variáveis de ambiente (Render/Vercel)
                e nunca são exibidas ou editadas no painel. Um teste de conexão em tempo real ainda
                não está implementado, por isso não exibimos status "conectado".
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {integrations.map((it) => (
                <div key={it.name} className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <it.icon className="h-5 w-5 text-kolecta-gold mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-sm font-bold">{it.name}</p>
                      <Badge variant="outline" className="text-[9px]">via env</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{it.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Em breve — configurações editáveis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comingSoon.map((s) => (
            <Card key={s.title} className="bg-gradient-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">{s.title}</CardTitle>
                  <Badge variant="outline" className="text-[9px] ml-auto gap-1">
                    <Clock className="h-3 w-3" /> Em breve
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
