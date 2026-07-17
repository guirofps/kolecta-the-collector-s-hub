import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Megaphone, Image as ImageIcon, Clock } from 'lucide-react';

const sections = [
  {
    icon: Star,
    title: 'Destaques pagos (Bronze / Prata / Ouro)',
    label: 'Os planos de destaque pago ainda não fazem parte do produto. Hoje o único destaque em produção é o crédito de destaque do Programa Membro Fundador, aplicado automaticamente pelo próprio vendedor (7 dias por crédito) — sem intervenção do admin.',
  },
  {
    icon: ImageIcon,
    title: 'Banners patrocinados',
    label: 'A venda e o gerenciamento de posições de banner (homepage, sidebar, página de produto) ainda não foram implementados no backend.',
  },
  {
    icon: Megaphone,
    title: 'Campanhas promocionais',
    label: 'Campanhas (desconto em comissão, frete grátis patrocinado, evento especial) exigem um motor de campanhas que ainda não existe. Serão adicionadas aqui quando o produto de mídia for construído.',
  },
];

export default function AdminMedia() {
  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold italic uppercase">Mídia & Campanhas</h1>
          <p className="text-sm text-muted-foreground mt-1">Destaques, banners e campanhas promocionais</p>
        </div>

        <Card className="bg-gradient-card border-border mb-6">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground" />
            <p className="font-heading text-lg font-bold">Produto de mídia — Em breve</p>
            <p className="text-sm text-muted-foreground max-w-lg">
              Esta área concentrará a monetização por mídia (destaques pagos, banners e campanhas).
              Nenhum desses fluxos está no MVP ainda, então não há dados a exibir.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map((s) => (
            <Card key={s.title} className="bg-gradient-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="font-heading text-sm font-semibold uppercase tracking-wider">{s.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
