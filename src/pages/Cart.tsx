import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useCart, CartItem } from '@/contexts/CartContext';
import { formatBRL, conditionLabel } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import EmptyState from '@/components/EmptyState';

// Group items by seller
function groupBySeller(items: CartItem[]) {
  const groups: Record<string, { sellerName: string; sellerSlug: string; items: CartItem[] }> = {};
  for (const item of items) {
    const sid = item.product.seller.id;
    if (!groups[sid]) {
      groups[sid] = { sellerName: item.product.seller.name, sellerSlug: item.product.seller.slug, items: [] };
    }
    groups[sid].items.push(item);
  }
  return Object.values(groups);
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalItems, totalPrice } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-16">
          <EmptyState
            icon={ShoppingCart}
            title="Seu carrinho está vazio"
            description="Explore nossos produtos e encontre peças incríveis para sua coleção."
            action={
              <Button variant="kolecta" onClick={() => navigate('/')}>
                Explorar Produtos
              </Button>
            }
          />
        </div>
      </Layout>
    );
  }

  const groups = groupBySeller(items);

  return (
    <Layout>
      <div className="container py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-tight">Meu Carrinho</h1>
          <Badge variant="secondary" className="text-sm">
            {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          </Badge>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Items column */}
          <div className="lg:col-span-8 space-y-0">
            {groups.map((group, idx) => (
              <div key={group.sellerSlug}>
                {/* Seller header */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-heading text-lg font-semibold uppercase tracking-wide">
                    {group.sellerName}
                  </span>
                  <Link
                    to={`/vendedor/${group.sellerSlug}`}
                    className="text-xs text-primary hover:underline font-body"
                  >
                    Ver loja →
                  </Link>
                </div>

                {/* Items */}
                <div className="space-y-4 mb-4">
                  {group.items.map(item => (
                    <CartItemRow
                      key={item.product.id}
                      item={item}
                      onRemove={removeItem}
                      onUpdateQty={updateQuantity}
                    />
                  ))}
                </div>

                {/* Separator between groups */}
                {idx < groups.length - 1 && <div className="line-tech my-6" />}
              </div>
            ))}
          </div>

          {/* Summary column */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <Card className="bg-gradient-card">
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Resumo do Pedido</h2>

                  {/* Subtotals per seller */}
                  {groups.map(group => {
                    const subtotal = group.items.reduce(
                      (s, i) => s + (i.product.price ?? 0) * i.quantity,
                      0
                    );
                    return (
                      <div key={group.sellerSlug} className="flex justify-between text-sm font-body">
                        <span className="text-muted-foreground truncate max-w-[60%]">{group.sellerName}</span>
                        <span>{formatBRL(subtotal)}</span>
                      </div>
                    );
                  })}

                  <p className="text-xs text-muted-foreground">Frete: calculado no checkout</p>

                  <div className="line-tech" />

                  <div className="flex justify-between items-center">
                    <span className="font-heading text-lg font-bold uppercase">Total</span>
                    <span className="font-heading text-2xl font-bold text-primary">
                      {formatBRL(totalPrice)}
                    </span>
                  </div>

                  <Button
                    variant="kolecta"
                    size="lg"
                    className="w-full glow-primary"
                    onClick={() => navigate('/checkout')}
                  >
                    Ir para o Checkout
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => navigate('/')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Continuar Comprando
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ── CartItem Row ─────────────────────────────────────── */

function CartItemRow({
  item,
  onRemove,
  onUpdateQty,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
}) {
  const p = item.product;

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Image */}
        <Link to={`/produto/${p.id}`} className="shrink-0">
          <div className="w-20 h-20 rounded-md overflow-hidden bg-muted">
            <img
              src={p.images[0]}
              alt={p.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link to={`/produto/${p.id}`}>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide truncate hover:text-primary transition-colors">
              {p.title}
            </h3>
          </Link>

          <Badge variant="outline" className="mt-1 text-[10px]">
            {conditionLabel(p.condition)}
          </Badge>

          <p className="font-heading text-lg font-bold text-primary mt-1">
            {formatBRL(p.price ?? 0)}
          </p>
        </div>

        {/* Quantity + remove */}
        <div className="flex flex-col items-end justify-between shrink-0">
          <button
            onClick={() => onRemove(p.id)}
            className="text-destructive hover:text-destructive/80 transition-colors p-1"
            aria-label="Remover item"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdateQty(p.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-6 text-center text-sm font-body font-medium">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdateQty(p.id, item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
