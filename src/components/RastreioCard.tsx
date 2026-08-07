// Rastreio do envio no detalhe do pedido.
//
// Mostra os MARCOS do Melhor Envio (emitida, postado, entregue) com data, não os
// eventos cidade a cidade dos Correios. O código de rastreio fica copiável, com
// um link para a transportadora para quem quiser o detalhe granular.
//
// Aparece para as duas pontas: o comprador acompanha o pedido chegando, o
// vendedor confirma que saiu.
import { useMemo } from 'react';
import {
  FileText, PackageCheck, Truck, MapPin, XCircle, Copy, RefreshCw,
  ExternalLink, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRastreio } from '@/hooks/use-api';
import type { EtapaRastreio } from '@/lib/api';

// As etapas fixas da linha do tempo, na ordem. "A caminho" é o estado corrente
// entre postado e entregue, não um marco à parte do Melhor Envio.
const ETAPAS: { key: Exclude<EtapaRastreio, 'pendente' | 'cancelado'>; label: string; icon: React.ElementType }[] = [
  { key: 'emitida', label: 'Etiqueta emitida', icon: FileText },
  { key: 'postado', label: 'Postado', icon: PackageCheck },
  { key: 'entregue', label: 'Entregue', icon: MapPin },
];

const ORDEM: Record<EtapaRastreio, number> = {
  pendente: -1, emitida: 0, postado: 1, entregue: 2, cancelado: 99,
};

/** "2026-08-04 14:18:16" → "04/08 às 14:18". Data do ME já é horário local. */
function formatarData(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return null;
  const [, , mes, dia, hora, min] = m;
  return `${dia}/${mes} às ${hora}:${min}`;
}

export default function RastreioCard({
  orderId,
  className,
}: {
  orderId: string;
  className?: string;
}) {
  const { data, isLoading, isFetching, refetch } = useRastreio(orderId);

  const dataPorEtapa = useMemo(() => {
    const mapa: Partial<Record<EtapaRastreio, string>> = {};
    if (data && data.rastreavel) {
      for (const m of data.marcos) if (m.data) mapa[m.etapa] = m.data;
    }
    return mapa;
  }, [data]);

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-border bg-gradient-card p-5', className)}>
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // Sem envio de transportadora: retirada em mãos, ou etiqueta ainda não
  // emitida. Não é erro, e não vale poluir a tela com uma timeline vazia.
  if (!data || !data.rastreavel) return null;

  const cancelado = data.etapaAtual === 'cancelado';
  const atual = ORDEM[data.etapaAtual] ?? -1;

  return (
    <div className={cn('rounded-xl border border-border bg-gradient-card p-5', className)}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Truck className="h-3.5 w-3.5" /> Rastreio
        </h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          aria-label="Atualizar rastreio"
        >
          {isFetching
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <RefreshCw className="h-3 w-3" />}
          Atualizar
        </button>
      </div>

      {cancelado ? (
        <div className="flex items-start gap-2 text-sm">
          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <span className="text-muted-foreground">
            Envio cancelado{data.canceladoEm ? ` em ${formatarData(data.canceladoEm)}` : ''}.
          </span>
        </div>
      ) : (
        // Linha do tempo vertical: cabe bem na coluna estreita do pedido e no
        // celular. Cada etapa acesa mostra a data; a corrente pulsa.
        <ol className="relative ml-1">
          {ETAPAS.map((etapa, i) => {
            const idx = ORDEM[etapa.key];
            const completa = idx < atual;
            const corrente = idx === atual;
            const emCaminho = corrente && etapa.key === 'postado'; // postado mas não entregue
            const Icon = etapa.icon;
            const quando = formatarData(dataPorEtapa[etapa.key] ?? null);

            return (
              <li key={etapa.key} className="flex gap-3 pb-5 last:pb-0">
                {/* Trilho + bolinha */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      (completa || corrente) ? 'border-primary bg-primary/10' : 'border-border bg-card',
                      corrente && 'border-accent bg-accent/10 animate-pulse',
                    )}
                  >
                    <Icon className={cn('h-4 w-4', (completa || corrente) ? 'text-primary' : 'text-muted-foreground', corrente && 'text-accent')} />
                  </div>
                  {i < ETAPAS.length - 1 && (
                    <div className={cn('w-px flex-1 min-h-[20px] mt-1', completa ? 'bg-primary/50' : 'bg-border')} />
                  )}
                </div>
                {/* Rótulo + data */}
                <div className="pt-1">
                  <p className={cn('text-sm font-medium', (completa || corrente) ? 'text-foreground' : 'text-muted-foreground')}>
                    {emCaminho ? 'A caminho' : etapa.label}
                  </p>
                  {quando ? (
                    <p className="text-xs text-muted-foreground mt-0.5">{quando}</p>
                  ) : corrente ? (
                    <p className="text-xs text-accent mt-0.5">agora</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Código + ações */}
      {data.codigo && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">Código</span>
              <code className="block text-sm text-foreground font-mono truncate">{data.codigo}</code>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Copiar código de rastreio"
              onClick={() =>
                navigator.clipboard?.writeText(data.codigo ?? '')
                  .then(() => toast.success('Código copiado'))
                  .catch(() => toast.error('Não consegui copiar'))
              }
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" asChild className="w-full">
            <a
              href="https://rastreamento.correios.com.br/app/index.php"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ver detalhes na transportadora
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
