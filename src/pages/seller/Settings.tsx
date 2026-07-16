import { useState, useEffect } from 'react';
import { useClerk } from '@clerk/clerk-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  User, ShieldCheck, Bell, Lock, KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSellerSelfProfile,
  useUpdateSellerProfile,
  useUpdateSellerPolicies,
  useUpdateNotificationPrefs,
} from '@/hooks/use-api';

const notifTypes = [
  { key: 'newOrder', label: 'Novo pedido recebido' },
  { key: 'newBid', label: 'Lance recebido no leilão' },
  { key: 'buyerMessage', label: 'Mensagem de comprador' },
  { key: 'disputeOpened', label: 'Disputa aberta' },
  { key: 'transferDone', label: 'Repasse realizado', pushDisabled: true },
  { key: 'listingReview', label: 'Anúncio aprovado/rejeitado' },
];

const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

type Section = 'profile' | 'policies' | 'notifications' | 'security';

const sections: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: 'profile', label: 'Perfil da loja', icon: User },
  { key: 'policies', label: 'Políticas', icon: ShieldCheck },
  { key: 'notifications', label: 'Notificações', icon: Bell },
  { key: 'security', label: 'Segurança & Conta', icon: Lock },
];

function initials(name: string | null | undefined) {
  if (!name) return 'LO';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

/* ─── Main Component ─── */
export default function SellerSettingsPage() {
  const isMobile = useIsMobile();
  const { openUserProfile } = useClerk();
  const [activeSection, setActiveSection] = useState<Section>('profile');

  const { data: profile, isLoading } = useSellerSelfProfile();
  const updateProfile = useUpdateSellerProfile();
  const updatePolicies = useUpdateSellerPolicies();
  const updateNotifs = useUpdateNotificationPrefs();

  // ── Form states (inicializados quando o perfil carrega) ──────────────────
  const [store, setStore] = useState({ storeName: '', bio: '', city: '', state: '', website: '' });
  const [policies, setPoliciesState] = useState({
    shipping: '', returns: '', payment: '', acceptOffers: false, maxDiscountPercent: 0,
  });
  const [notifPrefs, setNotifPrefs] = useState<Record<string, { email: boolean; push: boolean }>>({});

  useEffect(() => {
    if (!profile) return;
    setStore({
      storeName: profile.storeName ?? '',
      bio: profile.bio ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      website: profile.website ?? '',
    });
    setPoliciesState({
      shipping: profile.policies.shipping ?? '',
      returns: profile.policies.returns ?? '',
      payment: profile.policies.payment ?? '',
      acceptOffers: profile.policies.acceptOffers ?? false,
      maxDiscountPercent: profile.policies.maxDiscountPercent ?? 0,
    });
    const prefs: Record<string, { email: boolean; push: boolean }> = {};
    for (const nt of notifTypes) {
      const p = profile.notificationPrefs?.[nt.key];
      prefs[nt.key] = { email: p?.email ?? false, push: p?.push ?? false };
    }
    setNotifPrefs(prefs);
  }, [profile]);

  /* ─── Section Renderers ─── */

  const renderProfile = () => (
    <Card className="bg-gradient-card">
      <CardHeader><CardTitle className="font-heading">Perfil da loja</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-[120px] w-[120px]">
            <AvatarFallback className="bg-muted text-muted-foreground font-heading text-3xl">
              {initials(store.storeName || profile?.account.name)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="space-y-1.5">
          <Label>Nome da loja</Label>
          <Input value={store.storeName} onChange={(e) => setStore(s => ({ ...s, storeName: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição da loja</Label>
          <Textarea
            value={store.bio}
            maxLength={500}
            onChange={(e) => setStore(s => ({ ...s, bio: e.target.value }))}
            rows={4}
          />
          <p className="text-xs text-muted-foreground text-right">{store.bio.length}/500</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input value={store.city} onChange={(e) => setStore(s => ({ ...s, city: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={store.state} onValueChange={(v) => setStore(s => ({ ...s, state: v }))}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Site ou portfólio (opcional)</Label>
          <Input value={store.website} onChange={(e) => setStore(s => ({ ...s, website: e.target.value }))} />
        </div>
        <Button
          variant="kolecta"
          disabled={updateProfile.isPending}
          onClick={() => updateProfile.mutate(store)}
        >
          {updateProfile.isPending ? 'Salvando...' : 'Salvar perfil'}
        </Button>
      </CardContent>
    </Card>
  );

  const renderPolicies = () => (
    <Card className="bg-gradient-card">
      <CardHeader><CardTitle className="font-heading">Políticas da loja</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label>Política de envio</Label>
          <Textarea value={policies.shipping} onChange={(e) => setPoliciesState(p => ({ ...p, shipping: e.target.value }))} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label>Política de troca e devolução</Label>
          <Textarea value={policies.returns} onChange={(e) => setPoliciesState(p => ({ ...p, returns: e.target.value }))} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label>Formas de pagamento aceitas</Label>
          <Textarea value={policies.payment} onChange={(e) => setPoliciesState(p => ({ ...p, payment: e.target.value }))} rows={2} />
        </div>
        <Separator className="line-tech" />
        <div className="flex items-center justify-between">
          <Label>Aceitar propostas nos anúncios por padrão</Label>
          <Switch checked={policies.acceptOffers} onCheckedChange={(v) => setPoliciesState(p => ({ ...p, acceptOffers: v }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Desconto máximo para propostas (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={policies.maxDiscountPercent}
            onChange={(e) => setPoliciesState(p => ({ ...p, maxDiscountPercent: Number(e.target.value) }))}
            className="w-32"
          />
        </div>
        <Button
          variant="kolecta"
          disabled={updatePolicies.isPending}
          onClick={() => updatePolicies.mutate(policies)}
        >
          {updatePolicies.isPending ? 'Salvando...' : 'Salvar políticas'}
        </Button>
      </CardContent>
    </Card>
  );

  const renderNotifications = () => (
    <Card className="bg-gradient-card">
      <CardHeader><CardTitle className="font-heading">Notificações</CardTitle></CardHeader>
      <CardContent className="space-y-4">
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
        <Button
          variant="kolecta"
          disabled={updateNotifs.isPending}
          onClick={() => updateNotifs.mutate(notifPrefs)}
        >
          {updateNotifs.isPending ? 'Salvando...' : 'Salvar preferências'}
        </Button>
      </CardContent>
    </Card>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <Card className="bg-gradient-card">
        <CardHeader><CardTitle className="font-heading">Segurança da conta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Senha, autenticação em dois fatores (2FA) e sessões ativas são gerenciadas
            com segurança pela nossa camada de identidade (Clerk).
          </p>
          <Button variant="outline" onClick={() => openUserProfile()}>
            <KeyRound className="h-4 w-4 mr-2" /> Gerenciar segurança
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card">
        <CardHeader><CardTitle className="font-heading">Conta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Email:</span> {profile?.account.email ?? '—'}</p>
              <p>
                <span className="text-muted-foreground">Cadastrado em:</span>{' '}
                {profile?.account.createdAt
                  ? new Date(profile.account.createdAt).toLocaleDateString('pt-BR')
                  : '—'}
              </p>
            </div>
          )}
          <Separator />
          <Button variant="ghost" onClick={() => openUserProfile()}>
            Gerenciar dados da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const sectionRenderers: Record<Section, () => React.ReactNode> = {
    profile: renderProfile,
    policies: renderPolicies,
    notifications: renderNotifications,
    security: renderSecurity,
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
    </SellerLayout>
  );
}
