/**
 * Escolha de entrega do VENCEDOR de um leilão, depois do fecho.
 *
 * Leilão não tem checkout: o lance cobre só a peça. Aqui o vencedor escolhe
 * como quer receber, o frete entra no total do arremate e a cobrança sai de uma
 * vez só — nada é cobrado antes disso, e o valor do lance segue retido no
 * cartão dele como garantia até a cobrança passar.
 *
 * O preço mostrado é o que o servidor cotou; ao confirmar, o servidor recota e
 * grava o valor DELE. Se o frete tiver mudado no intervalo, a gravação recusa e
 * o comprador escolhe de novo — nunca paga um preço que a Kolecta não consegue
 * comprar.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Truck, Handshake, MapPin, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAuctionShippingOptions,
  useChooseAuctionShipping,
  usePayAuctionOrder,
} from '@/hooks/use-api';
import { formatBRL } from '@/lib/currency';

const PICKUP = 'pickup';

interface Props {
  orderId: string;
  listingTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuctionShippingDialog({
  orderId,
  listingTitle,
  open,
  onOpenChange,
}: Props) {
  const { data, isLoading, isError, error } = useAuctionShippingOptions(
    orderId,
    open,
  );
  const chooseShipping = useChooseAuctionShipping();
  const payOrder = usePayAuctionOrder();

  const [selected, setSelected] = useState<string>('');

  // Pré-seleciona a opção mais barata (a lista já vem ordenada por preço). Só
  // quando o diálogo abre e ainda não houve escolha, para não passar por cima
  // de quem já clicou em outra.
  useEffect(() => {
    if (!open || selected) return;
    if (data?.options?.length) setSelected(String(data.options[0].serviceId));
  }, [open, data, selected]);

  const escolhida = data?.options?.find(
    (o) => String(o.serviceId) === selected,
  );
  const isPickup = selected === PICKUP;
  const bidInCents = data?.bidInCents ?? 0;
  const shippingInCents = isPickup ? 0 : (escolhida?.shippingInCents ?? 0);
  const totalInCents = bidInCents + shippingInCents;

  const trabalhando = chooseShipping.isPending || payOrder.isPending;
  const podeConfirmar = !!selected && !trabalhando && !data?.needsAddress;

  async function confirmar() {
    if (!selected) return;
    // Duas chamadas de propósito: a escolha é gravada antes da cobrança, então
    // um cartão recusado não perde o frete escolhido — ele tenta de novo sem
    // refazer nada. A cobrança é a última coisa a acontecer.
    await chooseShipping.mutateAsync({
      orderId,
      deliveryMethod: isPickup ? 'pickup' : 'shipping',
      ...(isPickup ? {} : { shippingServiceId: escolhida!.serviceId }),
    });
    await payOrder.mutateAsync(orderId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !trabalhando && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wide">
            Como você quer receber?
          </DialogTitle>
          <DialogDescription>
            {listingTitle ? `${listingTitle} — ` : ''}o frete entra no total do
            arremate e a cobrança sai de uma vez só.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {/* Sem endereço não há o que cotar — manda cadastrar, não some a tela. */}
        {!isLoading && data?.needsAddress && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
              <MapPin className="h-4 w-4 shrink-0" />
              Você ainda não tem endereço de entrega
            </p>
            <p className="mt-1 text-muted-foreground">
              Cadastre um endereço para calcularmos o frete deste arremate.
            </p>
            <Button variant="kolecta" size="sm" className="mt-3" asChild>
              <Link to="/conta/enderecos">Cadastrar endereço</Link>
            </Button>
          </div>
        )}

        {!isLoading && isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Não conseguimos calcular o frete agora
            </p>
            <p className="mt-1 text-muted-foreground">
              {(error as Error)?.message ??
                'Tente de novo em alguns minutos — seu prazo continua valendo.'}
            </p>
          </div>
        )}

        {!isLoading && !isError && !data?.needsAddress && (
          <>
            {data?.address && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                Entrega em {data.address.city}/{data.address.state} · CEP{' '}
                {data.address.zip}
              </p>
            )}

            {/* Nenhuma transportadora atende: a retirada ainda pode salvar. */}
            {data?.options.length === 0 && !data?.pickup && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                Nenhuma transportadora atende este trajeto no momento. Tente de
                novo em alguns minutos.
              </div>
            )}

            <RadioGroup
              value={selected}
              onValueChange={setSelected}
              className="max-h-64 space-y-2 overflow-y-auto"
            >
              {data?.options.map((o) => (
                <Label
                  key={o.serviceId}
                  htmlFor={`frete-${o.serviceId}`}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-secondary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem
                    value={String(o.serviceId)}
                    id={`frete-${o.serviceId}`}
                  />
                  <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{o.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.deliveryTimeDays
                        ? `${o.deliveryTimeDays} dias úteis`
                        : 'prazo a confirmar'}
                    </p>
                  </div>
                  <span className="shrink-0 font-heading text-sm font-bold">
                    {formatBRL(o.shippingInCents / 100)}
                  </span>
                </Label>
              ))}

              {data?.pickup && (
                <Label
                  htmlFor="frete-pickup"
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-secondary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value={PICKUP} id="frete-pickup" />
                  <Handshake className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Retirada em mãos</p>
                    <p className="text-xs text-muted-foreground">
                      combinar com o vendedor
                    </p>
                  </div>
                  <span className="shrink-0 font-heading text-sm font-bold">
                    Grátis
                  </span>
                </Label>
              )}
            </RadioGroup>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Lance vencedor</span>
                <span>{formatBRL(bidInCents / 100)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span>
                  {isPickup ? 'Grátis' : formatBRL(shippingInCents / 100)}
                </span>
              </div>
              <div className="flex justify-between font-heading text-base font-bold">
                <span>Total a pagar</span>
                <span className="text-primary">
                  {formatBRL(totalInCents / 100)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              A cobrança sai no seu cartão salvo. A retenção do lance é liberada
              assim que o pagamento é confirmado.
            </p>
          </>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={trabalhando}
          >
            Agora não
          </Button>
          <Button
            variant="kolecta"
            onClick={confirmar}
            disabled={!podeConfirmar}
          >
            {trabalhando && (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            )}
            {payOrder.isPending
              ? 'Cobrando...'
              : `Pagar ${formatBRL(totalInCents / 100)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
