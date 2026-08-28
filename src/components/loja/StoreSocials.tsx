import { Globe, Instagram, Youtube } from 'lucide-react';
import type { StoreSocialData } from '@/lib/api';
import { temAlgumaRede } from '@/lib/redes-sociais';

/**
 * Fileira de redes sociais da loja.
 *
 * Três coisas que não são detalhe:
 *
 * 1. **Cada ícone é independente, e ausência é ausência.** Rede não preenchida
 *    não vira ícone apagado nem espaço reservado: ela some. Sem nenhuma rede o
 *    componente devolve `null` e a fileira inteira não existe — nada de margem
 *    sobrando entre as estatísticas e o "Membro desde".
 *
 * 2. **A URL vem PRONTA do backend.** Este componente nunca monta link a partir
 *    de handle. O backend valida o domínio contra uma allowlist e devolve
 *    `null` para o que não passar, inclusive para valor inválido que já estava
 *    gravado. Montar aqui contornaria essa checagem — e o `href` desta página é
 *    público e indexável.
 *
 * 3. **`rel` é obrigatório em todos.** `noopener`/`noreferrer` impedem a página
 *    de destino de mexer na aba de origem; `nofollow` importa porque
 *    `/vendedor/:slug` é indexável, e sem ele a loja vira moeda de SEO — alguém
 *    cadastraria links só para ganhar backlink nosso.
 */
export default function StoreSocials({
  social,
  className = '',
}: {
  social: StoreSocialData | null | undefined;
  className?: string;
}) {
  if (!temAlgumaRede(social)) return null;

  const redes = [
    { url: social!.instagram, nome: 'Instagram', Icone: Instagram },
    { url: social!.tiktok, nome: 'TikTok', Icone: TiktokIcon },
    { url: social!.youtube, nome: 'YouTube', Icone: Youtube },
    { url: social!.website, nome: 'Site', Icone: Globe },
  ].filter((r): r is typeof r & { url: string } => Boolean(r.url));

  return (
    <div className={`flex flex-wrap items-center gap-3 mb-2 ${className}`}>
      {redes.map(({ url, nome, Icone }) => (
        <a
          key={nome}
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          /* O ícone sozinho não diz nada a quem usa leitor de tela, e o texto
             visível ao lado não existe: o rótulo tem que vir daqui. */
          aria-label={`${nome} da loja (abre em nova aba)`}
          title={nome}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <Icone className="h-[18px] w-[18px]" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

/**
 * Ícone do TikTok.
 *
 * Escrito à mão porque o `lucide-react` não tem: ele não cobre logos de marca
 * recentes, e trazer uma biblioteca de ícones inteira (`react-icons` e afins)
 * para resolver um `<path>` sairia caro no bundle de uma página que é o LCP da
 * loja.
 *
 * Monocromático e herdando `currentColor` de propósito — assim ele acompanha o
 * mesmo hover dos outros três, e a marca não é recolorida nem distorcida, que é
 * o que as regras de uso de logo pedem.
 */
export function TiktokIcon({
  className = '',
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .53.04.77.12v-3.15a5.72 5.72 0 0 0-.77-.05 5.74 5.74 0 1 0 5.74 5.74V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.3-1.48Z" />
    </svg>
  );
}
