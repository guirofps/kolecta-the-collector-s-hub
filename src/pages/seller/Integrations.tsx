import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useBlingStatus, useBlingConnect, useBlingDisconnect, useBlingSincronizarEstoque,
  useTinyStatus, useTinyConnect, useTinyDisconnect, useTinySincronizarEstoque,
} from '@/hooks/use-api';
import {
  CheckCircle2, XCircle, ExternalLink, Plug, PlugZap, PackageSearch,
  RefreshCw, Loader2,
} from 'lucide-react';

export default function IntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const { data: blingStatus, isLoading } = useBlingStatus();
  const connectMutation = useBlingConnect();
  const disconnectMutation = useBlingDisconnect();
  const sincronizarEstoque = useBlingSincronizarEstoque();

  const { data: tinyStatus, isLoading: carregandoTiny } = useTinyStatus();
  const tinyConnect = useTinyConnect();
  const tinyDisconnect = useTinyDisconnect();
  const tinySincronizar = useTinySincronizarEstoque();

  // Feedback após callback OAuth (Bling e Tiny voltam pela mesma tela)
  useEffect(() => {
    const bling = searchParams.get('bling');
    const tiny = searchParams.get('tiny');
    if (bling === 'success') {
      toast({ title: 'Bling conectado com sucesso!' });
      setSearchParams({});
    } else if (bling === 'error') {
      toast({ title: 'Erro ao conectar com Bling', description: 'Tente novamente.', variant: 'destructive' });
      setSearchParams({});
    } else if (tiny === 'success') {
      toast({ title: 'Tiny conectado com sucesso!' });
      setSearchParams({});
    } else if (tiny === 'error') {
      toast({ title: 'Erro ao conectar com Tiny', description: 'Tente novamente.', variant: 'destructive' });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast]);

  const isConnected = blingStatus?.connected && !blingStatus?.expired;
  const isExpired = blingStatus?.connected && blingStatus?.expired;

  const tinyConectado = tinyStatus?.connected && !tinyStatus?.expired;
  const tinyExpirado = tinyStatus?.connected && tinyStatus?.expired;

  return (
    <SellerLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-heading text-3xl font-bold">Integrações</h1>
          <p className="text-muted-foreground mt-1">
            Conecte ferramentas externas à sua conta Kolecta
          </p>
        </div>

        {/* Bling card */}
        <Card className="bg-gradient-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0066cc]/10 flex items-center justify-center">
                  <span className="font-heading font-extrabold text-[#0066cc] text-sm">B</span>
                </div>
                <div>
                  <CardTitle className="font-heading text-base">Bling ERP</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Importa o catálogo, segue o estoque e recebe os pedidos pagos
                  </p>
                </div>
              </div>

              {isLoading ? (
                <Skeleton className="h-6 w-20 rounded-full" />
              ) : isConnected ? (
                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 border text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </Badge>
              ) : isExpired ? (
                <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 border text-xs gap-1">
                  <XCircle className="h-3 w-3" /> Token expirado
                </Badge>
              ) : (
                <Badge className="bg-secondary text-muted-foreground border border-border text-xs gap-1">
                  <XCircle className="h-3 w-3" /> Desconectado
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Descrição */}
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Importe seu catálogo do Bling como anúncios, em lote
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Vendeu a peça em outro canal, o anúncio sai do ar sozinho
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Comprador sincronizado como contato no Bling
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Emita NF-e pelo próprio Bling após a sincronização
              </li>
            </ul>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              {isLoading ? (
                <Skeleton className="h-9 w-36 rounded-md" />
              ) : isConnected ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={disconnectMutation.isPending}
                  onClick={() => disconnectMutation.mutate()}
                >
                  <Plug className="h-4 w-4 mr-1.5" />
                  {disconnectMutation.isPending ? 'Desconectando...' : 'Desconectar'}
                </Button>
              ) : (
                <Button
                  variant="kolecta"
                  size="sm"
                  disabled={connectMutation.isPending}
                  onClick={() => connectMutation.mutate()}
                >
                  <PlugZap className="h-4 w-4 mr-1.5" />
                  {connectMutation.isPending
                    ? 'Abrindo o Bling...'
                    : isExpired ? 'Reconectar Bling' : 'Conectar Bling'}
                </Button>
              )}

              <a
                href="https://www.bling.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                bling.com.br
              </a>
            </div>

            {isConnected && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  Cada pedido pago na Kolecta é lançado no seu Bling, e o estoque
                  daqui acompanha o de lá de meia em meia hora.
                </p>

                {/* Sem este atalho a tela de importação ficaria órfã, que foi
                    exatamente o que aconteceu com esta página aqui. */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline-gold" size="sm" asChild>
                    <Link to="/painel/anuncios/importar-bling">
                      <PackageSearch className="h-4 w-4 mr-1.5" />
                      Importar catálogo do Bling
                    </Link>
                  </Button>

                  {/* O cron já roda sozinho. Este botão é para quem acabou de
                      mexer no estoque e quer ver a vitrine acertada agora, e
                      serve de sinal de vida da integração: o lojista clica e vê
                      um número, em vez de acreditar que algo acontece. */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sincronizarEstoque.isPending}
                    onClick={() => sincronizarEstoque.mutate()}
                  >
                    {sincronizarEstoque.isPending
                      ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      : <RefreshCw className="h-4 w-4 mr-1.5" />}
                    {sincronizarEstoque.isPending
                      ? 'Conferindo o estoque...'
                      : 'Sincronizar estoque agora'}
                  </Button>
                </div>

                {/* "Conectado" sozinho não prova nada: as duas primeiras lojas
                    ficaram conectadas por dias sem que uma única chamada de
                    dado passasse. O número de anúncios ligados é o que mostra
                    que a integração está de fato fazendo alguma coisa. */}
                <p className="text-xs text-muted-foreground">
                  {(blingStatus?.anunciosVinculados ?? 0) > 0 ? (
                    <>
                      <strong className="text-foreground">
                        {blingStatus?.anunciosVinculados} anúncio(s)
                      </strong>{' '}
                      seguindo o estoque do seu Bling.
                    </>
                  ) : (
                    'Nenhum anúncio ligado ao Bling ainda. Importe o catálogo para o estoque começar a ser seguido.'
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tiny (Olist) card — espelha o do Bling */}
        <Card className="bg-gradient-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00a868]/10 flex items-center justify-center">
                  <span className="font-heading font-extrabold text-[#00a868] text-sm">T</span>
                </div>
                <div>
                  <CardTitle className="font-heading text-base">Tiny ERP (Olist)</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Importa o catálogo e segue o estoque, igual ao Bling
                  </p>
                </div>
              </div>

              {carregandoTiny ? (
                <Skeleton className="h-6 w-20 rounded-full" />
              ) : tinyConectado ? (
                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 border text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </Badge>
              ) : tinyExpirado ? (
                <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 border text-xs gap-1">
                  <XCircle className="h-3 w-3" /> Token expirado
                </Badge>
              ) : (
                <Badge className="bg-secondary text-muted-foreground border border-border text-xs gap-1">
                  <XCircle className="h-3 w-3" /> Desconectado
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Importe seu catálogo do Tiny como anúncios, em lote
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Vendeu a peça em outro canal, o anúncio sai do ar sozinho
              </li>
            </ul>

            <div className="flex items-center gap-3 pt-1">
              {carregandoTiny ? (
                <Skeleton className="h-9 w-36 rounded-md" />
              ) : tinyConectado ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={tinyDisconnect.isPending}
                  onClick={() => tinyDisconnect.mutate()}
                >
                  <Plug className="h-4 w-4 mr-1.5" />
                  {tinyDisconnect.isPending ? 'Desconectando...' : 'Desconectar'}
                </Button>
              ) : (
                <Button
                  variant="kolecta"
                  size="sm"
                  disabled={tinyConnect.isPending}
                  onClick={() => tinyConnect.mutate()}
                >
                  <PlugZap className="h-4 w-4 mr-1.5" />
                  {tinyConnect.isPending
                    ? 'Abrindo o Tiny...'
                    : tinyExpirado ? 'Reconectar Tiny' : 'Conectar Tiny'}
                </Button>
              )}

              <a
                href="https://www.tiny.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                tiny.com.br
              </a>
            </div>

            {tinyConectado && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  O estoque daqui acompanha o do seu Tiny de meia em meia hora.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline-gold" size="sm" asChild>
                    <Link to="/painel/anuncios/importar-tiny">
                      <PackageSearch className="h-4 w-4 mr-1.5" />
                      Importar catálogo do Tiny
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={tinySincronizar.isPending}
                    onClick={() => tinySincronizar.mutate()}
                  >
                    {tinySincronizar.isPending
                      ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      : <RefreshCw className="h-4 w-4 mr-1.5" />}
                    {tinySincronizar.isPending
                      ? 'Conferindo o estoque...'
                      : 'Sincronizar estoque agora'}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {(tinyStatus?.anunciosVinculados ?? 0) > 0 ? (
                    <>
                      <strong className="text-foreground">
                        {tinyStatus?.anunciosVinculados} anúncio(s)
                      </strong>{' '}
                      seguindo o estoque do seu Tiny.
                    </>
                  ) : (
                    'Nenhum anúncio ligado ao Tiny ainda. Importe o catálogo para o estoque começar a ser seguido.'
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Placeholder para futuras integrações */}
        <Card className="bg-card border-border border-dashed opacity-50">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Plug className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Mais integrações em breve</p>
              <p className="text-xs text-muted-foreground">Melhor Envio, Nuvemshop...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
