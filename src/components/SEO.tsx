import { Helmet } from 'react-helmet-async';

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

/**
 * Meta por página para SEO. O SPA servia o MESMO `<head>` em toda URL (mesmo
 * título e descrição em milhares de páginas), o que é péssimo para ranquear.
 * Aqui cada página declara título, descrição, canônica e JSON-LD próprios; o
 * Googlebot lê depois de renderizar. `react-helmet-async` cuida da hidratação.
 */
export default function SEO({
  title,
  description,
  canonicalPath,
  image,
  noindex,
  jsonLd,
}: SEOProps) {
  const fullTitle = title.includes('Kolecta') ? title : `${title} · Kolecta`;
  const url = canonicalPath ? SITE + canonicalPath : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {url && <link rel="canonical" href={url} />}
      {noindex && <meta name="robots" content="noindex,follow" />}

      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      {image && <meta name="twitter:image" content={image} />}

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
