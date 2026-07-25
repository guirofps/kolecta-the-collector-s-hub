import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { CreditCard, Trash2, AlertTriangle, Loader2, Wallet, Copy, Shield, Gavel } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWalletDeposit, useWallet, useSavedCard } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { isValidCpf } from '@/lib/cpf';
import { tokenizeCard, CardTokenizationError, isCardPaymentEnabled } from '@/lib/pagarme';

function maskCardNumber(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function maskExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export default function PaymentsPage() {
  // ── Cartão salvo (usado para dar LANCE por cartão) ──
  const { query: cardQuery, saveMutation, removeMutation } = useSavedCard();
  const savedCard = cardQuery.data;
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  // Documento e telefone do titular: a Pagar.me exige os DOIS no customer para
  // autorizar a retenção do lance. Aceita CPF (11) e CNPJ (14) — há lojas
  // cadastradas como empresa.
  const [cardDoc, setCardDoc] = useState('');
  const [cardPhone, setCardPhone] = useState('');
  const [cardError, setCardError] = useState('');
  const [tokenizing, setTokenizing] = useState(false);

  const resetCardForm = () => {
    setCardNumber('');
    setCardName('');
    setCardExp('');
    setCardCvv('');
    setCardDoc('');
    setCardPhone('');
    setCardError('');
  };

  const handleAddCardOpenChange = (open: boolean) => {
    setShowAddCard(open);
    if (!open) resetCardForm();
  };

  const handleSaveCard = async () => {
    setCardError('');
    if (cardNumber.replace(/\D/g, '').length < 13) {
      setCardError('Número do cartão inválido');
      return;
    }
    if (!cardName.trim()) {
      setCardError('Informe o nome impresso no cartão');
      return;
    }
    const docDigits = cardDoc.replace(/\D/g, '');
    if (docDigits.length !== 11 && docDigits.length !== 14) {
      setCardError('Informe o CPF (11 dígitos) ou CNPJ (14 dígitos) do titular');
      return;
    }
    if (docDigits.length === 11 && !isValidCpf(docDigits)) {
      setCardError('CPF inválido');
      return;
    }
    const phoneDigitsCard = cardPhone.replace(/\D/g, '');
    if (phoneDigitsCard.length < 10) {
      setCardError('Informe um telefone com DDD');
      return;
    }
    setTokenizing(true);
    try {
      const cardToken = await tokenizeCard({
        number: cardNumber,
        holderName: cardName,
        expiry: cardExp,
        cvv: cardCvv,
      });
      await saveMutation.mutateAsync({
        cardToken,
        cpf: docDigits,
        phone: phoneDigitsCard,
      });
      handleAddCardOpenChange(false);
    } catch (err) {
      setCardError(
        err instanceof CardTokenizationError
          ? err.message
          : (err as any)?.message || 'Não foi possível salvar o cartão.',
      );
    } finally {
      setTokenizing(false);
    }
  };

  // ── Depósito PIX na carteira ──
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
              <p className="text-sm text-muted-foreground">Sua carteira Kolecta e o cartão usado nos lances</p>
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

        {/* ── Cartão para lances ─────────────────────────────────────────────
            O lance em leilão é garantido por CARTÃO (retenção/pré-autorização).
            Guardamos só uma referência segura do cartão na Pagar.me — nunca o
            número completo. */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Gavel className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Cartão para lances</h2>
          </div>

          {!isCardPaymentEnabled ? (
            <div className="rounded-md bg-muted/40 border border-border p-3 text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                <strong className="block text-foreground mb-0.5">
                  Cartão de crédito: em breve
                </strong>
                Estamos finalizando a liberação com nosso provedor de pagamento.
                Enquanto isso, as compras são por <strong>Pix</strong> — e os
                lances em leilão ficam suspensos, porque são garantidos por cartão.
              </p>
            </div>
          ) : cardQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : savedCard ? (
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-heading font-semibold">
                    {(savedCard.brand || 'Cartão').toUpperCase()} •••• {savedCard.lastFour || '----'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {savedCard.holderName || ''}
                    {savedCard.expMonth && savedCard.expYear
                      ? ` · ${String(savedCard.expMonth).padStart(2, '0')}/${savedCard.expYear}`
                      : ''}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-5 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Você ainda não tem um cartão salvo. Salve um cartão para participar de leilões.
              </p>
              <Button variant="kolecta" size="sm" onClick={() => setShowAddCard(true)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Adicionar cartão
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs text-primary flex items-start gap-2 mb-6">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Compras usam saldo da carteira (via Pix) ou cartão no checkout. Já os lances em leilão são garantidos pelo cartão salvo acima.</p>
        </div>

        {/* ── Dialog: adicionar cartão ── */}
        <Dialog open={showAddCard} onOpenChange={handleAddCardOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase tracking-wider">Adicionar cartão</DialogTitle>
              <DialogDescription>
                Esse cartão será usado para garantir seus lances em leilões (retenção do valor).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="cardNumber">Número do cartão *</Label>
                <Input id="cardNumber" inputMode="numeric" autoComplete="cc-number"
                  className="bg-background font-mono" value={cardNumber}
                  onChange={e => setCardNumber(maskCardNumber(e.target.value))}
                  placeholder="0000 0000 0000 0000" />
              </div>
              <div>
                <Label htmlFor="cardName">Nome impresso no cartão *</Label>
                <Input id="cardName" autoComplete="cc-name" className="bg-background uppercase"
                  value={cardName} onChange={e => setCardName(e.target.value)}
                  placeholder="COMO ESTÁ NO CARTÃO" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardExp">Validade *</Label>
                  <Input id="cardExp" inputMode="numeric" autoComplete="cc-exp"
                    className="bg-background font-mono" value={cardExp}
                    onChange={e => setCardExp(maskExpiry(e.target.value))} placeholder="MM/AA" />
                </div>
                <div>
                  <Label htmlFor="cardCvv">CVV *</Label>
                  <Input id="cardCvv" inputMode="numeric" autoComplete="cc-csc" maxLength={4}
                    className="bg-background font-mono" value={cardCvv}
                    onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardDoc">CPF ou CNPJ do titular *</Label>
                  <Input id="cardDoc" inputMode="numeric" className="bg-background font-mono"
                    value={cardDoc}
                    onChange={e => setCardDoc(e.target.value.replace(/\D/g, '').slice(0, 14))}
                    placeholder="Somente números" />
                </div>
                <div>
                  <Label htmlFor="cardPhone">Telefone com DDD *</Label>
                  <Input id="cardPhone" inputMode="numeric" autoComplete="tel"
                    className="bg-background font-mono" value={cardPhone}
                    onChange={e => setCardPhone(formatPhone(e.target.value))}
                    placeholder="(11) 90000-0000" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                A operadora exige documento e telefone do titular para autorizar a
                retenção do lance.
              </p>

              {cardError && <p className="text-xs text-destructive">{cardError}</p>}
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Dados enviados de forma segura à Pagar.me. Não armazenamos o número do seu cartão.
              </p>
            </div>

            <DialogFooter className="sm:justify-between flex-row items-center">
              <Button type="button" variant="ghost" onClick={() => handleAddCardOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="kolecta" onClick={handleSaveCard} disabled={tokenizing}>
                {tokenizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar cartão'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
