import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import { CreditCard, Plus, Star, Trash2, AlertTriangle, Loader2, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useWalletDeposit, useWallet } from '@/hooks/use-api';

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

  // Wallet Deposit Logic
  const { data: wallet } = useWallet();
  const depositMutation = useWalletDeposit();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setDepositAmount('');
      return;
    }
    const numberValue = parseInt(value, 10) / 100;
    setDepositAmount(
      numberValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const parseCurrency = (value: string) => {
    const clean = value.replace(/\./g, '').replace(',', '.');
    return Math.round(parseFloat(clean) * 100);
  };

  const handleDepositSubmit = () => {
    const amountInCents = parseCurrency(depositAmount);
    if (amountInCents >= 500) {
      depositMutation.mutate(amountInCents);
    }
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDepositModalOpen(true)}>
              <Wallet className="h-4 w-4 mr-2" />
              Adicionar Saldo
            </Button>
            <Button variant="kolecta" size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
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

        {/* Add Balance Dialog */}
        <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase tracking-wider">Adicionar Saldo</DialogTitle>
              <DialogDescription>
                Recarregue sua carteira Kolecta via cartão de crédito ou Pix. O valor será creditado automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Valor do depósito (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                  <Input
                    type="text"
                    className="pl-9 font-heading text-lg"
                    placeholder="0,00"
                    value={depositAmount}
                    onChange={handleAmountChange}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Valor mínimo: R$ 5,00</p>
              </div>
            </div>

            <DialogFooter className="sm:justify-between flex-row items-center">
              <Button type="button" variant="ghost" onClick={() => setIsDepositModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="kolecta"
                className="glow-primary"
                onClick={handleDepositSubmit}
                disabled={depositMutation.isPending || !depositAmount || parseCurrency(depositAmount) < 500}
              >
                {depositMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Pagar e depositar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
