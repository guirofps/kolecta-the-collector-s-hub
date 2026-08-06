import { useState, useEffect, useRef } from 'react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, ShoppingCart, Gavel, Upload,
  X, ImagePlus, AlertCircle, Eye, Loader2, Sparkles, Copy, ListPlus, Package, Star,
} from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { mockCategories, formatBRL } from '@/lib/mock-data';
import { trackEvent } from '@/lib/analytics';
import { commissionLabel } from '@/lib/fees';
import { categoryArt } from '@/lib/category-art';
import { parsePriceToCents } from '@/lib/currency';
import { loadDraft, saveDraft, clearDraft } from '@/lib/listing-draft';
import { CONDITIONS } from '@/lib/conditions';
import {
  MARCAS_MINIATURA, ESCALAS_MINIATURA, marcaParaSalvar, escalaParaSalvar,
} from '@/lib/marcas';
import { linhaParaSalvar } from '@/lib/linhas';
import SeletorLinha from '@/components/SeletorLinha';
import {
  TAG_PRE_VENDA,
  dadosPreVenda,
  dataMaximaPreVenda,
  formatarDataPrevista,
  limiteTitulo,
  tituloComPreVenda,
  validarDataPrevista,
} from '@/lib/pre-venda';
import { MIN_PHOTOS, MAX_PHOTOS } from '@/lib/photos';
import { freteFaltando, AVISO_EMBALAGEM } from '@/lib/frete';
import { definirCapa, removerFoto } from '@/lib/fotos-anuncio';
import { fieldsForCategory, formatFieldValue, isFieldApplicable } from '@/lib/category-fields';
import ProductDescription from '@/components/ProductDescription';
import { useCreateListing, useUploadImage, useCategories, useAddresses, useCommissionRate } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import type { CreateListingPayload } from '@/lib/api';

// Opção de categoria usada no wizard (id real + slug estável para keyar campos).
interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

// Categorias reais da API; cai para o mock se a API ainda não respondeu.
// O `slug` é a chave estável usada nos campos dinâmicos por categoria.
function useCategoryOptions(): CategoryOption[] {
  const { data } = useCategories();
  if (data && data.length > 0) {
    return data.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
  }
  return mockCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
  }));
}

type ListingType = 'direct' | 'auction' | null;

interface FormData {
  type: ListingType;
  title: string;
  category: string;
  condition: string;
  categoryFields: Record<string, any>;
  brand: string;
  line: string;
  scale: string;
  year: string;
  edition: string;
  /** Código interno de estoque do vendedor. Opcional. */
  sku: string;
  /** Unidades disponíveis. String porque vem de <input>; validado na hora. */
  stock: string;
  description: string;
  photos: string[];
  price: string;
  startingBid: string;
  minIncrement: string;
  duration: string;
  reservePrice: string;
  antiSniper: boolean;
  /** Peça encomendada que ainda não chegou ao vendedor. */
  preVenda: boolean;
  /** Data prometida de chegada, "AAAA-MM-DD". Obrigatória na pré-venda. */
  preVendaDataPrevista: string;
  // Envio (frete): peso em gramas, dimensões em cm.
  weightGrams: string;
  widthCm: string;
  heightCm: string;
  lengthCm: string;
}

/** 720 -> "30 dias". Prazo do leilão é sempre múltiplo de dias. */
function durationLabel(hours: string): string {
  const days = Math.round(Number(hours) / 24);
  return `${days} ${days === 1 ? 'dia' : 'dias'}`;
}

// Parsing de valor monetário → centavos vive em @/lib/currency (parsePriceToCents),
// fonte única usada aqui e no resto do app (fix do F1).

const initialForm: FormData = {
  type: null,
  title: '',
  category: '',
  condition: '',
  categoryFields: {},
  brand: '',
  line: '',
  scale: '',
  year: '',
  edition: '',
  sku: '',
  // Nasce em 1: peça única é o caso da maioria em colecionável, então quem
  // vende uma peça só não precisa preencher nada.
  stock: '1',
  description: '',
  photos: [],
  price: '',
  startingBid: '',
  minIncrement: '10',
  duration: '336',
  reservePrice: '',
  antiSniper: true,
  preVenda: false,
  preVendaDataPrevista: '',
  weightGrams: '',
  widthCm: '',
  heightCm: '',
  lengthCm: '',
};

// ─── Travas do wizard ────────────────────────────────────────
// Mínimos exigidos para avançar de passo. Anúncio raso não vende e suja o
// catálogo, então o wizard bloqueia em vez de só "recomendar".
const MIN_TITLE = 10;
const MIN_DESCRIPTION = 30;

/** Fotos enviadas ao mesmo tempo. 8 × 5 MB de uma vez estoura no 4G. */
const UPLOAD_CONCURRENCY = 2;

// Rascunho automático e "Duplicar" vivem em @/lib/listing-draft (fonte única,
// compartilhada com a lista de anúncios).

// ─── Título sugerido a partir dos campos da categoria ────────
function suggestTitle(slug: string | undefined, f: Record<string, any>): string {
  const parts: (string | undefined)[] = [];
  switch (slug) {
    case 'miniaturas-diecast':
      parts.push(f?.brand, f?.line, f?.year, f?.scale);
      break;
    case 'cards-colecionaveis':
      parts.push(f?.jogo, f?.numero, f?.raridade);
      break;
    case 'action-figures':
      parts.push(f?.brand, f?.line, f?.personagem, f?.escalaAltura);
      break;
    case 'funko-pop':
      parts.push('Funko Pop', f?.line, f?.numero);
      break;
    case 'mangas-hqs':
      parts.push(f?.tituloObra, f?.volume, f?.editora);
      break;
  }
  return parts.filter(Boolean).join(' ').trim().slice(0, 80);
}

const steps = [
  { id: 1, label: 'Tipo' },
  { id: 2, label: 'Detalhes' },
  { id: 3, label: 'Fotos' },
  { id: 4, label: 'Preço' },
  { id: 5, label: 'Revisão' },
];

// Condições vêm da fonte única (src/lib/conditions.ts).
const conditions = CONDITIONS;

export default function CreateListing() {
  // Recupera o rascunho salvo (se houver) uma única vez, na montagem.
  // Pode ser retomada de um rascunho ou uma cópia vinda do "Duplicar".
  const [draft] = useState(loadDraft);
  const isCopy = draft?.origin === 'duplicate';
  const [step, setStep] = useState(draft?.step ?? 1);
  const [form, setForm] = useState<FormData>(
    draft ? { ...initialForm, ...(draft.form as Partial<FormData>) } : initialForm,
  );
  const [showDraftNotice, setShowDraftNotice] = useState(!!draft);
  // Quantos uploads estão em voo (o wizard aceita vários arquivos de uma vez).
  const [uploadingCount, setUploadingCount] = useState(0);

  // Salva o rascunho a cada mudança (só depois que há conteúdo de verdade).
  useEffect(() => {
    const hasContent = form.type !== null || form.title.trim() !== '' || form.photos.length > 0;
    if (!hasContent) return;
    // FormData é uma interface, que não ganha index signature implícita; o cast
    // satisfaz o Record<string, unknown> do rascunho (a forma já é compatível).
    saveDraft({ form: form as unknown as Record<string, unknown>, step, origin: draft?.origin, sourceTitle: draft?.sourceTitle });
  }, [form, step, draft]);

  const discardDraft = () => {
    clearDraft();
    setForm(initialForm);
    setStep(1);
    setShowDraftNotice(false);
  };
  const navigate = useNavigate();
  const createListing = useCreateListing();
  const uploadImage = useUploadImage();
  const { toast } = useToast();
  const categories = useCategoryOptions();
  const slugOf = (id: string) => categories.find((c) => c.id === id)?.slug;

  // Endereço de origem do frete: o vendedor precisa ter um endereço cadastrado
  // na plataforma (o mesmo de "Minha Conta → Endereços"), usado como origem.
  const { query: addressQuery } = useAddresses();
  // A taxa DESTE vendedor, vinda do backend. Fundador ativo paga menos, e a
  // previsão de repasse aqui precisa bater com o que ele vai receber.
  const taxaComissao = useCommissionRate();
  const hasAddress = (addressQuery.data ?? []).length > 0;
  const addressBlocking = !addressQuery.isLoading && !hasAddress;

  useEffect(() => {
    trackEvent('start_sell_flow');
  }, []);

  const update = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };


  // Campos obrigatórios por categoria (além dos comuns). A lista vive em
  // @/lib/category-fields, mesma fonte que a moderação usa para saber o que
  // cobrar. Antes eram duas listas soltas e elas divergiram: o painel do admin
  // cobrava escala de carta colecionável, que o wizard nem pergunta.
  const missingCategoryField = (): string | null => {
    const valores = form.categoryFields ?? {};
    const faltando = fieldsForCategory(slugOf(form.category))
      .filter((campo) => campo.required && isFieldApplicable(campo, valores))
      .filter((campo) => formatFieldValue(valores[campo.key]) === null);
    if (faltando.length === 0) return null;
    const nomes = faltando.map((c) => c.label.toLowerCase());
    return `Preencha ${nomes.length > 1 ? nomes.slice(0, -1).join(', ') + ' e ' + nomes.at(-1) : nomes[0]}`;
  };

  // O que falta no passo atual. `null` = pode avançar.
  // Devolve texto para o vendedor saber por que o botão está travado.
  const missingForStep = (): string | null => {
    switch (step) {
      case 1:
        return form.type === null ? 'Escolha o tipo de anúncio' : null;
      case 2: {
        if (form.title.trim().length < MIN_TITLE) return `O título precisa de pelo menos ${MIN_TITLE} caracteres`;
        if (!form.category) return 'Escolha a categoria';
        if (!form.condition) return 'Escolha a condição do item';
        if (form.description.trim().length < MIN_DESCRIPTION) return `A descrição precisa de pelo menos ${MIN_DESCRIPTION} caracteres`;
        // Quantidade só existe em venda direta. Zero e vazio não passam: um
        // anúncio no ar com estoque zero é uma venda que não pode ser cumprida.
        if (form.type === 'direct' && !(Number(form.stock) >= 1)) {
          return 'Informe quantas unidades você tem (no mínimo 1)';
        }
        return missingCategoryField();
      }
      case 3:
        return form.photos.length < MIN_PHOTOS
          ? `Envie pelo menos ${MIN_PHOTOS} fotos (${form.photos.length} de ${MIN_PHOTOS})`
          : null;
      case 4: {
        // F4: valida via parser (bloqueia vazio, zero e negativo).
        const cents = form.type === 'direct'
          ? parsePriceToCents(form.price)
          : parsePriceToCents(form.startingBid);
        const label = form.type === 'direct' ? 'um preço de venda' : 'um lance inicial';
        if (!cents || cents <= 0) return `Defina ${label} maior que zero`;
        // Pré-venda sem data prometida não pode ir ao ar: é a data que dá ao
        // comprador prazo a cobrar, e sem ela qualquer atraso vira problema da
        // plataforma em vez de descumprimento do combinado.
        if (form.type === 'direct' && form.preVenda) {
          const erro = validarDataPrevista(form.preVendaDataPrevista);
          if (erro) return erro.mensagem;
        }
        // F5: reserva abaixo do lance inicial não faz sentido (nunca vende).
        if (form.type === 'auction' && form.reservePrice) {
          const reserve = parsePriceToCents(form.reservePrice);
          if (reserve && reserve > 0 && reserve < cents) {
            return 'O preço mínimo para vender não pode ser menor que o lance inicial';
          }
        }
        // Frete deixou de ser opcional: sem peso e medidas o cálculo sai errado
        // e a diferença vira prejuízo de alguém (ver lib/frete).
        return freteFaltando(form);
      }
      default:
        return null;
    }
  };

  const canNext = () => missingForStep() === null;

  const handleSubmit = () => {
    // Sem endereço de origem o backend rejeita (BadRequest); trava aqui para dar
    // um caminho claro ao vendedor em vez de um erro.
    if (!hasAddress) return;
    trackEvent('submit_listing', { type: form.type });

    const toCents = (v: string) => parsePriceToCents(v);
    const toInt = (v: string) => {
      const n = parseInt(v.replace(/\D/g, ''), 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const isAuction = form.type === 'auction';

    // F2: a UI dos detalhes por categoria grava em `categoryFields.*`. As chaves
    // com coluna própria (brand/line/scale/year/edition) vão para o topo; o mapa
    // completo (jogo, raridade, personagem, número, grading…) vai em `attributes`
    // (coluna JSON no backend).
    // Pré-venda só existe em venda direta: no leilão a data de entrega depende
    // de quando o item arremata, então prometer chegada antes disso é chute.
    const ehPreVenda = !isAuction && form.preVenda && !!form.preVendaDataPrevista;

    const cf: Record<string, any> = {
      ...(form.categoryFields ?? {}),
      ...(ehPreVenda ? dadosPreVenda(form.preVendaDataPrevista) : {}),
    };
    const hasAttributes = Object.keys(cf).length > 0;

    const payload: CreateListingPayload = {
      // A tag entra aqui, na publicação, e não no campo que o vendedor digita:
      // assim ligar e desligar a pré-venda no wizard nunca deixa "[PRÉ-VENDA]"
      // grudado no texto nem duplica a tag de quem já escreveu à mão.
      title: tituloComPreVenda(form.title, ehPreVenda),
      description: form.description || undefined,
      categoryId: form.category || undefined,
      // Normaliza na saída: ver marcaParaSalvar. O seletor sozinho não segurou
      // ("Hotwheels " entrou por outro caminho depois que ele subiu).
      brand: marcaParaSalvar(cf.brand || form.brand, form.title),
      line: linhaParaSalvar(cf.line || form.line, cf.brand || form.brand),
      scale: escalaParaSalvar(cf.scale || form.scale),
      year: cf.year || form.year || undefined,
      edition: cf.edition || form.edition || undefined,
      sku: form.sku.trim() || undefined,
      // Leilão é de um item específico, então não carrega quantidade.
      stock: isAuction ? undefined : Math.max(1, Number(form.stock) || 1),
      condition: form.condition,
      type: form.type as 'direct' | 'auction',
      priceInCents: !isAuction && form.price ? toCents(form.price) : undefined,
      // Config de leilão: o backend cria a linha de auction (parada) junto do anúncio.
      startingBidInCents: isAuction && form.startingBid ? toCents(form.startingBid) : undefined,
      // F3: incremento mínimo era coletado mas nunca enviado.
      minIncrementInCents: isAuction && form.minIncrement ? toCents(form.minIncrement) : undefined,
      durationHours: isAuction ? Number(form.duration) || 336 : undefined,
      reservePriceInCents: isAuction && form.reservePrice ? toCents(form.reservePrice) : undefined,
      // Anti-sniper do wizard (só faz sentido em leilão).
      antiSniper: isAuction ? form.antiSniper : undefined,
      // Atributos por categoria em JSON.
      attributes: hasAttributes ? JSON.stringify(cf) : undefined,
      images: form.photos.length > 0 ? JSON.stringify(form.photos) : undefined,
      // Envio (frete): opcionais — sem eles o backend usa um pacote default.
      weightGrams: toInt(form.weightGrams),
      widthCm: toInt(form.widthCm),
      heightCm: toInt(form.heightCm),
      lengthCm: toInt(form.lengthCm),
    };

    createListing.mutate(payload, {
      onSuccess: () => {
        // Anúncio enviado: o rascunho local já cumpriu o papel.
        clearDraft();
        navigate('/painel/anuncios');
      },
    });
  };

  // Append seguro: uploads em paralelo terminam fora de ordem, então cada um
  // precisa somar em cima do estado mais recente (e não do capturado no closure).
  const appendPhoto = (url: string) => {
    setForm((prev) =>
      prev.photos.length >= MAX_PHOTOS ? prev : { ...prev, photos: [...prev.photos, url] },
    );
  };

  /**
   * Envia as fotos escolhidas, no máximo UPLOAD_CONCURRENCY por vez.
   *
   * Antes disparava todas de uma vez com `.mutate()` num laço. Dois problemas:
   *
   * 1. `useUploadImage` é UM observer de mutation — ele só acompanha a última
   *    chamada, então o `onError` de dentro do hook só disparava para o último
   *    arquivo. As falhas dos anteriores sumiam sem aviso: o vendedor via o
   *    contador zerar e ficava com menos fotos do que escolheu, sem entender.
   *    Aqui usamos `mutateAsync`, cuja promessa resolve por chamada, e
   *    reportamos cada falha pelo nome do arquivo.
   *
   * 2. 8 fotos de 5 MB simultâneas no 4G derrubam o envio por timeout. A fila
   *    limitada mantém a barra de progresso andando em vez de falhar em bloco.
   */
  const handleFilesSelect = async (files: File[]) => {
    // Desconta também o que já está em voo: com uploads paralelos, olhar só
    // `form.photos` deixaria passar mais que o limite.
    const free = MAX_PHOTOS - form.photos.length - uploadingCount;
    if (free <= 0) return;

    const batch = files.slice(0, free);
    setUploadingCount((n) => n + batch.length);

    const falhas: string[] = [];
    const fila = [...batch];

    const worker = async () => {
      for (let file = fila.shift(); file; file = fila.shift()) {
        try {
          const data = await uploadImage.mutateAsync(file);
          appendPhoto(data.url);
        } catch {
          falhas.push(file.name);
        } finally {
          setUploadingCount((n) => Math.max(0, n - 1));
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, batch.length) }, worker),
    );

    if (falhas.length > 0) {
      toast({
        title:
          falhas.length === 1
            ? 'Uma foto não subiu'
            : `${falhas.length} fotos não subiram`,
        description: `${falhas.join(', ')}. Tente enviar de novo.`,
        variant: 'destructive',
      });
    }
  };

  const removePhoto = (index: number) => {
    update('photos', removerFoto(form.photos, index));
  };

  /** A capa é a primeira do array; escolher uma traz ela para a frente. */
  const setCapa = (index: number) => {
    update('photos', definirCapa(form.photos, index));
  };

  return (
    <SellerLayout>
      <div className="p-6 lg:p-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link to="/painel/anuncios"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="font-heading text-xl font-extrabold italic uppercase">Criar Anúncio</h1>
            <p className="text-xs text-muted-foreground">Passo {step} de {steps.length}</p>
          </div>
        </div>

        {/* Aviso de rascunho recuperado ou de cópia ("Duplicar") */}
        {showDraftNotice && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-start gap-2">
              {isCopy
                ? <Copy className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                : <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />}
              <span className="text-xs text-foreground">
                {isCopy ? (
                  <>
                    Cópia de <strong>{draft?.sourceTitle || 'um anúncio seu'}</strong>. Ajuste o
                    título e envie as fotos deste item.
                  </>
                ) : (
                  <>Recuperamos seu rascunho. Continue de onde parou.</>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={discardDraft}>
                Começar do zero
              </Button>
              <Button variant="outline-gold" size="sm" className="h-7 text-xs" onClick={() => setShowDraftNotice(false)}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                  step > s.id
                    ? 'bg-primary text-primary-foreground'
                    : step === s.id
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
              </div>
              <span className={`hidden sm:block text-[11px] font-heading uppercase tracking-wider ${
                step >= s.id ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${step > s.id ? 'bg-primary/40' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {step === 1 && <StepType form={form} update={update} />}
            {step === 2 && <StepDetails form={form} update={update} categories={categories} />}
            {step === 3 && <StepPhotos form={form} onFilesSelect={handleFilesSelect} removePhoto={removePhoto} setCapa={setCapa} uploadingCount={uploadingCount} />}
            {step === 4 && <StepPricing form={form} update={update} taxaComissao={taxaComissao} />}
            {step === 5 && <StepReview form={form} categories={categories} />}
          </motion.div>
        </AnimatePresence>

        {/* Gate de endereço de origem (frete) — só no passo de revisão */}
        {step === 5 && addressBlocking && (
          <div className="mt-6 p-4 rounded-md bg-destructive/5 border border-destructive/30 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                Cadastre um endereço antes de anunciar
              </p>
              <p className="text-muted-foreground mt-0.5">
                Ele será usado como <strong>origem do frete</strong> nas suas vendas.
                É o mesmo endereço da sua conta.
              </p>
              <Button variant="kolecta" size="sm" className="mt-3" asChild>
                <Link to="/conta/enderecos">Cadastrar endereço</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {/* O que falta aparece ACIMA dos botões no celular. Antes era
            `hidden sm:flex`: no telefone, o botão "Próximo" ficava cinza e o
            vendedor não tinha como saber o motivo. É a tela onde a maioria
            anuncia, então era justamente onde a explicação faltava. */}
        {step < 5 && missingForStep() && (
          <div className="mt-8 flex items-start gap-1.5 rounded-md border border-accent/30 bg-accent/5 p-2.5 text-xs text-muted-foreground sm:hidden">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            {missingForStep()}
          </div>
        )}
        <div className={`flex items-center justify-between pt-6 border-t border-border ${
          step < 5 && missingForStep() ? 'mt-3 sm:mt-8' : 'mt-8'
        }`}>
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>

          {step < 5 ? (
            <div className="flex items-center gap-3">
              {/* Mesma mensagem, ao lado do botão quando há largura para isso. */}
              {missingForStep() && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 text-accent shrink-0" />
                  {missingForStep()}
                </span>
              )}
              <Button
                variant="kolecta"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext()}
              >
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="kolecta"
              onClick={handleSubmit}
              // F6: enquanto o endereço não carregou, o submit não tem como
              // funcionar (o backend rejeita sem origem). Trava o botão e mostra
              // o estado em vez de "clicar e nada acontecer".
              disabled={createListing.isPending || addressBlocking || addressQuery.isLoading}
            >
              {createListing.isPending || addressQuery.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {addressQuery.isLoading ? 'Verificando endereço…' : 'Enviar para Aprovação'}
            </Button>
          )}
        </div>
      </div>
    </SellerLayout>
  );
}

// ─── Step 1: Type ──────────────────────────────────────────

function StepType({ form, update }: { form: FormData; update: (f: keyof FormData, v: any) => void }) {
  return (
    <div>
      <h2 className="font-heading text-lg font-bold uppercase mb-1">Tipo de Anúncio</h2>
      <p className="text-sm text-muted-foreground mb-6">Escolha como deseja vender seu item.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            value: 'direct' as const,
            icon: ShoppingCart,
            title: 'Venda Direta',
            desc: 'Preço fixo. O comprador paga e recebe.',
            features: ['Preço definido por você', 'Venda imediata', 'Ideal para itens com preço de mercado'],
          },
          {
            value: 'auction' as const,
            icon: Gavel,
            title: 'Modo Lance',
            desc: 'Lances competitivos. Maior lance vence.',
            features: ['Preço inicial mínimo', 'Duração configurável', 'Ideal para itens raros e disputados'],
          },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => update('type', option.value)}
            className={`text-left p-5 rounded-lg border transition-all ${
              form.type === option.value
                ? 'border-primary bg-primary/5 glow-primary'
                : 'border-border bg-card hover:border-primary/30'
            }`}
          >
            <option.icon className={`h-8 w-8 mb-3 ${form.type === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
            <h3 className="font-heading text-base font-bold uppercase mb-1">{option.title}</h3>
            <p className="text-xs text-muted-foreground mb-3">{option.desc}</p>
            <ul className="space-y-1">
              {option.features.map((f) => (
                <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Details ───────────────────────────────────────

function StepDetails({ form, update, categories }: { form: FormData; update: (f: keyof FormData, v: any) => void; categories: CategoryOption[] }) {
  const [subStep, setSubStep] = useState<'category' | 'details'>(form.category ? 'details' : 'category');
  const [tempCategory, setTempCategory] = useState(form.category);

  // ─── Ajuda para escrever a descrição ────────────────────────
  // Vivem AQUI, não no componente pai: o textarea e o botão que os usam estão
  // neste componente. Definidos lá fora, o React estourava ao renderizar este
  // sub-passo e a tela ficava branca ao confirmar a categoria.
  const descricaoRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Começa uma nova linha de item na descrição e deixa o cursor pronto.
   * Ensina o formato pela prática: depois do primeiro clique, a pessoa entende
   * que cada linha com "-" vira um item, e passa a digitar direto.
   */
  const adicionarItemDescricao = () => {
    const atual = form.description;
    // Sem linha vazia sobrando: só quebra se já houver texto.
    const precisaQuebra = atual.length > 0 && !atual.endsWith('\n');
    const novo = `${atual}${precisaQuebra ? '\n' : ''}- `;
    update('description', novo);
    // O foco e o cursor no fim precisam esperar o React repintar o textarea.
    requestAnimationFrame(() => {
      const el = descricaoRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(novo.length, novo.length);
      el.scrollTop = el.scrollHeight;
    });
  };

  const handleConfirmCategory = () => {
    if (tempCategory !== form.category) {
      update('category', tempCategory);
      update('categoryFields', {});
    }
    setSubStep('details');
  };

  const updateCatField = (field: string, value: any) => {
    update('categoryFields', { ...form.categoryFields, [field]: value });
  };

  if (subStep === 'category') {
    return (
      <div className="space-y-6 relative">
        <style>{`
          .mt-8.pt-6 > button:last-child {
            display: none !important;
          }
        `}</style>
        
        <div>
          <h2 className="font-heading text-lg font-bold uppercase mb-1">O que você está vendendo?</h2>
          <p className="text-sm text-muted-foreground">Escolha a categoria do seu item</p>
        </div>

        {/* Botões com a arte da categoria (mesma da landing, via category-art). */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c) => {
            const isSelected = tempCategory === c.id;
            const art = categoryArt(c.slug);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setTempCategory(c.id)}
                aria-pressed={isSelected}
                // aspect-square casa com a arte (1:1): em 4:3 o object-cover
                // cortava a altura e dava efeito de zoom exagerado.
                className={`group relative aspect-square overflow-hidden rounded-xl border transition-all
                  ${isSelected
                    ? 'border-[#FFD700] ring-2 ring-[#FFD700]/40'
                    : 'border-border hover:border-primary/40'}
                `}
              >
                {art ? (
                  <>
                    <img
                      src={art}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25" />
                  </>
                ) : (
                  // Categoria sem arte própria: cai no ícone antigo.
                  <div className="absolute inset-0 flex items-center justify-center bg-card">
                    <CategoryIcon slug={c.slug} size={40} />
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 rounded-full bg-[#FFD700] p-1 text-black">
                    <Check className="h-3 w-3" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h3
                    className={`font-heading text-sm font-bold uppercase tracking-wide text-center leading-tight
                      ${art ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]' : 'text-foreground'}
                    `}
                  >
                    {c.name}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-4">
          <Button 
            type="button"
            variant="kolecta" 
            className="w-full sm:w-auto"
            disabled={!tempCategory}
            onClick={handleConfirmCategory}
          >
            Confirmar categoria
          </Button>
        </div>
      </div>
    );
  }

  const categoryObj = categories.find((c) => c.id === form.category);
  const catSlug = categoryObj?.slug;

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => setSubStep('category')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Alterar categoria
        </button>

        {categoryObj && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFD700] text-black mb-6">
            <CategoryIcon slug={categoryObj.slug} size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">{categoryObj.name}</span>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <Label htmlFor="title">Título do Anúncio *</Label>
          <Input
            id="title"
            placeholder="Ex: Mini GT Honda NSX Type R Prata 1:64"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            // Encolhe quando a pré-venda está ligada: a tag é somada só na
            // publicação, então sem descontar aqui o título sai do limite.
            maxLength={limiteTitulo(80, form.preVenda)}
            className="mt-1.5"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-accent">
              {form.title.trim().length > 0 && form.title.trim().length < MIN_TITLE
                ? `Mínimo ${MIN_TITLE} caracteres`
                : ''}
            </span>
            <span className="text-[10px] text-muted-foreground">{form.title.length}/80</span>
          </div>

          {/* Sugestão montada a partir dos campos da categoria preenchidos
              abaixo. Só aparece enquanto o título ainda não está resolvido. */}
          {(() => {
            const suggestion = suggestTitle(catSlug, form.categoryFields);
            const titleUnresolved = form.title.trim().length < MIN_TITLE;
            if (!titleUnresolved || suggestion.length < MIN_TITLE || suggestion === form.title) {
              return null;
            }
            return (
              <button
                type="button"
                onClick={() => update('title', suggestion)}
                className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-left transition-colors hover:bg-primary/10"
              >
                <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                <span className="truncate text-[11px] text-foreground">
                  Usar sugestão: <strong>{suggestion}</strong>
                </span>
              </button>
            );
          })()}
        </div>

        {/* SKU: pedido dos lojistas, para casar a venda aqui com o controle de
            estoque que eles já usam. Opcional, porque colecionador pessoa
            física não trabalha com código interno. */}
        <div>
          <Label htmlFor="sku">SKU / Código interno</Label>
          <Input
            id="sku"
            placeholder="Ex: HW-R34-001"
            value={form.sku}
            onChange={(e) => update('sku', e.target.value)}
            maxLength={60}
            className="mt-1.5"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Opcional. Seu código de estoque, para achar a peça no seu controle. Só você vê.
          </p>
        </div>

        {/* Quantidade: pedido dos lojistas que têm várias unidades da mesma
            peça. Nasce em 1, que é o caso da maioria em colecionável, então
            quem vende peça única não precisa fazer nada. Em leilão não aparece:
            leilão é de um item específico, e dois lances no mesmo lote não têm
            como ser atendidos. */}
        {form.type === 'direct' && (
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
              onChange={(e) => update('stock', e.target.value)}
              className="mt-1.5 max-w-[160px]"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Quantas unidades iguais você tem. Peça única é 1. O anúncio sai do
              ar sozinho quando o estoque zerar.
            </p>
          </div>
        )}

        <div>
          <Label className="mb-3 block">Condição *</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {conditions.map((c) => {
              const isSelected = form.condition === c.value;
              return (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => update('condition', c.value)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 glow-primary'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <h4 className={`font-heading text-sm font-bold uppercase mb-1 ${isSelected ? 'text-primary' : ''}`}>
                    {c.label}
                  </h4>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Descrição *</Label>
          {/* Placeholder com a estrutura pronta: a maioria copia o formato do
              exemplo. Antes era "Descreva detalhes, histórico, defeitos..." e o
              resultado saía num bloco corrido, com os diferenciais espremidos
              no meio da frase. */}
          <Textarea
            ref={descricaoRef}
            id="description"
            placeholder={
              'Conte o que a peça é e em que estado está.\n\n'
              + 'Para destacar os diferenciais, use um por linha:\n'
              + '- Lacrado, nunca aberto\n'
              + '- Caixa sem amassados\n'
              + '- Acompanha certificado'
            }
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            maxLength={4000}
            rows={7}
            className="mt-1.5"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={adicionarItemDescricao}>
              <ListPlus className="h-3.5 w-3.5" />
              Adicionar item à lista
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Cada linha começando com <code className="text-primary">-</code> vira um item com check no anúncio.
            </span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-accent">
              {form.description.trim().length < MIN_DESCRIPTION
                ? `Faltam ${MIN_DESCRIPTION - form.description.trim().length} caracteres (mínimo ${MIN_DESCRIPTION})`
                : ''}
            </span>
            <span className="text-[10px] text-muted-foreground">{form.description.length}/4000</span>
          </div>

          {/* Prévia com o MESMO formatador da página do anúncio: o vendedor vê
              o resultado real antes de publicar, em vez de descobrir depois. */}
          {form.description.trim().length > 0 && (
            <div className="mt-3 rounded-md border border-border bg-secondary/20 p-3">
              <p className="mb-2 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
                Como vai aparecer no anúncio
              </p>
              <ProductDescription texto={form.description} />
            </div>
          )}
        </div>

        {form.category && (
          <div className="pt-6 mt-6 border-t border-border">
            <h3 className="font-heading text-base font-bold uppercase mb-4">Detalhes de {categoryObj?.name}</h3>
            
            {catSlug === 'miniaturas-diecast' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {/* Lista fechada, não campo livre. Como texto livre, a mesma
                      marca entrou de seis jeitos ("Hotweels", "HOT WELLS",
                      "HotWheels"): 343 dos 821 anúncios ficaram fora do padrão,
                      quebrando filtro, busca e comparação de preço. */}
                  <Label htmlFor="c1-brand">Fabricante da miniatura *</Label>
                  <Select value={form.categoryFields?.brand || ''} onValueChange={(v) => updateCatField('brand', v)}>
                    <SelectTrigger id="c1-brand" className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {MARCAS_MINIATURA.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Quem fabrica a miniatura (Hot Wheels, Mini GT…), não a montadora do carro.
                  </p>
                </div>
                <div>
                  <Label htmlFor="c1-line">Linha / Série</Label>
                  {/* Lista depende do fabricante escolhido acima, com "Outra"
                      liberando campo livre: colaboração e exclusivo de evento
                      aparecem o tempo todo e não cabem em lista fechada. */}
                  <SeletorLinha
                    id="c1-line"
                    marca={form.categoryFields?.brand || form.brand}
                    value={form.categoryFields?.line || ''}
                    onChange={(v) => updateCatField('line', v)}
                  />
                </div>
                <div>
                  <Label>Escala *</Label>
                  <Select value={form.categoryFields?.scale || ''} onValueChange={(v) => updateCatField('scale', v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {ESCALAS_MINIATURA.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="c1-year">Ano de lançamento</Label>
                  <Input id="c1-year" placeholder="Ex: 2023" value={form.categoryFields?.year || ''} onChange={(e) => updateCatField('year', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="c1-edition">Edição / Número</Label>
                  <Input id="c1-edition" placeholder="Ex: #012, Chase Edition" value={form.categoryFields?.edition || ''} onChange={(e) => updateCatField('edition', e.target.value)} className="mt-1.5" />
                </div>
              </div>
            )}

            {catSlug === 'cards-colecionaveis' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Jogo / Universo *</Label>
                  <Select value={form.categoryFields?.jogo || ''} onValueChange={(v) => updateCatField('jogo', v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {['Pokémon', 'Magic: The Gathering', 'Dragon Ball', 'One Piece', 'Digimon', 'Sport Cards', 'Outro'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="c2-numero">Número da carta</Label>
                  <Input id="c2-numero" placeholder="Ex: 025/165" value={form.categoryFields?.numero || ''} onChange={(e) => updateCatField('numero', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Raridade</Label>
                  <Select value={form.categoryFields?.raridade || ''} onValueChange={(v) => updateCatField('raridade', v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {['Comum', 'Incomum', 'Rara', 'Rara Holográfica', 'Ultra Rara', 'Secreta', 'Promo', 'Outra'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Idioma</Label>
                  <Select value={form.categoryFields?.idioma || ''} onValueChange={(v) => updateCatField('idioma', v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {['Português', 'Inglês', 'Japonês', 'Outro'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gradada</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="gradada" checked={form.categoryFields?.gradada === 'Sim'} onChange={() => updateCatField('gradada', 'Sim')} className="accent-primary" />
                      <span className="text-sm">Sim</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="gradada" checked={form.categoryFields?.gradada === 'Não'} onChange={() => updateCatField('gradada', 'Não')} className="accent-primary" />
                      <span className="text-sm">Não</span>
                    </label>
                  </div>
                </div>
                {form.categoryFields?.gradada === 'Sim' && (
                  <>
                    <div>
                      <Label htmlFor="c2-empresa">Empresa de grading</Label>
                      <Input id="c2-empresa" placeholder="Ex: PSA, BGS" value={form.categoryFields?.empresaGrading || ''} onChange={(e) => updateCatField('empresaGrading', e.target.value)} className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="c2-nota">Nota</Label>
                      <Input id="c2-nota" placeholder="Ex: 9.5" value={form.categoryFields?.nota || ''} onChange={(e) => updateCatField('nota', e.target.value)} className="mt-1.5" />
                    </div>
                  </>
                )}
              </div>
            )}

            {catSlug === 'action-figures' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="c3-brand">Marca / Fabricante *</Label>
                  <Input id="c3-brand" placeholder="Ex: Bandai, Kotobukiya, Hot Toys, NECA" value={form.categoryFields?.brand || ''} onChange={(e) => updateCatField('brand', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="c3-line">Linha / Série *</Label>
                  <Input id="c3-line" placeholder="Ex: S.H.Figuarts, Master Stars" value={form.categoryFields?.line || ''} onChange={(e) => updateCatField('line', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="c3-personagem">Personagem / Nome *</Label>
                  <Input id="c3-personagem" placeholder="Ex: Goku, Batman, Darth Vader" value={form.categoryFields?.personagem || ''} onChange={(e) => updateCatField('personagem', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="c3-escala">Escala / Altura</Label>
                  <Input id="c3-escala" placeholder="Ex: 1/6, 30cm" value={form.categoryFields?.escalaAltura || ''} onChange={(e) => updateCatField('escalaAltura', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Articulado</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="articulado" checked={form.categoryFields?.articulado === 'Sim'} onChange={() => updateCatField('articulado', 'Sim')} className="accent-primary" />
                      <span className="text-sm">Sim</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="articulado" checked={form.categoryFields?.articulado === 'Não'} onChange={() => updateCatField('articulado', 'Não')} className="accent-primary" />
                      <span className="text-sm">Não</span>
                    </label>
                  </div>
                </div>
                <div>
                  <Label>Caixa original inclusa</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="caixaInclusa" checked={form.categoryFields?.caixaInclusa === 'Sim'} onChange={() => updateCatField('caixaInclusa', 'Sim')} className="accent-primary" />
                      <span className="text-sm">Sim</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="caixaInclusa" checked={form.categoryFields?.caixaInclusa === 'Não'} onChange={() => updateCatField('caixaInclusa', 'Não')} className="accent-primary" />
                      <span className="text-sm">Não</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {catSlug === 'funko-pop' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="c4-numero">Número do Pop *</Label>
                  <Input id="c4-numero" placeholder="Ex: #1234" value={form.categoryFields?.numero || ''} onChange={(e) => updateCatField('numero', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="c4-line">Linha / Série *</Label>
                  <Input id="c4-line" placeholder="Ex: Marvel, DC, Anime" value={form.categoryFields?.line || ''} onChange={(e) => updateCatField('line', e.target.value)} className="mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Edição especial</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    {['Glow in the Dark', 'Flocked', 'Metallic', 'Chase', 'Exclusivo SDCC', 'Exclusivo Target', 'Exclusivo GameStop', 'Nenhuma'].map((opt) => {
                      const selected = form.categoryFields?.edicaoEspecial || [];
                      const isChecked = selected.includes(opt);
                      return (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (opt === 'Nenhuma') {
                                  updateCatField('edicaoEspecial', ['Nenhuma']);
                                } else {
                                  updateCatField('edicaoEspecial', [...selected.filter((x: string) => x !== 'Nenhuma'), opt]);
                                }
                              } else {
                                updateCatField('edicaoEspecial', selected.filter((x: string) => x !== opt));
                              }
                            }} 
                            className="accent-primary w-4 h-4 rounded border-border" 
                          />
                          <span className="text-xs">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label>Caixa original inclusa</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="c4-caixaInclusa" checked={form.categoryFields?.caixaInclusa === 'Sim'} onChange={() => updateCatField('caixaInclusa', 'Sim')} className="accent-primary" />
                      <span className="text-sm">Sim</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="c4-caixaInclusa" checked={form.categoryFields?.caixaInclusa === 'Não'} onChange={() => updateCatField('caixaInclusa', 'Não')} className="accent-primary" />
                      <span className="text-sm">Não</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {catSlug === 'mangas-hqs' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="c5-titulo">Título da obra *</Label>
                  <Input id="c5-titulo" placeholder="Ex: Berserk, Akira, Sandman" value={form.categoryFields?.tituloObra || ''} onChange={(e) => updateCatField('tituloObra', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="c5-editora">Editora</Label>
                  <Input id="c5-editora" placeholder="Ex: JBC, Panini, Devir" value={form.categoryFields?.editora || ''} onChange={(e) => updateCatField('editora', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="c5-volume">Volume / Número</Label>
                  <Input id="c5-volume" placeholder="Ex: Vol. 1, #42" value={form.categoryFields?.volume || ''} onChange={(e) => updateCatField('volume', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Idioma</Label>
                  <Select value={form.categoryFields?.idioma || ''} onValueChange={(v) => updateCatField('idioma', v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {['Português', 'Inglês', 'Japonês', 'Outro'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Estado de conservação da lombada</Label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {['Perfeita', 'Leve amarelamento', 'Com amassados', 'Danificada'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="lombada" checked={form.categoryFields?.estadoLombada === opt} onChange={() => updateCatField('estadoLombada', opt)} className="accent-primary" />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Caixa / Slipcase incluso</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="slipcase" checked={form.categoryFields?.slipcase === 'Sim'} onChange={() => updateCatField('slipcase', 'Sim')} className="accent-primary" />
                      <span className="text-sm">Sim</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="slipcase" checked={form.categoryFields?.slipcase === 'Não'} onChange={() => updateCatField('slipcase', 'Não')} className="accent-primary" />
                      <span className="text-sm">Não</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Acessórios monta os campos a partir de CATEGORY_FIELDS em vez de
                repetir o JSX à mão como as categorias antigas. Categoria nova
                passa a precisar só da entrada na lista. */}
            {catSlug === 'acessorios' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fieldsForCategory('acessorios').map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={`c6-${f.key}`}>
                      {f.label}
                      {f.required ? ' *' : ''}
                    </Label>
                    {f.options ? (
                      <Select
                        value={form.categoryFields?.[f.key] || ''}
                        onValueChange={(v) => updateCatField(f.key, v)}
                      >
                        <SelectTrigger id={`c6-${f.key}`} className="mt-1.5">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`c6-${f.key}`}
                        value={form.categoryFields?.[f.key] || ''}
                        onChange={(e) => updateCatField(f.key, e.target.value)}
                        className="mt-1.5"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Photos ────────────────────────────────────────

function StepPhotos({
  form,
  onFilesSelect,
  removePhoto,
  setCapa,
  uploadingCount,
}: {
  form: FormData;
  onFilesSelect: (files: File[]) => void;
  removePhoto: (i: number) => void;
  setCapa: (i: number) => void;
  uploadingCount: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadingCount > 0;
  // Conta o que já subiu MAIS o que está subindo: sem isso o vendedor podia
  // escolher 8 fotos com 5 em voo e estourar o limite.
  const totalPrevisto = form.photos.length + uploadingCount;
  const cheio = totalPrevisto >= MAX_PHOTOS;

  const handleClick = () => {
    // Antes o clique era ignorado enquanto QUALQUER foto estivesse subindo.
    // No celular, com foto grande, o vendedor clicava para adicionar a segunda
    // e não acontecia nada: parecia que a tela tinha travado. Upload paralelo
    // funciona (o append soma em cima do estado mais recente), então não há
    // motivo para bloquear.
    if (!cheio) inputRef.current?.click();
  };

  // Aceita seleção múltipla: manda todos os arquivos de uma vez.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFilesSelect(files);
    e.target.value = '';
  };

  return (
    <div>
      <h2 className="font-heading text-lg font-bold uppercase mb-1">Fotos do Item *</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Mínimo {MIN_PHOTOS} fotos, máximo {MAX_PHOTOS}. Você pode selecionar várias de uma vez.
      </p>

      {/* Progresso do mínimo obrigatório */}
      {form.photos.length < MIN_PHOTOS ? (
        <div className="flex items-center gap-2 mb-3 p-3 rounded-md bg-accent/5 border border-accent/30">
          <AlertCircle className="h-4 w-4 text-accent shrink-0" />
          <span className="text-xs text-foreground">
            Faltam <strong>{MIN_PHOTOS - form.photos.length}</strong> foto
            {MIN_PHOTOS - form.photos.length > 1 ? 's' : ''} para poder avançar
            ({form.photos.length} de {MIN_PHOTOS}).
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-3 p-3 rounded-md bg-primary/5 border border-primary/30">
          <Check className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-foreground">Mínimo de fotos atingido.</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6 p-3 rounded-md bg-primary/5 border border-primary/20">
        <AlertCircle className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground">Fotos com boa iluminação e fundo neutro aumentam as chances de venda em até 3×.</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {form.photos.map((photo, i) => (
          <div key={i} className="relative aspect-square rounded-lg border border-border bg-secondary overflow-hidden group">
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

            {/* A capa é a primeira do array. Sem isto, a única forma de trocar
                seria apagar as fotos e subir de novo na ordem certa. */}
            {i > 0 && (
              <button
                type="button"
                onClick={() => setCapa(i)}
                className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-background/85 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                aria-label={`Usar foto ${i + 1} como capa`}
              >
                <Star className="h-3 w-3" />
                Usar como capa
              </button>
            )}
          </div>
        ))}

        {/* Quadro de progresso por foto em voo: o vendedor vê que está
            subindo, sem que isso trave a escolha das próximas. */}
        {Array.from({ length: uploadingCount }).map((_, i) => (
          <div
            key={`enviando-${i}`}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="px-1 text-center text-[10px] text-muted-foreground">Enviando…</span>
          </div>
        ))}

        {!cheio && (
          <button
            type="button"
            onClick={handleClick}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-secondary/50 flex flex-col items-center justify-center gap-2 transition-colors"
          >
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground text-center px-1">
              Adicionar fotos
            </span>
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">{form.photos.length}/{MAX_PHOTOS} fotos · Formatos: JPG, PNG, WebP · Máx 5MB cada</p>
    </div>
  );
}

// ─── Step 4: Pricing ───────────────────────────────────────

function StepPricing({ form, update, taxaComissao }: { form: FormData; update: (f: keyof FormData, v: any) => void; taxaComissao: number }) {
  // Só reclama depois que o vendedor mexeu no campo: acusar "informe a data"
  // no instante em que ele liga a chave é ranzinza, e o botão de avançar já
  // está travado de qualquer jeito.
  const erroData =
    form.preVenda && form.preVendaDataPrevista
      ? validarDataPrevista(form.preVendaDataPrevista)
      : null;

  return (
    <div className="space-y-5">
      <h2 className="font-heading text-lg font-bold uppercase mb-1">
        {form.type === 'direct' ? 'Preço de Venda' : 'Configuração do Modo Lance'}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {form.type === 'direct'
          ? 'Defina o preço fixo para venda imediata.'
          : 'Configure os parâmetros do modo lance.'}
      </p>

      {form.type === 'direct' ? (
        <>
        <div className="max-w-xs">
          <Label htmlFor="price">Preço (R$) *</Label>
          <Input
            id="price"
            type="number"
            placeholder="0,00"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            className="mt-1.5 font-heading text-lg"
          />
          {form.price && (
            <div className="mt-3 p-3 rounded-md bg-card border border-border">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Valor de venda</span>
                  <span>{formatBRL(Number(form.price))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comissão Kolecta ({commissionLabel(taxaComissao)})</span>
                  <span className="text-accent">-{formatBRL(Number(form.price) * taxaComissao)}</span>
                </div>
                <div className="line-tech my-2" />
                <div className="flex justify-between font-medium text-foreground">
                  <span>Você recebe</span>
                  <span className="text-primary">{formatBRL(Number(form.price) * (1 - taxaComissao))}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Pré-venda ─────────────────────────────────────
            Peça encomendada que ainda não chegou ao vendedor. Continua sendo
            venda direta comum: o comprador paga o valor cheio e o escrow
            segura o dinheiro até a entrega, como em qualquer compra. O que
            muda é o aviso — tag no título e data prometida no anúncio. */}
        <div className="rounded-md border border-border bg-card p-4 max-w-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="pre-venda" className="text-sm font-medium">
                É uma pré-venda
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Para peça encomendada que ainda não chegou até você. O título
                recebe a tag <span className="text-foreground">{TAG_PRE_VENDA}</span> sozinho.
              </p>
            </div>
            <Switch
              id="pre-venda"
              checked={form.preVenda}
              onCheckedChange={(v) => update('preVenda', v)}
            />
          </div>

          {form.preVenda && (
            <div className="mt-4 space-y-3">
              <div className="max-w-xs">
                <Label htmlFor="pre-venda-data">Data prevista de chegada *</Label>
                <Input
                  id="pre-venda-data"
                  type="date"
                  value={form.preVendaDataPrevista}
                  onChange={(e) => update('preVendaDataPrevista', e.target.value)}
                  max={dataMaximaPreVenda()}
                  className="mt-1.5"
                />
                {erroData ? (
                  <p className="mt-1.5 text-xs text-destructive">{erroData.mensagem}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Aparece no anúncio. É o prazo com o qual você se compromete.
                  </p>
                )}
              </div>

              <p className="rounded-md bg-kolecta-dark/40 p-3 text-xs text-muted-foreground">
                O comprador paga o valor cheio na hora da compra, e a Kolecta
                segura o dinheiro até ele confirmar que recebeu. Você recebe
                quando entregar.
              </p>
            </div>
          )}
        </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startingBid">Lance Inicial (R$) *</Label>
              <Input
                id="startingBid"
                type="number"
                placeholder="0,00"
                value={form.startingBid}
                onChange={(e) => update('startingBid', e.target.value)}
                className="mt-1.5"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Valor em que os lances começam. Todo mundo vê.
              </p>
            </div>
            <div>
              <Label htmlFor="minIncrement">Incremento Mínimo (R$)</Label>
              <Input
                id="minIncrement"
                type="number"
                placeholder="10"
                value={form.minIncrement}
                onChange={(e) => update('minIncrement', e.target.value)}
                className="mt-1.5"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                De quanto em quanto os lances sobem.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Duração</Label>
              <Select value={form.duration} onValueChange={(v) => update('duration', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {/* Plataforma nova tem pouca demanda: leilão curto morre sem
                      lance. Prazos mínimos de 7 dias dão tempo de juntar gente. */}
                  <SelectItem value="168">7 dias</SelectItem>
                  <SelectItem value="336">14 dias</SelectItem>
                  <SelectItem value="504">21 dias</SelectItem>
                  <SelectItem value="720">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reservePrice">Preço mínimo para vender (opcional)</Label>
              <Input
                id="reservePrice"
                type="number"
                placeholder="Deixe vazio para vender a qualquer valor"
                value={form.reservePrice}
                onChange={(e) => update('reservePrice', e.target.value)}
                className="mt-1.5"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Valor <strong className="text-foreground">secreto</strong>: ninguém vê. Se o leilão
                terminar abaixo dele, o item não é vendido. Deixe vazio para vender pelo maior lance,
                seja ele qual for.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-md bg-card border border-border">
            <div>
              <span className="text-sm font-medium">Anti-Sniper</span>
              <p className="text-xs text-muted-foreground">Estende o tempo se houver lance nos últimos minutos</p>
            </div>
            <Switch checked={form.antiSniper} onCheckedChange={(v) => update('antiSniper', v)} />
          </div>

          {form.startingBid && (
            <div className="p-3 rounded-md bg-card border border-border">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Lance inicial</span>
                  <span>{formatBRL(Number(form.startingBid))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comissão Kolecta ({commissionLabel(taxaComissao)})</span>
                  <span>Sobre o valor final</span>
                </div>
                <div className="flex justify-between">
                  <span>Duração</span>
                  <span>{durationLabel(form.duration)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ShippingFields form={form} update={update} />
    </div>
  );
}

// ─── Dados para envio (peso/dimensões, obrigatórios) ───────

function ShippingFields({ form, update }: { form: FormData; update: (f: keyof FormData, v: any) => void }) {
  return (
    <div className="pt-6 mt-6 border-t border-border space-y-4">
      <div>
        <h3 className="font-heading text-base font-bold uppercase mb-1">
          Dados para envio <span className="text-destructive">*</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          O frete é calculado com estes números. Errado aqui, sai errado na venda,
          e a diferença sai do seu bolso.
        </p>
      </div>

      {/* Texto em lib/frete, para esta tela e a de edição dizerem o mesmo. */}
      <div className="flex gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
        <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">{AVISO_EMBALAGEM.titulo}</strong>,{' '}
          {AVISO_EMBALAGEM.texto}
        </p>
      </div>

      {/* Os exemplos levam "ex:" na frente. Antes eram números crus ("300",
          "16"), e em campo vazio isso parece valor já preenchido: muita gente
          passava direto achando que estava pronto, e o anúncio ia sem frete. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="weightGrams">Peso (g) <span className="text-destructive">*</span></Label>
          <Input id="weightGrams" type="number" inputMode="numeric" placeholder="ex: 300" min={1}
            value={form.weightGrams} onChange={(e) => update('weightGrams', e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="widthCm">Largura (cm) <span className="text-destructive">*</span></Label>
          <Input id="widthCm" type="number" inputMode="numeric" placeholder="ex: 16" min={1}
            value={form.widthCm} onChange={(e) => update('widthCm', e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="heightCm">Altura (cm) <span className="text-destructive">*</span></Label>
          <Input id="heightCm" type="number" inputMode="numeric" placeholder="ex: 6" min={1}
            value={form.heightCm} onChange={(e) => update('heightCm', e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="lengthCm">Compr. (cm) <span className="text-destructive">*</span></Label>
          <Input id="lengthCm" type="number" inputMode="numeric" placeholder="ex: 12" min={1}
            value={form.lengthCm} onChange={(e) => update('lengthCm', e.target.value)} className="mt-1.5" />
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Review ────────────────────────────────────────

function StepReview({ form, categories }: { form: FormData; categories: CategoryOption[] }) {
  const categoryObj = categories.find((c) => c.id === form.category);
  const conditionObj = conditions.find((c) => c.value === form.condition);

  return (
    <div>
      <h2 className="font-heading text-lg font-bold uppercase mb-1">Revisão do Anúncio</h2>
      <p className="text-sm text-muted-foreground mb-6">Confira os dados antes de enviar para aprovação.</p>

      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          {/* Type */}
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary text-xs">
              {form.type === 'direct' ? 'Venda Direta' : 'Modo Lance'}
            </Badge>
            {conditionObj && (
              <Badge variant="outline" className="text-xs border-border">{conditionObj.label}</Badge>
            )}
          </div>

          {/* Title — com a tag de pré-venda já aplicada, que é como vai ao ar.
              Mostrar o título cru aqui esconderia justamente a parte que o
              vendedor não digitou. */}
          <h3 className="font-heading text-xl font-bold">
            {tituloComPreVenda(form.title, form.type === 'direct' && form.preVenda) || 'Sem título'}
          </h3>

          {form.type === 'direct' && form.preVenda && form.preVendaDataPrevista && (
            <div className="rounded-md border border-border bg-kolecta-dark/40 p-3 text-xs">
              <div className="flex justify-between font-medium text-foreground">
                <span>Chegada prevista</span>
                <span className="text-primary">
                  {formatarDataPrevista(form.preVendaDataPrevista)}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                É o prazo que vai aparecer no anúncio e com o qual você se compromete.
              </p>
            </div>
          )}

          {/* Category */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {categoryObj ? (
              <>
                <CategoryIcon slug={categoryObj.slug} size={16} />
                {categoryObj.name}
              </>
            ) : 'Categoria não selecionada'}
          </div>

          {/* Details */}
          {(form.brand || form.line || form.scale) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {form.brand && <div><span className="text-muted-foreground">Marca:</span> {form.brand}</div>}
              {form.line && <div><span className="text-muted-foreground">Linha:</span> {form.line}</div>}
              {form.scale && <div><span className="text-muted-foreground">Escala:</span> {form.scale}</div>}
              {form.year && <div><span className="text-muted-foreground">Ano:</span> {form.year}</div>}
              {form.edition && <div><span className="text-muted-foreground">Edição:</span> {form.edition}</div>}
            </div>
          )}

          {/* Photos */}
          {form.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {form.photos.map((p, i) => (
                <div key={i} className="w-16 h-16 rounded-md overflow-hidden bg-secondary shrink-0">
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          {form.description && <ProductDescription texto={form.description} />}

          {/* Pricing */}
          <div className="line-tech" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {form.type === 'direct' ? 'Preço' : 'Lance Inicial'}
            </span>
            <span className="font-heading text-2xl font-bold text-primary">
              {formatBRL(Number(form.type === 'direct' ? form.price : form.startingBid) || 0)}
            </span>
          </div>

          {form.type === 'auction' && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Incremento mínimo</span>
                <span>{formatBRL(Number(form.minIncrement))}</span>
              </div>
              <div className="flex justify-between">
                <span>Duração</span>
                <span>{durationLabel(form.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span>Anti-Sniper</span>
                <span>{form.antiSniper ? 'Ativado' : 'Desativado'}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 p-3 rounded-md bg-primary/5 border border-primary/20 flex items-start gap-2">
        <Eye className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Seu anúncio será enviado para <strong className="text-foreground">análise da equipe Kolecta</strong>. 
          Após aprovação, ficará visível para todos os compradores.
        </p>
      </div>
    </div>
  );
}
