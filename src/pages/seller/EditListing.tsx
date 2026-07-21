import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Loader2, ImagePlus, X, AlertCircle } from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockCategories } from '@/lib/mock-data';
import { CONDITIONS } from '@/lib/conditions';
import { useListing, useUpdateListing, useUploadImage, useCategories } from '@/hooks/use-api';
import type { CreateListingPayload } from '@/lib/api';
import { toast } from 'sonner';

const MAX_PHOTOS = 8;

// Condições vêm da fonte única (src/lib/conditions.ts).
const conditions = CONDITIONS;

interface EditForm {
  title: string;
  category: string;
  condition: string;
  brand: string;
  line: string;
  scale: string;
  year: string;
  edition: string;
  description: string;
  photos: string[];
  price: string; // em reais (string), convertido p/ centavos ao salvar
  // Envio (frete): peso em gramas, dimensões em cm (strings no form).
  weightGrams: string;
  widthCm: string;
  heightCm: string;
  lengthCm: string;
}

const emptyForm: EditForm = {
  title: '',
  category: '',
  condition: '',
  brand: '',
  line: '',
  scale: '',
  year: '',
  edition: '',
  description: '',
  photos: [],
  price: '',
  weightGrams: '',
  widthCm: '',
  heightCm: '',
  lengthCm: '',
};

function parseImages(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((u) => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: listing, isLoading, isError } = useListing(id);
  const { data: categories } = useCategories();
  const updateListing = useUpdateListing();
  const uploadImage = useUploadImage();

  // Categorias reais da API; cai para o mock se a API ainda não respondeu.
  const categoryOptions =
    categories && categories.length > 0
      ? categories.map((c) => ({ id: c.id, name: c.name }))
      : mockCategories.map((c) => ({ id: c.id, name: c.name }));

  const [form, setForm] = useState<EditForm>(emptyForm);
  const inputRef = useRef<HTMLInputElement>(null);

  // Popula o formulário quando o anúncio carrega
  useEffect(() => {
    if (!listing) return;
    setForm({
      title: listing.title ?? '',
      category: listing.categoryId ?? '',
      condition: listing.condition ?? '',
      brand: listing.brand ?? '',
      line: listing.line ?? '',
      scale: listing.scale ?? '',
      year: listing.year ?? '',
      edition: listing.edition ?? '',
      description: listing.description ?? '',
      photos: parseImages(listing.images),
      price: listing.priceInCents != null ? String(listing.priceInCents / 100) : '',
      weightGrams: listing.weightGrams != null ? String(listing.weightGrams) : '',
      widthCm: listing.widthCm != null ? String(listing.widthCm) : '',
      heightCm: listing.heightCm != null ? String(listing.heightCm) : '',
      lengthCm: listing.lengthCm != null ? String(listing.lengthCm) : '',
    });
  }, [listing]);

  const updateField = (field: keyof EditForm, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (file: File) => {
    if (form.photos.length >= MAX_PHOTOS) return;
    uploadImage.mutate(file, {
      onSuccess: (data) => {
        setForm((prev) => ({ ...prev, photos: [...prev.photos, data.url] }));
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  const handleSave = () => {
    if (!id) return;
    if (!form.title.trim()) {
      toast.error('O título é obrigatório.');
      return;
    }

    const isAuction = listing?.type === 'auction';
    const priceLabel = isAuction ? 'lance inicial' : 'preço';
    const priceInCents = form.price ? Math.round(Number(form.price) * 100) : undefined;
    if (form.price && (priceInCents === undefined || Number.isNaN(priceInCents) || priceInCents < 0)) {
      toast.error(`Informe um ${priceLabel} válido.`);
      return;
    }

    const toInt = (v: string) => {
      const n = parseInt(v.replace(/\D/g, ''), 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };

    const payload: Partial<CreateListingPayload> = {
      title: form.title.trim(),
      description: form.description || undefined,
      categoryId: form.category || undefined,
      brand: form.brand || undefined,
      line: form.line || undefined,
      scale: form.scale || undefined,
      year: form.year || undefined,
      edition: form.edition || undefined,
      condition: form.condition || undefined,
      priceInCents,
      images: JSON.stringify(form.photos),
      weightGrams: toInt(form.weightGrams),
      widthCm: toInt(form.widthCm),
      heightCm: toInt(form.heightCm),
      lengthCm: toInt(form.lengthCm),
    };

    updateListing.mutate(
      { id, data: payload },
      { onSuccess: () => navigate('/painel/anuncios') },
    );
  };

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SellerLayout>
    );
  }

  if (isError || !listing) {
    return (
      <SellerLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <div>
            <h2 className="font-heading text-xl font-bold">Anúncio não encontrado</h2>
            <p className="text-sm text-muted-foreground">Ele pode ter sido removido ou você não tem acesso.</p>
          </div>
          <Link to="/painel/anuncios">
            <Button variant="outline" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Voltar aos anúncios
            </Button>
          </Link>
        </div>
      </SellerLayout>
    );
  }

  const isAuction = listing.type === 'auction';
  const saving = updateListing.isPending;

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/painel/anuncios">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">Editar Anúncio</h1>
              <p className="text-sm text-muted-foreground">ID: #{listing.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
              {listing.status === 'active' ? 'Ativo' : listing.status}
            </Badge>
            <Link to={`/produto/${listing.id}`}>
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
                <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => updateField('category', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condição</Label>
                <Select value={form.condition} onValueChange={(v) => updateField('condition', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {conditions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Marca</Label>
                <Input value={form.brand} onChange={(e) => updateField('brand', e.target.value)} />
              </div>
              <div>
                <Label>Linha</Label>
                <Input value={form.line} onChange={(e) => updateField('line', e.target.value)} />
              </div>
              <div>
                <Label>Escala</Label>
                <Input value={form.scale} onChange={(e) => updateField('scale', e.target.value)} />
              </div>
              <div>
                <Label>Ano</Label>
                <Input value={form.year} onChange={(e) => updateField('year', e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Edição</Label>
              <Input value={form.edition} onChange={(e) => updateField('edition', e.target.value)} />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={5} />
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Fotos</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {form.photos.map((photo, i) => (
                <div key={`${photo}-${i}`} className="relative aspect-square rounded-lg border border-border bg-secondary overflow-hidden group">
                  <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 0 && (
                    <Badge className="absolute top-1 left-1 text-[9px] bg-primary text-primary-foreground">Capa</Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remover foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {form.photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => !uploadImage.isPending && inputRef.current?.click()}
                  disabled={uploadImage.isPending}
                  className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadImage.isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <ImagePlus className="h-6 w-6" />
                  )}
                  <span className="text-xs mt-1">{uploadImage.isPending ? 'Enviando…' : 'Adicionar'}</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              {form.photos.length}/{MAX_PHOTOS} fotos · A primeira é a capa · JPG, PNG ou WebP · Máx 5MB cada
            </p>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Preço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="outline">{isAuction ? 'Modo Lance' : 'Preço fixo'}</Badge>
            <div className="max-w-xs">
              <Label>{isAuction ? 'Lance inicial (R$)' : 'Preço (R$)'}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
              />
            </div>
            {isAuction && (
              <p className="text-xs text-muted-foreground">
                Os parâmetros do leilão (duração, incremento, reserva) são gerenciados na página de leilões.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Envio */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Dados para envio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Peso e dimensões do pacote embalado. Melhoram a precisão do frete —
              em branco, usamos uma estimativa padrão de colecionável.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Peso (g)</Label>
                <Input type="number" inputMode="numeric" placeholder="300"
                  value={form.weightGrams} onChange={(e) => updateField('weightGrams', e.target.value)} />
              </div>
              <div>
                <Label>Largura (cm)</Label>
                <Input type="number" inputMode="numeric" placeholder="16"
                  value={form.widthCm} onChange={(e) => updateField('widthCm', e.target.value)} />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input type="number" inputMode="numeric" placeholder="6"
                  value={form.heightCm} onChange={(e) => updateField('heightCm', e.target.value)} />
              </div>
              <div>
                <Label>Comprimento (cm)</Label>
                <Input type="number" inputMode="numeric" placeholder="12"
                  value={form.lengthCm} onChange={(e) => updateField('lengthCm', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
