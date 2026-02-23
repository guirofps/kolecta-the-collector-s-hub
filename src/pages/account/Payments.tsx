import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import { CreditCard, Plus, Star, Trash2, AlertTriangle } from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard';
  last4: string;
  expiry: string;
  isDefault: boolean;
}

export default function PaymentsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([
    { id: 'pm1', type: 'visa', last4: '4242', expiry: '12/28', isDefault: true },
  ]);
  const [showAdd, setShowAdd] = useState(false);

  const setDefault = (id: string) => {
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
  };

  const remove = (id: string) => {
    setMethods((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-heading text-3xl font-extrabold italic uppercase">Pagamentos</h1>
              <p className="text-sm text-muted-foreground">Gerencie seus métodos de pagamento</p>
            </div>
          </div>
          <Button variant="kolecta" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {/* Warning */}
        <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs text-primary flex items-start gap-2 mb-6">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Método de pagamento necessário para participar do Modo Lance.</p>
        </div>

        {/* Add card placeholder */}
        {showAdd && (
          <div className="p-5 rounded-lg border border-primary/30 bg-card mb-6">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider mb-4">Adicionar Cartão</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1">Número do cartão</label>
                <input type="text" placeholder="0000 0000 0000 0000" className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1">Validade</label>
                  <input type="text" placeholder="MM/AA" className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1">CVV</label>
                  <input type="text" placeholder="123" className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <Button variant="kolecta" size="sm" onClick={() => {
                setMethods((prev) => [...prev, { id: `pm${Date.now()}`, type: 'mastercard', last4: '8888', expiry: '06/29', isDefault: false }]);
                setShowAdd(false);
              }}>Salvar Cartão</Button>
            </div>
          </div>
        )}

        {/* Methods list */}
        {methods.length === 0 ? (
          <EmptyState icon={CreditCard} title="Nenhum método de pagamento" description="Adicione um cartão para participar do Modo Lance." />
        ) : (
          <div className="space-y-3">
            {methods.map((m) => (
              <div key={m.id} className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${m.isDefault ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground uppercase">{m.type}</span>
                    <span className="text-sm text-muted-foreground">•••• {m.last4}</span>
                    {m.isDefault && <Badge className="bg-primary/10 text-primary text-[10px] border-none">Padrão</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">Expira {m.expiry}</span>
                </div>
                <div className="flex gap-2">
                  {!m.isDefault && (
                    <Button variant="ghost-light" size="sm" className="text-xs" onClick={() => setDefault(m.id)}>
                      <Star className="h-3 w-3" /> Definir padrão
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent" onClick={() => remove(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
