import { useState } from 'react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  User, ShieldCheck, Bell, Lock, Trash2, Eye, EyeOff, Upload, Monitor, Smartphone, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Mock Data ─── */
const mockProfile = {
  name: 'JDM Imports',
  description: 'Especializada em peças e acessórios para veículos japoneses.',
  city: 'São Paulo',
  state: 'SP',
  website: 'https://jdm-imports.com.br',
  categories: ['Capacetes', 'Jaquetas'],
  initials: 'JI',
};

const mockPolicies = {
  shipping: 'Enviamos em até 2 dias úteis após confirmação. Correios SEDEX e PAC.',
  returns: 'Aceitamos devoluções em até 7 dias após recebimento.',
  payment: 'Cartão de crédito, Pix e boleto bancário.',
  acceptOffers: true,
  maxDiscount: 15,
};

const notifTypes = [
  { key: 'newOrder', label: 'Novo pedido recebido' },
  { key: 'newBid', label: 'Lance recebido no leilão' },
  { key: 'buyerMessage', label: 'Mensagem de comprador' },
  { key: 'disputeOpened', label: 'Disputa aberta' },
  { key: 'transferDone', label: 'Repasse realizado', pushDisabled: true },
  { key: 'listingReview', label: 'Anúncio aprovado/rejeitado' },
];

const mockNotifPrefs: Record<string, { email: boolean; push: boolean }> = {
  newOrder: { email: true, push: true },
  newBid: { email: true, push: true },
  buyerMessage: { email: false, push: true },
  disputeOpened: { email: true, push: true },
  transferDone: { email: true, push: false },
  listingReview: { email: true, push: false },
};

const mockSessions = [
  { id: 's1', device: 'Chrome — Windows', icon: Monitor, lastAccess: '2025-03-17T14:30:00', current: true },
  { id: 's2', device: 'Safari — iPhone 15', icon: Smartphone, lastAccess: '2025-03-16T09:00:00', current: false },
  { id: 's3', device: 'Firefox — macOS', icon: Globe, lastAccess: '2025-03-10T20:00:00', current: false },
];

const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

type Section = 'profile' | 'policies' | 'notifications' | 'security' | 'account';

const sections: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: 'profile', label: 'Perfil da loja', icon: User },
  { key: 'policies', label: 'Políticas', icon: ShieldCheck },
  { key: 'notifications', label: 'Notificações', icon: Bell },
  { key: 'security', label: 'Segurança', icon: Lock },
  { key: 'account', label: 'Conta', icon: Trash2 },
];

/* ─── Main Component ─── */
export default function SellerSettingsPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<Section>('profile');

  // Profile state
  const [profile, setProfile] = useState(mockProfile);
  const [descCount, setDescCount] = useState(mockProfile.description.length);

  // Policies state
  const [policies, setPolicies] = useState(mockPolicies);

  // Notifications state
  const [notifPrefs, setNotifPrefs] = useState(mockNotifPrefs);

  // Security state
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [sessions, setSessions] = useState(mockSessions);

  // Account state
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const save = (msg: string) => toast({ title: msg });

  // Password strength
  const pwStrength = (() => {
    if (!newPw) return 0;
    let s = 0;
    if (newPw.length >= 8) s++;
    if (/[A-Z]/.test(newPw)) s++;
    if (/[0-9]/.test(newPw)) s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  })();
  const pwColors = ['bg-destructive', 'bg-[hsl(var(--kolecta-red))]', 'bg-amber-500', 'bg-emerald-500'];
  const pwLabels = ['Fraca', 'Fraca', 'Média', 'Forte'];

  const handleChangePassword = () => {
    if (!currentPw || !newPw || !confirmPw) return;
    if (newPw !== confirmPw) { toast({ title: 'As senhas não coincidem', variant: 'destructive' }); return; }
    if (newPw.length < 8) { toast({ title: 'A senha deve ter pelo menos 8 caracteres', variant: 'destructive' }); return; }
    toast({ title: 'Senha alterada com sucesso' });
    setPasswordDialog(false);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== 'CONFIRMAR') return;
    toast({ title: 'Solicitação de exclusão enviada', variant: 'destructive' });
    setDeleteDialog(false);
    setDeleteConfirmText('');
  };

  /* ─── Section Renderers ─── */

  const renderProfile = () => (
    <Card className="bg-gradient-card">
      <CardHeader><CardTitle className="font-heading">Perfil da loja</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {/* API: PUT /api/seller/profile */}
        <div className="flex items-center gap-4">
          <Avatar className="h-[120px] w-[120px]">
            <AvatarFallback className="bg-muted text-muted-foreground font-heading text-3xl">{profile.initials}</AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" /> Alterar foto</Button>
        </div>
        <div className="space-y-1.5">
          <Label>Nome da loja</Label>
          <Input value={profile.name} onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição da loja</Label>
          <Textarea
            value={profile.description}
            maxLength={500}
            onChange={(e) => { setProfile(p => ({ ...p, description: e.target.value })); setDescCount(e.target.value.length); }}
            rows={4}
          />
          <p className="text-xs text-muted-foreground text-right">{descCount}/500</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input value={profile.city} onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={profile.state} onValueChange={(v) => setProfile(p => ({ ...p, state: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Site ou portfólio (opcional)</Label>
          <Input value={profile.website} onChange={(e) => setProfile(p => ({ ...p, website: e.target.value }))} />
        </div>
        <Button variant="kolecta" onClick={() => save('Perfil salvo')}>Salvar perfil</Button>
      </CardContent>
    </Card>
  );

  const renderPolicies = () => (
    <Card className="bg-gradient-card">
      <CardHeader><CardTitle className="font-heading">Políticas da loja</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {/* API: PUT /api/seller/policies */}
        <div className="space-y-1.5">
          <Label>Política de envio</Label>
          <Textarea value={policies.shipping} onChange={(e) => setPolicies(p => ({ ...p, shipping: e.target.value }))} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label>Política de troca e devolução</Label>
          <Textarea value={policies.returns} onChange={(e) => setPolicies(p => ({ ...p, returns: e.target.value }))} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label>Formas de pagamento aceitas</Label>
          <Textarea value={policies.payment} onChange={(e) => setPolicies(p => ({ ...p, payment: e.target.value }))} rows={2} />
        </div>
        <Separator className="line-tech" />
        <div className="flex items-center justify-between">
          <Label>Aceitar propostas nos anúncios por padrão</Label>
          <Switch checked={policies.acceptOffers} onCheckedChange={(v) => setPolicies(p => ({ ...p, acceptOffers: v }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Desconto máximo para propostas (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={policies.maxDiscount}
            onChange={(e) => setPolicies(p => ({ ...p, maxDiscount: Number(e.target.value) }))}
            className="w-32"
          />
        </div>
        <Button variant="kolecta" onClick={() => save('Políticas salvas')}>Salvar políticas</Button>
      </CardContent>
    </Card>
  );

  const renderNotifications = () => (
    <Card className="bg-gradient-card">
      <CardHeader><CardTitle className="font-heading">Notificações</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* API: PUT /api/seller/notification-preferences */}
        <div className="grid grid-cols-[1fr_60px_60px] gap-2 text-xs text-muted-foreground font-heading uppercase tracking-wider">
          <span />
          <span className="text-center">Email</span>
          <span className="text-center">Push</span>
        </div>
        {notifTypes.map((nt) => (
          <div key={nt.key} className="grid grid-cols-[1fr_60px_60px] gap-2 items-center">
            <span className="text-sm">{nt.label}</span>
            <div className="flex justify-center">
              <Switch
                checked={notifPrefs[nt.key]?.email ?? false}
                onCheckedChange={(v) => setNotifPrefs(p => ({ ...p, [nt.key]: { ...p[nt.key], email: v } }))}
              />
            </div>
            <div className="flex justify-center">
              <Switch
                checked={notifPrefs[nt.key]?.push ?? false}
                disabled={nt.pushDisabled}
                onCheckedChange={(v) => setNotifPrefs(p => ({ ...p, [nt.key]: { ...p[nt.key], push: v } }))}
              />
            </div>
          </div>
        ))}
        <Button variant="kolecta" onClick={() => save('Preferências salvas')}>Salvar preferências</Button>
      </CardContent>
    </Card>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <Card className="bg-gradient-card">
        <CardHeader><CardTitle className="font-heading">Senha</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setPasswordDialog(true)}>Alterar senha</Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card">
        <CardHeader><CardTitle className="font-heading">Autenticação em dois fatores</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {/* API: POST /api/auth/2fa/setup */}
          <div className="flex items-center gap-3">
            <Badge className={twoFaEnabled ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'}>
              {twoFaEnabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <Button variant={twoFaEnabled ? 'destructive' : 'kolecta'} onClick={() => { setTwoFaEnabled(!twoFaEnabled); save(twoFaEnabled ? '2FA desativado' : '2FA ativado'); }}>
            {twoFaEnabled ? 'Desativar 2FA' : 'Ativar 2FA'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card">
        <CardHeader><CardTitle className="font-heading">Sessões ativas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <s.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{s.device} {s.current && <Badge variant="secondary" className="ml-2 text-[10px]">Atual</Badge>}</p>
                  <p className="text-xs text-muted-foreground">Último acesso: {new Date(s.lastAccess).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              {!s.current && (
                <Button variant="ghost" size="sm" onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))}>
                  Encerrar
                </Button>
              )}
            </div>
          ))}
          <Separator />
          <Button variant="destructive" size="sm" onClick={() => { setSessions(prev => prev.filter(x => x.current)); save('Sessões encerradas'); }}>
            Encerrar todas as outras sessões
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderAccount = () => (
    <Card className="bg-gradient-card">
      <CardHeader><CardTitle className="font-heading">Conta</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* API: DELETE /api/seller/account */}
        <div className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Email:</span> vendedor@kolecta.com.br</p>
          <p><span className="text-muted-foreground">Cadastrado em:</span> 15/01/2024</p>
        </div>
        <Separator />
        <Button variant="ghost" className="text-destructive" onClick={() => setDeleteDialog(true)}>
          <Trash2 className="h-4 w-4 mr-1" /> Solicitar exclusão da conta
        </Button>
      </CardContent>
    </Card>
  );

  const sectionRenderers: Record<Section, () => React.ReactNode> = {
    profile: renderProfile,
    policies: renderPolicies,
    notifications: renderNotifications,
    security: renderSecurity,
    account: renderAccount,
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua loja, políticas e segurança</p>
        </div>

        {/* Mobile: tabs, Desktop: sidebar layout */}
        {isMobile ? (
          <div className="space-y-4">
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors',
                    activeSection === s.key
                      ? 'bg-[hsl(var(--kolecta-gold)/0.1)] text-[hsl(var(--kolecta-gold))] font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </button>
              ))}
            </div>
            {sectionRenderers[activeSection]()}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            <aside className="col-span-3 space-y-1">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left',
                    activeSection === s.key
                      ? 'bg-[hsl(var(--kolecta-gold)/0.1)] text-[hsl(var(--kolecta-gold))] font-medium border-l-2 border-[hsl(var(--kolecta-gold))]'
                      : 'text-muted-foreground hover:bg-muted border-l-2 border-transparent'
                  )}
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </button>
              ))}
            </aside>
            <div className="col-span-9">
              {sectionRenderers[activeSection]()}
            </div>
          </div>
        )}
      </div>

      {/* Password Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Alterar senha</DialogTitle>
            <DialogDescription className="sr-only">Formulário de alteração de senha</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Senha atual</Label>
              <div className="relative">
                <Input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowCurrentPw(!showCurrentPw)}>
                  {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <div className="relative">
                <Input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNewPw(!showNewPw)}>
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPw && (
                <div className="space-y-1">
                  <div className="flex gap-1 h-1.5">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={cn('flex-1 rounded-full', i < pwStrength ? pwColors[pwStrength - 1] : 'bg-muted')} />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{pwLabels[pwStrength - 1] || ''}</p>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setPasswordDialog(false)}>Cancelar</Button>
            <Button variant="kolecta" onClick={handleChangePassword} disabled={!currentPw || !newPw || !confirmPw}>
              Alterar senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-destructive">Excluir conta</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Digite <strong>CONFIRMAR</strong> para prosseguir:</p>
            <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="CONFIRMAR" />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'CONFIRMAR'}>
              Excluir conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
}
