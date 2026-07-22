// ─── Placar do Fundador ──────────────────────────────────────
// Progresso rumo à CANDIDATURA de Membro Fundador: 5 anúncios enviados antes
// do lançamento colocam o vendedor na seleção (não garantem a vaga; a equipe
// faz a curadoria priorizando lojistas e o resultado sai no dia 25).
// Aparece só durante o pré-lançamento; depois do dia 25 some sozinho.
//
// A contagem segue a regra do handoff (docs/handoff-fundadores.md): conta
// anúncio ENVIADO, esteja ele em análise ou já aprovado. Recusado não conta.
//
// ATENÇÃO À VOCABULÁRIO: o banco grava status em inglês (`draft` = em análise,
// `active` = aprovado, `rejected` = recusado). Contar pelos nomes em português
// zerava o placar de todo mundo.

import { Link } from 'react-router-dom';
import { PlusCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FounderMedal } from '@/components/FounderBadge';
import { hasLaunched } from '@/lib/launch';
import type { Listing } from '@/lib/api';

const REQUIRED = 5;

// Só o recusado fica de fora: contar por exclusão evita zerar o placar de novo
// se o backend introduzir um status novo (vendido, pausado, etc.).
const NOT_QUALIFYING = new Set(['rejected', 'reprovado']);

export default function FounderProgress({ listings }: { listings: Listing[] }) {
  // Campanha encerrada: não renderiza nada.
  if (hasLaunched()) return null;

  const count = Math.min(
    REQUIRED,
    listings.filter((l) => !NOT_QUALIFYING.has(l.status)).length,
  );
  const done = count >= REQUIRED;
  const remaining = REQUIRED - count;

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-kolecta-dark p-5 text-white glow-primary">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Medalha ilustrativa (o número real vem depois, do backend) */}
        <div className="shrink-0 self-center sm:self-auto">
          <FounderMedal number={0} size={72} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-heading text-xs font-bold uppercase tracking-widest text-primary">
            Seleção de Membros Fundadores
          </p>

          {done ? (
            <p className="mt-1 font-heading text-xl font-extrabold italic uppercase leading-tight">
              Requisitos completos! Você está concorrendo.
            </p>
          ) : (
            <p className="mt-1 font-heading text-xl font-extrabold italic uppercase leading-tight">
              {count} de {REQUIRED} anúncios enviados
            </p>
          )}

          {/* Barra de progresso segmentada */}
          <div className="mt-3 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: REQUIRED }, (_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i < count ? 'bg-primary' : 'bg-white/15'
                }`}
              />
            ))}
          </div>

          <p className="mt-2 text-xs text-white/60">
            {done ? (
              <>
                <Check className="mr-1 inline h-3.5 w-3.5 text-primary" />
                Sua candidatura está na seleção. Mantenha os anúncios ativos: a
                curadoria prioriza lojistas ativos. Resultado no dia 25/07, no
                lançamento.
              </>
            ) : (
              <>
                Faltam <strong className="text-white">{remaining}</strong> pra
                entrar na seleção. Os escolhidos ganham selo numerado, taxa
                reduzida por 6 meses e 5 destaques grátis. Resultado no dia 25/07.
              </>
            )}
          </p>
        </div>

        {!done && (
          <div className="shrink-0 self-center">
            <Button variant="kolecta" asChild>
              <Link to="/painel/anuncios/novo">
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar próximo anúncio
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
