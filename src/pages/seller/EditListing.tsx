import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Loader2, ImagePlus, X, AlertCircle, Package, Star } from 'lucide-react';
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
import { freteFaltando, AVISO_EMBALAGEM } from '@/lib/frete';
import { definirCapa } from '@/lib/fotos-anuncio';
import ProductDescription from '@/components/ProductDescription';
import RejectionNotice from '@/components/RejectionNotice';
import { isOpenRoute } from '@/components/LaunchGate';
import { useListing, useUpdateListing, useUploadImage, useCategories } from '@/hooks/use-api';
import type { CreateListingPayload } from '@/lib/api';
import { toast } from 'sonner';
import CategoryFieldsEditor from '@/components/CategoryFieldsEditor';
import {
  fieldsForCategory, parseAttributes, formatFieldValue, isFieldApplicable,
} from '@/lib/category-fields';

const MAX_PHOTOS = 8;

// Mesmo vocabulário da lista de anúncios do vendedor (seller/Listings).
const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  draft: 'Rascunho',
  pending_review: 'Em análise',
  rejected: 'Reprovado',
  paused: 'Pausado',
  sold: 'Vendido',
  cancelled: 'Cancelado',
};

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
  /**
   * Campos específicos da categoria (jogo, personagem, raridade, título da
   * obra…). Vivem no JSON `attributes` do anúncio; as chaves com coluna própria
   * (brand/line/scale/year/edition) também são espelhadas no topo ao salvar.
   */
  categoryFields: Record<string, unknown>;
  /** Código interno de estoque do vendedor. Opcional. */
  sku: string;
  /** Unidades disponíveis. String porque vem de <input>. */
  stock: string;
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
  categoryFields: {},
  sku: '',
  stock: '1',
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
      // `attributes` guarda os campos da categoria; as colunas próprias entram
      // como reserva para o anúncio antigo, criado antes do JSON existir.
      categoryFields: {
        brand: listing.brand ?? '',
        line: listing.line ?? '',
        scale: listing.scale ?? '',
        year: listing.year ?? '',
        edition: listing.edition ?? '',
        ...parseAttributes(listing.attributes),
      },
      sku: listing.sku ?? '',
      // O backend ainda não devolve `stock`; cai em 1 até passar a devolver.
      stock: listing.stock != null ? String(listing.stock) : '1',
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

  const updateCatField = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      categoryFields: { ...prev.categoryFields, [key]: value },
    }));
  };

  /** Slug da categoria escolhida — é por ele que os campos são resolvidos. */
  const categorySlug =
    (categories ?? []).find((c) => c.id === form.category)?.slug ?? null;

  /**
   * O que ainda falta para o anúncio poder ir ao ar. Mesma régua da peneira do
   * backend, mostrada aqui como aviso: o vendedor que veio corrigir uma
   * reprovação precisa ver o que falta antes de salvar e ser reprovado de novo.
   */
  const faltandoNaCategoria = fieldsForCategory(categorySlug)
    .filter((c) => c.required && isFieldApplicable(c, form.categoryFields))
    .filter((c) => formatFieldValue(form.categoryFields[c.key]) === null)
    .map((c) => c.label);

  const handleFileSelect = (file: File) => {
    if (form.photos.length >= MAX_PHOTOS) return;
    uploadImage.mutate(file, {
      onSuccess: (data) => {
        setForm((prev) => ({ ...prev, photos: [...prev.photos, data.url] }));
      },
      // O erro é tratado aqui, por chamada: o hook não tem mais `onError` no
      // observer, porque lá ele só disparava para o último de vários uploads.
      onError: (err: any) => {
        toast.error(
          `Não foi possível enviar ${file.name}. ${err?.message ?? 'Tente de novo.'}`,
        );
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

    // Mesma regra da criação (lib/frete). Separadas, esta tela deixaria salvar
    // o que o wizard bloqueia, e o vendedor reprovado por "peso ou dimensões
    // faltando" reenviaria sem corrigir.
    const semFrete = freteFaltando(form);
    if (semFrete) {
      toast.error(`${semFrete}.`);
      return;
    }

    // Estoque zero num anúncio no ar é venda que não pode ser cumprida.
    if (listing?.type !== 'auction' && !(Number(form.stock) >= 1)) {
      toast.error('Informe quantas unidades você tem (no mínimo 1).');
      return;
    }

    const isAuction = listing?.type === 'auction';
    // F7: em leilão, `priceInCents` é sempre null e o lance inicial mora na
    // tabela de auction (editável no gerenciador de leilões). Editar preço aqui
    // gravava no campo errado, então só validamos/enviamos preço em venda direta.
    const priceInCents = !isAuction && form.price ? Math.round(Number(form.price) * 100) : undefined;
    if (!isAuction && form.price && (priceInCents === undefined || Number.isNaN(priceInCents) || priceInCents < 0)) {
      toast.error('Informe um preço válido.');
      return;
    }

    const toInt = (v: string) => {
      const n = parseInt(v.replace(/\D/g, ''), 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };

    // Mesma regra do wizard de criação: o mapa completo vai para `attributes`,
    // e as chaves que têm coluna própria são espelhadas no topo do registro.
    // Sem enviar `attributes`, o que o vendedor preenchesse aqui não seria
    // gravado em lugar nenhum.
    const cf = form.categoryFields ?? {};
    const texto = (k: string) => formatFieldValue(cf[k]) ?? undefined;
    const hasAttributes = Object.values(cf).some(
      (v) => formatFieldValue(v) !== null,
    );

    const payload: Partial<CreateListingPayload> = {
      title: form.title.trim(),
      description: form.description || undefined,
      categoryId: form.category || undefined,
      brand: texto('brand') ?? (form.brand || undefined),
      line: texto('line') ?? (form.line || undefined),
      scale: texto('scale') ?? (form.scale || undefined),
      year: texto('year') ?? (form.year || undefined),
      edition: texto('edition') ?? (form.edition || undefined),
      attributes: hasAttributes ? JSON.stringify(cf) : undefined,
      sku: form.sku.trim() || undefined,
      // Leilão é de um item específico e não carrega quantidade.
      stock: listing?.type === 'auction' ? undefined : Math.max(1, Number(form.stock) || 1),
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
            {/* Rótulo legível: antes caía no status cru do banco ("rejected",
                "pending_review") para tudo que não fosse ativo. */}
            <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
              {STATUS_LABEL[listing.status] ?? listing.status}
            </Badge>
            {/* Só depois do lançamento: a página pública está fechada até lá, e
                o link expulsava o vendedor do painel. */}
            {isOpenRoute('/produto/x') && (
              <Link to={`/produto/${listing.id}`}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Eye className="h-4 w-4" /> Ver anúncio
                </Button>
              </Link>
            )}
            <Button onClick={handleSave} disabled={saving} className="glow-primary gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </Button>
          </div>
        </div>

        {/* O motivo fica no topo da edição, que é onde o vendedor está quando
            vai corrigir. Sem isso ele abre a tela sem saber o que mudar. */}
        {listing.status === 'rejected' && (
          <RejectionNotice motivo={listing.rejectionReason} />
        )}

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

            {/* Campos da categoria. Antes eram cinco caixas de texto fixas
                (Marca/Linha/Escala/Ano/Edição) iguais para toda categoria: um
                card pedia escala, e o "Jogo / Universo" que ele precisa não
                existia em lugar nenhum. */}
            <CategoryFieldsEditor
              categorySlug={categorySlug}
              values={form.categoryFields}
              onChange={updateCatField}
            />

            {faltandoNaCategoria.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-xs text-destructive">
                  Falta preencher para o anúncio ir ao ar:{' '}
                  <strong>{faltandoNaCategoria.join(', ')}</strong>.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU / Código interno</Label>
                <Input
                  id="sku"
                  placeholder="Ex: HW-R34-001"
                  value={form.sku}
                  onChange={(e) => updateField('sku', e.target.value)}
                  maxLength={60}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Opcional. Só você vê.</p>
              </div>

              {/* Controle de estoque pós-publicação: é aqui que o lojista repõe
                  depois de vender, ou corrige a contagem. Leilão não tem
                  quantidade, é um item específico. */}
              {listing?.type !== 'auction' && (
                <div>
                  <Label htmlFor="stock">
                    Quantidade em estoque <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="ex: 1"
                    value={form.stock}
                    onChange={(e) => updateField('stock', e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Repõe aqui depois de vender. Zerou, o anúncio sai do ar.
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={7}
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Cada linha começando com <code className="text-primary">-</code> vira um item com check no anúncio.
              </p>
              {/* Mesma prévia da criação: editar sem ver o resultado é como o
                  vendedor descobria a descrição amassada só depois de publicar. */}
              {form.description.trim().length > 0 && (
                <div className="mt-3 rounded-md border border-border bg-secondary/20 p-3">
                  <p className="mb-2 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
                    Como vai aparecer no anúncio
                  </p>
                  <ProductDescription texto={form.description} />
                </div>
              )}
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
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Remover foto ${i + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {/* Escolher a capa sem refazer o upload. A capa é sempre a
                      primeira do array, e antes a única forma de trocar era
                      apagar todas as fotos e subir de novo na ordem certa. */}
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, photos: definirCapa(p.photos, i) }))}
                      className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-background/85 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                      aria-label={`Usar foto ${i + 1} como capa`}
                    >
                      <Star className="h-3 w-3" />
                      Usar como capa
                    </button>
                  )}
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
            {isAuction ? (
              // F7/F8: lance inicial, incremento, reserva e duração vivem na
              // tabela de auction. Editar aqui gravava no campo errado, então
              // remetemos ao gerenciador de leilões em vez de mostrar um campo
              // que carrega vazio e salva errado.
              <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                O lance inicial e os parâmetros do leilão (duração, incremento e reserva)
                são gerenciados na página de{' '}
                <Link to="/painel/leiloes" className="text-primary underline underline-offset-2">
                  leilões
                </Link>
                .
              </div>
            ) : (
              <div className="max-w-xs">
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => updateField('price', e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Envio */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl">
              Dados para envio <span className="text-destructive">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              O frete é calculado com estes números. Errado aqui, sai errado na venda,
              e a diferença sai do seu bolso.
            </p>

            {/* Mesmo aviso do wizard (lib/frete): esta é a tela onde o vendedor
                volta para corrigir depois de reprovação por frete incompleto. */}
            <div className="flex gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">{AVISO_EMBALAGEM.titulo}</strong>,{' '}
                {AVISO_EMBALAGEM.texto}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* "ex:" na frente: número cru em campo vazio parece preenchido. */}
              <div>
                <Label>Peso (g) <span className="text-destructive">*</span></Label>
                <Input type="number" inputMode="numeric" placeholder="ex: 300" min={1}
                  value={form.weightGrams} onChange={(e) => updateField('weightGrams', e.target.value)} />
              </div>
              <div>
                <Label>Largura (cm) <span className="text-destructive">*</span></Label>
                <Input type="number" inputMode="numeric" placeholder="ex: 16" min={1}
                  value={form.widthCm} onChange={(e) => updateField('widthCm', e.target.value)} />
              </div>
              <div>
                <Label>Altura (cm) <span className="text-destructive">*</span></Label>
                <Input type="number" inputMode="numeric" placeholder="ex: 6" min={1}
                  value={form.heightCm} onChange={(e) => updateField('heightCm', e.target.value)} />
              </div>
              <div>
                <Label>Comprimento (cm) <span className="text-destructive">*</span></Label>
                <Input type="number" inputMode="numeric" placeholder="ex: 12" min={1}
                  value={form.lengthCm} onChange={(e) => updateField('lengthCm', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
