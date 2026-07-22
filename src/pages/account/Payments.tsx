import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import { CreditCard, Plus, Star, Trash2, AlertTriangle, Loader2, Wallet, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useWalletDeposit, useWallet } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { isValidCpf } from '@/lib/cpf';

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');

  const pixData = depositMutation.data;

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

  const formatCpf = (v: string) =>
    v
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 10) {
      return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  };

  const cpfDigits = cpf.replace(/\D/g, '');
  const phoneDigits = phone.replace(/\D/g, '');
  const amountInCents = depositAmount ? parseCurrency(depositAmount) : 0;
  const cpfInvalid = cpfDigits.length === 11 && !isValidCpf(cpfDigits);
  const canSubmit =
    amountInCents >= 500 && isValidCpf(cpfDigits) && phoneDigits.length >= 10;

  const handleDepositSubmit = () => {
    if (!canSubmit) return;
    depositMutation.mutate({ amountInCents, cpf: cpfDigits, phone: phoneDigits });
  };

  const handleCopyPix = async () => {
    if (!pixData?.qrCode) return;
    await navigator.clipboard.writeText(pixData.qrCode);
    toast({ title: 'Código PIX copiado!' });
  };

  const handleDepositOpenChange = (open: boolean) => {
    setIsDepositModalOpen(open);
    if (!open) {
      // Limpa o estado e atualiza o saldo (o crédito chega via webhook).
      depositMutation.reset();
      setDepositAmount('');
      setCpf('');
      setPhone('');
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-heading text-3xl font-extrabold italic uppercase">Saldo & Pagamentos</h1>
              <p className="text-sm text-muted-foreground">Sua carteira Kolecta — depósitos e pagamentos via Pix</p>
            </div>
          </div>
          <Button variant="kolecta" size="sm" onClick={() => setIsDepositModalOpen(true)}>
            <Wallet className="h-4 w-4 mr-2" />
            Adicionar Saldo
          </Button>
        </div>

        {/* Saldo atual (real, vindo da carteira) */}
        <div className="p-5 rounded-lg border border-primary/30 bg-primary/5 mb-6">
          <span className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Saldo disponível</span>
          <p className="font-heading text-3xl font-bold text-primary mt-1">
            R$ {((wallet?.balanceInCents ?? 0) / 100).toFixed(2).replace('.', ',')}
          </p>
        </div>

        {/* B2/D8: os pagamentos são via Pix/carteira. A lista de "cartões salvos"
            era cenográfica (cartões falsos locais) e foi removida até existir um
            cofre de cartões real (Stripe/Pagar.me). */}
        <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs text-primary flex items-start gap-2 mb-6">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Os pagamentos na Kolecta são via Pix. Adicione saldo à sua carteira para comprar e dar lances.</p>
        </div>

        {/* Add Balance Dialog */}
        <Dialog open={isDepositModalOpen} onOpenChange={handleDepositOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase tracking-wider">
                {pixData ? 'Pague com Pix' : 'Adicionar Saldo'}
              </DialogTitle>
              <DialogDescription>
                {pixData
                  ? 'Escaneie o QR Code ou copie o código no app do seu banco. O saldo é creditado automaticamente após o pagamento.'
                  : 'Recarregue sua carteira Kolecta via Pix. Informe os dados abaixo para gerar o código.'}
              </DialogDescription>
            </DialogHeader>

            {pixData ? (
              <div className="flex flex-col items-center gap-4 py-4">
                {pixData.qrCodeUrl && (
                  <img
                    src={pixData.qrCodeUrl}
                    alt="QR Code Pix"
                    className="h-52 w-52 rounded-lg border border-border bg-white p-2"
                  />
                )}
                <div className="w-full space-y-1">
                  <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">
                    Pix copia e cola
                  </label>
                  <div className="flex gap-2">
                    <Input readOnly value={pixData.qrCode} className="font-mono text-xs" />
                    <Button type="button" variant="outline" size="icon" onClick={handleCopyPix}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Valor:{' '}
                  <span className="font-heading text-foreground">
                    R$ {(pixData.amountInCents / 100).toFixed(2).replace('.', ',')}
                  </span>
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Valor do depósito (R$)</label>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">CPF</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                  />
                  {cpfInvalid && (
                    <p className="text-xs text-destructive">CPF inválido. Confira os dígitos.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Telefone (com DDD)</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    CPF e telefone são exigidos pelo Pix para gerar a cobrança.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="sm:justify-between flex-row items-center">
              {pixData ? (
                <Button
                  type="button"
                  variant="kolecta"
                  className="w-full"
                  onClick={() => handleDepositOpenChange(false)}
                >
                  Concluir
                </Button>
              ) : (
                <>
                  <Button type="button" variant="ghost" onClick={() => handleDepositOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="kolecta"
                    className="glow-primary"
                    onClick={handleDepositSubmit}
                    disabled={depositMutation.isPending || !canSubmit}
                  >
                    {depositMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando Pix...
                      </>
                    ) : (
                      'Gerar Pix'
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
