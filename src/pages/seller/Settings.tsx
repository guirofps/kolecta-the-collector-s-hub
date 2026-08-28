import { useState, useEffect, useRef } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import StoreCover from '@/components/loja/StoreCover';
import {
  COVER_FOCAL_DEFAULT, COVER_OVERLAY_DEFAULT, COVER_OVERLAY_MAX, COVER_OVERLAY_MIN,
} from '@/lib/capa-loja';
import {
  User, ShieldCheck, Bell, Lock, KeyRound, Camera, Loader2, Trash2, Truck,
  AlertTriangle, Copy, Check, ExternalLink, Image as ImageIcon,
  Instagram, Youtube, Globe,
} from 'lucide-react';
// O TikTok não existe no lucide — vem do nosso componente, junto do ícone que a
// própria loja usa, para os dois nunca divergirem.
import { TiktokIcon } from '@/components/loja/StoreSocials';
import { urlDaRedeFront, urlDeWebsiteFront } from '@/lib/redes-sociais';
import { cn } from '@/lib/utils';
import {
  marcadasNaTela, alternarTransportadora, semCoberturaNacional,
} from '@/lib/transportadoras';
import { useToast } from '@/hooks/use-toast';
import {
  useSellerSelfProfile,
  useUpdateSellerProfile,
  useUpdateSellerPolicies,
  useUpdateNotificationPrefs,
  useUpdateSellerShipping,
  useUploadImage,
  useUploadCapa,
} from '@/hooks/use-api';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // igual ao limite do /api/media/upload
// A capa é uma imagem larga (panorâmica), e o servidor aceita até 15 MB. 8 MB
// dá folga para foto de celular sem virar um upload eterno em 4G.
const MAX_CAPA_BYTES = 8 * 1024 * 1024;

const notifTypes = [
  { key: 'newOrder', label: 'Novo pedido recebido' },
  { key: 'newBid', label: 'Lance recebido no leilão' },
  { key: 'buyerMessage', label: 'Mensagem de comprador' },
  { key: 'disputeOpened', label: 'Disputa aberta' },
  { key: 'transferDone', label: 'Repasse realizado', pushDisabled: true },
  { key: 'listingReview', label: 'Anúncio aprovado/rejeitado' },
];

const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

type Section = 'profile' | 'shipping' | 'policies' | 'notifications' | 'security';

const sections: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: 'profile', label: 'Perfil da loja', icon: User },
  { key: 'shipping', label: 'Envio', icon: Truck },
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
  const { user } = useUser();
  const [activeSection, setActiveSection] = useState<Section>('profile');

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const capaInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useSellerSelfProfile();
  const updateProfile = useUpdateSellerProfile();
  const updatePolicies = useUpdateSellerPolicies();
  const updateNotifs = useUpdateNotificationPrefs();
  const updateShipping = useUpdateSellerShipping();
  const uploadImage = useUploadImage();
  const uploadCapa = useUploadCapa();

  // ── Form states (inicializados quando o perfil carrega) ──────────────────
  // As redes vivem DENTRO do `store`, e não fora como a capa: são texto
  // digitado, não upload. Salvar a cada tecla mandaria um request por caractere,
  // e a capa só salva sozinha porque enviar uma imagem já é um ato em si.
  const [store, setStore] = useState({
    storeName: '', avatarUrl: '', bio: '', city: '', state: '', website: '',
    socialTiktok: '', socialInstagram: '', socialYoutube: '',
  });
  // Capa da loja. Fora do `store` de propósito: o botão "Salvar perfil" manda o
  // `store` inteiro, e a capa salva sozinha (enviar imagem já tem efeito, como
  // a foto). Misturar faria um "Salvar perfil" desfazer um ajuste de capa ainda
  // não salvo, e vice-versa.
  const [capa, setCapa] = useState({
    url: '',
    focalY: COVER_FOCAL_DEFAULT,
    overlay: COVER_OVERLAY_DEFAULT,
  });
  const [policies, setPoliciesState] = useState({
    shipping: '', returns: '', payment: '', acceptOffers: false, maxDiscountPercent: 0,
  });
  const [notifPrefs, setNotifPrefs] = useState<Record<string, { email: boolean; push: boolean }>>({});
  // Transportadoras marcadas. Vazio = "todas as que a Kolecta oferece", que é o
  // estado de quem nunca abriu esta aba.
  const [transportadoras, setTransportadoras] = useState<number[]>([]);
  const [aceitaRetirada, setAceitaRetirada] = useState(true);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // ── Link público da loja (vanity URL) ────────────────────────────────────
  const slug = profile?.slug ?? null;
  const urlLoja = slug ? `kolecta.com.br/${slug}` : null;
  const copiarLink = async () => {
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(`https://kolecta.com.br/${slug}`);
      setLinkCopiado(true);
      toast({ title: 'Link copiado!', description: 'Cole na bio do Instagram, no WhatsApp, onde quiser.' });
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch {
      toast({ title: 'Não deu pra copiar', description: 'Copie o link manualmente.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!profile) return;
    setStore({
      storeName: profile.storeName ?? '',
      // Sem foto própria: herda a do Clerk (persiste no próximo "Salvar perfil")
      avatarUrl: profile.avatarUrl ?? (user?.hasImage ? user.imageUrl : ''),
      bio: profile.bio ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      website: profile.website ?? '',
      // `socialRaw`, e não `social`: o vendedor digitou "@loja" e é "@loja" que
      // precisa reaparecer no campo — devolver a URL montada faria o valor dele
      // mudar sozinho a cada vez que ele abrisse a tela.
      socialTiktok: profile.socialRaw?.tiktok ?? '',
      socialInstagram: profile.socialRaw?.instagram ?? '',
      socialYoutube: profile.socialRaw?.youtube ?? '',
    });
    setCapa({
      url: profile.cover?.url ?? '',
      focalY: profile.cover?.focalY ?? COVER_FOCAL_DEFAULT,
      overlay: profile.cover?.overlay ?? COVER_OVERLAY_DEFAULT,
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
    setTransportadoras(profile.shipping?.services ?? []);
    setAceitaRetirada(profile.shipping?.acceptsPickup !== false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user?.imageUrl, user?.hasImage]);

  /** Salva só a foto (upload/troca/remoção têm efeito imediato). */
  const saveAvatar = (avatarUrl: string) => {
    setStore((s) => ({ ...s, avatarUrl }));
    updateProfile.mutate({ ...store, avatarUrl });
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reenviar o mesmo arquivo
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Envie uma imagem (JPG, PNG ou WebP).', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: 'Imagem muito grande', description: 'O limite é 5 MB.', variant: 'destructive' });
      return;
    }

    try {
      const { url } = await uploadImage.mutateAsync(file);
      saveAvatar(url);
    } catch (err) {
      toast({
        title: 'Não foi possível enviar a foto',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // ── Capa da loja ─────────────────────────────────────────────────────────
  //
  // Salva sozinha, sem depender do "Salvar perfil": enviar uma imagem e mexer
  // no enquadramento são ações com efeito imediato, como a foto da loja.
  const salvarCapa = (patch: Partial<typeof capa>) => {
    const novo = { ...capa, ...patch };
    setCapa(novo);
    updateProfile.mutate({
      coverUrl: novo.url,
      coverFocalY: novo.focalY,
      coverOverlay: novo.overlay,
    });
  };

  const handleCapaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Envie uma imagem (JPG, PNG ou WebP).', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_CAPA_BYTES) {
      toast({ title: 'Imagem muito grande', description: 'O limite é 8 MB.', variant: 'destructive' });
      return;
    }

    try {
      const { url } = await uploadCapa.mutateAsync(file);
      salvarCapa({ url });
    } catch (err) {
      toast({
        title: 'Não foi possível enviar a capa',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  /* ─── Section Renderers ─── */

  const renderCapa = () => (
    <div className="space-y-3">
      <div>
        <Label>Capa da loja</Label>
        <p className="text-xs text-muted-foreground mt-1">
          {capa.url
            ? 'A faixa no topo da sua página. Use uma imagem larga — ela é cortada em formato panorâmico.'
            : 'Sua loja está com a capa padrão da Kolecta. Suba a sua para ela ficar com a cara da sua marca — de preferência uma imagem larga, porque a faixa é panorâmica.'}
        </p>
      </div>

      {/* Prévia: é o mesmo componente que a loja usa (inclusive a capa padrão,
          quando ainda não há a própria), com o nome por cima — assim o vendedor
          vê o resultado de verdade e não uma aproximação. */}
      <div className="relative overflow-hidden rounded-lg border border-border">
        <StoreCover cover={capa.url ? capa : null} seed={profile?.slug} />
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary shrink-0" />
          <span className="font-heading text-base sm:text-lg font-extrabold italic uppercase text-white drop-shadow">
            {store.storeName || profile?.account.name || 'Sua loja'}
          </span>
        </div>
      </div>

      <input
        ref={capaInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCapaSelect}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={uploadCapa.isPending || updateProfile.isPending}
          onClick={() => capaInputRef.current?.click()}
        >
          {uploadCapa.isPending
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <ImageIcon className="h-4 w-4 mr-2" />}
          {capa.url ? 'Trocar capa' : 'Enviar capa'}
        </Button>
        {capa.url && (
          <Button
            variant="ghost"
            size="sm"
            disabled={uploadCapa.isPending || updateProfile.isPending}
            onClick={() => salvarCapa({ url: '' })}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Remover
          </Button>
        )}
      </div>

      {capa.url && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
          <div className="space-y-2">
            <Label className="text-xs">Enquadramento</Label>
            <Slider
              value={[capa.focalY]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => setCapa((c) => ({ ...c, focalY: v }))}
              onValueCommit={([v]) => salvarCapa({ focalY: v })}
            />
            <p className="text-xs text-muted-foreground">
              Escolhe que parte da imagem fica visível — do topo à base.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Escurecer imagem — {capa.overlay}%</Label>
            <Slider
              value={[capa.overlay]}
              min={COVER_OVERLAY_MIN}
              max={COVER_OVERLAY_MAX}
              step={1}
              onValueChange={([v]) => setCapa((c) => ({ ...c, overlay: v }))}
              onValueCommit={([v]) => salvarCapa({ overlay: v })}
            />
            {/* O piso não é escolha de estilo: o nome da loja e os botões ficam
                em cima da capa, e sem um mínimo de véu a imagem clara apaga os
                dois. Por isso o slider começa em COVER_OVERLAY_MIN. */}
            <p className="text-xs text-muted-foreground">
              O mínimo existe para o nome da sua loja continuar legível sobre a
              imagem.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // ── Redes sociais ────────────────────────────────────────────────────────
  //
  // Cada campo é independente: preencheu, o ícone aparece na loja; não
  // preencheu, ele não existe. A prévia embaixo do input mostra o link que vai
  // sair ANTES de salvar — é o que evita o vendedor descobrir dias depois que o
  // que ele colou não virou ícone nenhum.
  const REDES_DO_FORM = [
    { campo: 'socialInstagram', rede: 'instagram', nome: 'Instagram', Icone: Instagram, exemplo: '@sualoja' },
    { campo: 'socialTiktok', rede: 'tiktok', nome: 'TikTok', Icone: TiktokIcon, exemplo: '@sualoja' },
    { campo: 'socialYoutube', rede: 'youtube', nome: 'YouTube', Icone: Youtube, exemplo: '@seucanal' },
  ] as const;

  const renderRedes = () => (
    <div className="space-y-4">
      <div>
        <Label>Redes sociais</Label>
        <p className="text-xs text-muted-foreground mt-1">
          O ícone só aparece na sua loja se o campo estiver preenchido. Pode colar
          o <span className="text-foreground">@usuário</span> ou o link inteiro —
          dá no mesmo.
        </p>
      </div>

      {REDES_DO_FORM.map(({ campo, rede, nome, Icone, exemplo }) => {
        const valor = store[campo];
        const url = urlDaRedeFront(rede, valor);
        const invalido = valor.trim().length > 0 && !url;

        return (
          <div key={campo} className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Icone className="h-3.5 w-3.5" aria-hidden="true" />
              {nome}
            </Label>
            <Input
              value={valor}
              placeholder={`${exemplo} ou o link completo`}
              aria-invalid={invalido || undefined}
              onChange={(e) => setStore(s => ({ ...s, [campo]: e.target.value }))}
            />
            {url && (
              <p className="text-xs text-muted-foreground truncate">
                Vai levar para <span className="text-foreground">{url}</span>
              </p>
            )}
            {invalido && (
              <p className="text-xs text-destructive">
                Isso não parece um link do {nome}. Use o @usuário ou o endereço do
                seu perfil no {nome}.
              </p>
            )}
          </div>
        );
      })}

      {/* O site fica aqui junto, e não lá embaixo perdido entre cidade e estado:
          ele é o quarto ícone da mesma fileira. Ele já existia e já era salvo —
          o que mudou é que agora ele APARECE na loja. */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          Site ou portfólio
        </Label>
        <Input
          value={store.website}
          placeholder="sualoja.com.br"
          onChange={(e) => setStore(s => ({ ...s, website: e.target.value }))}
        />
        {urlDeWebsiteFront(store.website) && (
          <p className="text-xs text-muted-foreground truncate">
            Vai levar para{' '}
            <span className="text-foreground">{urlDeWebsiteFront(store.website)}</span>
          </p>
        )}
      </div>
    </div>
  );

  /** Algum campo de rede está preenchido mas não gera link? */
  const redeInvalida = REDES_DO_FORM.some(({ campo, rede }) => {
    const valor = store[campo];
    return valor.trim().length > 0 && !urlDaRedeFront(rede, valor);
  });

  const renderProfile = () => (
    <Card className="bg-gradient-card">
      <CardHeader><CardTitle className="font-heading">Perfil da loja</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {/* A capa vem antes da foto porque é assim que a loja aparece: faixa no
            topo, foto por baixo. */}
        {renderCapa()}

        <Separator />

        {renderRedes()}

        <Separator />

        <div className="flex items-center gap-4">
          <Avatar className="h-[120px] w-[120px]">
            {store.avatarUrl && (
              <AvatarImage
                src={store.avatarUrl}
                alt={store.storeName || profile?.account.name || 'Loja'}
              />
            )}
            <AvatarFallback className="bg-muted text-muted-foreground font-heading text-3xl">
              {initials(store.storeName || profile?.account.name)}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={uploadImage.isPending || updateProfile.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadImage.isPending
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Camera className="h-4 w-4 mr-2" />}
                {store.avatarUrl ? 'Trocar foto' : 'Enviar foto'}
              </Button>

              {user?.hasImage && store.avatarUrl !== user.imageUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={uploadImage.isPending || updateProfile.isPending}
                  onClick={() => saveAvatar(user.imageUrl)}
                >
                  Usar foto do meu perfil
                </Button>
              )}

              {/* Com foto no Clerk, remover só faria a do perfil voltar — quem
                  faz esse caminho é o botão acima. */}
              {store.avatarUrl && !user?.hasImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={uploadImage.isPending || updateProfile.isPending}
                  onClick={() => saveAvatar('')}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Remover
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground max-w-[280px]">
              JPG, PNG ou WebP até 5 MB. Sem foto própria, usamos a do seu perfil de
              usuário — e sem nenhuma das duas, as iniciais da loja.
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Nome da loja</Label>
          <Input
            value={store.storeName}
            onChange={(e) => setStore(s => ({ ...s, storeName: e.target.value }))}
            placeholder="Ex: Escala Miniaturas"
          />
          <p className="text-xs text-muted-foreground">
            É o nome que aparece nos seus anúncios para os compradores. Sem ele, mostramos seu nome de usuário.
          </p>
        </div>

        {urlLoja && (
          <div className="space-y-1.5">
            <Label>Link da sua loja</Label>
            <div className="flex items-center gap-2">
              <div className="flex h-10 flex-1 items-center rounded-md border border-input bg-muted/40 px-3 font-mono text-sm text-foreground">
                {urlLoja}
              </div>
              <Button type="button" variant="outline" onClick={copiarLink} className="shrink-0">
                {linkCopiado
                  ? <><Check className="mr-1.5 h-4 w-4 text-green-600" /> Copiado</>
                  : <><Copy className="mr-1.5 h-4 w-4" /> Copiar</>}
              </Button>
              <Button asChild type="button" variant="ghost" size="icon" className="shrink-0" title="Abrir loja">
                <a href={`https://${urlLoja}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sua vitrine pública. Divulgue esse link e mande os clientes direto pra sua loja na Kolecta.
            </p>
          </div>
        )}
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
        <Button
          variant="kolecta"
          /* Trava com rede inválida: o backend recusaria de qualquer jeito, e
             barrar aqui troca um 400 em toast por um erro embaixo do campo
             errado, que é onde o vendedor pode consertar. */
          disabled={updateProfile.isPending || redeInvalida}
          onClick={() => updateProfile.mutate(store)}
        >
          {updateProfile.isPending ? 'Salvando...' : 'Salvar perfil'}
        </Button>
      </CardContent>
    </Card>
  );

  // ── Envio ────────────────────────────────────────────────────────────────
  // Antes o vendedor recebia todas as transportadoras da Kolecta e se virava
  // para despachar em qualquer uma. Aqui ele corta as que não usa, tipicamente
  // porque a agência da outra fica na esquina da casa dele.
  //
  // Nada marcado = todas. É o estado de quem nunca mexeu, e a saída de
  // emergência de quem se arrependeu.
  const disponiveis = profile?.shipping?.disponiveis ?? [];
  const marcadas = marcadasNaTela(transportadoras, disponiveis);
  const semNacional = semCoberturaNacional(transportadoras, disponiveis);

  const alternar = (id: number, marcar: boolean) =>
    setTransportadoras(alternarTransportadora(transportadoras, disponiveis, id, marcar));

  const renderShipping = () => (
    <Card className="bg-gradient-card">
      <CardHeader><CardTitle className="font-heading">Transportadoras</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Marque com quais você topa despachar. O comprador só vê essas no
          checkout, e a etiqueta sai na que ele escolher. Você não paga o frete:
          a Kolecta compra a etiqueta e desconta do repasse.
        </p>

        <div className="space-y-3">
          {disponiveis.map((t) => (
            <label
              key={t.id}
              className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30"
            >
              <Checkbox
                className="mt-0.5"
                checked={marcadas.includes(t.id)}
                onCheckedChange={(v) => alternar(t.id, v === true)}
              />
              <span className="text-sm leading-tight">
                <span className="font-medium">{t.carrier} {t.service}</span>
                {t.nacional && (
                  <span className="ml-2 text-[11px] uppercase tracking-wider text-emerald-500">
                    Todo o Brasil
                  </span>
                )}
                {t.aviso && (
                  <span className="block text-xs text-muted-foreground mt-0.5">{t.aviso}</span>
                )}
              </span>
            </label>
          ))}
        </div>

        {/* O erro que ninguém vê: sem uma transportadora nacional, quem mora
            fora da região das regionais simplesmente não enxerga frete, não
            fecha a compra e vai embora. Não aparece erro em tela nenhuma, e o
            vendedor jura que a loja está no ar. */}
        {semNacional && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong className="block text-foreground">Sua loja ficaria invisível fora da região</strong>
              Sem uma transportadora que atende o Brasil inteiro, quem mora longe
              não vê frete nenhum e desiste da compra sem avisar ninguém. Marque
              pelo menos uma opção com "Todo o Brasil".
            </p>
          </div>
        )}

        {transportadoras.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nada marcado: seus compradores veem todas as opções da Kolecta.
          </p>
        )}

        <Separator className="line-tech" />

        {/* A retirada em mãos aparecia para TODO comprador, de todo vendedor.
            Quem vende de outro estado recebia pedido de retirada e tinha que
            explicar que não dava. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Aceito entregar em mãos</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                O comprador vê "Retirada pessoal" como opção, sem frete, e
                combina com você onde buscar.
              </p>
            </div>
            <Switch checked={aceitaRetirada} onCheckedChange={setAceitaRetirada} />
          </div>
          {!aceitaRetirada && (
            <p className="text-xs text-muted-foreground">
              Desligado: todo pedido seu vai por transportadora.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="kolecta"
            disabled={updateShipping.isPending || semNacional}
            onClick={() => updateShipping.mutate({ services: transportadoras, acceptsPickup: aceitaRetirada })}
          >
            {updateShipping.isPending ? 'Salvando...' : 'Salvar transportadoras'}
          </Button>
          {transportadoras.length > 0 && (
            <Button
              variant="ghost"
              disabled={updateShipping.isPending}
              onClick={() => { setTransportadoras([]); updateShipping.mutate({ services: [], acceptsPickup: aceitaRetirada }); }}
            >
              Voltar a aceitar todas
            </Button>
          )}
        </div>
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
    shipping: renderShipping,
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
