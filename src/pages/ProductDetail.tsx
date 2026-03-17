import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Heart, ShieldCheck, Star, Gavel, ShoppingCart, Flag, ChevronRight, ArrowLeft, MessageSquare, AlertTriangle, CreditCard } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { cn } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import AuctionCountdown from '@/components/AuctionCountdown';
import BidHistory from '@/components/BidHistory';
import VerificationBadge from '@/components/VerificationBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { getProductById, mockProducts, mockBids, formatBRL, conditionLabel } from '@/lib/mock-data';
import { trackEvent } from '@/lib/analytics';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const product = getProductById(id || '');
  const [bidAmount, setBidAmount] = useState('');
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [bidConfirmed, setBidConfirmed] = useState(false);
  const [bidAccepted, setBidAccepted] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Mock states for verification/payment blocks
  const [mockVerified] = useState(true);
  const [mockHasPayment] = useState(true);

  useEffect(() => {
    if (product) trackEvent('view_product', { id: product.id, type: product.type });
  }, [product]);

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold text-muted-foreground uppercase">Produto não encontrado</h1>
          <Button variant="outline-gold" className="mt-4" asChild>
            <Link to="/busca"><ArrowLeft className="h-4 w-4" /> Voltar à busca</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const isAuction = product.type === 'auction';
  const bids = mockBids.filter((b) => b.auctionId === product.id).sort((a, b) => b.amount - a.amount);
  const minBid = (product.currentBid || product.startingBid || 0) + (product.minIncrement || 10);
  const similar = mockProducts.filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id).slice(0, 4);

  const handleBid = () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid || !bidAccepted) return;
    trackEvent('bid_confirm', { productId: product.id, amount });
    setBidConfirmed(true);
    setTimeout(() => {
      setBidDialogOpen(false);
      setBidConfirmed(false);
      setBidAmount('');
      setBidAccepted(false);
    }, 2000);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/categoria/${product.categorySlug}`} className="hover:text-foreground transition-colors">{product.category}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground truncate max-w-[200px]">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="aspect-square rounded-lg overflow-hidden bg-kolecta-dark border border-border">
            <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
          </div>

          {/* Info */}
          <div>
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-secondary text-secondary-foreground text-[10px] font-heading uppercase tracking-wider">
                {conditionLabel(product.condition)}
              </Badge>
              {isAuction && (
                <Badge className="bg-accent text-accent-foreground text-[10px] font-heading uppercase tracking-wider">
                  Modo Lance
                </Badge>
              )}
              {product.featured && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-heading uppercase tracking-wider">
                  Destaque
                </Badge>
              )}
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold italic uppercase leading-tight mb-4">
              {product.title}
            </h1>

            {/* Price / Auction block */}
            <div className="p-5 rounded-lg border border-border bg-card mb-6">
              {isAuction ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Maior lance atual</span>
                    <div className="font-heading text-4xl font-extrabold text-accent mt-1">
                      {formatBRL(product.currentBid || product.startingBid || 0)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {product.bidsCount} lances · Incremento mín. {formatBRL(product.minIncrement || 0)}
                    </span>
                  </div>

                  <div className="line-tech" />

                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Encerra em</span>
                    <div className="mt-2">
                      <AuctionCountdown endsAt={product.auctionEndsAt!} />
                    </div>
                  </div>

                  {/* Verification/Payment warnings */}
                  {!mockVerified && (
                    <div className="rounded-md bg-accent/5 border border-accent/20 p-3 text-xs text-accent flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Conta não verificada</p>
                        <p className="text-muted-foreground mt-0.5">Você precisa <Link to="/conta/verificacao" className="text-accent underline">verificar sua conta</Link> para dar lances.</p>
                      </div>
                    </div>
                  )}
                  {!mockHasPayment && (
                    <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs text-primary flex items-start gap-2">
                      <CreditCard className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Nenhum método de pagamento</p>
                        <p className="text-muted-foreground mt-0.5">Adicione um <Link to="/conta/pagamentos" className="text-primary underline">método de pagamento</Link> para participar.</p>
                      </div>
                    </div>
                  )}

                  {/* Bid button */}
                  <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="accent"
                        size="lg"
                        className="w-full text-base"
                        disabled={!mockVerified || !mockHasPayment}
                        onClick={() => {
                          trackEvent('bid_place', { productId: product.id });
                          setBidDialogOpen(true);
                        }}
                      >
                        <Gavel className="h-5 w-5" />
                        Enviar Lance
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="font-heading text-xl uppercase">Confirmar Lance</DialogTitle>
                        <DialogDescription>
                          {product.title}
                        </DialogDescription>
                      </DialogHeader>

                      {bidConfirmed ? (
                        <div className="py-8 text-center">
                          <div className="text-4xl mb-3">✓</div>
                          <p className="font-heading text-lg font-bold text-primary uppercase">Lance registrado!</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                              Lance mínimo: <span className="text-foreground font-semibold">{formatBRL(minBid)}</span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                              <input
                                type="number"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                placeholder={minBid.toFixed(2)}
                                className="w-full h-12 rounded-md border border-border bg-input pl-10 pr-4 text-lg font-heading font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                              />
                            </div>

                            {/* Legal text */}
                            <div className="rounded-md bg-secondary/50 p-3 space-y-2 text-xs text-muted-foreground">
                              <p>• Ao vencer, o pagamento é <span className="text-foreground font-medium">obrigatório</span>.</p>
                              <p>• Você terá <span className="text-foreground font-medium">7 dias após a entrega</span> para verificar o item.</p>
                            </div>

                            {/* Commitment checkbox */}
                            <div className="flex items-start gap-2">
                              <Checkbox
                                id="bid-accept"
                                checked={bidAccepted}
                                onCheckedChange={(v) => setBidAccepted(!!v)}
                                className="mt-0.5"
                              />
                              <label htmlFor="bid-accept" className="text-xs text-muted-foreground cursor-pointer">
                                Entendo o compromisso de compra e concordo com os <Link to="/termos" className="text-primary underline">termos</Link>.
                              </label>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="accent"
                              className="w-full"
                              onClick={handleBid}
                              disabled={!bidAmount || parseFloat(bidAmount) < minBid || !bidAccepted}
                            >
                              Confirmar Lance
                            </Button>
                          </DialogFooter>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>

                  {/* Bid history */}
                  {bids.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Histórico de Lances</h3>
                      <BidHistory bids={bids} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Preço</span>
                    <div className="font-heading text-4xl font-extrabold text-foreground mt-1">
                      {formatBRL(product.price || 0)}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="kolecta" size="lg" className="flex-1 text-base" onClick={() => {
                      trackEvent('buy_now_click', { productId: product.id });
                      addItem(product, 1);
                      navigate('/carrinho');
                    }}>
                      <ShoppingCart className="h-5 w-5" />
                      Comprar Agora
                    </Button>
                    {/* API: POST /api/favorites/:productId — adiciona favorito
                        DELETE /api/favorites/:productId — remove favorito */}
                    <Button variant="ghost-light" size="lg" onClick={() => {
                      setIsFavorite((prev) => !prev);
                      trackEvent(isFavorite ? 'remove_from_favorites' : 'add_to_favorites', { productId: product.id });
                    }}>
                      <Heart className={cn('h-5 w-5', isFavorite && 'fill-kolecta-red text-kolecta-red')} />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Seller */}
            <Link
              to={`/vendedor/${product.seller.slug}`}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-all mb-6"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <span className="font-heading font-bold">{product.seller.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">{product.seller.name}</span>
                  <VerificationBadge verified={product.seller.verified} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 text-primary fill-primary" /> {product.seller.rating}
                  <span>·</span>
                  {product.seller.totalSales} vendas
                  <span>·</span>
                  {product.seller.location}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => trackEvent('report_listing', { productId: product.id })}>
                <Flag className="h-3 w-3" /> Denunciar
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-10">
          <Tabs defaultValue="description">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="description" className="font-heading uppercase tracking-wider text-xs">Descrição</TabsTrigger>
              <TabsTrigger value="details" className="font-heading uppercase tracking-wider text-xs">Detalhes</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-4">
              <div className="p-6 rounded-lg border border-border bg-card">
                <p className="text-sm text-foreground/90 leading-relaxed">{product.description}</p>
              </div>
            </TabsContent>
            <TabsContent value="details" className="mt-4">
              <div className="p-6 rounded-lg border border-border bg-card">
                <dl className="grid grid-cols-2 gap-3">
                  {Object.entries(product.details).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">{key}</dt>
                      <dd className="text-sm text-foreground mt-0.5">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <div className="mt-12">
            <h2 className="font-heading text-xl font-extrabold italic uppercase mb-6">Produtos Semelhantes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
