// Modo férias do vendedor: pausa em massa as vendas diretas com um clique e
// reativa na volta. O leilão NÃO pausa (a data manda nele), então ao ligar a
// gente avisa quais leilões seguem correndo em vez de esconder isso.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Gavel, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useVacationStatus, useSetVacationMode } from '@/hooks/use-api';

function formataData(iso: string | null): string {
  if (!iso) return 'sem data';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'sem data';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function VacationModeCard() {
  const { data: status, isLoading } = useVacationStatus();
  const set = useSetVacationMode();
  const [confirmar, setConfirmar] = useState(false);

  const ativo = !!status?.vacationMode;
  const leiloes = status?.leiloesAtivos ?? [];
  const diretos = status?.diretosAtivos ?? 0;

  const aoAlternar = (ligar: boolean) => {
    if (ligar) {
      setConfirmar(true); // só liga depois de confirmar (por causa dos leilões)
    } else {
      set.mutate(false);
    }
  };

  return (
    <Card className="bg-gradient-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Plane className="h-5 w-5 text-[hsl(var(--kolecta-gold))]" />
            <CardTitle className="font-heading text-base">Modo férias</CardTitle>
          </div>
          <Switch
            checked={ativo}
            disabled={isLoading || set.isPending}
            onCheckedChange={aoAlternar}
            aria-label="Ativar modo férias"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Vai viajar ou ficar sem atendimento? Pause suas vendas diretas de uma vez
          e reative quando voltar. Ninguém compra o que você não vai conseguir despachar.
        </p>
        {ativo ? (
          <p className="text-sm font-medium text-[hsl(var(--kolecta-gold))]">
            Modo férias ligado. Suas vendas diretas estão pausadas.
            {leiloes.length > 0 && ` ${leiloes.length} leilão(ões) seguem ativos até encerrarem.`}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {diretos > 0
              ? `${diretos} venda(s) direta(s) ativa(s) seriam pausadas.`
              : 'Você não tem vendas diretas ativas no momento.'}
          </p>
        )}
      </CardContent>

      {/* Confirmação ao LIGAR: explica o leilão em vez de esconder. */}
      <Dialog open={confirmar} onOpenChange={(o) => !o && setConfirmar(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Ativar modo férias?</DialogTitle>
            <DialogDescription>
              Suas {diretos > 0 ? `${diretos} ` : ''}vendas diretas ativas ficam pausadas
              na hora. Você reativa quando voltar, com um clique.
            </DialogDescription>
          </DialogHeader>

          {leiloes.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
              <p className="text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{leiloes.length} leilão(ões) continuam</strong> até a data de
                  encerramento leilão com lance não dá pra pausar. Se algum fechar
                  enquanto você estiver fora, você ainda precisa despachar no prazo.
                </span>
              </p>
              <ul className="space-y-1 pl-6">
                {leiloes.map((l, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Gavel className="h-3 w-3 shrink-0" />
                    <span className="truncate">{l.title}</span>
                    <span className="shrink-0">· encerra {formataData(l.endsAt)}</span>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                <Link to="/painel/modo-lance">Encerrar leilões antes de viajar</Link>
              </Button>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setConfirmar(false)} disabled={set.isPending}>
              Cancelar
            </Button>
            <Button
              variant="kolecta"
              disabled={set.isPending}
              onClick={() => set.mutate(true, { onSuccess: () => setConfirmar(false) })}
            >
              {set.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ativar modo férias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/** Faixa no painel do vendedor enquanto o modo férias está ligado. */
export function VacationBanner() {
  const { data: status } = useVacationStatus();
  const set = useSetVacationMode();
  if (!status?.vacationMode) return null;

  const leiloes = status.leiloesAtivos ?? [];
  return (
    <div className="mx-4 mt-4 lg:mx-6 flex items-start gap-3 rounded-lg border border-[hsl(var(--kolecta-gold))]/30 bg-[hsl(var(--kolecta-gold))]/10 px-4 py-3">
      <Plane className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--kolecta-gold))]" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-foreground">Sua loja está em modo férias.</p>
        <p className="mt-0.5 text-muted-foreground">
          Vendas diretas pausadas.
          {leiloes.length > 0
            ? ` ${leiloes.length} leilão(ões) ainda ativos, encerram na data marcada.`
            : ''}{' '}
          Reative quando voltar.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        disabled={set.isPending}
        onClick={() => set.mutate(false)}
      >
        {set.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reativar'}
      </Button>
    </div>
  );
}
