import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Upload, X, Loader2, CheckCircle2, ImagePlus, PackageOpen,
} from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMyListings, useUploadImage } from '@/hooks/use-api';
// Clerk direto só para o token (mesmo padrão interno de hooks/use-api). O user/
// role continua vindo do AuthContext nas telas; aqui é só o Bearer do upload.
import { useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { casarPorSku } from '@/lib/casar-fotos';

// Foto local: o File puro não serve de key nem de id de seleção, e o preview
// precisa de um objectURL. `ordem` vem do casamento por SKU (menor = capa).
interface FotoLocal {
  id: string;
  file: File;
  preview: string;
  listingId: string | null;
  ordem: number;
}

const MAX_POR_PRODUTO = 8;

export default function BulkPhotosPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: listings, isLoading } = useMyListings();
  const uploadImage = useUploadImage();

  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 });
  const [concluido, setConcluido] = useState<{ enviados: number; semFoto: number } | null>(null);

  // Rascunhos sem foto: o que a importação criou como "falta foto" (e qualquer
  // rascunho manual ainda sem imagem). São os produtos que a tela preenche.
  const produtos = useMemo(() => {
    return (listings ?? []).filter((l) => {
      if (l.status !== 'draft') return false;
      const imgs = l.images ? safeParse(l.images) : [];
      return imgs.length === 0;
    });
  }, [listings]);

  const skus = useMemo(
    () => produtos.map((p) => p.sku ?? '').filter(Boolean),
    [produtos],
  );

  // Limpa os objectURLs ao desmontar (senão vaza memória a cada preview).
  useEffect(() => {
    return () => { fotos.forEach((f) => URL.revokeObjectURL(f.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function adicionarArquivos(files: FileList | File[]) {
    const novos: FotoLocal[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const casou = casarPorSku(file.name, skus);
      const listingId = casou
        ? produtos.find((p) => p.sku === casou.sku)?.id ?? null
        : null;
      novos.push({
        id: `${file.name}-${file.size}-${Math.round(file.lastModified)}-${novos.length}`,
        file,
        preview: URL.createObjectURL(file),
        listingId,
        ordem: casou?.ordem ?? 999,
      });
    }
    setFotos((atual) => [...atual, ...novos]);
    const casadas = novos.filter((f) => f.listingId).length;
    toast({
      title: `${novos.length} foto(s) adicionada(s)`,
      description: casadas > 0
        ? `${casadas} casaram automaticamente pelo SKU. O resto está na bandeja.`
        : 'Toque numa foto e depois no produto para encaixar.',
    });
  }

  const bandeja = fotos.filter((f) => !f.listingId);
  function fotosDoProduto(id: string) {
    return fotos
      .filter((f) => f.listingId === id)
      .sort((a, b) => a.ordem - b.ordem);
  }

  function toggleSelecao(id: string) {
    setSelecionadas((s) => {
      const nova = new Set(s);
      nova.has(id) ? nova.delete(id) : nova.add(id);
      return nova;
    });
  }

  // Coração da interação adaptativa: escolhe fotos na bandeja, toca no produto.
  function encaixarNo(listingId: string) {
    if (selecionadas.size === 0) return;
    const jaTem = fotosDoProduto(listingId).length;
    if (jaTem + selecionadas.size > MAX_POR_PRODUTO) {
      toast({
        title: 'Muitas fotos',
        description: `Cada anúncio aceita até ${MAX_POR_PRODUTO}.`,
        variant: 'destructive',
      });
      return;
    }
    setFotos((atual) =>
      atual.map((f) =>
        selecionadas.has(f.id) ? { ...f, listingId, ordem: 999 } : f,
      ),
    );
    setSelecionadas(new Set());
  }

  function tirarDoProduto(id: string) {
    setFotos((atual) =>
      atual.map((f) => (f.id === id ? { ...f, listingId: null } : f)),
    );
  }

  async function enviarTudo() {
    const comFoto = produtos.filter((p) => fotosDoProduto(p.id).length > 0);
    if (comFoto.length === 0) {
      toast({ title: 'Nenhuma foto encaixada ainda', variant: 'destructive' });
      return;
    }
    setEnviando(true);
    setProgresso({ feito: 0, total: comFoto.length });
    const token = (await getToken()) || '';
    let enviados = 0;

    for (const p of comFoto) {
      try {
        const arquivos = fotosDoProduto(p.id);
        const urls: string[] = [];
        // Sobe uma a uma (o hook comprime cada foto antes de hospedar).
        for (const f of arquivos) {
          const { url } = await uploadImage.mutateAsync(f.file);
          urls.push(url);
        }
        await api.listings.update(token, p.id, { images: JSON.stringify(urls) });
        // Rascunho → fila de análise (a peneira do backend confere as fotos).
        await api.listings.publish(token, p.id);
        enviados++;
      } catch (err) {
        toast({
          title: `Falha em "${p.title}"`,
          description: (err as Error).message,
          variant: 'destructive',
        });
      }
      setProgresso((pr) => ({ ...pr, feito: pr.feito + 1 }));
    }

    setEnviando(false);
    setConcluido({ enviados, semFoto: produtos.length - comFoto.length });
  }

  // ── Estados de página ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </SellerLayout>
    );
  }

  if (concluido) {
    return (
      <SellerLayout>
        <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="font-heading text-2xl font-bold">Fotos enviadas!</h1>
          <p className="text-muted-foreground">
            {concluido.enviados} anúncio(s) foram para análise com as fotos.
            {concluido.semFoto > 0 && ` ${concluido.semFoto} ainda estão sem foto e ficaram como rascunho.`}
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="kolecta" asChild>
              <Link to="/painel/anuncios">Ver meus anúncios</Link>
            </Button>
            {concluido.semFoto > 0 && (
              <Button variant="outline" onClick={() => { setConcluido(null); setFotos([]); }}>
                Continuar anexando
              </Button>
            )}
          </div>
        </div>
      </SellerLayout>
    );
  }

  if (produtos.length === 0) {
    return (
      <SellerLayout>
        <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
          <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="font-heading text-2xl font-bold">Nenhum anúncio esperando foto</h1>
          <p className="text-muted-foreground">
            Quando você importar uma planilha sem foto, os anúncios aparecem aqui
            para você anexar as imagens de uma vez.
          </p>
          <Button variant="kolecta" asChild>
            <Link to="/painel/anuncios/importar">Importar planilha</Link>
          </Button>
        </div>
      </SellerLayout>
    );
  }

  const totalEncaixadas = fotos.filter((f) => f.listingId).length;

  return (
    <SellerLayout>
      {/* pb grande: a bandeja fixa do celular não pode tampar o último produto. */}
      <div className="mx-auto max-w-5xl space-y-6 pb-40 lg:pb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/painel/anuncios"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Anexar fotos</h1>
            <p className="text-sm text-muted-foreground">
              {produtos.length} anúncio(s) esperando foto. Solte as imagens e encaixe em cada um.
            </p>
          </div>
        </div>

        {/* Dropzone */}
        <div
          className="cursor-pointer rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); adicionarArquivos(e.dataTransfer.files); }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) adicionarArquivos(e.target.files); e.target.value = ''; }}
          />
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Solte todas as fotos aqui, ou toque para escolher</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dica: nomeie como <code className="text-primary">SKU-1.jpg</code>, <code className="text-primary">SKU-2.jpg</code> que encaixamos sozinhos
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Produtos */}
          <div className="grid gap-3 sm:grid-cols-2">
            {produtos.map((p) => {
              const suas = fotosDoProduto(p.id);
              const podeReceber = selecionadas.size > 0;
              return (
                <Card
                  key={p.id}
                  onClick={() => podeReceber && encaixarNo(p.id)}
                  className={`transition-colors ${
                    podeReceber ? 'cursor-pointer border-primary/60 ring-1 ring-primary/30' : ''
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium">{p.title}</p>
                      {p.sku && (
                        <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {p.sku}
                        </code>
                      )}
                    </div>
                    {suas.length === 0 ? (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ImagePlus className="h-3.5 w-3.5" /> Sem foto ainda
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {suas.map((f, i) => (
                          <div key={f.id} className="relative">
                            <img
                              src={f.preview}
                              alt=""
                              className={`h-12 w-12 rounded object-cover ${i === 0 ? 'ring-2 ring-primary' : ''}`}
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); tirarDoProduto(f.id); }}
                              className="absolute -right-1 -top-1 rounded-full bg-background/90 p-0.5 shadow"
                              aria-label="Remover foto"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {suas.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                        A primeira (borda amarela) é a capa.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Bandeja: coluna no desktop, barra fixa no celular */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-3 lg:static lg:z-auto lg:self-start lg:rounded-lg lg:border">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium">
                Bandeja {bandeja.length > 0 && `(${bandeja.length})`}
              </p>
              {selecionadas.size > 0 && (
                <span className="text-[11px] text-primary">
                  {selecionadas.size} selecionada(s) — toque no produto
                </span>
              )}
            </div>
            {bandeja.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {fotos.length === 0 ? 'Suas fotos aparecem aqui.' : 'Tudo encaixado. 🎉'}
              </p>
            ) : (
              <div className="flex max-h-24 gap-1.5 overflow-x-auto overflow-y-hidden lg:max-h-[60vh] lg:flex-wrap lg:overflow-y-auto">
                {bandeja.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => toggleSelecao(f.id)}
                    className={`relative shrink-0 ${selecionadas.has(f.id) ? 'ring-2 ring-primary' : ''}`}
                  >
                    <img src={f.preview} alt={f.file.name} className="h-14 w-14 rounded object-cover" />
                    {selecionadas.has(f.id) && (
                      <span className="absolute inset-0 flex items-center justify-center rounded bg-primary/30">
                        <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <Button
              variant="kolecta"
              className="mt-3 w-full"
              disabled={enviando || totalEncaixadas === 0}
              onClick={enviarTudo}
            >
              {enviando
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando {progresso.feito}/{progresso.total}…</>
                : <>Enviar {totalEncaixadas} foto(s) para análise</>}
            </Button>
            {enviando && (
              <Progress
                value={progresso.total ? (progresso.feito / progresso.total) * 100 : 0}
                className="mt-2 h-1.5"
              />
            )}
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}

function safeParse(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
