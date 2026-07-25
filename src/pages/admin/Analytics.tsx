import { useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBRL } from '@/lib/currency';
import { useAdminListings, useCategories } from '@/hooks/use-api';
import { Clock, TrendingUp, Package, Store, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell,
} from 'recharts';
import {
  criadosPorDia,
  criadosHoje,
  criadosNosUltimos,
  funilModeracao,
  esperaMaisAntiga,
  vendedores,
  vendedoresComItemNoAr,
  catalogoPorCategoria,
  faixasDePreco,
  valorDoCatalogoEmCentavos,
} from '@/lib/admin-analytics';

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(225, 18%, 12%)',
    border: '1px solid hsl(225, 12%, 18%)',
    borderRadius: 8,
    fontSize: 12,
  },
};

/**
 * Teto de uma consulta. O painel deriva tudo da listagem completa, então
 * precisa caber aqui. Se o catálogo passar disso, os números viram "pelo menos
 * N" e o aviso no rodapé aparece, em vez de a tela mentir em silêncio.
 */
const LIMITE = 1000;

/** Cartão de número, com o contexto embaixo. Número solto não decide nada. */
function Kpi({
  rotulo,
  valor,
  contexto,
  icone: Icone,
  alerta,
}: {
  rotulo: string;
  valor: string;
  contexto?: string;
  icone: typeof Package;
  alerta?: boolean;
}) {
  return (
    <Card className={`bg-card ${alerta ? 'border-destructive/40' : 'border-border'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-heading uppercase tracking-wider text-muted-foreground">
              {rotulo}
            </p>
            <p className={`mt-1 font-heading text-2xl font-extrabold ${alerta ? 'text-destructive' : ''}`}>
              {valor}
            </p>
            {contexto && <p className="mt-0.5 text-[11px] text-muted-foreground">{contexto}</p>}
          </div>
          <Icone className={`h-4 w-4 shrink-0 ${alerta ? 'text-destructive' : 'text-primary'}`} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Espaço reservado para o que depende de rastreamento de sessão. Fica visível
 * de propósito: assim o painel mostra o que ainda falta em vez de fingir que
 * está completo.
 */
function AguardandoEventos({ label }: { label: string }) {
  return (
    <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-center">
      <Clock className="h-6 w-6 text-muted-foreground" />
      <p className="max-w-[260px] text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function AdminAnalytics() {
  const [janela, setJanela] = useState<7 | 30>(30);

  // Uma consulta só, sem filtro de status: o painel precisa do catálogo todo
  // para separar fila, no ar e reprovado.
  const { data, isLoading } = useAdminListings(undefined, LIMITE);
  const listings = useMemo(() => data ?? [], [data]);
  const { data: categorias } = useCategories();

  const nomeCategoria = (id: string) =>
    categorias?.find((c) => c.id === id)?.name ?? id;

  const m = useMemo(() => {
    const funil = funilModeracao(listings);
    return {
      funil,
      serie: criadosPorDia(listings, janela),
      hoje: criadosHoje(listings),
      semana: criadosNosUltimos(listings, 7),
      espera: esperaMaisAntiga(listings),
      topVendedores: vendedores(listings, 8),
      lojasNoAr: vendedoresComItemNoAr(listings),
      categorias: catalogoPorCategoria(listings),
      faixas: faixasDePreco(listings),
      valorCatalogo: valorDoCatalogoEmCentavos(listings),
      saturado: listings.length >= LIMITE,
    };
  }, [listings, janela]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl p-6 lg:p-8">
          <Skeleton className="mb-8 h-10 w-64" />
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-extrabold italic uppercase">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Movimento da plataforma, a partir do catálogo. Tráfego e comportamento
            entram quando o registro de eventos existir.
          </p>
        </div>

        {/* ─── KPIs ───────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi
            rotulo="No ar"
            valor={String(m.funil.noAr)}
            contexto={`de ${m.funil.total} no total`}
            icone={Package}
          />
          <Kpi
            rotulo="Criados hoje"
            valor={String(m.hoje)}
            contexto={`${m.semana} nos últimos 7 dias`}
            icone={TrendingUp}
          />
          <Kpi
            rotulo="Lojas com item no ar"
            valor={String(m.lojasNoAr)}
            contexto={`${m.topVendedores.length > 0 ? `maior tem ${m.topVendedores[0].noAr}` : 'nenhuma ainda'}`}
            icone={Store}
          />
          <Kpi
            rotulo="Na fila"
            valor={String(m.funil.aguardando)}
            contexto={
              m.espera != null
                ? `o mais antigo espera há ${m.espera} ${m.espera === 1 ? 'dia' : 'dias'}`
                : 'fila vazia'
            }
            icone={m.funil.aguardando > 0 ? AlertTriangle : CheckCircle2}
            alerta={m.espera != null && m.espera >= 3}
          />
        </div>

        {/* ─── Ritmo de criação ───────────────────────────── */}
        <Card className="mb-6 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
              Anúncios criados por dia
            </CardTitle>
            <div className="flex gap-1">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setJanela(d)}
                  className={`rounded px-2 py-1 text-[11px] transition-colors ${
                    janela === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d} dias
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={m.serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 12%, 18%)" />
                <XAxis dataKey="rotulo" stroke="hsl(220, 9%, 60%)" fontSize={11} interval="preserveStartEnd" />
                <YAxis stroke="hsl(220, 9%, 60%)" fontSize={11} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v, 'anúncios']} />
                <Area type="monotone" dataKey="criados" stroke="hsl(48, 100%, 50%)" fill="hsl(48, 100%, 50%)" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ─── Funil de moderação + catálogo ──────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                Moderação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { rotulo: 'No ar', valor: m.funil.noAr, cor: 'bg-green-500' },
                { rotulo: 'Aguardando decisão', valor: m.funil.aguardando, cor: 'bg-yellow-500' },
                { rotulo: 'Reprovados', valor: m.funil.reprovados, cor: 'bg-destructive' },
                { rotulo: 'Pausados, vendidos e outros', valor: m.funil.outros, cor: 'bg-muted-foreground' },
              ].map((linha) => {
                const pct = m.funil.total > 0 ? (linha.valor / m.funil.total) * 100 : 0;
                return (
                  <div key={linha.rotulo}>
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">{linha.rotulo}</span>
                      <span className="font-medium">
                        {linha.valor}
                        <span className="ml-1 text-muted-foreground">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className={`h-full ${linha.cor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              <p className="pt-1 text-[11px] text-muted-foreground">
                {m.funil.taxaAprovacao != null ? (
                  <>
                    Taxa de aprovação:{' '}
                    <strong className="text-foreground">
                      {(m.funil.taxaAprovacao * 100).toFixed(0)}%
                    </strong>{' '}
                    do que já foi decidido. A fila não entra nessa conta.
                  </>
                ) : (
                  'Nada decidido ainda, então não há taxa de aprovação.'
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                Catálogo no ar por categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {m.categorias.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum anúncio no ar ainda.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {m.categorias.map((c) => {
                    const pct = m.funil.noAr > 0 ? (c.noAr / m.funil.noAr) * 100 : 0;
                    return (
                      <div key={c.categoria}>
                        <div className="mb-1 flex items-baseline justify-between text-xs">
                          <span className="truncate text-muted-foreground">
                            {nomeCategoria(c.categoria)}
                          </span>
                          <span className="ml-2 shrink-0 font-medium">
                            {c.noAr}
                            <span className="ml-1 text-muted-foreground">({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Vendedores + faixa de preço ────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                Vendedores por itens no ar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {m.topVendedores.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">Sem vendedores ainda.</p>
              ) : (
                <div className="space-y-2">
                  {m.topVendedores.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 flex-1 truncate">{v.nome}</span>
                      <span className="shrink-0 font-medium">{v.noAr} no ar</span>
                      {/* A fila do vendedor aparece separada: 300 parados com 2
                          publicados é um problema que a soma esconderia. */}
                      {v.aguardando > 0 && (
                        <span className="shrink-0 text-yellow-500">+{v.aguardando} na fila</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                Faixa de preço do que está no ar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={m.faixas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 12%, 18%)" />
                  <XAxis dataKey="faixa" stroke="hsl(220, 9%, 60%)" fontSize={10} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke="hsl(220, 9%, 60%)" fontSize={11} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [v, 'itens']} />
                  <Bar dataKey="itens" radius={[4, 4, 0, 0]}>
                    {m.faixas.map((_, i) => (
                      <Cell key={i} fill="hsl(48, 100%, 50%)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Vitrine somando{' '}
                <strong className="text-foreground">{formatBRL(m.valorCatalogo / 100)}</strong>.
                É o valor do que está exposto, não vendas.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ─── O que ainda não é coletado ─────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                Visitantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AguardandoEventos label="A coleta de tráfego já está ligada e o número aparece no painel da Vercel. Trazer para cá precisa de registro de eventos próprio." />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                Funil de compra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AguardandoEventos label="Quem viu, quem colocou no carrinho e quem comprou. Precisa gravar cada evento no backend." />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">
                Agora na plataforma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AguardandoEventos label="Quantas pessoas estão navegando neste momento. É o item mais caro: exige sinal periódico de cada visitante." />
            </CardContent>
          </Card>
        </div>

        {m.saturado && (
          <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
            <strong className="text-destructive">Atenção:</strong> a consulta bateu o teto de{' '}
            {LIMITE} anúncios, então os números acima são um piso e não o total. Daqui em
            diante o painel precisa que o backend some por nós, em vez de contar aqui.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
