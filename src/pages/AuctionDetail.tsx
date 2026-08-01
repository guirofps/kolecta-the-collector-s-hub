import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import VerificationBadge from '@/components/VerificationBadge';
import { FounderBadgeFor } from '@/components/FounderBadge';
import ProductGallery from '@/components/ProductGallery';
import { useAuctionDetail, usePlaceBid, useSavedCard } from '@/hooks/use-api';
import { isCardPaymentEnabled } from '@/lib/pagarme';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/currency';
import { conditionLabel } from '@/lib/mock-data';
import type { ProductCondition } from '@/lib/mock-data';
import type { AuctionWithListing } from '@/lib/api';
import {
  Gavel, ArrowLeft, ShieldCheck, Timer, Trophy, AlertTriangle, Loader2, ChevronRight, LogIn, Store, CreditCard,
} from 'lucide-react';

function parseImages(raw: string | null): string[] {
  if (!raw) return ['/placeholder.svg'];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) && p.length > 0 ? p : ['/placeholder.svg'];
  } catch {
    return raw.startsWith('http') ? [raw] : ['/placeholder.svg'];
  }
}

/** Contagem regressiva ao vivo. Retorna o texto e se já encerrou. */
function useCountdown(endsAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  if (!endsAt) return { text: '—', ended: false, urgent: false };
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return { text: 'Encerrado', ended: true, urgent: false };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  const text = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  return { text, ended: false, urgent: diff < 3600000 };
}

function AuctionDetailSkeleton() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: auction, isLoading, isError } = useAuctionDetail(id);
  const { user, isAuthenticated } = useAuth();
  const placeBid = usePlaceBid();
  // Lance é garantido por cartão (retenção). Sem cartão salvo → não dá lance.
  const { query: cardQuery } = useSavedCard();

  const countdown = useCountdown(auction?.endsAt ?? null);
  const [amountBRL, setAmountBRL] = useState('');

  const derived = useMemo(() => {
    if (!auction) return null;
    const current = auction.currentBidInCents ?? auction.startingBidInCents;
    const minNext = current + (auction.minIncrementInCents ?? 1000);
    const hasBids = auction.currentBidInCents != null;
    return { current, minNext, hasBids };
  }, [auction]);

  // Pré-preenche o campo com o lance mínimo sugerido quando o leilão carrega/atualiza.
  useEffect(() => {
    if (derived && amountBRL === '') {
      setAmountBRL((derived.minNext / 100).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived?.minNext]);

  if (isLoading) return <AuctionDetailSkeleton />;

  if (isError || !auction || !derived) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Gavel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold text-muted-foreground uppercase">Leilão não encontrado</h1>
          <p className="text-sm text-muted-foreground mt-2">Este leilão pode ter sido removido ou encerrado.</p>
          <Button variant="outline-gold" className="mt-6" asChild>
            <Link to="/modo-lance"><ArrowLeft className="h-4 w-4 mr-2" /> Ver leilões</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const images = parseImages(auction.images);
  const isSeller = isAuthenticated && user.id === auction.sellerId;
  const isWinner = isAuthenticated && !!auction.currentWinnerId && user.id === auction.currentWinnerId;
  const ended = auction.status !== 'active' || countdown.ended;
  // Pausado: o relógio está congelado no banco, então mostrar a contagem daria
  // um número parado (ou absurdo) e pareceria defeito.
  const pausado = Boolean(auction.pausedAt);
  const reserveNotMet =
    auction.reservePriceInCents != null && derived.current < auction.reservePriceInCents;
  const savedCard = cardQuery.data;

  const submitBid = () => {
    const cents = Math.round(parseFloat(amountBRL.replace(',', '.')) * 100);
    if (!Number.isFinite(cents) || cents < derived.minNext) return;
    placeBid.mutate(
      { auctionId: auction.id, amountInCents: cents },
      { onSuccess: () => setAmountBRL('') },
    );
  };

  const belowMin = (() => {
    const cents = Math.round(parseFloat(amountBRL.replace(',', '.')) * 100);
    return !Number.isFinite(cents) || cents < derived.minNext;
  })();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/modo-lance" className="hover:text-foreground transition-colors">Modo Lance</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground truncate max-w-[200px]">{auction.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fotos: principal + miniaturas clicáveis */}
          <ProductGallery images={images} title={auction.title} />

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-accent text-accent-foreground text-[10px] font-heading uppercase tracking-wider">
                <Gavel className="h-3 w-3 mr-1" /> Modo Lance
              </Badge>
              <Badge className="bg-secondary text-secondary-foreground text-[10px] font-heading uppercase tracking-wider">
                {conditionLabel(auction.condition as ProductCondition)}
              </Badge>
              {ended && (
                <Badge variant="destructive" className="text-[10px] font-heading uppercase tracking-wider">
                  Encerrado
                </Badge>
              )}
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold italic uppercase leading-tight mb-4">
              {auction.title}
            </h1>

            {/* Painel do leilão */}
            <div className="p-5 rounded-lg border border-border bg-card mb-6 space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {derived.hasBids ? 'Lance atual' : 'Lance inicial'}
                  </span>
                  <div className="font-heading text-4xl font-extrabold text-[hsl(var(--kolecta-gold))] mt-1">
                    {formatBRL(derived.current / 100)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {pausado ? 'Situação' : 'Tempo restante'}
                  </span>
                  {pausado ? (
                    <div className="flex items-center justify-end gap-1 font-heading text-lg font-bold mt-1 text-kolecta-gold">
                      <AlertTriangle className="h-4 w-4" /> Pausado
                    </div>
                  ) : (
                    <div className={`flex items-center justify-end gap-1 font-heading text-lg font-bold mt-1 ${countdown.urgent ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
                      <Timer className="h-4 w-4" /> {countdown.text}
                    </div>
                  )}
                </div>
              </div>

              {reserveNotMet && !ended && (
                <p className="text-xs text-amber-500 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Preço de reserva ainda não atingido.
                </p>
              )}

              {/* ── Estados ── */}
              {ended ? (
                isWinner ? (
                  <div className="rounded-md bg-primary/10 border border-primary/30 p-4 space-y-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Trophy className="h-4 w-4" /> Você venceu este leilão!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      A cobrança é feita automaticamente no cartão que garantiu seu lance. Acompanhe em Meus Pedidos.
                    </p>
                    <Button variant="kolecta" className="w-full" asChild>
                      <Link to="/conta/pedidos">Ver meus pedidos</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md bg-secondary/50 border border-border p-3 text-sm text-muted-foreground">
                    Este leilão foi encerrado.
                  </div>
                )
              ) : /* Pausado vem ANTES da checagem de login: convidar a "entrar
                     para dar lance" num leilão que não recebe lance faz a pessoa
                     se cadastrar para descobrir que não dá. E vem separado por
                     dono, porque a causa só é acionável para o vendedor. */
              isSeller && pausado ? (
                <div className="rounded-md bg-muted/40 border border-border p-4 space-y-3">
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-kolecta-gold" />
                    <span>
                      <strong className="block text-foreground mb-0.5">
                        Leilão pausado — falta sua conta de recebimento
                      </strong>
                      Para o dinheiro do arremate chegar até você, precisamos da
                      sua conta de recebimento ativa. Enquanto ela não estiver
                      pronta, o leilão fica pausado e não aceita lances. Assim
                      que ativar, ele volta ao ar sozinho, com o{' '}
                      <strong>mesmo tempo que faltava</strong>.
                    </span>
                  </p>
                  <Button variant="kolecta" className="w-full" asChild>
                    <Link to="/painel/recebedor">Criar conta de recebimento</Link>
                  </Button>
                </div>
              ) : isSeller ? (
                <div className="rounded-md bg-secondary/50 border border-border p-3 text-sm text-muted-foreground">
                  Você é o vendedor deste leilão e não pode dar lances.
                </div>
              ) : pausado ? (
                <div className="rounded-md bg-muted/40 border border-border p-4">
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-kolecta-gold" />
                    <span>
                      <strong className="block text-foreground mb-0.5">
                        Leilão pausado
                      </strong>
                      O vendedor está finalizando o cadastro de recebimento. O
                      leilão volta com o <strong>mesmo tempo que faltava</strong>{' '}
                      — nada se perde. As compras diretas seguem normais.
                    </span>
                  </p>
                </div>
              ) : !isAuthenticated ? (
                <Button variant="kolecta" className="w-full" asChild>
                  <Link to="/entrar"><LogIn className="h-4 w-4 mr-2" /> Entrar para dar lance</Link>
                </Button>
              ) : !isCardPaymentEnabled ? (
                // Lance é garantido por pré-autorização no cartão. Com o cartão
                // fechado, não há como dar lance — dizer isso aqui evita o
                // usuário salvar cartão, tentar e levar erro do gateway.
                <div className="rounded-md bg-muted/40 border border-border p-4">
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-kolecta-gold" />
                    <span>
                      <strong className="block text-foreground mb-0.5">
                        Lances suspensos temporariamente
                      </strong>
                      Os lances são garantidos por cartão de crédito, e o
                      pagamento com cartão está em liberação com nosso provedor.
                      Em breve os leilões voltam. As compras diretas seguem
                      normais, por <strong>Pix</strong>.
                    </span>
                  </p>
                </div>
              ) : cardQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verificando cartão...
                </div>
              ) : !savedCard ? (
                <div className="rounded-md bg-secondary/50 border border-border p-4 space-y-3">
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4 shrink-0 mt-0.5" />
                    Os lances são garantidos por cartão de crédito. Salve um cartão
                    no Financeiro para participar — o valor do lance fica retido
                    (pré-autorizado) e só é cobrado se você vencer.
                  </p>
                  <Button variant="kolecta" className="w-full" asChild>
                    <Link to="/conta/pagamentos">
                      <CreditCard className="h-4 w-4 mr-2" /> Salvar cartão no Financeiro
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {isWinner && (
                    <p className="flex items-center gap-2 text-xs text-primary font-medium">
                      <Trophy className="h-3.5 w-3.5" /> Você está liderando.
                    </p>
                  )}
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Seu lance (mínimo {formatBRL(derived.minNext / 100)})
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={(derived.minNext / 100).toFixed(2)}
                        value={amountBRL}
                        onChange={(e) => setAmountBRL(e.target.value)}
                        className="pl-9"
                        disabled={placeBid.isPending}
                      />
                    </div>
                    <Button
                      variant="kolecta"
                      onClick={submitBid}
                      disabled={placeBid.isPending || belowMin}
                    >
                      {placeBid.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Gavel className="h-4 w-4 mr-1" /> Dar lance</>}
                    </Button>
                  </div>
                  {belowMin && amountBRL !== '' && (
                    <p className="text-xs text-destructive">
                      O lance precisa ser no mínimo {formatBRL(derived.minNext / 100)}.
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" />
                    O valor fica retido no cartão •••• {savedCard.lastFour ?? '----'} até o fim do leilão. Você só é cobrado se vencer.
                  </p>
                </div>
              )}
            </div>

            {/* Vendedor */}
            {/* Mesmo bloco do anúncio de venda direta: o nome leva à loja. */}
            <div className="rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3 p-4">
                <Link
                  to={`/vendedor/${auction.sellerId}`}
                  className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-heading font-bold uppercase transition-colors hover:bg-secondary/70"
                  aria-label="Ver loja do vendedor"
                >
                  {(auction.sellerName ?? '').trim().charAt(0) || 'V'}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/vendedor/${auction.sellerId}`}
                      className="text-sm font-medium text-foreground truncate hover:text-primary hover:underline transition-colors"
                    >
                      {auction.sellerName || 'Vendedor Kolecta'}
                    </Link>
                    <VerificationBadge verified={true} />
                    <FounderBadgeFor userId={auction.sellerId} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" /> Transação protegida pelo Kolecta
                  </div>
                </div>
              </div>
              <div className="border-t border-border px-4 py-2.5">
                <Link
                  to={`/vendedor/${auction.sellerId}`}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Store className="h-3.5 w-3.5" />
                  Ver todos os anúncios desta loja
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
