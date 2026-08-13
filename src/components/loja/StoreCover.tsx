import type { StoreCoverData } from '@/lib/api';
import { capaSegura } from '@/lib/capa-loja';

/**
 * Capa (banner) da loja — a faixa no topo do perfil do vendedor.
 *
 * Três coisas que não são detalhe:
 *
 * 1. **O escurecimento é obrigatório.** O nome da loja, o selo de verificado e
 *    os botões ficam por cima da capa. Sem o véu, a primeira foto clara apaga o
 *    nome da própria loja. O valor vem do vendedor, mas passa pelo `capaSegura`.
 *
 * 2. **A altura é reservada por `aspect-ratio`.** A imagem é o maior elemento da
 *    página; sem altura reservada o conteúdo pula quando ela carrega.
 *
 * 3. **O gradiente é duplo.** Escuro no topo, porque o header da Kolecta é
 *    translúcido e passa por cima da capa, e escuro embaixo, onde ficam o
 *    avatar e o nome. O meio fica mais claro — é onde a foto do vendedor
 *    aparece de verdade.
 */
export default function StoreCover({
  cover,
  className = '',
}: {
  cover: StoreCoverData | null | undefined;
  className?: string;
}) {
  const capa = capaSegura(cover);
  if (!capa) return null;

  const veu = capa.overlay / 100;

  return (
    <div
      className={`relative w-full overflow-hidden bg-muted aspect-[16/7] sm:aspect-[16/5] lg:aspect-[1600/380] ${className}`}
    >
      <img
        src={capa.url}
        alt=""
        /* Decorativa: quem lê com leitor de tela já recebe o nome da loja no
           <h1> logo abaixo, e descrever "capa da loja X" seria repetir. */
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: `50% ${capa.focalY}%` }}
        /* É o LCP da página: nada de lazy. */
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            rgba(0,0,0,${Math.min(0.55, veu + 0.1).toFixed(2)}) 0%,
            rgba(0,0,0,${(veu * 0.55).toFixed(2)}) 42%,
            rgba(0,0,0,${veu.toFixed(2)}) 100%)`,
        }}
      />
    </div>
  );
}
