// Gera public/sitemap.xml a partir do catálogo ativo (API pública do backend).
//
// Node puro (sem TS/vite-node) para rodar no `prebuild` da Vercel sem depender
// de ferramenta. RESILIENTE: se a API não responder no build, NÃO sobrescreve o
// sitemap já commitado — o build nunca quebra por isso.
//
// Uso manual: `npm run sitemap`.

import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE = 'https://kolecta.com.br';
const API = (process.env.VITE_API_URL || 'https://kolecta-backend.onrender.com').replace(/\/+$/, '');
const SAIDA = resolve(process.cwd(), 'public', 'sitemap.xml');

const ESTATICAS = [
  { path: '/', prio: '1.0', freq: 'daily' },
  { path: '/busca', prio: '0.8', freq: 'daily' },
  { path: '/categorias', prio: '0.8', freq: 'weekly' },
  { path: '/modo-lance', prio: '0.8', freq: 'daily' },
  { path: '/comunidade', prio: '0.6', freq: 'daily' },
  { path: '/como-funciona', prio: '0.5', freq: 'monthly' },
  { path: '/ajuda', prio: '0.4', freq: 'monthly' },
  { path: '/taxas-e-comissoes', prio: '0.4', freq: 'monthly' },
  { path: '/termos', prio: '0.3', freq: 'yearly' },
  { path: '/privacidade', prio: '0.3', freq: 'yearly' },
];

const CATEGORIAS = [
  'miniaturas-diecast', 'cards-colecionaveis', 'funko-pop',
  'action-figures', 'acessorios', 'mangas-hqs',
];

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function todosOsAnuncios() {
  const out = [];
  const limite = 100;
  for (let offset = 0, pagina = 0; pagina < 200; offset += limite, pagina++) {
    const r = await fetch(`${API}/api/listings?limit=${limite}&offset=${offset}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    const body = await r.json();
    const dados = body?.data ?? [];
    out.push(...dados);
    if (dados.length < limite) break;
  }
  return out;
}

function montarUrl(loc, prio, freq, lastmod) {
  const lm = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${esc(SITE + loc)}</loc>${lm}\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>`;
}

function isoDe(l) {
  const raw = l.updatedAt ?? l.createdAt;
  if (!raw) return undefined;
  const n = Number(raw);
  const d = Number.isFinite(n) && n > 0 ? new Date(n * 1000) : new Date(raw);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

async function main() {
  let anuncios = [];
  try {
    anuncios = await todosOsAnuncios();
  } catch (e) {
    if (existsSync(SAIDA)) {
      console.warn(`[sitemap] API indisponível (${e.message}). Mantendo o sitemap existente.`);
      return;
    }
    console.warn('[sitemap] API indisponível e sem sitemap prévio. Gerando só as rotas fixas.');
  }

  const ativos = anuncios.filter((l) => (l.status ?? 'active') === 'active');
  const vendedores = [...new Set(ativos.map((l) => l.sellerId).filter(Boolean))];

  const urls = [
    ...ESTATICAS.map((e) => montarUrl(e.path, e.prio, e.freq)),
    ...CATEGORIAS.map((slug) => montarUrl(`/categoria/${slug}`, '0.7', 'daily')),
    ...ativos.map((l) => montarUrl(`/produto/${l.id}`, '0.6', 'weekly', isoDe(l))),
    ...vendedores.map((id) => montarUrl(`/vendedor/${id}`, '0.5', 'weekly')),
  ];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') +
    '\n</urlset>\n';

  writeFileSync(SAIDA, xml, 'utf8');
  console.log(
    `[sitemap] gravado: ${ativos.length} produtos + ${vendedores.length} lojas + ${CATEGORIAS.length} categorias + ${ESTATICAS.length} fixas = ${urls.length} URLs`,
  );
}

main().catch((e) => {
  console.warn(`[sitemap] falhou, seguindo sem regenerar: ${e.message}`);
});
