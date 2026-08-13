import { useEffect } from 'react';

const SITE = 'https://kolecta.com.br';

interface SEOProps {
  /** Título da página (o " · Kolecta" é anexado se não houver). */
  title: string;
  description?: string;
  /** Caminho canônico, ex.: `/produto/abc`. Vira a URL canônica absoluta. */
  canonicalPath?: string;
  /** Imagem para Open Graph / Twitter (URL absoluta). */
  image?: string;
  /** Páginas privadas/duplicadas: tira do índice, mas segue os links. */
  noindex?: boolean;
  /** Dados estruturados (schema.org) já como objeto. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Meta por página para SEO, escrita DIRETO no `<head>` via efeito.
 *
 * O SPA servia o MESMO `<head>` em toda URL (mesmo título/descrição em milhares
 * de páginas), o que é péssimo para ranquear. `react-helmet-async` foi tentado e
 * simplesmente não injetava client-side (nenhum marcador no head), então aqui a
 * manipulação é direta: 100% previsível, sem lib. O Googlebot lê depois de
 * renderizar. A home mantém os defaults do `index.html`.
 */
export default function SEO({
  title,
  description,
  canonicalPath,
  image,
  noindex,
  jsonLd,
}: SEOProps) {
  const jsonLdStr = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const fullTitle = title.includes('Kolecta') ? title : `${title} · Kolecta`;
    document.title = fullTitle;
    upsertMeta('property', 'og:title', fullTitle);

    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
    }
    const url = canonicalPath ? SITE + canonicalPath : undefined;
    if (url) {
      upsertLink('canonical', url);
      upsertMeta('property', 'og:url', url);
    }
    if (image) {
      upsertMeta('property', 'og:image', image);
      upsertMeta('name', 'twitter:image', image);
    }
    if (noindex) upsertMeta('name', 'robots', 'noindex,follow');

    // JSON-LD num script dedicado e marcado, recriado a cada página.
    document.getElementById('seo-jsonld')?.remove();
    if (jsonLdStr) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'seo-jsonld';
      s.textContent = jsonLdStr;
      document.head.appendChild(s);
    }

    return () => {
      // Sai da página: remove o que é específico dela. Título/description/canonical
      // são sobrescritos pela próxima página (ou ficam os defaults na home).
      document.getElementById('seo-jsonld')?.remove();
      if (noindex) document.head.querySelector('meta[name="robots"]')?.remove();
    };
  }, [title, description, canonicalPath, image, noindex, jsonLdStr]);

  return null;
}
