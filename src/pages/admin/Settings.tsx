import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Settings2, UserPlus, Gavel, Bell, Plug, Database,
  Download, Zap, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────

const mockGeneral = {
  platformName: 'Kolecta',
  description: 'Marketplace de colecionáveis premium do Brasil.',
  supportEmail: 'suporte@kolecta.com.br',
  senderEmail: 'noreply@kolecta.com.br',
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
  maintenanceMode: false,
  maintenanceMessage: '',
};

const mockRegistration = {
  allowBuyers: true,
  allowSellers: true,
  requireEmail: true,
  requireKyc: true,
  kycLevel: 'complete',
  manualApproval: true,
  maxListingsUnverified: 5,
};

const mockAuction = {
  enabled: true,
  maxDuration: 7,
  minDuration: 24,
  paymentDeadline: 48,
  allowEarlyEnd: false,
  autoExtend: true,
  autoExtendMinutes: 5,
  extensionTime: 10,
};

const mockNotifications = {
  welcomeEmail: true,
  newVerification: true,
  escalatedDispute: true,
  dailyReport: false,
  adminEmails: 'admin@kolecta.com.br, carlos@kolecta.com.br',
};

const mockIntegrations = {
  stripe: { connected: true, environment: 'production' as const, lastKey: '4mQk' },
  correios: { connected: true },
  sendgrid: { connected: true, apiKey: '••••••••••SG.xxxx' },
};

// ── Types ──────────────────────────────────────────────────

type Section = 'general' | 'registration' | 'auction' | 'notifications' | 'integrations' | 'data';

const sections: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: 'general', label: 'Geral', icon: Settings2 },
  { key: 'registration', label: 'Cadastros e verificação', icon: UserPlus },
  { key: 'auction', label: 'Modo Lance', icon: Gavel },
  { key: 'notifications', label: 'Notificações do sistema', icon: Bell },
  { key: 'integrations', label: 'Integrações', icon: Plug },
  { key: 'data', label: 'Dados e backup', icon: Database },
];

// ── Component ──────────────────────────────────────────────

export default function AdminSettings() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<Section>('general');

  const [general, setGeneral] = useState(mockGeneral);
  const [registration, setRegistration] = useState(mockRegistration);
  const [auction, setAuction] = useState(mockAuction);
  const [notifications, setNotifications] = useState(mockNotifications);

  const save = (msg: string) => toast({ title: msg });

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <Card className="bg-gradient-card border-border">
            <CardHeader><CardTitle className="font-heading text-lg uppercase">Geral</CardTitle></CardHeader>
            {/* API: PUT /api/admin/settings/general */}
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da plataforma</Label>
                <Input value={general.platformName} onChange={e => setGeneral(p => ({ ...p, platformName: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição da plataforma</Label>
                <Textarea value={general.description} onChange={e => setGeneral(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email de suporte</Label>
                  <Input value={general.supportEmail} onChange={e => setGeneral(p => ({ ...p, supportEmail: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email de notificações (remetente)</Label>
                  <Input value={general.senderEmail} onChange={e => setGeneral(p => ({ ...p, senderEmail: e.target.value }))} className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fuso horário padrão</Label>
                  <Select value={general.timezone} onValueChange={v => setGeneral(p => ({ ...p, timezone: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">América/São Paulo (BRT)</SelectItem>
                      <SelectItem value="America/Manaus">América/Manaus (AMT)</SelectItem>
                      <SelectItem value="America/Belem">América/Belém (BRT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Moeda padrão</Label>
                  <div className="flex items-center gap-2">
                    <Input value="BRL — Real Brasileiro" readOnly className="h-9 opacity-60 cursor-not-allowed" />
                    <Badge variant="outline" className="text-[9px] shrink-0">Padrão</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Modo manutenção</Label>
                    <p className="text-xs text-muted-foreground">Desativa a plataforma para todos os usuários</p>
                  </div>
                  <Switch checked={general.maintenanceMode} onCheckedChange={v => setGeneral(p => ({ ...p, maintenanceMode: v }))} />
                </div>
                {general.maintenanceMode && (
                  <div className="space-y-2 pl-4 border-l-2 border-kolecta-red/30">
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <AlertTriangle className="h-3 w-3" /> ATENÇÃO: ativa imediatamente para todos os usuários
                    </Badge>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mensagem exibida aos usuários</Label>
                      <Input value={general.maintenanceMessage} onChange={e => setGeneral(p => ({ ...p, maintenanceMessage: e.target.value }))} className="h-9" placeholder="Estamos em manutenção. Voltamos em breve!" />
                    </div>
                  </div>
                )}
              </div>

              <Button className="glow-primary" onClick={() => save('Configurações gerais salvas')}>Salvar configurações</Button>
            </CardContent>
          </Card>
        );

      case 'registration':
        return (
          <Card className="bg-gradient-card border-border">
            <CardHeader><CardTitle className="font-heading text-lg uppercase">Cadastros e Verificação</CardTitle></CardHeader>
            {/* API: PUT /api/admin/settings/registration */}
            <CardContent className="space-y-5">
              {([
                { key: 'allowBuyers' as const, label: 'Permitir novos cadastros de compradores' },
                { key: 'allowSellers' as const, label: 'Permitir novos cadastros de vendedores' },
                { key: 'requireEmail' as const, label: 'Exigir verificação de email no cadastro' },
                { key: 'requireKyc' as const, label: 'Exigir KYC para vendedores' },
              ]).map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <Label className="text-sm">{item.label}</Label>
                  <Switch checked={registration[item.key]} onCheckedChange={v => setRegistration(p => ({ ...p, [item.key]: v }))} />
                </div>
              ))}

              <div className="space-y-1.5">
                <Label className="text-xs">Nível de KYC exigido</Label>
                <Select value={registration.kycLevel} onValueChange={v => setRegistration(p => ({ ...p, kycLevel: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico (CPF + selfie)</SelectItem>
                    <SelectItem value="complete">Completo (+ comprovante de residência)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Aprovação manual de vendedores</Label>
                  <p className="text-xs text-muted-foreground">Novos vendedores aguardam aprovação de um admin antes de publicar</p>
                </div>
                <Switch checked={registration.manualApproval} onCheckedChange={v => setRegistration(p => ({ ...p, manualApproval: v }))} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Máximo de anúncios por vendedor não verificado</Label>
                <Input type="number" value={registration.maxListingsUnverified} onChange={e => setRegistration(p => ({ ...p, maxListingsUnverified: parseInt(e.target.value) || 0 }))} className="h-9 w-32" min={0} />
              </div>

              <Button className="glow-primary" onClick={() => save('Configurações de cadastro salvas')}>Salvar configurações</Button>
            </CardContent>
          </Card>
        );

      case 'auction':
        return (
          <Card className="bg-gradient-card border-border">
            <CardHeader><CardTitle className="font-heading text-lg uppercase">Modo Lance</CardTitle></CardHeader>
            {/* API: PUT /api/admin/settings/auction */}
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Modo Lance habilitado na plataforma</Label>
                <Switch checked={auction.enabled} onCheckedChange={v => setAuction(p => ({ ...p, enabled: v }))} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Duração máxima de leilão (dias)</Label>
                  <Input type="number" value={auction.maxDuration} onChange={e => setAuction(p => ({ ...p, maxDuration: parseInt(e.target.value) || 0 }))} className="h-9" min={1} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Duração mínima de leilão (horas)</Label>
                  <Input type="number" value={auction.minDuration} onChange={e => setAuction(p => ({ ...p, minDuration: parseInt(e.target.value) || 0 }))} className="h-9" min={1} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Prazo para pagamento após vencer (horas)</Label>
                <Input type="number" value={auction.paymentDeadline} onChange={e => setAuction(p => ({ ...p, paymentDeadline: parseInt(e.target.value) || 0 }))} className="h-9 w-32" min={1} />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Permitir encerramento antecipado pelo vendedor</Label>
                <Switch checked={auction.allowEarlyEnd} onCheckedChange={v => setAuction(p => ({ ...p, allowEarlyEnd: v }))} />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Extensão automática se lance nos últimos X minutos</Label>
                <Switch checked={auction.autoExtend} onCheckedChange={v => setAuction(p => ({ ...p, autoExtend: v }))} />
              </div>

              {auction.autoExtend && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-kolecta-gold/30">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Minutos para extensão automática</Label>
                    <Input type="number" value={auction.autoExtendMinutes} onChange={e => setAuction(p => ({ ...p, autoExtendMinutes: parseInt(e.target.value) || 0 }))} className="h-9" min={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tempo de extensão em minutos</Label>
                    <Input type="number" value={auction.extensionTime} onChange={e => setAuction(p => ({ ...p, extensionTime: parseInt(e.target.value) || 0 }))} className="h-9" min={1} />
                  </div>
                </div>
              )}

              <Button className="glow-primary" onClick={() => save('Configurações do Modo Lance salvas')}>Salvar configurações</Button>
            </CardContent>
          </Card>
        );

      case 'notifications':
        return (
          <Card className="bg-gradient-card border-border">
            <CardHeader><CardTitle className="font-heading text-lg uppercase">Notificações do Sistema</CardTitle></CardHeader>
            {/* API: PUT /api/admin/settings/notifications */}
            <CardContent className="space-y-5">
              {([
                { key: 'welcomeEmail' as const, label: 'Enviar email de boas-vindas no cadastro' },
                { key: 'newVerification' as const, label: 'Notificar admin em novas solicitações de verificação' },
                { key: 'escalatedDispute' as const, label: 'Notificar admin em disputas escaladas' },
                { key: 'dailyReport' as const, label: 'Relatório financeiro diário por email' },
              ]).map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <Label className="text-sm">{item.label}</Label>
                  <Switch checked={notifications[item.key]} onCheckedChange={v => setNotifications(p => ({ ...p, [item.key]: v }))} />
                </div>
              ))}

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-xs">Emails dos admins para notificações (separados por vírgula)</Label>
                <Input value={notifications.adminEmails} onChange={e => setNotifications(p => ({ ...p, adminEmails: e.target.value }))} className="h-9" />
              </div>

              <Button className="glow-primary" onClick={() => save('Preferências de notificação salvas')}>Salvar preferências</Button>
            </CardContent>
          </Card>
        );

      case 'integrations':
        return (
          <div className="space-y-4">
            {/* Stripe */}
            <Card className="bg-gradient-card border-border">
              <CardHeader><CardTitle className="font-heading text-lg uppercase">Stripe</CardTitle></CardHeader>
              {/* Chaves gerenciadas via variáveis de ambiente — nunca exibir chaves completas no frontend */}
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="gap-1 text-xs bg-green-500/10 text-green-500 border-green-500/20">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                    Produção
                  </Badge>
                  <span className="text-xs text-muted-foreground">Chave pública: ••••{mockIntegrations.stripe.lastKey}</span>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 text-xs"><Zap className="h-3 w-3" /> Testar conexão</Button>
              </CardContent>
            </Card>

            {/* Correios */}
            <Card className="bg-gradient-card border-border">
              <CardHeader><CardTitle className="font-heading text-lg uppercase">Correios / APIs de Frete</CardTitle></CardHeader>
              {/* API: GET /api/admin/settings/integrations
                  POST /api/admin/settings/integrations/:service/test */}
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="gap-1 text-xs bg-green-500/10 text-green-500 border-green-500/20">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 text-xs"><Zap className="h-3 w-3" /> Testar conexão</Button>
              </CardContent>
            </Card>

            {/* SendGrid */}
            <Card className="bg-gradient-card border-border">
              <CardHeader><CardTitle className="font-heading text-lg uppercase">SendGrid (Email)</CardTitle></CardHeader>
              {/* API: POST /api/admin/settings/integrations/:service/test */}
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="gap-1 text-xs bg-green-500/10 text-green-500 border-green-500/20">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">API Key</Label>
                  <Input value={mockIntegrations.sendgrid.apiKey} readOnly className="h-9 opacity-60 cursor-not-allowed font-mono text-xs" />
                </div>
                <Button variant="ghost" size="sm" className="gap-1 text-xs"><Zap className="h-3 w-3" /> Testar envio</Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'data':
        return (
          <Card className="bg-gradient-card border-border">
            <CardHeader><CardTitle className="font-heading text-lg uppercase">Dados e Backup</CardTitle></CardHeader>
            {/* API: POST /api/admin/data/export/:type */}
            <CardContent className="space-y-4">
              <Button variant="ghost" className="gap-2 justify-start w-full">
                <Download className="h-4 w-4" /> Exportar todos os dados (LGPD)
              </Button>
              <Button variant="ghost" className="gap-2 justify-start w-full">
                <Download className="h-4 w-4" /> Exportar base de usuários
              </Button>
              <Button variant="ghost" className="gap-2 justify-start w-full">
                <Download className="h-4 w-4" /> Exportar histórico financeiro
              </Button>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Último backup automático: 18/03/2026 às 03:00
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold italic uppercase">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Configurações gerais do sistema</p>
        </div>

        {isMobile ? (
          /* Mobile: horizontal scroll tabs */
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
              {sections.map(s => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                    activeSection === s.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              ))}
            </div>
            {renderContent()}
          </div>
        ) : (
          /* Desktop: sidebar + content */
          <div className="grid grid-cols-[220px_1fr] gap-8">
            <nav className="space-y-1">
              {sections.map(s => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
                    activeSection === s.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </button>
              ))}
            </nav>
            <div>{renderContent()}</div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
