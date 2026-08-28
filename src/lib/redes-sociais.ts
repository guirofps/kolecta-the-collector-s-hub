import type { StoreSocialData } from '@/lib/api';

// ─── Redes sociais da loja ───────────────────────────────────────────────────
//
// As mesmas regras do backend (`src/sellers/redes.ts`). Repetir aqui é
// deliberado, pelo mesmo motivo do `capa-loja.ts`: são dois processos.
//
// A diferença é o USO. No backend a normalização decide o que vai para o banco
// e o que vira `href` numa página pública — é a checagem que vale. Aqui ela só
// alimenta a prévia embaixo do input, para o vendedor ver o link que vai sair
// ANTES de salvar, sem uma ida ao servidor por tecla digitada.
//
// Por isso esta cópia nunca é a única barreira: o que o front monta não vira
// link na loja. O que a loja mostra vem pronto do backend, já saneado.

export type Rede = 'tiktok' | 'instagram' | 'youtube';

/** Espelho de `REDES_PERMITIDAS` no backend. Ver o comentário de lá. */
export const REDES_PERMITIDAS: Record<Rede, readonly string[]> = {
  tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
};

export const REDE_MAX_LENGTH = 200;

const ESQUEMAS_PROIBIDOS = /^\s*(javascript|data|vbscript|file)\s*:/i;
const TEM_PROTOCOLO = /^[a-z][a-z0-9+.-]*:\/\//i;
const HANDLE_VALIDO = /^[A-Za-z0-9._-]{1,50}$/;
const PREFIXOS_YOUTUBE = ['c', 'channel', 'user'] as const;

/** Rótulo de cada rede, para mensagens e `aria-label`. */
export const NOME_DA_REDE: Record<Rede | 'website', string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  website: 'Site',
};

/**
 * Normaliza o que foi digitado para o identificador canônico, ou `null`.
 *
 * Espelho de `normalizarRede()` no backend — inclusive na idempotência: rodar
 * de novo sobre o resultado devolve o mesmo valor. Sem isso, o `c/canal` do
 * YouTube seria lido como domínio na segunda passada.
 */
export function normalizarRedeFront(
  rede: Rede,
  valor: string | null | undefined,
): string | null {
  const cru = semControles(valor ?? '').trim();
  if (!cru || cru.length > REDE_MAX_LENGTH) return null;
  if (ESQUEMAS_PROIBIDOS.test(cru)) return null;

  if (rede === 'youtube') {
    const canonico = /^(c|channel|user)\/([A-Za-z0-9._-]{1,50})$/.exec(cru);
    if (canonico) return `${canonico[1]}/${canonico[2]}`;
  }

  if (cru.startsWith('@')) return identificador(rede, cru.slice(1));

  // Testa BARRA, não ponto: "loja.nerd" é handle válido no Instagram.
  if (!cru.includes('/') && !TEM_PROTOCOLO.test(cru)) {
    return identificador(rede, cru);
  }

  const url = comoUrl(cru);
  if (!url) return null;
  if (!REDES_PERMITIDAS[rede].includes(url.hostname.toLowerCase())) return null;

  const partes = url.pathname.split('/').filter(Boolean);
  if (partes.length === 0) return null;

  if (rede === 'youtube') {
    const [primeiro, segundo] = partes;
    if (primeiro.startsWith('@')) return identificador('youtube', primeiro.slice(1));
    if ((PREFIXOS_YOUTUBE as readonly string[]).includes(primeiro)) {
      if (!segundo || !HANDLE_VALIDO.test(segundo)) return null;
      return `${primeiro}/${segundo}`;
    }
    if (partes.length === 1 && HANDLE_VALIDO.test(primeiro)) return primeiro;
    return null;
  }

  return identificador(rede, partes[0].replace(/^@/, ''));
}

/** Identificador -> URL, para a prévia. Espelho de `urlDaRede()`. */
export function urlDaRedeFront(
  rede: Rede,
  valor: string | null | undefined,
): string | null {
  const id = normalizarRedeFront(rede, valor);
  if (!id) return null;

  if (rede === 'tiktok') return `https://www.tiktok.com/@${id}`;
  if (rede === 'instagram') return `https://www.instagram.com/${id}`;
  return `https://www.youtube.com/${id}`;
}

/** Espelho de `urlDeWebsite()`, para a prévia do campo de site. */
export function urlDeWebsiteFront(valor: string | null | undefined): string | null {
  const cru = semControles(valor ?? '').trim();
  if (!cru || cru.length > REDE_MAX_LENGTH) return null;
  if (ESQUEMAS_PROIBIDOS.test(cru)) return null;

  const url = comoUrl(cru);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.local')) return null;

  return url.toString();
}

/**
 * Tem alguma rede para mostrar?
 *
 * O backend já devolve `null` quando não há nenhuma, mas uma resposta velha em
 * cache pode trazer um objeto com os quatro campos nulos. Sem esta checagem, a
 * fileira desenharia um bloco vazio com margem — que é justamente o "espaço
 * sobrando" que a regra de esconder o ícone existe para evitar.
 */
export function temAlgumaRede(social: StoreSocialData | null | undefined): boolean {
  if (!social) return false;
  return Boolean(social.tiktok || social.instagram || social.youtube || social.website);
}

/**
 * Tira caracteres de controle antes de qualquer checagem.
 *
 * O navegador ignora esses bytes ao resolver um `href`, então um NUL no meio
 * de "javascript:" ainda executa — mas passaria por um teste no texto cru.
 * A limpeza é por CÓDIGO de caractere, e não por regex: regex com caractere de
 * controle é ilegível e a regra `no-control-regex` recusa.
 */
function semControles(valor: string): string {
  return Array.from(valor)
    .filter((c) => {
      const codigo = c.charCodeAt(0);
      return codigo > 31 && codigo !== 127;
    })
    .join('');
}

function comoUrl(valor: string): URL | null {
  const comProtocolo = TEM_PROTOCOLO.test(valor) ? valor : `https://${valor}`;

  let url: URL;
  try {
    url = new URL(comProtocolo);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;

  return url;
}

function identificador(rede: Rede, handle: string): string | null {
  const limpo = handle.trim();
  if (!HANDLE_VALIDO.test(limpo)) return null;
  return rede === 'youtube' ? `@${limpo}` : limpo;
}
