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

type ListingType = 'direct' | 'auction' | null;

interface FormData {
  type: ListingType;
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
  { value: 'lacrado', label: 'Lacrado', desc: 'Embalagem original selada' },
  { value: 'novo', label: 'Novo', desc: 'Sem uso, pode estar aberto' },
  { value: 'mint', label: 'Mint', desc: 'Estado perfeito, como novo' },
  { value: 'usado', label: 'Usado', desc: 'Com sinais de uso' },
];

export default function CreateListing() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent('start_sell_flow');
  }, []);

  const update = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canNext = () => {
    switch (step) {
      case 1: return form.type !== null;
      case 2: return form.title && form.category && form.condition;
      case 3: return true; // photos optional for MVP
      case 4: return form.type === 'direct' ? !!form.price : !!form.startingBid;
      default: return true;
    }
  };

  const handleSubmit = () => {
    trackEvent('submit_listing', { type: form.type });
    navigate('/painel-vendedor/anuncios');
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
            <Link to="/painel-vendedor/anuncios"><ArrowLeft className="h-4 w-4" /></Link>
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
            title: 'Leilão',
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
  return (
    <div className="space-y-5">
      <h2 className="font-heading text-lg font-bold uppercase mb-1">Detalhes do Item</h2>
      <p className="text-sm text-muted-foreground mb-4">Preencha as informações do seu colecionável.</p>

      <div>
        <Label htmlFor="title">Título do Anúncio *</Label>
        <Input
          id="title"
          placeholder="Ex: Hot Wheels RLC Nissan Skyline GT-R R34"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          maxLength={120}
          className="mt-1.5"
        />
        <span className="text-[10px] text-muted-foreground">{form.title.length}/120</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Categoria *</Label>
          <Select value={form.category} onValueChange={(v) => update('category', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {mockCategories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>{c.icon} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Condição *</Label>
          <Select value={form.condition} onValueChange={(v) => update('condition', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {conditions.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label} — {c.desc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" placeholder="Hot Wheels" value={form.brand} onChange={(e) => update('brand', e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="line">Linha</Label>
          <Input id="line" placeholder="RLC" value={form.line} onChange={(e) => update('line', e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="scale">Escala</Label>
          <Input id="scale" placeholder="1:64" value={form.scale} onChange={(e) => update('scale', e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="year">Ano</Label>
          <Input id="year" placeholder="2025" value={form.year} onChange={(e) => update('year', e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="edition">Edição / Tiragem</Label>
          <Input id="edition" placeholder="Limited 5000 pçs" value={form.edition} onChange={(e) => update('edition', e.target.value)} className="mt-1.5" />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Descreva o item em detalhes: estado, defeitos, autenticidade, acessórios..."
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={4}
          className="mt-1.5"
        />
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
        {form.type === 'direct' ? 'Preço de Venda' : 'Configuração do Leilão'}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {form.type === 'direct'
          ? 'Defina o preço fixo para venda imediata.'
          : 'Configure os parâmetros do leilão.'}
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
              <p className="text-xs text-muted-foreground">Estende o leilão se houver lance nos últimos minutos</p>
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
  const categoryObj = mockCategories.find((c) => c.slug === form.category);
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
              {form.type === 'direct' ? 'Venda Direta' : 'Leilão'}
            </Badge>
            {conditionObj && (
              <Badge variant="outline" className="text-xs border-border">{conditionObj.label}</Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="font-heading text-xl font-bold">{form.title || 'Sem título'}</h3>

          {/* Category */}
          <div className="text-sm text-muted-foreground">
            {categoryObj ? `${categoryObj.icon} ${categoryObj.name}` : 'Categoria não selecionada'}
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
