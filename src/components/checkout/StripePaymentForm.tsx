import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  orderId: string;
  totalInCents: number;
}

// StripePaymentForm deve ser renderizado dentro de <Elements> wrapper (no pai)
export default function StripePaymentForm({ orderId, totalInCents }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedTotal = (totalInCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // O Stripe redireciona para esta URL após o pagamento
        return_url: `${window.location.origin}/pedido/confirmacao?order_id=${orderId}`,
      },
    });

    // Se chegou aqui, ocorreu um erro (confirmPayment só retorna em caso de falha;
    // em caso de sucesso, o Stripe redireciona automaticamente)
    if (error) {
      setErrorMessage(
        error.type === 'card_error' || error.type === 'validation_error'
          ? (error.message ?? 'Erro no cartão. Verifique os dados e tente novamente.')
          : 'Ocorreu um erro inesperado. Tente novamente.',
      );
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stripe Payment Element — renderiza automaticamente os campos de cartão */}
      <PaymentElement
        options={{
          layout: 'tabs',
          defaultValues: {
            billingDetails: { address: { country: 'BR' } },
          },
        }}
      />

      {/* Erro de pagamento */}
      {errorMessage && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{errorMessage}</p>
        </div>
      )}

      {/* Botão de confirmação */}
      <Button
        type="submit"
        variant="kolecta"
        size="lg"
        className="w-full glow-primary"
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando pagamento...
          </>
        ) : (
          `Confirmar pagamento · ${formattedTotal}`
        )}
      </Button>

      {/* Selos de segurança */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span className="text-xs font-body">Pagamento criptografado e seguro via Stripe</span>
      </div>
    </form>
  );
}
