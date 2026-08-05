// Moderação da comunidade.
//
// Não existia tela nenhuma. O schema tinha `status: active | hidden | removed`
// em posts E em comentários desde o começo, e o backend só sabia moderar post:
// comentário tinha a coluna e não tinha botão.
//
// O que expôs isso foi concreto: três comentários no ar apontando para a loja
// de um concorrente, um terço de tudo que havia sido comentado, e nenhuma forma
// de tirar do ar sem mexer no banco na mão.
//
// A lista mostra o que JÁ FOI ocultado também. A listagem pública só mostra
// `active`, então uma tela que escondesse o mesmo não teria como desfazer nada.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeOff, Trash2, RotateCcw, Loader2, MessageSquare, FileText, ExternalLink } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useComunidadeAdmin, useModerarComunidade } from '@/hooks/use-api';
import type { ItemComunidade } from '@/lib/api';

const FILTROS = [
  { chave: 'todos', rotulo: 'Tudo' },
  { chave: 'active', rotulo: 'No ar' },
  { chave: 'hidden', rotulo: 'Ocultos' },
  { chave: 'removed', rotulo: 'Removidos' },
];

const SELO: Record<string, { rotulo: string; cls: string }> = {
  active: { rotulo: 'No ar', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  hidden: { rotulo: 'Oculto', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  removed: { rotulo: 'Removido', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
};

/** Link externo em comentário é o padrão do spam de concorrente. */
const TEM_LINK = /https?:\/\/\S+/i;

export default function AdminCommunityPage() {
  const [filtro, setFiltro] = useState('todos');
  const { data: itens, isLoading } = useComunidadeAdmin(filtro);
  const moderar = useModerarComunidade();

  const comLink = (itens ?? []).filter(
    (i) => i.status === 'active' && TEM_LINK.test(String(i.corpo ?? '')),
  );

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-extrabold italic uppercase">Comunidade</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ocultar tira da vista e dá para desfazer. Remover é para o que não volta.
            Nos dois casos o texto fica no banco, para servir de prova se o autor
            for banido depois.
          </p>
        </div>

        {/* Link externo é o sinal mais barato de spam de concorrente, e foi
            exatamente assim que o problema apareceu. */}
        {comLink.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-start gap-2">
              <ExternalLink className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>{comLink.length} publicação(ões) no ar com link externo.</strong>{' '}
                Nem todo link é spam, mas vale olhar.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <Button
              key={f.chave}
              size="sm"
              variant={filtro === f.chave ? 'kolecta' : 'outline'}
              onClick={() => setFiltro(f.chave)}
            >
              {f.rotulo}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : (itens ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            Nada aqui.
          </p>
        ) : (
          <div className="space-y-2">
            {(itens ?? []).map((item) => (
              <Linha
                key={`${item.tipo}-${item.id}`}
                item={item}
                pendente={moderar.isPending}
                onAcao={(acao) => moderar.mutate({ tipo: item.tipo, id: item.id, acao })}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Linha({
  item, pendente, onAcao,
}: {
  item: ItemComunidade;
  pendente: boolean;
  onAcao: (acao: 'hide' | 'remove' | 'restore') => void;
}) {
  const selo = SELO[item.status] ?? SELO.active;
  const Icone = item.tipo === 'post' ? FileText : MessageSquare;
  const temLink = TEM_LINK.test(String(item.corpo ?? ''));

  return (
    <Card className={temLink && item.status === 'active' ? 'border-amber-500/40' : ''}>
      <CardContent className="p-4 flex items-start gap-3">
        <Icone className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`text-xs border ${selo.cls}`}>{selo.rotulo}</Badge>
            <span className="text-xs text-muted-foreground">
              {item.tipo === 'post' ? 'Publicação' : 'Comentário'} de {item.autor ?? 'usuário'}
            </span>
            {item.postId && (
              <Link
                to={`/comunidade/${item.postId}`}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                ver a publicação
              </Link>
            )}
          </div>

          {item.titulo && <p className="text-sm font-medium">{item.titulo}</p>}
          {item.corpo && (
            <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">
              {item.corpo.length > 300 ? `${item.corpo.slice(0, 300)}...` : item.corpo}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          {item.status !== 'active' ? (
            <Button size="sm" variant="outline" disabled={pendente} onClick={() => onAcao('restore')}>
              {pendente ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Voltar</span>
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" disabled={pendente} onClick={() => onAcao('hide')}>
                <EyeOff className="h-3.5 w-3.5" /> <span className="ml-1.5">Ocultar</span>
              </Button>
              <Button size="sm" variant="destructive" disabled={pendente} onClick={() => onAcao('remove')}>
                <Trash2 className="h-3.5 w-3.5" /> <span className="ml-1.5">Remover</span>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
