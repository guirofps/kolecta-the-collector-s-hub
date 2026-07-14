// Modo pré-lançamento — fonte única da verdade sobre "o site já lançou?".
//
// A data-alvo vem da env var VITE_LAUNCH_DATE (embutida no build pelo Vite).
// Deve ser uma string ISO COM offset explícito de fuso, ex.:
//   VITE_LAUNCH_DATE=2026-07-25T12:00:00-03:00   (Brasília)
//
// Regra de segurança para dev: se a var estiver ausente ou for inválida,
// hasLaunched() retorna sempre `true` → site aberto (comportamento atual).
// Assim, nenhum ambiente sem a var (dev local) entra em modo countdown por engano.

const RAW = import.meta.env.VITE_LAUNCH_DATE as string | undefined;

/** Data de lançamento, ou null se não configurada/ inválida. */
export function getLaunchDate(): Date | null {
  if (!RAW) return null;
  const d = new Date(RAW);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** true se já passou da data de lançamento (ou se não há data configurada). */
export function hasLaunched(now: Date = new Date()): boolean {
  const target = getLaunchDate();
  if (!target) return true; // sem data válida = site aberto (dev-safe)
  return now.getTime() >= target.getTime();
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

/** Tempo restante até o lançamento, decomposto em dias/horas/min/seg. */
export function getCountdown(now: Date = new Date()): Countdown {
  const target = getLaunchDate();
  const totalMs = target ? Math.max(0, target.getTime() - now.getTime()) : 0;

  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalMs };
}
