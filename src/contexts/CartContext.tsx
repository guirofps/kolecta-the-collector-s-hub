import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product } from '@/lib/mock-data';
import { trackEvent } from '@/lib/analytics';

// F19: o carrinho vivia só em memória e esvaziava a cada refresh. Persistimos
// em localStorage para o carrinho sobreviver ao recarregar a página.
const CART_STORAGE_KEY = 'kolecta_cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Salva o carrinho a cada mudança para sobreviver ao refresh.
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* localStorage indisponível (modo privado/quota): mantém só em memória. */
    }
  }, [items]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  // D1: o checkout do backend cria 1 unidade por anúncio (item por listingId,
  // sem quantidade). Enquanto for assim, travamos a quantidade em 1 no carrinho
  // para o total exibido não divergir do pedido criado. Reverter = subir MAX_QTY
  // quando o backend aceitar quantidade.
  const MAX_QTY = 1;

  const addItem = useCallback((product: Product, quantity = 1) => {
    // Funil de tráfego: a etapa "adicionou ao carrinho" (ver lib/analytics).
    trackEvent('add_to_cart', { id: product.id, price: product.price });
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) }
            : i
        );
      }
      return [...prev, { product, quantity: Math.min(MAX_QTY, quantity) }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) return;
    const clamped = Math.min(MAX_QTY, quantity);
    setItems(prev =>
      prev.map(i => (i.product.id === productId ? { ...i, quantity: clamped } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + (i.product.price ?? 0) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isCartOpen, openCart, closeCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
