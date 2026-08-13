import { useState } from 'react';
import { Reorder } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Search, MoreHorizontal, Eye, Pencil, Pause, Play, Trash2, Loader2, Sparkles, Rocket, Copy, Package, SearchX, Upload, Gavel, GripVertical, Check, ArrowUpDown, ListChecks, Pin, PinOff } from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatBRL, conditionLabel } from '@/lib/mock-data';
import { isListingFeatured } from '@/lib/api';
import { useMyListings, useDeleteListing, useTogglePauseListing, usePublishListing, useMyFounder, useUseFounderCredit, useIsFounderActive, useColocarEmLeilao, useReorderListings, useDestacarListings } from '@/hooks/use-api';
import type { Listing } from '@/lib/api';
import { ordenarPorPosicao } from '@/lib/ordenar-vitrine';
import {
  MAX_DESTAQUES, alternarDestaque, destaquesAtivos, estaDestacado,
} from '@/lib/destaques-loja';
import EmptyState from '@/components/EmptyState';
import RejectionNotice from '@/components/RejectionNotice';
import { isOpenRoute } from '@/components/LaunchGate';
import { saveDraft, draftFromListing } from '@/lib/listing-draft';
import { hasLaunched } from '@/lib/launch';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusTabs = [
  { label: 'Todos', value: 'todos' },
  { label: 'Ativos', value: 'active' },
  { label: 'Rascunhos', value: 'draft' },
  { label: 'Reprovados', value: 'rejected' },
  { label: 'Pausados', value: 'paused' },
  { label: 'Vendidos', value: 'sold' },
];

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400',
  draft: 'bg-primary/10 text-primary',
  pending_review: 'bg-yellow-500/10 text-yellow-500',
  rejected: 'bg-accent/10 text-accent',
  paused: 'bg-secondary text-muted-foreground',
  sold: 'bg-blue-500/10 text-blue-400',
  expired: 'bg-secondary text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  draft: 'Rascunho',
  // Faltava: o anúncio na fila mostrava o valor cru "pending_review" no selo.
  pending_review: 'Em análise',
  rejected: 'Reprovado',
  paused: 'Pausado',
  sold: 'Vendido',
  expired: 'Expirado',
};

export default function SellerListings() {
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [search, setSearch] = useState('');
  // Modo de organizar a vitrine: arrastar os anúncios ATIVOS para a ordem em que
  // aparecem na página do vendedor. Fica separado da gestão normal para não
  // brigar com os cliques de editar/pausar de cada card.
  const [reordenando, setReordenando] = useState(false);
  const navigate = useNavigate();

  const { data: myProducts, isLoading } = useMyListings();
  const deleteMutation = useDeleteListing();
  const togglePauseMutation = useTogglePauseListing();
  const publishMutation = usePublishListing();
  const { data: founder } = useMyFounder();
  const useCreditMutation = useUseFounderCredit();
  const destacarMutation = useDestacarListings();
  // Fundador ativo com créditos disponíveis pode destacar anúncios ativos.
  const creditsAvailable = founder?.credits?.available ?? 0;
  // Só depois da seleção (25/07). Ver useIsFounderActive.
  const canFeature = useIsFounderActive() && creditsAvailable > 0;
  // A vitrine pública só abre no lançamento. Perguntamos ao próprio gate em vez
  // de repetir a regra aqui: mudou a allowlist, isto acompanha.
  const paginaPublicaDisponivel = isOpenRoute('/produto/x');

  const filtered = (myProducts || []).filter((p) => {
    if (activeTab !== 'todos' && p.status !== activeTab) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const semAnuncios = (myProducts || []).length === 0;
  const filtroAtivo = activeTab !== 'todos' || search.trim() !== '';

  // Só anúncio ATIVO aparece na vitrine pública, então só ele entra na
  // reordenação, já na ordem que o público vê (posição, depois data).
  const ativos = ordenarPorPosicao((myProducts || []).filter((p) => p.status === 'active'));
  const podeReordenar = ativos.length >= 2;

  // ── Destaques da loja ──
  // Os fixados que valem hoje. Item destacado que foi pausado ou vendido mantém
  // a marca (volta destacado se reativar) mas não ocupa vaga — senão o vendedor
  // veria "4/4" contando itens que a loja nem mostra.
  const idsDestacados = destaquesAtivos(myProducts || []).map((p) => p.id);
  const noMaximoDeDestaques = idsDestacados.length >= MAX_DESTAQUES;

  /** Fixa ou tira o anúncio da faixa de destaques da loja. */
  const alternarNaLoja = (product: Listing) => {
    const nova = alternarDestaque(idsDestacados, product.id);
    if (!nova) {
      toast.error(`Você já tem ${MAX_DESTAQUES} destaques`, {
        description: 'Tire um da lista para colocar este no lugar.',
      });
      return;
    }
    const fixando = nova.length > idsDestacados.length;
    destacarMutation.mutate(nova, {
      onSuccess: () =>
        toast.success(
          fixando ? 'Fixado nos destaques da loja' : 'Removido dos destaques',
          {
            description: fixando
              ? 'Ele aparece no topo da sua página, antes dos outros anúncios.'
              : undefined,
          },
        ),
    });
  };

  /**
   * Duplicar: grava uma cópia do anúncio como rascunho e abre o wizard já
   * preenchido. Poupa o vendedor de repetir categoria, condição, descrição e
   * dimensões a cada item parecido (o caso de quem tem estoque).
   */
  // ── Colocar em leilão ──────────────────────────────────────────────────
  // O vendedor já montou o anúncio. Quem decide entre converter e duplicar é o
  // BACKEND, pelo estoque: peça única vira leilão no lugar, para não existirem
  // dois anúncios do mesmo objeto físico.
  const leilao = useColocarEmLeilao();
  const [paraLeilao, setParaLeilao] = useState<Listing | null>(null);
  const [cfg, setCfg] = useState({
    lanceInicial: '', incremento: '10', duracao: '48', reserva: '', antiSniper: true,
  });

  const abrirLeilao = (product: Listing) => {
    setParaLeilao(product);
    setCfg({
      // Sugere o preço de venda como lance inicial: é o número que ele já
      // pensou para a peça, e continua editável.
      lanceInicial: product.priceInCents ? String(product.priceInCents / 100) : '',
      incremento: '10', duracao: '48', reserva: '', antiSniper: true,
    });
  };

  const confirmarLeilao = () => {
    if (!paraLeilao) return;
    const reais = (v: string) => Math.round(Number(String(v).replace(',', '.')) * 100);
    const inicial = reais(cfg.lanceInicial);
    if (!Number.isFinite(inicial) || inicial <= 0) {
      toast.error('Informe o lance inicial.');
      return;
    }
    leilao.mutate(
      {
        id: paraLeilao.id,
        config: {
          startingBidInCents: inicial,
          minIncrementInCents: reais(cfg.incremento) || undefined,
          reservePriceInCents: cfg.reserva ? reais(cfg.reserva) : undefined,
          durationHours: Number(cfg.duracao) || undefined,
          antiSniper: cfg.antiSniper,
        },
      },
      { onSuccess: () => setParaLeilao(null) },
    );
  };

  const duplicar = (product: Listing) => {
    saveDraft(draftFromListing(product));
    toast.success('Cópia criada', {
      description: 'Ajuste o título e envie as fotos deste item.',
    });
    navigate('/painel/anuncios/novo');
  };

  return (
    <SellerLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-extrabold italic uppercase">Meus Anúncios</h1>
            <p className="text-sm text-muted-foreground mt-1">{(myProducts || []).length} anúncios no total</p>
          </div>
          <div className="flex items-center gap-2">
            {podeReordenar && !reordenando && (
              <Button variant="outline" size="sm" onClick={() => setReordenando(true)}>
                <ArrowUpDown className="h-4 w-4" />
                Organizar vitrine
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/painel/anuncios/completar">
                <ListChecks className="h-4 w-4" />
                Completar em massa
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/painel/importar">
                <Upload className="h-4 w-4" />
                Importar Planilha
              </Link>
            </Button>
            <Button variant="kolecta" asChild>
              <Link to="/painel/anuncios/novo">
                <PlusCircle className="h-4 w-4" />
                Novo Anúncio
              </Link>
            </Button>
          </div>
        </div>

        {/* Organizar vitrine: arrastar os ativos para a ordem da página pública. */}
        {reordenando && (
          <ReorderVitrine ativos={ativos} onSair={() => setReordenando(false)} />
        )}

        {!reordenando && (<>
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-heading uppercase tracking-wider whitespace-nowrap transition-colors ${
                activeTab === tab.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar nos seus anúncios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Listings */}
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="font-heading text-lg font-bold text-muted-foreground uppercase">Buscando seus anúncios...</p>
          </div>
        ) : filtered.length === 0 ? (
          semAnuncios ? (
            // Vitrine vazia: convite, não só um aviso. Durante o pré-lançamento
            // puxa o gancho da seleção de Fundador, que é o que move o vendedor.
            <EmptyState
              icon={Package}
              title="Sua vitrine está vazia"
              description={
                hasLaunched()
                  ? 'Crie seu primeiro anúncio e comece a vender para colecionadores de todo o Brasil.'
                  : 'Crie seus primeiros anúncios e concorra a uma das 100 vagas de Membro Fundador. O resultado sai no lançamento.'
              }
              action={
                <Button variant="kolecta" asChild>
                  <Link to="/painel/anuncios/novo">
                    <PlusCircle className="h-4 w-4" /> Criar primeiro anúncio
                  </Link>
                </Button>
              }
            />
          ) : (
            // Tem anúncio, só não bateu com o filtro: não faz sentido convidar a criar.
            <EmptyState
              icon={SearchX}
              title="Nenhum anúncio com esse filtro"
              description="Tente outra aba ou limpe a busca."
              action={
                filtroAtivo ? (
                  <Button
                    variant="outline"
                    onClick={() => { setActiveTab('todos'); setSearch(''); }}
                  >
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          )
        ) : (
          <div className="space-y-3">
            {filtered.map((product) => {
              let imgs: string[] = [];
              try {
                if (product.images) imgs = JSON.parse(product.images);
              } catch (e) {
                console.error('Failed to parse images', e);
              }

              return (
              <Card key={product.id} className="bg-card border-border hover:border-primary/20 transition-colors">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-secondary shrink-0 flex justify-center items-center">
                      {imgs[0] ? (
                         <img src={imgs[0]} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                         <span className="text-[10px] text-muted-foreground">Sem Foto</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* No painel, clicar no próprio anúncio leva a GERENCIAR,
                            não à página pública. Antes levava a /produto/:id, que
                            está fechada no pré-lançamento: o vendedor era expulso
                            para a landing e achava que tinha caído a sessão. */}
                        <Link
                          to={`/painel/anuncios/${product.id}/editar`}
                          className="text-sm font-medium truncate hover:text-primary transition-colors"
                        >
                          {product.title}
                        </Link>
                        <Badge className={`text-[10px] shrink-0 ${statusColors[product.status] || ''}`}>
                          {statusLabels[product.status] || product.status}
                        </Badge>
                        {isListingFeatured(product) && (
                          <Badge className="text-[10px] shrink-0 gap-1 bg-primary/15 text-primary border-primary/30">
                            <Sparkles className="h-3 w-3" /> Em destaque
                          </Badge>
                        )}
                        {estaDestacado(product) && product.status === 'active' && (
                          <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
                            <Pin className="h-3 w-3" /> Destaque da loja
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{product.brand || 'Sem marca'}</span>
                        <span>·</span>
                        <span>{conditionLabel(product.condition as any) || product.condition}</span>
                        <span>·</span>
                        <span>{product.type === 'auction' ? 'Modo Lance' : 'Venda Direta'}</span>
                        {/* O SKU aparece aqui para o lojista achar a peça no
                            controle dele sem abrir o anúncio. */}
                        {product.sku && (
                          <>
                            <span>·</span>
                            <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px]">
                              {product.sku}
                            </code>
                          </>
                        )}
                      </div>
                      {/* O motivo aparece na própria linha do anúncio reprovado:
                          é o que diz ao vendedor o que corrigir. */}
                      {product.status === 'rejected' && (
                        <RejectionNotice motivo={product.rejectionReason} compacto className="mt-2" />
                      )}
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="font-heading text-sm font-bold">
                        {formatBRL((product.priceInCents || 0) / 100)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {product.type === 'auction' ? 'Lances abertos' : 'Preço fixo'}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        {/* A página pública do anúncio só existe depois do
                            lançamento. Oferecer o link antes disso jogava o
                            vendedor para fora do painel. */}
                        {paginaPublicaDisponivel && (
                          <DropdownMenuItem className="gap-2 text-sm" onClick={() => navigate(`/produto/${product.id}`)}>
                            <Eye className="h-3.5 w-3.5" /> Ver anúncio
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="gap-2 text-sm" onClick={() => navigate(`/painel/anuncios/${product.id}/editar`)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-sm" onClick={() => duplicar(product)}>
                          <Copy className="h-3.5 w-3.5" /> Duplicar
                        </DropdownMenuItem>
                        {/* Só faz sentido em compra direta: leilão já é leilão. */}
                        {product.type !== 'auction' && (
                          <DropdownMenuItem className="gap-2 text-sm" onClick={() => abrirLeilao(product)}>
                            <Gavel className="h-3.5 w-3.5" /> Colocar em leilão
                          </DropdownMenuItem>
                        )}
                        {/* "Enviar para análise", não "Publicar": quem coloca no
                            ar é a moderação. O nome antigo prometia publicação
                            imediata e o vendedor não entenderia por que o
                            anúncio não apareceu. */}
                        {product.status === 'draft' && (
                          <DropdownMenuItem
                            className="gap-2 text-sm text-primary"
                            disabled={publishMutation.isPending}
                            onClick={() => publishMutation.mutate(product.id)}
                          >
                            <Rocket className="h-3.5 w-3.5" /> Enviar para análise
                          </DropdownMenuItem>
                        )}
                        {product.status === 'paused' && (
                          <DropdownMenuItem
                            className="gap-2 text-sm text-primary"
                            disabled={publishMutation.isPending}
                            onClick={() => publishMutation.mutate(product.id)}
                          >
                            <Rocket className="h-3.5 w-3.5" /> Reativar
                          </DropdownMenuItem>
                        )}
                        {/* Anúncio reprovado ficava sem saída: "Publicar" só
                            aparecia para rascunho e em análise, então o vendedor
                            corrigia e não tinha como devolver para a fila. */}
                        {product.status === 'rejected' && (
                          <DropdownMenuItem
                            className="gap-2 text-sm text-primary"
                            disabled={publishMutation.isPending}
                            onClick={() => navigate(`/painel/anuncios/${product.id}/editar`)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Corrigir e reenviar
                          </DropdownMenuItem>
                        )}
                        {/* Fixar no topo da LOJA. Fica junto do "Destacar (usar
                            1 crédito)" logo abaixo, e por isso os dois nomes
                            precisam ser diferentes: aquele é destaque de
                            plataforma (vitrine geral, consome crédito, expira),
                            este é a faixa da página do próprio vendedor, de
                            graça e sem prazo. */}
                        {product.status === 'active' && (
                          <DropdownMenuItem
                            className="gap-2 text-sm"
                            disabled={
                              destacarMutation.isPending ||
                              (!estaDestacado(product) && noMaximoDeDestaques)
                            }
                            onClick={() => alternarNaLoja(product)}
                          >
                            {estaDestacado(product) ? (
                              <><PinOff className="h-3.5 w-3.5" /> Tirar dos destaques da loja</>
                            ) : noMaximoDeDestaques ? (
                              <><Pin className="h-3.5 w-3.5" /> Destaques da loja ({MAX_DESTAQUES}/{MAX_DESTAQUES})</>
                            ) : (
                              <><Pin className="h-3.5 w-3.5" /> Fixar nos destaques da loja</>
                            )}
                          </DropdownMenuItem>
                        )}
                        {canFeature && product.status === 'active' && !isListingFeatured(product) && (
                          <DropdownMenuItem
                            className="gap-2 text-sm text-primary"
                            disabled={useCreditMutation.isPending}
                            onClick={() => useCreditMutation.mutate(product.id)}
                          >
                            <Sparkles className="h-3.5 w-3.5" /> Destacar (usar 1 crédito)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="gap-2 text-sm"
                          disabled={togglePauseMutation.isPending}
                          onClick={() => togglePauseMutation.mutate(product.id)}
                        >
                          {product.status === 'paused' ? (
                            <><Play className="h-3.5 w-3.5" /> Reativar</>
                          ) : (
                            <><Pause className="h-3.5 w-3.5" /> Pausar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-sm text-accent" onClick={() => {
                          if (confirm('Tem certeza que deseja excluir esse anúncio?')) {
                            deleteMutation.mutate(product.id || '');
                          }
                        }}>
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
        </>)}
      </div>

      {/* ── Colocar em leilão ── */}
      <Dialog open={!!paraLeilao} onOpenChange={(o) => !o && setParaLeilao(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Colocar em leilão</DialogTitle>
            <DialogDescription>
              {paraLeilao && Number(paraLeilao.stock ?? 1) > 1 ? (
                <>
                  Você tem {paraLeilao.stock} unidades. Uma vai para o leilão e o
                  anúncio de compra direta segue com {Number(paraLeilao.stock) - 1}.
                </>
              ) : (
                <>
                  É peça única, então o próprio anúncio vira leilão. Ele volta
                  para análise antes de ir ao ar.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lance inicial (R$) *</Label>
                <Input
                  value={cfg.lanceInicial}
                  onChange={(e) => setCfg((c) => ({ ...c, lanceInicial: e.target.value }))}
                  placeholder="149,90"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Incremento (R$)</Label>
                <Input
                  value={cfg.incremento}
                  onChange={(e) => setCfg((c) => ({ ...c, incremento: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duração (horas)</Label>
                <Input
                  value={cfg.duracao}
                  onChange={(e) => setCfg((c) => ({ ...c, duracao: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preço de reserva (R$)</Label>
                <Input
                  value={cfg.reserva}
                  onChange={(e) => setCfg((c) => ({ ...c, reserva: e.target.value }))}
                  placeholder="opcional"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Anti-sniper</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Lance nos minutos finais estica o prazo, para ninguém arrematar
                  no estalo.
                </p>
              </div>
              <Switch
                checked={cfg.antiSniper}
                onCheckedChange={(v) => setCfg((c) => ({ ...c, antiSniper: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setParaLeilao(null)}>Cancelar</Button>
            <Button variant="kolecta" disabled={leilao.isPending} onClick={confirmarLeilao}>
              {leilao.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Colocar em leilão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </SellerLayout>
  );
}

// ─── Organizar vitrine (arrastar para reordenar) ─────────────────────────────
//
// Lista separada e enxuta só com os anúncios ativos: o vendedor arrasta pela
// alça e a ordem é gravada ao soltar. A UI mostra a nova ordem na hora (estado
// local do Reorder); a persistência acontece no fim de cada arraste.
function ReorderVitrine({ ativos, onSair }: { ativos: Listing[]; onSair: () => void }) {
  const reorder = useReorderListings();
  const [ordem, setOrdem] = useState<Listing[]>(ativos);

  const persistir = () => reorder.mutate(ordem.map((l) => l.id));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 p-3">
        <p className="text-sm text-muted-foreground">
          Arraste pela alça para ordenar. O topo aparece primeiro na sua página —
          depois dos destaques, que vêm sempre na frente.
          {reorder.isPending && <span className="ml-2 text-primary">salvando…</span>}
        </p>
        <Button variant="kolecta" size="sm" onClick={onSair}>
          <Check className="h-4 w-4" /> Concluir
        </Button>
      </div>

      <Reorder.Group axis="y" values={ordem} onReorder={setOrdem} className="space-y-2">
        {ordem.map((l) => (
          <ReorderItem key={l.id} listing={l} onSoltar={persistir} />
        ))}
      </Reorder.Group>
    </div>
  );
}

function ReorderItem({ listing, onSoltar }: { listing: Listing; onSoltar: () => void }) {
  let imgs: string[] = [];
  try { if (listing.images) imgs = JSON.parse(listing.images); } catch { /* sem foto */ }

  return (
    <Reorder.Item
      value={listing}
      onDragEnd={onSoltar}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
        {imgs[0] ? (
          <img src={imgs[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[9px] text-muted-foreground">Sem foto</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{listing.title}</p>
          {/* Destaque pula na frente de toda esta ordem. Sem a marca aqui, o
              vendedor arrastaria um item para o topo e não entenderia por que
              outro continua aparecendo antes na loja. */}
          {estaDestacado(listing) && (
            <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
              <Pin className="h-3 w-3" /> Destaque
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{formatBRL((listing.priceInCents || 0) / 100)}</p>
      </div>
    </Reorder.Item>
  );
}
