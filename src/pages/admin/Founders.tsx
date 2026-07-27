import { useState, useMemo, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Award, Search, Loader2, Medal } from 'lucide-react';
import { useFounderCandidates, useGrantFounder, useAdminUsers, useListings } from '@/hooks/use-api';
import { LIMITE_CATALOGO } from '@/lib/catalogo';
import { fundadoresConcedidos, proximoNumeroDeFundador } from '@/lib/founder-numbers';
import type { FounderCandidate } from '@/lib/api';

// A numeração agora é sequencial e normal: #001, #002, #003... A ideia antiga
// de reservar 1 a 50 para códigos de evento e 51 a 100 para a seleção foi
// abandonada. A concessão real (checada no banco em 25/07) já está em #001 a
// #010, então a tela precisa aceitar a faixa toda a partir de 1, senão a equipe
// não consegue conceder por aqui e depende do dev mexer direto no banco.
const NUMERO_MIN = 1;
const NUMERO_MAX = 100;

/**
 * O #000 é a casa: a conta da marca-mãe, fundadora zero da Kolecta. Fica fora
 * da faixa numerada porque não disputa vaga com ninguém, e por isso a validação
 * o abre à parte.
 */
const NUMERO_DA_CASA = 0;

function initialsOf(name: string | null, fallback: string) {
  const src = (name ?? '').trim();
  if (!src) return fallback.slice(0, 2).toUpperCase();
  const parts = src.split(/\s+/);
  return (
    ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() ||
    fallback.slice(0, 2).toUpperCase()
  );
}

export default function AdminFounders() {
  const { data, isLoading } = useFounderCandidates();
  const grant = useGrantFounder();

  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<FounderCandidate | null>(null);
  const [number, setNumber] = useState('');

  const candidates = data?.candidates ?? [];

  // Fundadores já concedidos e o próximo número livre saem dos anúncios (que
  // carregam `sellerFounderNumber`), não do backend: o `nextNumber` da API ainda
  // vinha da lógica antiga (a partir de 51), enquanto as concessões reais estão
  // em #001..#010. O catálogo já vem do cache das outras telas.
  const { data: catalogo } = useListings(LIMITE_CATALOGO);
  const fundadores = useMemo(() => fundadoresConcedidos(catalogo ?? []), [catalogo]);
  const nextNumber = useMemo(() => proximoNumeroDeFundador(catalogo ?? []), [catalogo]);

  const filtered = useMemo(() => {
    if (!search) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(
      (c) =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  }, [candidates, search]);

  // ─── Concessão por exceção ───────────────────────────────
  // A lista de candidatos só traz quem cumpriu os 5 anúncios. Isso deixava de
  // fora quem a equipe quer premiar por outro motivo: a conta da casa, um
  // convidado, um lojista que fechou parceria. Não havia caminho nenhum na
  // interface para essas pessoas, e o endpoint de concessão aceita qualquer
  // usuário. Aqui a busca continua na lista de candidatos, e só cai nos demais
  // usuários quando não achar nada lá, para não misturar as duas coisas.
  const { data: usuarios } = useAdminUsers(500);

  const fora = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2 || filtered.length > 0) return [];
    const jaCandidato = new Set(candidates.map((c) => c.userId));
    return (usuarios ?? [])
      .filter((u) => !jaCandidato.has(u.id))
      .filter(
        (u) =>
          (u.name ?? '').toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [usuarios, candidates, filtered.length, search]);

  // Prefill do número com o próximo livre ao abrir o diálogo.
  useEffect(() => {
    if (target) setNumber(nextNumber != null ? String(nextNumber) : '');
  }, [target, nextNumber]);

  const parsedNumber = Number(number);
  const numberValid =
    Number.isInteger(parsedNumber) &&
    (parsedNumber === NUMERO_DA_CASA ||
      (parsedNumber >= NUMERO_MIN && parsedNumber <= NUMERO_MAX));

  const doGrant = () => {
    if (!target || !numberValid) return;
    grant.mutate(
      { userId: target.userId, number: parsedNumber },
      { onSuccess: () => setTarget(null) },
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-kolecta-gold" />
            Membros Fundadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Candidatos qualificados (5+ anúncios enviados) aguardando concessão do
            selo. A seleção dos 100 é curada pela equipe — o número é escolhido
            aqui (faixa {NUMERO_MIN}–{NUMERO_MAX}).
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="bg-gradient-card">
            <CardContent className="flex items-center gap-3 p-5">
              <Award className="h-8 w-8 text-kolecta-gold" />
              <div>
                <div className="font-heading text-2xl font-bold">
                  {fundadores.length}<span className="text-base text-muted-foreground">/{NUMERO_MAX}</span>
                </div>
                <div className="text-xs text-muted-foreground">Fundadores concedidos</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="flex items-center gap-3 p-5">
              <Medal className="h-8 w-8 text-primary" />
              <div>
                <div className="font-heading text-2xl font-bold">
                  {isLoading ? '—' : candidates.length}
                </div>
                <div className="text-xs text-muted-foreground">Candidatos aguardando</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="flex items-center gap-3 p-5">
              <Award className="h-8 w-8 text-primary" />
              <div>
                <div className="font-heading text-2xl font-bold">
                  #{String(nextNumber).padStart(3, '0')}
                </div>
                <div className="text-xs text-muted-foreground">Próximo número livre</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Fundadores atuais ────────────────────────────
            Controle de quem já é fundador: número, loja, e quantos anúncios tem
            no ar como sinal de engajamento. É a base da gestão futura (tirar
            quem não engaja, abrir vaga para outro, criar outros selos). Sai dos
            anúncios, então fundador que zerou a loja não aparece: a gestão
            completa depende de um endpoint de fundadores no backend. */}
        {fundadores.length > 0 && (
          <div>
            <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Fundadores atuais
            </h2>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {fundadores.map((f) => (
                <Card key={f.numero} className="bg-gradient-card">
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md bg-kolecta-gold/10 font-heading text-sm font-bold text-kolecta-gold">
                      #{String(f.numero).padStart(3, '0')}
                    </span>
                    <a
                      href={`/vendedor/${f.sellerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary"
                    >
                      {f.nome}
                    </a>
                    {f.status !== 'active' && (
                      <Badge variant="outline" className="shrink-0 border-accent/40 text-accent">
                        {f.status}
                      </Badge>
                    )}
                    {/* Zero no ar = sinal de quem não está engajando. */}
                    <span
                      className={`shrink-0 text-xs ${f.anunciosNoAr === 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                      {f.anunciosNoAr} no ar
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-gradient-card">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum candidato aguardando concessão.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <Card key={c.userId} className="bg-gradient-card">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initialsOf(c.name, c.email ?? c.userId)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name ?? '(sem nome)'}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.email ?? c.userId}</div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {c.submitted} anúncios
                  </Badge>
                  <Button
                    variant="kolecta"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setTarget(c)}
                  >
                    Conceder selo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quem não está na lista de candidatos. Aparece só quando a busca não
            achou candidato nenhum, para a exceção não competir com o fluxo
            normal nem virar o caminho preferido. */}
        {fora.length > 0 && (
          <div className="space-y-3">
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Fora da lista de candidatos.</strong>{' '}
                Estas pessoas não cumpriram os 5 anúncios. Conceder aqui é exceção
                da equipe: a conta da casa, um convidado, uma parceria fechada.
              </p>
            </div>
            {fora.map((u) => (
              <Card key={u.id} className="bg-gradient-card border-dashed">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initialsOf(u.name, u.email ?? u.id)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{u.name ?? '(sem nome)'}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email ?? u.id}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() =>
                      setTarget({
                        userId: u.id,
                        name: u.name,
                        email: u.email,
                        submitted: 0,
                        founderStatus: 'none',
                      })
                    }
                  >
                    Conceder por exceção
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Grant dialog */}
      <Dialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Conceder selo de Fundador</DialogTitle>
            <DialogDescription>
              {target?.name ?? target?.email ?? 'Candidato'}: escolha o número do
              selo (faixa {NUMERO_MIN} a {NUMERO_MAX}, ou {NUMERO_DA_CASA} para
              a conta da casa). O número é permanente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-muted-foreground">Número do fundador</label>
            <Input
              type="number"
              min={NUMERO_DA_CASA}
              max={NUMERO_MAX}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder={`${NUMERO_MIN}–${NUMERO_MAX}`}
            />
            {!numberValid && number !== '' && (
              <p className="text-xs text-destructive">
                Use um número entre {NUMERO_MIN} e {NUMERO_MAX}, ou {NUMERO_DA_CASA} para a conta da casa.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Cancelar</Button>
            <Button
              variant="kolecta"
              onClick={doGrant}
              disabled={!numberValid || grant.isPending}
            >
              {grant.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Conceder #{numberValid ? String(parsedNumber).padStart(3, '0') : '—'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
