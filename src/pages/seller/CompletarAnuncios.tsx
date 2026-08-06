// Completar anúncios em massa.
//
// Nasceu da importação do Bling. O ERP entrega título, descrição, preço, peso,
// dimensões, marca, SKU e foto, o que já basta para publicar. Mas linha, ano e
// edição ficam vazios, e são justamente os campos que alimentam a busca e os
// filtros da vitrine: o anúncio entra no ar e some da navegação.
//
// Editar um por um não é opção para quem acabou de importar cem.
//
// A regra é a mesma da importação: preenche o que está vazio, não sobrescreve.
// Aplicar "Mainline" a cinquenta anúncios não pode apagar o "Car Culture" que
// três deles já tinham certo.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, ListChecks, AlertTriangle } from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useMyListings, useCompletarEmLote, useCategories } from '@/hooks/use-api';
import { CATEGORY_FIELDS, parseAttributes } from '@/lib/category-fields';
import type { Listing } from '@/lib/api';

/** Colunas próprias; o resto do que a categoria pede vive em `attributes`. */
const COLUNAS = new Set(['brand', 'line', 'scale', 'year', 'edition']);

function valorDoCampo(l: Listing, campo: string): string {
  if (COLUNAS.has(campo)) {
    const v = (l as unknown as Record<string, unknown>)[campo];
    return v == null ? '' : String(v).trim();
  }
  const attrs = parseAttributes(l.attributes);
  const v = attrs[campo];
  return v == null ? '' : String(v).trim();
}

export default function CompletarAnunciosPage() {
  const { data: anuncios = [], isLoading } = useMyListings();
  const { data: categorias = [] } = useCategories();
  const completar = useCompletarEmLote();

  // O anúncio guarda `categoryId`; os campos que a categoria pede são indexados
  // por slug. O select trabalha com o id para não depender dessa tradução.
  const [categoriaId, setCategoriaId] = useState('');
  const [campo, setCampo] = useState('');
  const [valor, setValor] = useState('');
  const [sobrescrever, setSobrescrever] = useState(false);
  const [marcados, setMarcados] = useState<string[]>([]);

  // Só as categorias que de fato pedem campos extras. As outras não têm o que
  // completar, e listá-las seria oferecer um caminho que não leva a nada.
  const opcoesCategoria = useMemo(
    () => categorias.filter((c) => (CATEGORY_FIELDS[c.slug] ?? []).length > 0),
    [categorias],
  );

  const slug = opcoesCategoria.find((c) => c.id === categoriaId)?.slug ?? '';
  const campos = CATEGORY_FIELDS[slug] ?? [];
  const campoAtual = campos.find((c) => c.key === campo);

  // Só os anúncios da categoria escolhida a que FALTA o campo escolhido. Mostrar
  // os que já têm valor seria oferecer trabalho que não precisa ser feito.
  const alvos = useMemo(() => {
    if (!categoriaId || !campo) return [];
    return anuncios.filter(
      (l) =>
        l.categoryId === categoriaId &&
        (sobrescrever || !valorDoCampo(l, campo)),
    );
  }, [anuncios, categoriaId, campo, sobrescrever]);

  const todosMarcados = alvos.length > 0 && marcados.length === alvos.length;

  const trocarCategoria = (v: string) => {
    setCategoriaId(v);
    setCampo('');
    setValor('');
    setMarcados([]);
  };

  const aplicar = () => {
    completar.mutate(
      { ids: marcados, valores: { [campo]: valor }, sobrescrever },
      { onSuccess: () => { setMarcados([]); setValor(''); } },
    );
  };

  return (
    <SellerLayout>
      <div className="p-6 lg:p-8 max-w-4xl space-y-5">
        <Link
          to="/painel/anuncios"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Meus anúncios
        </Link>

        <div>
          <h1 className="font-heading text-2xl font-extrabold italic uppercase">
            Completar anúncios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preencha de uma vez o que ficou em branco. Anúncio importado costuma
            entrar sem linha, ano e edição, e são esses campos que fazem ele
            aparecer na busca e nos filtros.
          </p>
        </div>

        <Card className="bg-gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">O que preencher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="completar-categoria">Categoria</Label>
                <Select value={categoriaId} onValueChange={trocarCategoria}>
                  <SelectTrigger id="completar-categoria">
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesCategoria.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="completar-campo">Campo</Label>
                <Select
                  value={campo}
                  onValueChange={(v) => { setCampo(v); setValor(''); setMarcados([]); }}
                  disabled={!categoriaId}
                >
                  <SelectTrigger id="completar-campo">
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {campos.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="completar-valor">Valor</Label>
                {campoAtual?.options?.length ? (
                  <Select value={valor} onValueChange={setValor} disabled={!campo}>
                    <SelectTrigger id="completar-valor">
                      <SelectValue placeholder="Escolha" />
                    </SelectTrigger>
                    <SelectContent>
                      {campoAtual.options.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="completar-valor"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    disabled={!campo}
                    placeholder="Ex: Mainline"
                  />
                )}
              </div>
            </div>

            {/* Sobrescrever existe para o caso legítimo de corrigir em massa,
                mas fica desligado: quem clica em aplicar quase sempre quer
                preencher buraco, não apagar o que já estava certo. */}
            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <div>
                <Label>Substituir o que já está preenchido</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Desligado, só preenche o que está em branco. Ligue apenas para
                  corrigir um valor que entrou errado em vários anúncios.
                </p>
              </div>
              <Switch checked={sobrescrever} onCheckedChange={(v) => { setSobrescrever(v); setMarcados([]); }} />
            </div>
          </CardContent>
        </Card>

        {campo && (
          <Card className="bg-gradient-card">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-heading text-base">
                  {sobrescrever ? 'Anúncios da categoria' : 'Anúncios sem esse campo'}
                </CardTitle>
                <Badge variant="outline">{alvos.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : alvos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum anúncio precisa disso. Já está tudo preenchido.
                </p>
              ) : (
                <>
                  <label className="flex items-center gap-2 pb-1 cursor-pointer">
                    <Checkbox
                      checked={todosMarcados}
                      onCheckedChange={(v) =>
                        setMarcados(v === true ? alvos.map((l) => l.id) : [])
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      Marcar todos os {alvos.length}
                    </span>
                  </label>

                  <div className="max-h-80 overflow-y-auto space-y-1">
                    {alvos.map((l) => (
                      <label
                        key={l.id}
                        className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-muted/30"
                      >
                        <Checkbox
                          checked={marcados.includes(l.id)}
                          onCheckedChange={(v) =>
                            setMarcados((m) =>
                              v === true ? [...new Set([...m, l.id])] : m.filter((x) => x !== l.id),
                            )
                          }
                        />
                        <span className="text-sm truncate flex-1 min-w-0">{l.title}</span>
                        {sobrescrever && valorDoCampo(l, campo) && (
                          <span className="text-xs text-amber-600 shrink-0">
                            tem: {valorDoCampo(l, campo)}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {sobrescrever && marcados.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Vai <strong className="text-foreground">substituir</strong> o valor
              de {marcados.length} anúncio(s), inclusive dos que já estavam
              preenchidos. Não dá para desfazer de uma vez.
            </p>
          </div>
        )}

        <Button
          variant="kolecta"
          disabled={!campo || !valor.trim() || marcados.length === 0 || completar.isPending}
          onClick={aplicar}
        >
          {completar.isPending
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <ListChecks className="h-4 w-4 mr-2" />}
          Preencher {marcados.length > 0 ? `${marcados.length} anúncio(s)` : ''}
        </Button>
      </div>
    </SellerLayout>
  );
}
