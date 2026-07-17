import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBRL } from '@/lib/currency';
import { useAdminReports } from '@/hooks/use-api';
import { Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';

const tooltipStyle = {
  contentStyle: { background: 'hsl(225, 18%, 12%)', border: '1px solid hsl(225, 12%, 18%)', borderRadius: 8, fontSize: 12 },
};

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="h-[180px] flex flex-col items-center justify-center text-center gap-2">
      <Clock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground max-w-[220px]">{label}</p>
    </div>
  );
}

export default function AdminReports() {
  const { data, isLoading } = useAdminReports();
  const gmvByMonth = data?.gmvByMonth ?? [];
  const auctionMetrics = data?.auctionMetrics ?? [];
  const topCategories = data?.topCategories ?? [];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-extrabold italic uppercase">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">Análise detalhada do marketplace</p>
        </div>

        {/* GMV + Payment methods */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">GMV Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full rounded" />
                ) : gmvByMonth.every((m) => m.gmv === 0) ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Sem vendas no período ainda.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={gmvByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 12%, 18%)" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                      <defs>
                        <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(48, 100%, 50%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(48, 100%, 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="gmv" stroke="hsl(48, 100%, 50%)" strokeWidth={2} fill="url(#gmvGrad)" name="GMV" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment methods — sem tracking por pedido ainda */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Meios de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <ComingSoon label="Em breve — hoje os pagamentos são via Pix (Pagar.me). O detalhamento por método exige registrar o meio em cada pedido." />
            </CardContent>
          </Card>
        </div>

        {/* DAU + Auctions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Usuários Ativos Diários (DAU)</CardTitle>
            </CardHeader>
            <CardContent>
              <ComingSoon label="Em breve — requer analytics de sessão (rastreamento de acessos), que ainda não é coletado." />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Modo Lance & Lances por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[220px] w-full rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={auctionMetrics} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 12%, 18%)" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="modoLance" fill="hsl(0, 80%, 55%)" radius={[4, 4, 0, 0]} name="Modo Lance" />
                    <Bar dataKey="lances" fill="hsl(48, 100%, 50%)" radius={[4, 4, 0, 0]} name="Lances" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top categories table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Top Categorias por GMV</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
            ) : topCategories.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sem vendas por categoria ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">#</th>
                      <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Categoria</th>
                      <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">GMV</th>
                      <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Itens</th>
                      <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topCategories.map((cat, i) => (
                      <tr key={cat.name} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-heading text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{cat.name}</td>
                        <td className="px-4 py-3 text-right font-heading font-bold text-primary">{formatBRL(cat.gmv)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{cat.items.toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3 text-right">{formatBRL(cat.items > 0 ? cat.gmv / cat.items : 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
