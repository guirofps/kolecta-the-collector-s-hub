import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { formatBRL } from '@/lib/mock-data';

export default function CartDrawer() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, totalItems, totalPrice, isCartOpen, closeCart } = useCart();

  const goTo = (path: string) => {
    closeCart();
    navigate(path);
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col p-0">
        <SheetHeader className="px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="font-heading text-xl font-bold uppercase tracking-wide">Carrinho</SheetTitle>
            {totalItems > 0 && (
              <Badge className="bg-kolecta-gold text-kolecta-gold-foreground text-xs">{totalItems}</Badge>
            )}
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            <p className="font-heading text-lg font-bold text-muted-foreground uppercase">Seu carrinho está vazio</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-sm line-clamp-1">{item.product.title}</p>
                      <p className="text-xs text-muted-foreground">{item.product.seller.name}</p>
                      <p className="font-heading font-bold text-sm text-kolecta-gold mt-0.5">
                        {formatBRL((item.product.price ?? 0) * item.quantity)}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-medium w-5 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-auto text-kolecta-red hover:text-kolecta-red"
                          onClick={() => removeItem(item.product.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="shrink-0 px-4 pb-4 pt-2 space-y-3">
              <Separator className="line-tech" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-heading text-xl font-bold text-kolecta-gold">{formatBRL(totalPrice)}</span>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => goTo('/carrinho')}>
                Ver carrinho completo
              </Button>
              <Button variant="kolecta" className="w-full glow-primary" onClick={() => goTo('/checkout')}>
                Finalizar compra
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
