import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { mockCategories, formatBRL } from '@/lib/mock-data';
import { toast } from 'sonner';

/* API: GET /api/seller/listings/:id
   PUT /api/seller/listings/:id */

const mockListing = {
  id: '1',
  title: 'Action Figure Dragon Ball Z - Goku Ultra Instinct',
  category: 'action-figures',
  condition: 'novo-lacrado',
  brand: 'Bandai',
  line: 'S.H. Figuarts',
  scale: '1/12',
  year: '2023',
  edition: 'Standard',
  description: 'Action figure oficial da Bandai, linha S.H. Figuarts. Goku na forma Ultra Instinct com acessórios extras e base de exposição. Produto novo e lacrado na embalagem original.',
  photos: ['/placeholder.svg', '/placeholder.svg', '/placeholder.svg'],
  price: '899.90',
  type: 'direct' as const,
  status: 'active',
  startingBid: '',
  minIncrement: '',
  duration: '',
  reservePrice: '',
  antiSniper: false,
};

export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(mockListing);

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [id]);

  const updateField = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Anúncio atualizado com sucesso!');
    }, 1000);
  };

  if (loading) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/painel-vendedor/anuncios">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">Editar Anúncio</h1>
              <p className="text-sm text-muted-foreground">ID: #{id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={form.status === 'active' ? 'default' : 'secondary'}>
              {form.status === 'active' ? 'Ativo' : 'Inativo'}
            </Badge>
            <Link to={`/produto/${id}`}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Eye className="h-4 w-4" /> Ver anúncio
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saving} className="glow-primary gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </Button>
          </div>
        </div>

        {/* Basic info */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Informações básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Título do anúncio</Label>
                <Input value={form.title} onChange={e => updateField('title', e.target.value)} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => updateField('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mockCategories.map(c => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condição</Label>
                <Select value={form.condition} onValueChange={v => updateField('condition', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo-lacrado">Novo / Lacrado</SelectItem>
                    <SelectItem value="novo-aberto">Novo / Aberto</SelectItem>
                    <SelectItem value="usado-excelente">Usado / Excelente</SelectItem>
                    <SelectItem value="usado-bom">Usado / Bom</SelectItem>
                    <SelectItem value="usado-regular">Usado / Regular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-border" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Marca</Label>
                <Input value={form.brand} onChange={e => updateField('brand', e.target.value)} />
              </div>
              <div>
                <Label>Linha</Label>
                <Input value={form.line} onChange={e => updateField('line', e.target.value)} />
              </div>
              <div>
                <Label>Escala</Label>
                <Input value={form.scale} onChange={e => updateField('scale', e.target.value)} />
              </div>
              <div>
                <Label>Ano</Label>
                <Input value={form.year} onChange={e => updateField('year', e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Edição</Label>
              <Input value={form.edition} onChange={e => updateField('edition', e.target.value)} />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => updateField('description', e.target.value)} rows={5} />
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Fotos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {form.photos.map((photo, i) => (
                <div key={i} className="aspect-square rounded-lg border border-border bg-secondary overflow-hidden">
                  <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              <button className="aspect-square rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <span className="text-2xl">+</span>
                <span className="text-xs">Adicionar</span>
              </button>
            </div>
            {/* API: POST /api/uploads para imagens */}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="bg-gradient-card border-white/10">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Preço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="outline">{form.type === 'direct' ? 'Preço fixo' : 'Modo Lance'}</Badge>
            {form.type === 'direct' ? (
              <div className="max-w-xs">
                <Label>Preço (R$)</Label>
                <Input type="number" value={form.price} onChange={e => updateField('price', e.target.value)} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <div>
                  <Label>Lance inicial (R$)</Label>
                  <Input type="number" value={form.startingBid} onChange={e => updateField('startingBid', e.target.value)} />
                </div>
                <div>
                  <Label>Incremento mínimo (R$)</Label>
                  <Input type="number" value={form.minIncrement} onChange={e => updateField('minIncrement', e.target.value)} />
                </div>
                <div>
                  <Label>Preço reserva (R$)</Label>
                  <Input type="number" value={form.reservePrice} onChange={e => updateField('reservePrice', e.target.value)} />
                </div>
                <div>
                  <Label>Duração (dias)</Label>
                  <Input type="number" value={form.duration} onChange={e => updateField('duration', e.target.value)} />
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <Switch checked={form.antiSniper} onCheckedChange={v => updateField('antiSniper', v)} />
                  <Label>Anti-sniper (extensão automática)</Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
