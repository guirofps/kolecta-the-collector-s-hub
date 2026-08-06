// Importar catálogo do Bling.
//
// Irmã da importação por planilha (`BulkImport.tsx`): mesma ideia, fonte
// diferente. E o mesmo princípio, que é o que importa aqui: CONFERIR antes de
// criar. O lojista descobre na tela que 30 dos 200 produtos estão sem a segunda
// foto, e não depois, com 200 anúncios travados na análise.
//
// O Bling não tem categoria da Kolecta nem condição do item, então esses dois
// são escolhidos para o lote inteiro. O que a categoria exige e o ERP não
// guarda (escala, personagem, jogo) aparece como pendência, produto a produto.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Loader2, PackageSearch, Plug,
} from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useBlingStatus, useBlingProdutos, useBlingConferir, useBlingImportar,
} from '@/hooks/use-api';
import { CATEGORY_FIELDS } from '@/lib/category-fields';
import { CONDITIONS } from '@/lib/conditions';
import { formatBRL } from '@/lib/currency';

/** Teto por lote, igual ao do backend: cada produto custa uma ida ao Bling. */
const MAX_LOTE = 30;

export default function BlingImportPage() {
  const { data: status, isLoading: carregandoStatus } = useBlingStatus();
  const conectado = !!status?.connected && !status?.expired;

  const [pagina, setPagina] = useState(1);
  const { data: catalogo, isLoading: carregandoCatalogo } = useBlingProdutos(pagina, conectado);

  const [marcados, setMarcados] = useState<number[]>([]);
  const [categoria, setCategoria] = useState('');
  const [condicao, setCondicao] = useState('');
  // Campos obrigatórios da categoria que o Bling não guarda (escala, jogo,
  // personagem). O lojista preenche uma vez e vale para o lote.
  const [atributos, setAtributos] = useState<Record<string, string>>({});

  const camposDoLote = (CATEGORY_FIELDS[categoria] ?? []).filter((f) => f.required);

  const conferir = useBlingConferir();
  const importar = useBlingImportar();

  const produtos = catalogo?.produtos ?? [];
  const podeConferir = marcados.length > 0 && !!categoria && !!condicao;

  // A conferência vale só para o lote que foi conferido. Mudou a seleção ou as
  // escolhas, o resultado velho engana: some com ele.
  const chaveAtual = useMemo(
    () =>
      [...marcados].sort((a, b) => a - b).join(',') +
      '|' + categoria + '|' + condicao +
      // Os atributos entram na chave: mudar a escala muda o resultado da
      // conferência, e mostrar o resultado antigo enganaria.
      '|' + JSON.stringify(atributos),
    [marcados, categoria, condicao, atributos],
  );
  const [chaveConferida, setChaveConferida] = useState('');
  const conferencia = chaveConferida === chaveAtual ? conferir.data : undefined;

  const alternar = (id: number, marcar: boolean) =>
    setMarcados((atual) =>
      marcar ? [...new Set([...atual, id])] : atual.filter((x) => x !== id),
    );

  const executar = (acao: 'conferir' | 'importar') => {
    // Só manda o que foi preenchido: chave com string vazia sobrescreveria
    // nada, mas polui e confunde na leitura do log.
    const preenchidos = Object.fromEntries(
      Object.entries(atributos).filter(([, v]) => String(v).trim()),
    );
    const body = { ids: marcados, categoria, condicao, atributos: preenchidos };
    if (acao === 'conferir') {
      conferir.mutate(body, { onSuccess: () => setChaveConferida(chaveAtual) });
    } else {
      importar.mutate(body, {
        onSuccess: () => {
          setMarcados([]);
          setChaveConferida('');
        },
      });
    }
  };

  if (carregandoStatus) {
    return (
      <SellerLayout>
        <Skeleton className="h-64 w-full max-w-3xl" />
      </SellerLayout>
    );
  }

  if (!conectado) {
    return (
      <SellerLayout>
        <div className="max-w-2xl space-y-4">
          <Voltar />
          <Card className="bg-gradient-card">
            <CardContent className="p-6 space-y-3">
              <Plug className="h-5 w-5 text-muted-foreground" />
              <p className="font-heading text-lg font-bold">Conecte seu Bling primeiro</p>
              <p className="text-sm text-muted-foreground">
                {status?.expired
                  ? 'Sua conexão expirou. Reconecte para ler o catálogo.'
                  : 'Sem a conexão não há catálogo para ler.'}
              </p>
              <Button variant="kolecta" asChild>
                <Link to="/painel/integracoes">Ir para Integrações</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="max-w-4xl space-y-5">
        <Voltar />
        <div>
          <h1 className="font-heading text-3xl font-bold">Importar do Bling</h1>
          <p className="text-muted-foreground mt-1">
            Escolha os produtos, confira o que falta e só então crie os anúncios.
          </p>
        </div>

        {/* ── Escolhas do lote ── */}
        <Card className="bg-gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">Vale para o lote inteiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              O Bling não guarda categoria nem condição, então esses dois você
              escolhe aqui. Se o lote tiver categorias diferentes, importe em
              lotes separados.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger><SelectValue placeholder="Escolha a categoria" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORY_FIELDS).map((slug) => (
                      <SelectItem key={slug} value={slug}>{slug}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Condição</Label>
                <Select value={condicao} onValueChange={setCondicao}>
                  <SelectTrigger><SelectValue placeholder="Escolha a condição" /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campos que a categoria exige e o ERP não guarda. Escala é o caso
                que travava tudo: sem ela, NENHUM produto de miniaturas passava
                (medido nas duas primeiras lojas conectadas, 10 de 10 recusados).
                Vale como preenchimento: o que o produto já traz do Bling, como
                a marca, continua ganhando. */}
            {camposDoLote.length > 0 && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  O Bling não tem estes campos e a categoria exige. Preenchem o
                  que faltar; o que já veio do produto continua valendo.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {camposDoLote.map((campo) => (
                    <div key={campo.key} className="space-y-1.5">
                      <Label>{campo.label}</Label>
                      {campo.options?.length ? (
                        <Select
                          value={atributos[campo.key] ?? ''}
                          onValueChange={(v) =>
                            setAtributos((a) => ({ ...a, [campo.key]: v }))
                          }
                        >
                          <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                          <SelectContent>
                            {campo.options.map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={atributos[campo.key] ?? ''}
                          onChange={(e) =>
                            setAtributos((a) => ({ ...a, [campo.key]: e.target.value }))
                          }
                          placeholder="opcional"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Catálogo ── */}
        <Card className="bg-gradient-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="font-heading text-base">
                Seu catálogo no Bling
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {marcados.length} de {MAX_LOTE} por lote
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {carregandoCatalogo ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : produtos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum produto nesta página do seu Bling.
              </p>
            ) : (
              produtos.map((p) => {
                const marcado = marcados.includes(p.id);
                const cheio = marcados.length >= MAX_LOTE && !marcado;
                const item = conferencia?.itens.find((i) => i.blingProductId === p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-start gap-3 rounded-md border p-3 ${
                      cheio ? 'opacity-40' : 'cursor-pointer hover:bg-muted/30'
                    } ${item && !item.pronto ? 'border-destructive/40' : 'border-border'}`}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={marcado}
                      disabled={cheio}
                      onCheckedChange={(v) => alternar(p.id, v === true)}
                    />
                    {p.imagem && (
                      <img src={p.imagem} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                    )}
                    <span className="text-sm leading-tight flex-1 min-w-0">
                      <span className="font-medium block truncate">{p.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.sku ? `SKU ${p.sku} · ` : ''}
                        {p.precoEmReais !== null ? formatBRL(p.precoEmReais) : 'sem preço'}
                        {p.estoque !== null ? ` · ${p.estoque} em estoque` : ''}
                        {!p.ativo ? ' · inativo no Bling' : ''}
                      </span>
                      {item && <Pendencias item={item} />}
                    </span>
                  </label>
                );
              })
            )}

            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost" size="sm"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">Página {pagina}</span>
              <Button
                variant="ghost" size="sm"
                disabled={!catalogo?.temMais}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </CardContent>
        </Card>

        {conferencia && <Resumo c={conferencia} />}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline-gold"
            disabled={!podeConferir || conferir.isPending}
            onClick={() => executar('conferir')}
          >
            {conferir.isPending
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <PackageSearch className="h-4 w-4 mr-2" />}
            Conferir {marcados.length > 0 ? `os ${marcados.length}` : ''}
          </Button>
          <Button
            variant="kolecta"
            // Importar só depois de conferir o MESMO lote: sem isso o lojista
            // criaria anúncios sem ver o que faltava, que é o problema todo.
            disabled={!conferencia || conferencia.resumo.prontos === 0 || importar.isPending}
            onClick={() => executar('importar')}
          >
            {importar.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importar {conferencia ? `${conferencia.resumo.prontos} pronto(s)` : ''}
          </Button>
        </div>

        {importar.data && <Resultado r={importar.data} />}
      </div>
    </SellerLayout>
  );
}

function Voltar() {
  return (
    <Link to="/painel/anuncios" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
      <ArrowLeft className="h-4 w-4" /> Meus anúncios
    </Link>
  );
}

function Pendencias({ item }: { item: { pendencias: string[]; jaImportado: boolean; pronto: boolean } }) {
  if (item.jaImportado) {
    return (
      <span className="block text-xs text-muted-foreground mt-1">
        Já virou anúncio antes. Não vou duplicar.
      </span>
    );
  }
  if (item.pronto) {
    return (
      <span className="block text-xs text-emerald-500 mt-1 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Pronto para importar
      </span>
    );
  }
  return (
    <span className="block text-xs text-destructive mt-1">
      {item.pendencias.join(' · ')}
    </span>
  );
}

function Resumo({ c }: { c: { resumo: { total: number; prontos: number; comPendencia: number; jaImportados: number } } }) {
  const { resumo } = c;
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">{resumo.total} conferido(s)</Badge>
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border">
        {resumo.prontos} pronto(s)
      </Badge>
      {resumo.comPendencia > 0 && (
        <Badge className="bg-destructive/15 text-destructive border-destructive/30 border">
          {resumo.comPendencia} com pendência
        </Badge>
      )}
      {resumo.jaImportados > 0 && (
        <Badge variant="outline">{resumo.jaImportados} já importado(s)</Badge>
      )}
    </div>
  );
}

function Resultado({ r }: { r: { criados: Array<{ titulo: string; aviso?: string }>; recusados: Array<{ titulo: string; motivos: string[] }> } }) {
  const comUmaFoto = r.criados.filter((c) => c.aviso);
  return (
    <Card className="bg-gradient-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base">Resultado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="flex items-center gap-2 text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
          {r.criados.length} anúncio(s) criado(s), em análise.
        </p>

        {/* A importação aceita foto única porque o ERP só guarda a principal, e
            exigir duas inviabilizaria trazer um catálogo inteiro. Mas anúncio
            com uma foto vende menos, então o lojista sai daqui sabendo quais
            valem uma segunda foto. */}
        {comUmaFoto.length > 0 && (
          <div className="rounded-md border border-kolecta-gold/30 bg-kolecta-gold/5 p-3 space-y-1">
            <p className="text-xs">
              <strong className="text-foreground">
                {comUmaFoto.length} entrou(entraram) com uma foto só.
              </strong>{' '}
              Passa na análise assim mesmo, mas anúncio com mais fotos vende
              melhor. Vale abrir e completar quando der.
            </p>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/painel/anuncios">Ver meus anúncios</Link>
            </Button>
          </div>
        )}
        {r.recusados.map((x, i) => (
          <p key={i} className="flex items-start gap-2 text-muted-foreground text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
            <span><strong className="text-foreground">{x.titulo}</strong>: {x.motivos.join(' · ')}</span>
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
