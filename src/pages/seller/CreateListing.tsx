import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, ShoppingCart, Gavel, Upload,
  X, ImagePlus, AlertCircle, Eye,
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
import { useCreateListing } from '@/hooks/use-api';
import type { CreateListingPayload } from '@/lib/api';

function CategoryIcon({ slug, size = 32 }: { slug: string; size?: number }) {
  const fill = '#FFD700';
  switch (slug) {
    case 'miniaturas-diecast':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="5" y="9" width="22" height="14" rx="5" fill={fill} />
          <rect x="9" y="12" width="14" height="8" rx="2.5" fill="#0f0f0f" opacity="0.3" />
          <rect x="1" y="10" width="5" height="5" rx="2" fill={fill} />
          <rect x="1" y="17" width="5" height="5" rx="2" fill={fill} />
          <rect x="26" y="10" width="5" height="5" rx="2" fill={fill} />
          <rect x="26" y="17" width="5" height="5" rx="2" fill={fill} />
        </svg>
      );
    case 'cards-colecionaveis':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="6" y="3" width="20" height="26" rx="3" fill={fill} />
          <polygon points="16,9 17.8,14 23,14 18.9,17 20.5,22 16,19 11.5,22 13.1,17 9,14 14.2,14" fill="#0f0f0f" opacity="0.3" />
        </svg>
      );
    case 'action-figures':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M8 13 L6 29 L16 24 L26 29 L24 13 Z" fill={fill} opacity="0.55" />
          <circle cx="16" cy="8" r="5" fill={fill} />
          <rect x="11" y="13" width="10" height="10" rx="2" fill={fill} />
          <rect x="11" y="23" width="4" height="7" rx="2" fill={fill} />
          <rect x="17" y="23" width="4" height="7" rx="2" fill={fill} />
          <rect x="3" y="13" width="8" height="3" rx="1.5" fill={fill} />
          <rect x="21" y="13" width="8" height="3" rx="1.5" fill={fill} />
        </svg>
      );
    case 'funko-pop':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="11" r="9" fill={fill} />
          <rect x="10" y="19" width="12" height="11" rx="3" fill={fill} />
          <circle cx="13" cy="11" r="1.5" fill="#0f0f0f" opacity="0.4" />
          <circle cx="19" cy="11" r="1.5" fill="#0f0f0f" opacity="0.4" />
        </svg>
      );
    case 'mangas-hqs':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 4 L4 7 L4 28 L16 25 Z" fill={fill} />
          <path d="M16 4 L28 7 L28 28 L16 25 Z" fill={fill} opacity="0.65" />
          <line x1="7" y1="12" x2="15" y2="11" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="7" y1="15" x2="15" y2="14" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="7" y1="18" x2="15" y2="17" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="17" y1="11" x2="25" y2="12" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="17" y1="14" x2="25" y2="15" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
          <line x1="17" y1="17" x2="25" y2="18" stroke="#0f0f0f" strokeWidth="1.2" opacity="0.35" />
        </svg>
      );
    default:
      return <span style={{ fontSize: size * 0.75 }}>📦</span>;
  }
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
  description: string;
  photos: string[];
  price: string;
  startingBid: string;
  minIncrement: string;
  duration: string;
  reservePrice: string;
  antiSniper: boolean;
}

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
  description: '',
  photos: [],
  price: '',
  startingBid: '',
  minIncrement: '10',
  duration: '48',
  reservePrice: '',
  antiSniper: true,
};

const steps = [
  { id: 1, label: 'Tipo' },
  { id: 2, label: 'Detalhes' },
  { id: 3, label: 'Fotos' },
  { id: 4, label: 'Preço' },
  { id: 5, label: 'Revisão' },
];

const conditions = [
  { value: 'novo-lacrado', label: 'Novo lacrado', desc: 'Embalagem original intacta, nunca aberto' },
  { value: 'novo-sem-caixa', label: 'Novo sem caixa', desc: 'Item novo, sem embalagem original' },
  { value: 'usado-conservado', label: 'Usado conservado', desc: 'Sem danos visíveis, bem mantido' },
  { value: 'usado-com-marcas', label: 'Usado com marcas', desc: 'Com desgastes ou danos visíveis' },
];

export default function CreateListing() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const navigate = useNavigate();
  const createListing = useCreateListing();

  useEffect(() => {
    trackEvent('start_sell_flow');
  }, []);

  const update = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value })); 
  };

  const canNext = () => {
    switch (step) {
      case 1: return form.type !== null;
      case 2: {
        if (!form.title || !form.category || !form.condition) return false;
        if (form.category === 'c1') return !!form.categoryFields?.brand && !!form.categoryFields?.scale;
        if (form.category === 'c2') return !!form.categoryFields?.jogo;
        if (form.category === 'c3') return !!form.categoryFields?.brand && !!form.categoryFields?.line && !!form.categoryFields?.personagem;
        if (form.category === 'c4') return !!form.categoryFields?.numero && !!form.categoryFields?.line;
        if (form.category === 'c5') return !!form.categoryFields?.tituloObra;
        return true;
      }
      case 3: return true; // photos optional for MVP
      case 4: return form.type === 'direct' ? !!form.price : !!form.startingBid;
      default: return true;
    }
  };

  const handleSubmit = () => {
    trackEvent('submit_listing', { type: form.type });

    const payload: CreateListingPayload = {
      title: form.title,
      description: form.description || undefined,
      categoryId: form.category || undefined,
      brand: form.brand || undefined,
      line: form.line || undefined,
      scale: form.scale || undefined,
      year: form.year || undefined,
      edition: form.edition || undefined,
      condition: form.condition,
      type: form.type as 'direct' | 'auction',
      priceInCents: form.type === 'direct' && form.price
        ? Math.round(Number(form.price.replace(/\./g, '').replace(',', '.')) * 100)
        : form.type === 'auction' && form.startingBid
        ? Math.round(Number(form.startingBid.replace(/\./g, '').replace(',', '.')) * 100)
        : undefined,
      images: form.photos.length > 0 ? JSON.stringify(form.photos) : undefined,
    };

    createListing.mutate(payload, {
      onSuccess: () => navigate('/painel/anuncios'),
    });
  };

  const addMockPhoto = () => {
    if (form.photos.length < 8) {
      update('photos', [...form.photos, `/placeholder.svg`]);
    }
  };

  const removePhoto = (index: number) => {
    update('photos', form.photos.filter((_, i) => i !== index));
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
            {step === 2 && <StepDetails form={form} update={update} />}
            {step === 3 && <StepPhotos form={form} addPhoto={addMockPhoto} removePhoto={removePhoto} />}
            {step === 4 && <StepPricing form={form} update={update} />}
            {step === 5 && <StepReview form={form} />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>

          {step < 5 ? (
            <Button
              variant="kolecta"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="kolecta" onClick={handleSubmit}>
              <Check className="h-4 w-4" /> Enviar para Aprovação
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

function StepDetails({ form, update }: { form: FormData; update: (f: keyof FormData, v: any) => void }) {
  const [subStep, setSubStep] = useState<'category' | 'details'>(form.category ? 'details' : 'category');
  const [tempCategory, setTempCategory] = useState(form.category);

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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {mockCategories.map((c: any) => {
            const isSelected = tempCategory === c.id;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setTempCategory(c.id)}
                className={`relative text-left p-4 rounded-xl border transition-all flex flex-col items-start gap-3
                  ${isSelected ? 'border-[#FFD700] bg-[#FFD700]/5' : 'border-border bg-card hover:border-primary/30'}
                `}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-[#FFD700] text-black p-1 rounded-full">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <CategoryIcon slug={c.slug} size={32} />
                <div>
                  <h3 className="font-heading text-sm font-bold">{c.name}</h3>
                  {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
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

  const categoryObj = mockCategories.find((c: any) => c.id === form.category);

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
            maxLength={80}
            className="mt-1.5"
          />
          <div className="text-right mt-1">
            <span className="text-[10px] text-muted-foreground">{form.title.length}/80</span>
          </div>
        </div>

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
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            placeholder="Descreva detalhes, histórico, defeitos..."
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            maxLength={4000}
            rows={5}
            className="mt-1.5"
          />
          <div className="text-right mt-1">
            <span className="text-[10px] text-muted-foreground">{form.description.length}/4000</span>
          </div>
        </div>

        {form.category && (
          <div className="pt-6 mt-6 border-t border-border">
            <h3 className="font-heading text-base font-bold uppercase mb-4">Detalhes de {categoryObj?.name}</h3>
            
            {form.category === 'c1' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="c1-brand">Marca *</Label>
                  <Input id="c1-brand" placeholder="Ex: Mini GT, Tarmac Works, Hot Wheels" value={form.categoryFields?.brand || ''} onChange={(e) => updateCatField('brand', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="c1-line">Linha / Série</Label>
                  <Input id="c1-line" placeholder="Ex: LB-Works, Kaido House" value={form.categoryFields?.line || ''} onChange={(e) => updateCatField('line', e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Escala *</Label>
                  <Select value={form.categoryFields?.scale || ''} onValueChange={(v) => updateCatField('scale', v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {['1:64', '1:43', '1:32', '1:24', '1:18', '1:12', 'Outra'].map(s => (
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

            {form.category === 'c2' && (
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

            {form.category === 'c3' && (
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

            {form.category === 'c4' && (
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

            {form.category === 'c5' && (
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
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Photos ────────────────────────────────────────

function StepPhotos({ form, addPhoto, removePhoto }: { form: FormData; addPhoto: () => void; removePhoto: (i: number) => void }) {
  return (
    <div>
      <h2 className="font-heading text-lg font-bold uppercase mb-1">Fotos do Item</h2>
      <p className="text-sm text-muted-foreground mb-2">Mínimo 3 fotos recomendadas. Máximo 8.</p>

      <div className="flex items-center gap-2 mb-6 p-3 rounded-md bg-primary/5 border border-primary/20">
        <AlertCircle className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground">Fotos com boa iluminação e fundo neutro aumentam as chances de venda em até 3×.</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {form.photos.map((photo, i) => (
          <div key={i} className="relative aspect-square rounded-lg border border-border bg-secondary overflow-hidden group">
            <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            {i === 0 && (
              <Badge className="absolute top-1 left-1 text-[9px] bg-primary text-primary-foreground">Capa</Badge>
            )}
            <button
              onClick={() => removePhoto(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {form.photos.length < 8 && (
          <button
            onClick={addPhoto}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-secondary/50 flex flex-col items-center justify-center gap-2 transition-colors"
          >
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Adicionar</span>
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">{form.photos.length}/8 fotos · Formatos: JPG, PNG, WebP · Máx 5MB cada</p>
    </div>
  );
}

// ─── Step 4: Pricing ───────────────────────────────────────

function StepPricing({ form, update }: { form: FormData; update: (f: keyof FormData, v: any) => void }) {
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
                  <span>Comissão Kolecta (10%)</span>
                  <span className="text-accent">-{formatBRL(Number(form.price) * 0.1)}</span>
                </div>
                <div className="line-tech my-2" />
                <div className="flex justify-between font-medium text-foreground">
                  <span>Você recebe</span>
                  <span className="text-primary">{formatBRL(Number(form.price) * 0.9)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
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
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Duração</Label>
              <Select value={form.duration} onValueChange={(v) => update('duration', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 horas</SelectItem>
                  <SelectItem value="48">48 horas</SelectItem>
                  <SelectItem value="72">3 dias</SelectItem>
                  <SelectItem value="168">7 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reservePrice">Preço de Reserva (opcional)</Label>
              <Input
                id="reservePrice"
                type="number"
                placeholder="Mínimo para vender"
                value={form.reservePrice}
                onChange={(e) => update('reservePrice', e.target.value)}
                className="mt-1.5"
              />
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
                  <span>Comissão Kolecta (10%)</span>
                  <span>Sobre o valor final</span>
                </div>
                <div className="flex justify-between">
                  <span>Duração</span>
                  <span>{form.duration}h</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Review ────────────────────────────────────────

function StepReview({ form }: { form: FormData }) {
  const categoryObj = mockCategories.find((c: any) => c.id === form.category);
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

          {/* Title */}
          <h3 className="font-heading text-xl font-bold">{form.title || 'Sem título'}</h3>

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
          {form.description && (
            <p className="text-sm text-muted-foreground">{form.description}</p>
          )}

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
                <span>{form.duration}h</span>
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
