// ─── Selo de Membro Fundador ─────────────────────────────────
// Dois formatos, ambos SVG puro (fundo transparente, escala sem perder nitidez):
//
//  • <FounderMedal />  — medalha grande. Vitrine: perfil, landing, e-mail.
//  • <FounderBadge />  — pill compacto. Inline: card do anúncio, nome do vendedor.
//
// O número é o do fundador (#001–#100). Os #001–#050 saem no evento presencial;
// #051–#100 pela landing de captação.

import { useFounderBadge } from '@/hooks/use-api';

const GOLD = '#FFD700';
const DARK = '#14161F';

/** Formata 51 → "051". */
function padNumber(n: number): string {
  return String(n).padStart(3, '0');
}

// ─── Ícone base da medalha ───────────────────────────────────
// Anel dourado + estrela, sem texto. É a assinatura visual do selo, e existe
// separado para o pill inline usar a MESMA identidade da medalha grande. Antes
// o pill usava um hexágono, um desenho sem parentesco com a medalha da landing.

function MedalIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Traço proporcionalmente mais grosso: em 16px um anel fino some. */}
      <circle cx="60" cy="60" r="53" stroke={GOLD} strokeWidth="8" fill={DARK} />
      {/* Estrela centralizada e maior, já que aqui não há número dentro. */}
      <polygon
        points="60,26 68.2,51.2 94.7,51.2 73.2,66.8 81.4,92 60,76.4 38.6,92 46.8,66.8 25.3,51.2 51.8,51.2"
        fill={GOLD}
      />
    </svg>
  );
}

// ─── Medalha (grande) ────────────────────────────────────────

export function FounderMedal({
  number,
  size = 120,
  className,
}: {
  number: number;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`Membro Fundador número ${padNumber(number)}`}
    >
      {/* Anel externo dourado */}
      <circle cx="60" cy="60" r="56" stroke={GOLD} strokeWidth="3" fill={DARK} />

      {/* Anel interno fino */}
      <circle cx="60" cy="60" r="48" stroke={GOLD} strokeOpacity="0.3" strokeWidth="1" fill="none" />

      {/* Estrela no topo */}
      <polygon
        points="60,26 62.2,32.6 69.2,32.6 63.5,36.7 65.7,43.3 60,39.2 54.3,43.3 56.5,36.7 50.8,32.6 57.8,32.6"
        fill={GOLD}
      />

      {/* Número — o protagonista */}
      <text
        x="60"
        y="72"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="30"
        fontWeight="800"
        fontStyle="italic"
        fontFamily="'Barlow Condensed', sans-serif"
      >
        #{padNumber(number)}
      </text>

      {/* "FUNDADOR" */}
      <text
        x="60"
        y="90"
        textAnchor="middle"
        fill={GOLD}
        fontSize="9"
        fontWeight="700"
        letterSpacing="2.2"
        fontFamily="'Barlow Condensed', sans-serif"
      >
        FUNDADOR
      </text>
    </svg>
  );
}

// ─── Pill compacto (inline no anúncio) ───────────────────────

export function FounderBadge({
  number,
  className,
}: {
  number: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 pl-1 pr-2.5 py-0.5 ${className ?? ''}`}
      title={`Membro Fundador #${padNumber(number)}`}
    >
      <MedalIcon size={16} />
      <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-primary leading-none">
        Fundador #{padNumber(number)}
      </span>
    </span>
  );
}

// ─── Wrappers auto-carregáveis (buscam o selo pelo userId) ───────────────────
// Renderizam nada quando o usuário não é fundador (founderNumber == null),
// então podem ser plugados direto no card/perfil sem checagem no chamador.
//
// TRAVA DE LANÇAMENTO: os Fundadores são escolhidos pela equipe e o resultado
// só sai em 25/07. O backend, porém, atribui número sozinho ao avaliar a
// qualificação na leitura de /api/founder/me, e com isso gente que só cumpriu
// os 5 anúncios já aparecia com "Fundador #053" no perfil, antes de qualquer
// curadoria. Enquanto o backend não separa "candidato" de "fundador escolhido",
// nenhum selo é exibido em público antes da data.

import { hasLaunched } from '@/lib/launch';

/** Pill compacto que busca o selo do vendedor por userId. */
export function FounderBadgeFor({
  userId,
  className,
}: {
  userId: string | undefined;
  className?: string;
}) {
  const { data } = useFounderBadge(userId);
  if (!hasLaunched()) return null;
  if (!data) return null;
  return <FounderBadge number={data.founderNumber} className={className} />;
}

/** Medalha grande que busca o selo do usuário por userId. */
export function FounderMedalFor({
  userId,
  size,
  className,
}: {
  userId: string | undefined;
  size?: number;
  className?: string;
}) {
  const { data } = useFounderBadge(userId);
  if (!hasLaunched()) return null;
  if (!data) return null;
  return <FounderMedal number={data.founderNumber} size={size} className={className} />;
}
