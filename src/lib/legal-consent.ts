// ─── Consentimento legal (Termos + LGPD) ─────────────────────────────────────
// A LGPD exige consentimento demonstrável: guardamos qual versão foi aceita e
// quando. Por ora persiste no localStorage; o próximo passo é enviar ao backend
// para atrelar ao usuário (ver docs/PLAN-programa-fundadores.md T10).

/** Versão dos termos aceitos. Incrementar quando os termos/política mudarem
 *  para forçar re-consentimento. */
export const LEGAL_TERMS_VERSION = '2026-07-15';

const STORAGE_KEY = 'kolecta_legal_consent';
// Marca que o registro local já foi enviado ao backend (atrelado ao usuário).
const SYNCED_KEY = 'kolecta_legal_consent_synced';

export interface LegalConsentRecord {
  termsVersion: string;
  termsAcceptedAt: string; // ISO
  lgpdAcceptedAt: string; // ISO
}

/** Registra o aceite dos dois termos (Termos da plataforma + LGPD). */
export function recordConsent(): LegalConsentRecord {
  const now = new Date().toISOString();
  const record: LegalConsentRecord = {
    termsVersion: LEGAL_TERMS_VERSION,
    termsAcceptedAt: now,
    lgpdAcceptedAt: now,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    // Novo aceite → precisa (re)sincronizar com o backend.
    localStorage.removeItem(SYNCED_KEY);
  } catch {
    // localStorage indisponível (modo privado): segue sem persistir.
  }
  return record;
}

/** Registro de aceite guardado localmente, se houver. */
export function getStoredConsent(): LegalConsentRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LegalConsentRecord) : null;
  } catch {
    return null;
  }
}

/** true se o registro local já foi enviado ao backend. */
export function isConsentSynced(): boolean {
  try {
    return localStorage.getItem(SYNCED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Marca o registro local como já enviado ao backend. */
export function markConsentSynced(): void {
  try {
    localStorage.setItem(SYNCED_KEY, 'true');
  } catch {
    // ignore
  }
}

/** true se o usuário já aceitou a versão atual dos termos. */
export function hasValidConsent(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const record = JSON.parse(raw) as LegalConsentRecord;
    return record.termsVersion === LEGAL_TERMS_VERSION;
  } catch {
    return false;
  }
}
