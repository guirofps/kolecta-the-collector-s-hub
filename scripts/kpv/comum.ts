// ─── KPV: infraestrutura compartilhada dos scripts ───────────────────────────
//
// Os quatro passos do pipeline vivem em arquivos separados mas dividem isto:
// leitura de credencial, acesso ao banco (SÓ LEITURA) e cliente do Mercado
// Livre.
//
// Rode com `npx vite-node scripts/kpv/N-nome.ts` para que os scripts usem as
// bibliotecas de src/lib que já têm teste. Reescrever a lógica em .mjs criaria
// uma segunda verdade para divergir da primeira, que é exatamente o problema
// que o KPV existe para resolver.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

export const RAIZ = process.cwd();
export const PASTA_DADOS = `${RAIZ}\\scripts\\kpv\\dados`;

/** Lê um .env simples. Ignora comentário e linha solta. */
export function lerEnv(caminho: string): Record<string, string> {
  return Object.fromEntries(
    readFileSync(caminho, 'utf8').split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter((m): m is RegExpMatchArray => Boolean(m))
      .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]),
  );
}

export function salvar(nome: string, dados: unknown): string {
  const caminho = `${PASTA_DADOS}\\${nome}`;
  if (!existsSync(dirname(caminho))) mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, JSON.stringify(dados, null, 2), 'utf8');
  return caminho;
}

export function carregar<T>(nome: string): T {
  return JSON.parse(readFileSync(`${PASTA_DADOS}\\${nome}`, 'utf8')) as T;
}

// ─── Banco (leitura) ─────────────────────────────────────────────────────────

const ENV_BACKEND = 'C:\\Users\\Guilherme Rojas\\Desktop\\kolecta-backend\\.env';

/**
 * Consulta o banco de produção. NUNCA escreve daqui: o passo 4 gera SQL para
 * revisão humana em vez de aplicar sozinho. Referência de preço errada é
 * corrigível; UPDATE errado em 800 anúncios, nem sempre.
 */
export async function consultar<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  if (/^\s*(insert|update|delete|drop|alter|create)\b/i.test(sql)) {
    throw new Error('consultar() é só para leitura. O passo 4 gera SQL para você revisar e rodar.');
  }
  const env = lerEnv(ENV_BACKEND);
  const url = env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '') + '/v2/pipeline';
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.TURSO_AUTH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql } }, { type: 'close' }] }),
  });
  const d: any = await r.json();
  const s = d.results?.[0];
  if (!s || s.type === 'error') throw new Error(JSON.stringify(s?.error ?? d).slice(0, 300));
  const cols = s.response.result.cols.map((c: any) => c.name);
  return s.response.result.rows.map((row: any[]) =>
    Object.fromEntries(cols.map((c: string, i: number) => [c, row[i]?.value ?? null]))) as T[];
}

// ─── Mercado Livre ───────────────────────────────────────────────────────────

let tokenCache: { valor: string; expiraEm: number } | null = null;

/** Token de aplicação (client_credentials). Vale 6h; reaproveitado na sessão. */
export async function tokenML(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiraEm) return tokenCache.valor;
  const env = lerEnv(`${RAIZ}\\.env.kpv`);
  if (!env.ML_APP_ID || !env.ML_SECRET) {
    throw new Error('Faltam ML_APP_ID e ML_SECRET no .env.kpv');
  }
  const r = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials', client_id: env.ML_APP_ID, client_secret: env.ML_SECRET,
    }),
  });
  const j: any = await r.json();
  if (!j.access_token) throw new Error(`Token do ML falhou: ${JSON.stringify(j).slice(0, 200)}`);
  // Renova um minuto antes do prazo, para não estourar no meio de um lote.
  tokenCache = { valor: j.access_token, expiraEm: Date.now() + (j.expires_in - 60) * 1000 };
  return j.access_token;
}

export async function getML<T = any>(caminho: string): Promise<{ status: number; corpo: T | null }> {
  const r = await fetch(`https://api.mercadolibre.com${caminho}`, {
    headers: { Authorization: `Bearer ${await tokenML()}` },
  });
  const corpo = await r.json().catch(() => null);
  return { status: r.status, corpo };
}

/**
 * Espera entre chamadas.
 *
 * Não é frescura: a API é gratuita e a conta é do Guilherme, que já teve conta
 * de pagamento travada uma vez. Rajada de requisição é o que faz um provedor
 * olhar de perto.
 */
export const pausa = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export const brl = (centavos: number) =>
  `R$ ${(centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
