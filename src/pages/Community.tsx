import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Layout from '@/components/layout/Layout';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Heart,
  Bookmark,
  MessageCircle,
  Flag,
  Plus,
  TrendingUp,
  Sparkles,
  Loader2,
  ImagePlus,
  X,
  Send,
} from 'lucide-react';
import {
  useCommunityFeed,
  useCommunityHighlights,
  useCommunityTrends,
  useCommunityComments,
  useCreateCommunityPost,
  useTogglePostLike,
  useTogglePostSave,
  useAddCommunityComment,
  useReportCommunity,
  useCategories,
  useMyListings,
  useUploadImage,
} from '@/hooks/use-api';
import type {
  CommunityPost,
  CommunityPostType,
  CreatePostPayload,
} from '@/lib/api';

const SORTS = [
  { value: 'relevantes', label: 'Relevantes' },
  { value: 'recentes', label: 'Recentes' },
  { value: 'mais_curtidos', label: 'Mais curtidos' },
  { value: 'mais_salvos', label: 'Mais salvos' },
  { value: 'com_produto', label: 'Com produto' },
];

const TYPE_LABELS: Record<CommunityPostType, string> = {
  collection: 'Coleção',
  product: 'Produto',
  discussion: 'Discussão',
  guide: 'Guia',
};

const POST_TYPES: CommunityPostType[] = ['collection', 'discussion', 'guide', 'product'];

function formatBRL(cents: number | null) {
  if (cents == null) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Card de produto vinculado ─────────────────────────────────────────────────

function LinkedProduct({ listing }: { listing: NonNullable<CommunityPost['listing']> }) {
  const thumb = listing.images?.[0] ?? '/placeholder.svg';
  return (
    <Link
      to={`/produto/${listing.id}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-2 hover:border-primary/40 transition-colors"
    >
      <img src={thumb} alt={listing.title} className="h-14 w-14 rounded-md object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{listing.title}</p>
        <p className="font-heading font-bold text-primary">{formatBRL(listing.priceInCents)}</p>
      </div>
      <Badge variant="outline" className="shrink-0 text-[10px]">Ver produto</Badge>
    </Link>
  );
}

// ─── Comentários (lazy) ─────────────────────────────────────────────────────────

function CommentsSection({ postId }: { postId: string }) {
  const { isSignedIn } = useAuth();
  const { data: comments = [], isLoading } = useCommunityComments(postId);
  const addComment = useAddCommunityComment(postId);
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    addComment.mutate(text.trim(), { onSuccess: () => setText('') });
  };

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {isSignedIn ? (
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um comentário…"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <Button size="icon" onClick={submit} disabled={addComment.isPending || !text.trim()}>
            {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          <Link to="/entrar" className="text-primary underline">Entre</Link> para comentar.
        </p>
      )}

      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">Seja o primeiro a comentar.</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="text-sm">
            <span className="font-medium">{c.author?.name ?? 'Usuário'}</span>{' '}
            <span className="text-[10px] text-muted-foreground">· {timeAgo(c.createdAt)}</span>
            <p className="text-muted-foreground">{c.body}</p>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Card de post ──────────────────────────────────────────────────────────────

function PostCard({ post }: { post: CommunityPost }) {
  const { isSignedIn } = useAuth();
  const like = useTogglePostLike();
  const save = useTogglePostSave();
  const report = useReportCommunity();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const onLike = () => {
    if (!isSignedIn) return;
    setLiked((v) => !v);
    like.mutate(post.id);
  };
  const onSave = () => {
    if (!isSignedIn) return;
    setSaved((v) => !v);
    save.mutate(post.id);
  };
  const onReport = () => {
    if (!isSignedIn) return;
    report.mutate({ targetType: 'post', targetId: post.id, reason: 'spam' });
  };

  return (
    <article className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{post.author?.name ?? 'Usuário'}</span>
          <span className="text-[10px] text-muted-foreground">· {timeAgo(post.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[post.type]}</Badge>
          {post.category && <Badge variant="outline" className="text-[10px]">{post.category.name}</Badge>}
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-bold">{post.title}</h3>
        {post.body && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{post.body}</p>}
      </div>

      {post.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {post.images.slice(0, 3).map((img, i) => (
            <img key={i} src={img} alt="" className="aspect-square w-full rounded-md object-cover" />
          ))}
        </div>
      )}

      {post.listing && <LinkedProduct listing={post.listing} />}

      <div className="flex items-center gap-4 pt-1 text-sm text-muted-foreground">
        <button onClick={onLike} className="flex items-center gap-1 hover:text-primary transition-colors" aria-label="Curtir">
          <Heart className={`h-4 w-4 ${liked ? 'fill-primary text-primary' : ''}`} />
          {post.likeCount + (liked ? 1 : 0)}
        </button>
        <button onClick={() => setShowComments((v) => !v)} className="flex items-center gap-1 hover:text-primary transition-colors" aria-label="Comentar">
          <MessageCircle className="h-4 w-4" />
          {post.commentCount}
        </button>
        <button onClick={onSave} className="flex items-center gap-1 hover:text-primary transition-colors" aria-label="Salvar">
          <Bookmark className={`h-4 w-4 ${saved ? 'fill-primary text-primary' : ''}`} />
          {post.saveCount + (saved ? 1 : 0)}
        </button>
        <button onClick={onReport} className="ml-auto hover:text-destructive transition-colors" aria-label="Denunciar">
          <Flag className="h-4 w-4" />
        </button>
      </div>

      {showComments && <CommentsSection postId={post.id} />}
    </article>
  );
}

// ─── Dialog de criar publicação ──────────────────────────────────────────────────

function CreatePostDialog() {
  const { isSignedIn } = useAuth();
  const createPost = useCreateCommunityPost();
  const uploadImage = useUploadImage();
  const { data: categories = [] } = useCategories();
  const { data: myListings = [] } = useMyListings();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CommunityPostType>('collection');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [listingId, setListingId] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);

  const activeListings = myListings.filter((l) => l.status === 'active');

  const reset = () => {
    setType('collection');
    setTitle('');
    setBody('');
    setCategoryId('');
    setListingId('');
    setImages([]);
  };

  const onUpload = (file: File) => {
    if (images.length >= 8) return;
    uploadImage.mutate(file, { onSuccess: (d) => setImages((p) => [...p, d.url]) });
  };

  const canSubmit =
    title.trim().length > 0 && (type !== 'product' || !!listingId);

  const submit = () => {
    const payload: CreatePostPayload = {
      type,
      title: title.trim(),
      body: body || undefined,
      categoryId: categoryId || undefined,
      images: images.length ? images : undefined,
      listingId: type === 'product' ? listingId : undefined,
    };
    createPost.mutate(payload, {
      onSuccess: () => {
        reset();
        setOpen(false);
      },
    });
  };

  if (!isSignedIn) {
    return (
      <Button asChild variant="kolecta" className="gap-1.5">
        <Link to="/entrar"><Plus className="h-4 w-4" /> Criar publicação</Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="kolecta" className="gap-1.5"><Plus className="h-4 w-4" /> Criar publicação</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova publicação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tipo</label>
            <Select value={type} onValueChange={(v) => setType(v as CommunityPostType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POST_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Sobre o que é a sua publicação?" />
          </div>

          <div>
            <label className="text-sm font-medium">Texto</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={8000} placeholder="Conte mais…" />
          </div>

          <div>
            <label className="text-sm font-medium">Categoria</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'product' && (
            <div>
              <label className="text-sm font-medium">Produto vinculado (seus anúncios ativos)</label>
              <Select value={listingId} onValueChange={setListingId}>
                <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                <SelectContent>
                  {activeListings.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum anúncio ativo.</div>
                  ) : (
                    activeListings.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Imagens</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative h-16 w-16">
                  <img src={img} alt="" className="h-full w-full rounded-md object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute -right-1 -top-1 rounded-full bg-background border border-border p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 8 && (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary">
                  {uploadImage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={!canSubmit || createPost.isPending} variant="kolecta">
            {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bloco "Em alta" ─────────────────────────────────────────────────────────────

function HighlightsBar() {
  const { data, isLoading } = useCommunityHighlights();
  if (isLoading) return <Skeleton className="h-24 w-full rounded-lg" />;
  if (!data) return null;

  const cards = [
    data.topPost && { label: 'Post em alta', value: data.topPost.title, to: undefined },
    data.topProductPost && { label: 'Produto mais salvo', value: data.topProductPost.title, to: undefined },
    data.topCategory && { label: 'Categoria em crescimento', value: `${data.topCategory.icon ?? ''} ${data.topCategory.name}`, to: `/categoria/${data.topCategory.slug}` },
  ].filter(Boolean) as { label: string; value: string; to?: string }[];

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((c, i) => (
        <div key={i} className="rounded-lg border border-border bg-gradient-card p-4">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> {c.label}
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-medium">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Top Trends (sidebar) ────────────────────────────────────────────────────────

function TrendsSidebar() {
  const { data } = useCommunityTrends('24h');
  const posts = data?.posts ?? [];
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-20 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-1.5 font-heading text-sm font-bold uppercase">
          <TrendingUp className="h-4 w-4 text-primary" /> Top Trends · 24h
        </h3>
        {posts.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Sem destaques ainda.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {posts.slice(0, 5).map((p, i) => (
              <li key={p.id} className="flex gap-2 text-sm">
                <span className="font-heading font-bold text-primary">{i + 1}</span>
                <span className="line-clamp-2">{p.title}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [sort, setSort] = useState('relevantes');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const { data: categories = [] } = useCategories();
  const { data: feed, isLoading } = useCommunityFeed({ sort, categoryId });
  const posts = feed?.data ?? [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8 rounded-xl border border-border bg-gradient-card p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="font-heading text-3xl font-extrabold italic uppercase">Comunidade Collecta</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Descubra coleções, produtos e tendências em alta entre colecionadores. Compartilhe achados e acompanhe o que a comunidade está salvando.
              </p>
            </div>
            <CreatePostDialog />
          </div>
        </div>

        {/* Em alta */}
        <section className="mb-8">
          <HighlightsBar />
        </section>

        {/* Categorias */}
        <section className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryId(undefined)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${!categoryId ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${categoryId === c.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          {/* Feed */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold uppercase">Feed</h2>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-lg" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Ainda não há publicações"
                description="Seja o primeiro a compartilhar algo com a comunidade."
              />
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>

          <TrendsSidebar />
        </div>
      </div>
    </Layout>
  );
}
