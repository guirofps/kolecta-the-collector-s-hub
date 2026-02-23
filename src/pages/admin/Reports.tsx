import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBRL } from '@/lib/mock-data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';

const monthlyGMV = [
  { month: 'Jul', gmv: 42000 }, { month: 'Ago', gmv: 58000 }, { month: 'Set', gmv: 65000 },
  { month: 'Out', gmv: 78000 }, { month: 'Nov', gmv: 110000 }, { month: 'Dez', gmv: 145000 },
  { month: 'Jan', gmv: 128000 }, { month: 'Fev', gmv: 187000 },
];

const dailyUsers = [
  { day: '14', dau: 120 }, { day: '15', dau: 145 }, { day: '16', dau: 132 },
  { day: '17', dau: 168 }, { day: '18', dau: 155 }, { day: '19', dau: 189 },
  { day: '20', dau: 201 }, { day: '21', dau: 178 }, { day: '22', dau: 210 }, { day: '23', dau: 195 },
];

const auctionMetrics = [
  { month: 'Set', leiloes: 45, lances: 320 }, { month: 'Out', leiloes: 62, lances: 480 },
  { month: 'Nov', leiloes: 78, lances: 610 }, { month: 'Dez', leiloes: 95, lances: 820 },
  { month: 'Jan', leiloes: 88, lances: 750 }, { month: 'Fev', leiloes: 124, lances: 980 },
];

const topCategories = [
  { name: 'Carrinhos & Miniaturas', gmv: 108500, items: 1247 },
  { name: 'Funko Pop', gmv: 33700, items: 834 },
  { name: 'Cards Colecionáveis', gmv: 22400, items: 562 },
  { name: 'Action Figures', gmv: 14200, items: 423 },
  { name: 'Vintage & Retrô', gmv: 5800, items: 315 },
  { name: 'Modelismo', gmv: 2850, items: 198 },
];

const paymentMethods = [
  { name: 'Pix', value: 62, color: 'hsl(48, 100%, 50%)' },
  { name: 'Cartão', value: 28, color: 'hsl(200, 70%, 50%)' },
  { name: 'Boleto', value: 10, color: 'hsl(225, 12%, 40%)' },
];

const tooltipStyle = {
  contentStyle: { background: 'hsl(225, 18%, 12%)', border: '1px solid hsl(225, 12%, 18%)', borderRadius: 8, fontSize: 12 },
};

export default function AdminReports() {
  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-extrabold italic uppercase">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">Análise detalhada do marketplace</p>
        </div>

        {/* GMV */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">GMV Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyGMV}>
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
              </CardContent>
            </Card>
          </div>

          {/* Payment methods */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Meios de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={paymentMethods} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" stroke="none">
                    {paymentMethods.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {paymentMethods.map((p) => (
                  <div key={p.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    {p.name} ({p.value}%)
                  </div>
                ))}
              </div>
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
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyUsers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 12%, 18%)" />
                  <XAxis dataKey="day" tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="dau" stroke="hsl(200, 70%, 50%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(200, 70%, 50%)' }} name="DAU" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Leilões & Lances por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={auctionMetrics} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 12%, 18%)" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(225, 8%, 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="leiloes" fill="hsl(0, 80%, 55%)" radius={[4, 4, 0, 0]} name="Leilões" />
                  <Bar dataKey="lances" fill="hsl(48, 100%, 50%)" radius={[4, 4, 0, 0]} name="Lances" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top categories table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">Top Categorias por GMV</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                      <td className="px-4 py-3 text-right">{formatBRL(cat.gmv / cat.items)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
