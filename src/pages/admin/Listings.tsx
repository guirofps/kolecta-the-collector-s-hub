import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, X, Eye, AlertCircle, Clock, Loader2,
  ArrowDownWideNarrow, ArrowUpNarrowWide,
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAdminListings, useUpdateListingStatus, useCategories } from '@/hooks/use-api';
import type { Listing } from '@/lib/api';
import { formatBRL } from '@/lib/currency';
// Fonte única dos rótulos. A lista local daqui estava com o vocabulário antigo
// (mint, near_mint...) e não batia com o que o wizard salva (`novo-lacrado`),
// então a fila mostrava o código cru em todo anúncio.
import { conditionLabel } from '@/lib/conditions';
import { MIN_PHOTOS, MAX_PHOTOS } from '@/lib/photos';
import ProductDescription from '@/components/ProductDescription';
import {
  fieldsForCategory, parseAttributes, formatFieldValue, isFieldApplicable,
} from '@/lib/category-fields';

// O texto vai inteiro para o vendedor, no painel e no e-mail de reprovação.
// Por isso cada motivo diz o que corrigir, não só o que está errado: "peso e
// dimensões faltando" deixa a pessoa sem saber o que fazer.
const MOTIVOS_REPROVACAO = [
  'Fotos insuficientes ou de baixa qualidade',
  'Título ou descrição inadequados',
  // Frete errado sai caro para os dois lados, e era o motivo que faltava.
  'Peso ou dimensões faltando (o frete sai errado sem isso)',
  'Peso ou dimensões incompatíveis com o item',
  'Categoria errada para este item',
  'Faltam informações obrigatórias da categoria',
  'Preço fora dos padrões de mercado',
  'Produto não se enquadra nas categorias permitidas',
  'Suspeita de falsificação ou item não autêntico',
  'Informações incompletas ou contraditórias',
  'Outro motivo',
];

function parseImages(images: string | null): string[] {
  if (!images) return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Centavos para BRL, tolerando null/undefined sem virar NaN na tela. */
function brl(cents: number | null | undefined): string | null {
  return typeof cents === 'number' ? formatBRL(cents / 100) : null;
}

/** O valor de referência do anúncio: preço na venda direta, lance inicial no leilão. */
function valorPrincipal(l: Listing): string | null {
  return l.type === 'auction' ? brl(l.startingBidInCents) : brl(l.priceInCents);
}

/** Botão de filtro. `perigo` marca os que apontam problema. */
function Chip({ ativo, onClick, perigo, children }: {
  ativo: boolean; onClick: () => void; perigo?: boolean; children: React.ReactNode;
}) {
  const base = 'rounded-md px-2.5 py-1 text-xs font-medium transition-colors';
  const cor = ativo
    ? perigo ? 'bg-destructive/15 text-destructive' : 'bg-accent/15 text-accent'
    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground';
  return <button type="button" onClick={onClick} className={`${base} ${cor}`}>{children}</button>;
}

/** Uma linha de dado no painel de revisão. `alerta` pinta de vermelho o que falta. */
function Dado({ rotulo, valor, alerta }: { rotulo: string; valor: React.ReactNode; alerta?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground shrink-0">{rotulo}</span>
      <span className={`text-xs text-right ${alerta ? 'text-destructive font-medium' : 'text-foreground'}`}>
        {valor}
      </span>
    </div>
  );
}

/**
 * Valores dos campos da categoria. `attributes` é a fonte; as colunas do topo
 * (brand/line/scale/year/edition) entram como reserva porque anúncio antigo foi
 * gravado antes de o wizard passar a mandar o JSON.
 */
function valoresDoAnuncio(l: Listing): Record<string, unknown> {
  const attrs = parseAttributes(l.attributes);
  const reserva: Record<string, unknown> = {
    brand: l.brand, line: l.line, scale: l.scale, year: l.year, edition: l.edition,
  };
  const saida: Record<string, unknown> = { ...reserva };
  for (const [k, v] of Object.entries(attrs)) {
    if (formatFieldValue(v) !== null) saida[k] = v;
  }
  return saida;
}

/** Peso e dimensões: frete errado sai caro, então a falta precisa aparecer. */
function resumoFrete(l: Listing): { texto: string; faltando: boolean } {
  const temPeso = typeof l.weightGrams === 'number' && l.weightGrams > 0;
  const dims = [l.widthCm, l.heightCm, l.lengthCm];
  const temDims = dims.every((d) => typeof d === 'number' && d > 0);
  if (!temPeso && !temDims) return { texto: 'Não informado', faltando: true };
  const peso = temPeso ? `${l.weightGrams} g` : 'sem peso';
  const medida = temDims ? `${l.widthCm} x ${l.heightCm} x ${l.lengthCm} cm` : 'sem dimensões';
  return { texto: `${peso}, ${medida}`, faltando: !temPeso || !temDims };
}


// Limite por consulta. Se uma delas voltar cheia, tem anúncio ficando de fora
// e a tela avisa em vez de esconder.
const LIMITE = 1000;

export default function AdminListings() {
  // ATENÇÃO: existem DOIS status de "aguardando moderação" no banco.
  // `pending_review` é o que o painel do vendedor mostra como "em análise"
  // (ver seller/Dashboard.tsx), e `draft` é o vocabulário anterior, ainda com
  // centenas de anúncios parados. A fila buscava só `draft` e deixava todos os
  // `pending_review` invisíveis: o vendedor via "aguardando aprovação" e o
  // anúncio nunca chegava aqui. Enquanto o backend não unifica, buscamos os dois.
  const revisao = useAdminListings('pending_review', LIMITE);
  const rascunho = useAdminListings('draft', LIMITE);
  const { data: categorias = [] } = useCategories();
  const updateStatus = useUpdateListingStatus();

  const isLoading = revisao.isLoading || rascunho.isLoading;
  const isError = revisao.isError && rascunho.isError;

  const listaRevisao = revisao.data ?? [];
  const listaRascunho = rascunho.data ?? [];

  const todos = [...listaRevisao, ...listaRascunho];

  const truncou = listaRevisao.length >= LIMITE || listaRascunho.length >= LIMITE;

  // Categoria errada é o erro mais comum de anúncio, então o nome dela precisa
  // estar na revisão. A API do anúncio devolve só o id.
  const nomeCategoria = (id: string | null) =>
    categorias.find((c) => c.id === id)?.name ?? null;
  const slugCategoria = (id: string | null) =>
    categorias.find((c) => c.id === id)?.slug ?? null;

  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  // Vários motivos de uma vez: anúncio incompleto costuma ter mais de um
  // problema, e mandar um por vez faria o vendedor levar reprovações em série.
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectNotes, setRejectNotes] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'direct' | 'auction'>('todos');
  const [soPendencia, setSoPendencia] = useState(false);
  const [busca, setBusca] = useState('');
  // Padrão "antigos": quem enviou primeiro é revisado primeiro. É a ordem justa
  // quando há fila, e evita que anúncio antigo fique esquecido no fim da pilha.
  const [ordem, setOrdem] = useState<'antigos' | 'recentes'>('antigos');
  const [periodo, setPeriodo] = useState<'todos' | 'hoje' | '7dias' | 'antigos'>('todos');

  // Qual anúncio está sendo moderado agora. Sem isso, `updateStatus.isPending`
  // é global e uma única aprovação punha spinner e travava o botão das 176
  // linhas ao mesmo tempo, parecendo que a tela inteira congelou.
  const [emAndamento, setEmAndamento] = useState<string | null>(null);
  const ocupado = (id: string) => emAndamento === id;

  /**
   * O que está faltando neste anúncio. Alimenta o selo na linha e o filtro
   * "só com pendência", que é o que permite achar problema no meio de 600.
   */
  const pendenciasDe = (l: Listing): string[] => {
    const faltas: string[] = [];
    const fotos = parseImages(l.images).length;
    if (fotos < MIN_PHOTOS) faltas.push(`${fotos} ${fotos === 1 ? 'foto' : 'fotos'}`);
    if (!l.categoryId) faltas.push('sem categoria');
    if (valorPrincipal(l) === null) faltas.push('sem valor');
    if (resumoFrete(l).faltando) faltas.push('frete incompleto');

    const valores = valoresDoAnuncio(l);
    const obrigatoriosVazios = fieldsForCategory(slugCategoria(l.categoryId))
      .filter((c) => c.required && isFieldApplicable(c, valores))
      .filter((c) => formatFieldValue(valores[c.key]) === null);
    if (obrigatoriosVazios.length) {
      faltas.push(obrigatoriosVazios.map((c) => c.label.toLowerCase()).join(', '));
    }
    return faltas;
  };

  // Contagem por categoria sobre a fila inteira, para os chips não mentirem
  // quando um filtro já está aplicado.
  const contagemPorCategoria = todos.reduce<Record<string, number>>((acc, l) => {
    const chave = l.categoryId ?? 'sem-categoria';
    acc[chave] = (acc[chave] ?? 0) + 1;
    return acc;
  }, {});

  const categoriasNaFila = categorias
    .filter((c) => contagemPorCategoria[c.id] > 0)
    .sort((a, b) => contagemPorCategoria[b.id] - contagemPorCategoria[a.id]);

  // ─── Período ─────────────────────────────────────────────
  // Cortes calculados uma vez, para o filtro não recriar Date por linha.
  const agora = Date.now();
  const inicioDeHoje = new Date();
  inicioDeHoje.setHours(0, 0, 0, 0);
  const CORTE_HOJE = inicioDeHoje.getTime();
  const CORTE_7DIAS = agora - 7 * 24 * 60 * 60 * 1000;

  const dataDe = (l: Listing) => new Date(l.createdAt).getTime();

  const noPeriodo = (l: Listing) => {
    const t = dataDe(l);
    if (!Number.isFinite(t)) return periodo === 'todos'; // data corrompida: só em "tudo"
    if (periodo === 'hoje') return t >= CORTE_HOJE;
    if (periodo === '7dias') return t >= CORTE_7DIAS;
    // "Mais de 7 dias": o que está encalhado há tempo e merece atenção.
    if (periodo === 'antigos') return t < CORTE_7DIAS;
    return true;
  };

  const contagemPeriodo = {
    todos: todos.length,
    hoje: todos.filter((l) => dataDe(l) >= CORTE_HOJE).length,
    '7dias': todos.filter((l) => dataDe(l) >= CORTE_7DIAS).length,
    antigos: todos.filter((l) => dataDe(l) < CORTE_7DIAS).length,
  };

  const termo = busca.trim().toLowerCase();
  const listings = todos
    .filter((l) => {
      if (filtroCategoria === 'sem-categoria') {
        if (l.categoryId != null) return false;
      } else if (filtroCategoria !== 'todas' && l.categoryId !== filtroCategoria) {
        return false;
      }
      if (filtroTipo !== 'todos' && l.type !== filtroTipo) return false;
      if (soPendencia && pendenciasDe(l).length === 0) return false;
      if (!noPeriodo(l)) return false;
      if (termo && !l.title.toLowerCase().includes(termo) && !(l.sellerName ?? '').toLowerCase().includes(termo)) return false;
      return true;
    })
    .sort((a, b) => (ordem === 'antigos' ? dataDe(a) - dataDe(b) : dataDe(b) - dataDe(a)));

  const totalComPendencia = todos.filter((l) => pendenciasDe(l).length > 0).length;
  const filtroAtivo = filtroCategoria !== 'todas' || filtroTipo !== 'todos'
    || soPendencia || periodo !== 'todos' || termo !== '';

  const handleApprove = (id: string) => {
    setEmAndamento(id);
    updateStatus.mutate(
      { id, status: 'active' },
      {
        onSuccess: () => setDetailOpen(false),
        onSettled: () => setEmAndamento(null),
      },
    );
  };

  /**
   * TODOS os motivos que a tela já detectou, não só o primeiro.
   * Anúncio de importação costuma ter várias faltas ao mesmo tempo (sem foto,
   * sem frete, sem marca), e mandar um motivo por vez faria o vendedor
   * corrigir, reenviar e levar outra reprovação pelo item seguinte.
   * A sugestão continua editável: é atalho, não decisão.
   */
  const motivosSugeridos = (l: Listing): string[] => {
    const faltas = pendenciasDe(l);
    const sugeridos: string[] = [];
    if (faltas.some((f) => f.includes('foto'))) {
      sugeridos.push('Fotos insuficientes ou de baixa qualidade');
    }
    if (faltas.some((f) => f.includes('frete'))) {
      sugeridos.push('Peso ou dimensões faltando (o frete sai errado sem isso)');
    }
    if (faltas.some((f) => f.includes('sem categoria'))) {
      sugeridos.push('Categoria errada para este item');
    }
    // Sobrou falta de campo obrigatório da categoria (marca, escala, jogo…).
    const outras = faltas.filter(
      (f) => !f.includes('foto') && !f.includes('frete') && !f.includes('sem categoria') && !f.includes('sem valor'),
    );
    if (outras.length > 0) sugeridos.push('Faltam informações obrigatórias da categoria');
    return sugeridos;
  };

  const toggleMotivo = (motivo: string) => {
    setRejectReasons((atuais) =>
      atuais.includes(motivo) ? atuais.filter((m) => m !== motivo) : [...atuais, motivo],
    );
  };

  const openReject = (listing: Listing) => {
    setSelectedListing(listing);
    setRejectDialogOpen(true);
    setRejectReasons(motivosSugeridos(listing));
    setRejectNotes('');
  };

  const handleReject = () => {
    if (!selectedListing) return;
    // Vai como lista com "- ": o painel do vendedor e o e-mail formatam isso
    // em itens legíveis (ver lib/description-format). Com vários motivos, um
    // parágrafo corrido esconderia metade do que precisa ser corrigido.
    const linhas = rejectReasons.map((m) => `- ${m}`);
    const observacao = rejectNotes.trim();
    const motivo = [
      ...linhas,
      ...(observacao ? ['', observacao] : []),
    ].join('\n');

    setEmAndamento(selectedListing.id);
    updateStatus.mutate(
      { id: selectedListing.id, status: 'rejected', reason: motivo },
      {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setDetailOpen(false);
        },
        onSettled: () => setEmAndamento(null),
      },
    );
  };

  const openDetail = (listing: Listing) => {
    setSelectedListing(listing);
    setDetailOpen(true);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'agora';
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  };

  /** Data e hora exatas, para o `title` do elemento. "3d atrás" não diz quando. */
  const dataCompleta = (dateStr: string) => {
    const d = new Date(dateStr);
    return Number.isFinite(d.getTime())
      ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : 'data desconhecida';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="font-heading text-xl font-bold uppercase mb-2">Erro ao carregar</h2>
          <p className="text-sm text-muted-foreground">Não foi possível buscar os anúncios pendentes.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading text-2xl font-extrabold italic uppercase">Fila de Aprovação</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filtroAtivo
                ? `${listings.length} de ${todos.length} anúncios`
                : `${todos.length} anúncios aguardando revisão`}
              {listaRevisao.length > 0 && listaRascunho.length > 0 && (
                <span className="text-xs">
                  {' '}({listaRevisao.length} em análise, {listaRascunho.length} em rascunho)
                </span>
              )}
            </p>
          </div>
          <Badge className="bg-accent/10 text-accent text-sm px-3 py-1">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            {listings.length} pendentes
          </Badge>
        </div>

        {/* Se uma das consultas falhar, a fila fica incompleta sem avisar, e
            aprovar em lote com lista parcial deixa vendedor para trás. */}
        {(revisao.isError || rascunho.isError) && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">
              Parte da fila não carregou ({revisao.isError ? 'em análise' : 'rascunhos'}).
              A lista abaixo está incompleta. Recarregue antes de aprovar em lote.
            </p>
          </div>
        )}

        {truncou && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-accent/30 bg-accent/5 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-xs text-accent">
              A fila atingiu o limite de {LIMITE} por consulta e pode haver anúncios
              fora desta lista.
            </p>
          </div>
        )}

        {/* Filtros. Com 600 anúncios numa lista corrida não dá para revisar
            nada; agrupar por categoria deixa o olho calibrado num tipo de item
            por vez, e "com pendência" acha o problema no meio do monte. */}
        <div className="mb-5 space-y-3 rounded-lg border border-border bg-card/50 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">Categoria</span>
            <Chip ativo={filtroCategoria === 'todas'} onClick={() => setFiltroCategoria('todas')}>
              Todas ({todos.length})
            </Chip>
            {categoriasNaFila.map((c) => (
              <Chip key={c.id} ativo={filtroCategoria === c.id} onClick={() => setFiltroCategoria(c.id)}>
                {c.name} ({contagemPorCategoria[c.id]})
              </Chip>
            ))}
            {contagemPorCategoria['sem-categoria'] > 0 && (
              <Chip
                ativo={filtroCategoria === 'sem-categoria'}
                onClick={() => setFiltroCategoria('sem-categoria')}
                perigo
              >
                Sem categoria ({contagemPorCategoria['sem-categoria']})
              </Chip>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">Tipo</span>
            <Chip ativo={filtroTipo === 'todos'} onClick={() => setFiltroTipo('todos')}>Todos</Chip>
            <Chip ativo={filtroTipo === 'direct'} onClick={() => setFiltroTipo('direct')}>Venda direta</Chip>
            <Chip ativo={filtroTipo === 'auction'} onClick={() => setFiltroTipo('auction')}>Modo Lance</Chip>

            <span className="mx-2 h-4 w-px bg-border" />
            <Chip ativo={soPendencia} onClick={() => setSoPendencia((v) => !v)} perigo>
              Com pendência ({totalComPendencia})
            </Chip>
          </div>

          {/* Data de envio. Ordem padrão é o mais antigo primeiro: quem enviou
              antes é revisado antes, e sem isso o anúncio velho some no fim da
              pilha enquanto os novos chegam por cima. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">Enviado</span>
            {([
              { valor: 'todos', rotulo: 'Qualquer data' },
              { valor: 'hoje', rotulo: 'Hoje' },
              { valor: '7dias', rotulo: 'Últimos 7 dias' },
              { valor: 'antigos', rotulo: 'Mais de 7 dias' },
            ] as const).map((op) => (
              <Chip
                key={op.valor}
                ativo={periodo === op.valor}
                onClick={() => setPeriodo(op.valor)}
                perigo={op.valor === 'antigos' && contagemPeriodo.antigos > 0}
              >
                {op.rotulo} ({contagemPeriodo[op.valor]})
              </Chip>
            ))}

            <span className="mx-2 h-4 w-px bg-border" />
            <span className="mr-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">Ordem</span>
            <Chip ativo={ordem === 'antigos'} onClick={() => setOrdem('antigos')}>
              <ArrowDownWideNarrow className="mr-1 inline h-3 w-3" />
              Mais antigos
            </Chip>
            <Chip ativo={ordem === 'recentes'} onClick={() => setOrdem('recentes')}>
              <ArrowUpNarrowWide className="mr-1 inline h-3 w-3" />
              Mais recentes
            </Chip>
          </div>

          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou vendedor..."
            className="h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Listing queue */}
        <AnimatePresence>
          <div className="space-y-3">
            {listings.map((listing, i) => {
              const imgs = parseImages(listing.images);
              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <Card className="bg-card border-border hover:border-primary/20 transition-colors">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 p-4">
                        {/* Image */}
                        <div className="w-20 h-20 rounded-md overflow-hidden bg-secondary shrink-0">
                          {imgs[0] ? (
                            <img src={imgs[0]} alt={listing.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem foto</div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium truncate">{listing.title}</h3>
                            <Badge variant="outline" className="text-[10px] border-border shrink-0">
                              {listing.type === 'auction' ? 'Modo Lance' : 'Venda Direta'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-1">
                            <span>{conditionLabel(listing.condition)}</span>
                            <span>·</span>
                            {/* Em leilão o valor de referência é o lance inicial;
                                `priceInCents` vem vazio e mostrava só um traço. */}
                            {valorPrincipal(listing) ? (
                              <span className="font-medium text-foreground">
                                {listing.type === 'auction' && 'Inicial '}
                                {valorPrincipal(listing)}
                              </span>
                            ) : (
                              <span className="font-medium text-destructive">Sem valor</span>
                            )}
                            <span>·</span>
                            <span>{nomeCategoria(listing.categoryId) ?? 'Sem categoria'}</span>
                            <span>·</span>
                            <span className={imgs.length < MIN_PHOTOS ? 'text-destructive' : undefined}>
                              {imgs.length} {imgs.length === 1 ? 'foto' : 'fotos'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span>Vendedor: <span className="text-foreground">{listing.sellerName || listing.sellerId}</span></span>
                            <span
                              className="flex items-center gap-1"
                              title={`Enviado em ${dataCompleta(listing.createdAt)}`}
                            >
                              <Clock className="h-3 w-3" />
                              {timeAgo(listing.createdAt)}
                            </span>
                            {/* Resumo do que falta, para dar pra triar sem abrir. */}
                            {(() => {
                              const faltas = pendenciasDe(listing);
                              if (faltas.length === 0) return null;
                              return (
                                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">
                                  {faltas.join(' · ')}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openDetail(listing)}
                            aria-label={`Ver detalhes de ${listing.title}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-accent/30 text-accent hover:bg-accent/10"
                            onClick={() => openReject(listing)}
                            disabled={ocupado(listing.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reprovar
                          </Button>
                          <Button
                            variant="kolecta"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleApprove(listing.id)}
                            disabled={ocupado(listing.id)}
                          >
                            {ocupado(listing.id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>

        {listings.length === 0 && (
          filtroAtivo ? (
            <div className="py-16 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum anúncio com esse filtro.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setFiltroCategoria('todas');
                  setFiltroTipo('todos');
                  setSoPendencia(false);
                  setPeriodo('todos');
                  setBusca('');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="text-center py-20">
              <Check className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h2 className="font-heading text-xl font-bold uppercase mb-2">Tudo revisado!</h2>
              <p className="text-sm text-muted-foreground">Não há anúncios pendentes de aprovação.</p>
            </div>
          )
        )}

        {/* Detail dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold uppercase">Detalhe do Anúncio</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Revise todas as informações antes de aprovar ou reprovar.
              </DialogDescription>
            </DialogHeader>
            {selectedListing && (() => {
              const imgs = parseImages(selectedListing.images);
              return (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-32 h-32 rounded-md overflow-hidden bg-secondary shrink-0">
                      {imgs[0] ? (
                        <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem foto</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading text-base font-bold mb-1">{selectedListing.title}</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{selectedListing.type === 'auction' ? 'Modo Lance' : 'Venda Direta'}</Badge>
                        <Badge variant="outline" className="text-xs">{conditionLabel(selectedListing.condition)}</Badge>
                        {selectedListing.brand && <Badge variant="outline" className="text-xs">{selectedListing.brand}</Badge>}
                        {selectedListing.scale && <Badge variant="outline" className="text-xs">Escala {selectedListing.scale}</Badge>}
                      </div>
                      {/* Formatada também aqui: é o texto que o comprador vai
                          ler, então a moderação precisa ver o resultado final. */}
                      <ProductDescription texto={selectedListing.description} />
                    </div>
                  </div>

                  {/* Ficha completa: é aqui que se pega inconsistência antes de
                      aprovar, então nada de esconder campo vazio. O que falta
                      aparece em vermelho em vez de simplesmente não existir. */}
                  <div className="grid gap-x-6 sm:grid-cols-2">
                    <div className="rounded-md border border-border bg-secondary/20 p-3">
                      <p className="mb-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">Item</p>
                      <Dado rotulo="Categoria" valor={nomeCategoria(selectedListing.categoryId) ?? 'Sem categoria'} alerta={!selectedListing.categoryId} />
                      <Dado rotulo="Condição" valor={conditionLabel(selectedListing.condition) || 'Não informada'} alerta={!selectedListing.condition} />

                      {/* Só os campos que ESTA categoria pergunta. Antes aqui
                          saíam as colunas cruas do banco, então carta aparecia
                          com "Escala: não informada" em vermelho, sendo que
                          escala nem é perguntada para carta. */}
                      {(() => {
                        const slug = slugCategoria(selectedListing.categoryId);
                        const campos = fieldsForCategory(slug);
                        const valores = valoresDoAnuncio(selectedListing);

                        if (campos.length === 0) {
                          return (
                            <Dado
                              rotulo="Detalhes"
                              valor={slug ? 'Categoria sem campos definidos' : 'Categoria desconhecida'}
                              alerta
                            />
                          );
                        }

                        return campos
                          .filter((campo) => isFieldApplicable(campo, valores))
                          .map((campo) => {
                            const texto = formatFieldValue(valores[campo.key]);
                            return (
                              <Dado
                                key={campo.key}
                                rotulo={campo.label}
                                valor={texto ?? (campo.required ? 'Faltando' : 'Não informado')}
                                // Vermelho só no que a categoria realmente exige.
                                alerta={campo.required && !texto}
                              />
                            );
                          });
                      })()}

                      <Dado rotulo="Fotos" valor={`${imgs.length} de ${MAX_PHOTOS}`} alerta={imgs.length < MIN_PHOTOS} />
                      {/* Só quando o vendedor usa: SKU vazio não é problema. */}
                      {selectedListing.sku && <Dado rotulo="SKU" valor={selectedListing.sku} />}
                    </div>

                    <div className="rounded-md border border-border bg-secondary/20 p-3">
                      <p className="mb-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
                        {selectedListing.type === 'auction' ? 'Modo Lance' : 'Venda direta'}
                      </p>

                      {selectedListing.type === 'auction' ? (
                        // A fila (/api/admin/listings) ainda não devolve a config
                        // do leilão, que vive na tabela `auctions`. Sem esses
                        // valores não dá para revisar reserva nem incremento,
                        // então avisamos em vez de mostrar um traço mudo.
                        typeof selectedListing.startingBidInCents === 'number' ? (
                          <>
                            <Dado rotulo="Lance inicial" valor={brl(selectedListing.startingBidInCents)} />
                            <Dado rotulo="Incremento mínimo" valor={brl(selectedListing.minIncrementInCents) ?? 'Não definido'} alerta={selectedListing.minIncrementInCents == null} />
                            <Dado rotulo="Preço de reserva" valor={brl(selectedListing.reservePriceInCents) ?? 'Sem reserva'} />
                            <Dado rotulo="Duração" valor={selectedListing.durationHours ? `${Math.round(selectedListing.durationHours / 24)} dias` : 'Não definida'} alerta={!selectedListing.durationHours} />
                            <Dado rotulo="Anti-sniper" valor={selectedListing.antiSniper ? 'Ligado' : 'Desligado'} />
                          </>
                        ) : (
                          <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 p-2">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                            <p className="text-[11px] leading-relaxed text-destructive">
                              O backend ainda não envia a configuração do leilão nesta tela
                              (lance inicial, incremento, reserva e duração). Confira esses
                              valores no anúncio antes de aprovar.
                            </p>
                          </div>
                        )
                      ) : (
                        <Dado
                          rotulo="Preço"
                          valor={brl(selectedListing.priceInCents) ?? 'Sem preço'}
                          alerta={selectedListing.priceInCents == null}
                        />
                      )}

                      <div className="my-2 border-t border-border" />
                      <p className="mb-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">Envio</p>
                      {(() => {
                        const frete = resumoFrete(selectedListing);
                        return <Dado rotulo="Peso e medidas" valor={frete.texto} alerta={frete.faltando} />;
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border">
                    <div>
                      <span className="text-xs text-muted-foreground">Vendedor</span>
                      <div className="text-sm font-medium">{selectedListing.sellerName || selectedListing.sellerId}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">
                        {selectedListing.type === 'auction' ? 'Lance inicial' : 'Preço'}
                      </span>
                      <div className="font-heading text-lg font-bold text-primary">
                        {valorPrincipal(selectedListing) ?? (
                          <span className="text-destructive">Sem valor</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Image gallery */}
                  {imgs.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {imgs.map((url, idx) => (
                        <div key={idx} className="w-20 h-20 rounded-md overflow-hidden bg-secondary shrink-0">
                          <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            <DialogFooter>
              <Button
                variant="outline"
                className="border-accent/30 text-accent hover:bg-accent/10"
                onClick={() => selectedListing && openReject(selectedListing)}
                disabled={updateStatus.isPending}
              >
                <X className="h-4 w-4" /> Reprovar
              </Button>
              <Button
                variant="kolecta"
                onClick={() => selectedListing && handleApprove(selectedListing.id)}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Aprovar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold uppercase text-accent">Reprovar Anúncio</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Marque tudo que precisa ser corrigido. O vendedor recebe a lista
                inteira, no painel e por e-mail.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {/* O que a tela detectou já vem marcado; o admin ajusta. */}
              {rejectReasons.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {rejectReasons.length} {rejectReasons.length === 1 ? 'motivo marcado' : 'motivos marcados'}
                </p>
              )}
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {MOTIVOS_REPROVACAO.map((reason) => {
                  const marcado = rejectReasons.includes(reason);
                  return (
                    <button
                      key={reason}
                      type="button"
                      role="checkbox"
                      aria-checked={marcado}
                      onClick={() => toggleMotivo(reason)}
                      className={`flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        marcado
                          ? 'border border-accent/30 bg-accent/10 text-accent'
                          : 'border border-transparent bg-secondary/30 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          marcado ? 'border-accent bg-accent text-accent-foreground' : 'border-muted-foreground/40'
                        }`}
                        aria-hidden="true"
                      >
                        {marcado && <Check className="h-3 w-3" />}
                      </span>
                      {reason}
                    </button>
                  );
                })}
              </div>
              <Textarea
                placeholder="Observações adicionais (opcional)..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
              <Button
                variant="accent"
                onClick={handleReject}
                disabled={rejectReasons.length === 0 || updateStatus.isPending}
              >
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Confirmar Reprovação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
