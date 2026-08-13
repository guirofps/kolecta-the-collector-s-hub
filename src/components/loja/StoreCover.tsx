import type { StoreCoverData } from '@/lib/api';
import { capaSegura, variacaoDaCapaPadrao } from '@/lib/capa-loja';

/** Proporção da faixa. Uma constante só, para a capa e o lugar-nenhum dela
 *  nunca terem alturas diferentes e a página não pular entre os dois. */
const PROPORCAO = 'aspect-[16/7] sm:aspect-[16/5] lg:aspect-[1600/380]';

/**
 * Capa (banner) da loja — a faixa no topo do perfil do vendedor.
 *
 * Quatro coisas que não são detalhe:
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
 *
 * 4. **Sem capa própria, entra a padrão** (`<CapaPadrao>`), e não um buraco.
 *    Ela é DESENHADA em CSS, não é arquivo: não pesa nada, nunca sai borrada e
 *    trocar o visual de todas as lojas é mexer aqui, não em 224 linhas do banco.
 */
export default function StoreCover({
  cover,
  seed,
  className = '',
}: {
  cover: StoreCoverData | null | undefined;
  /** Id/slug da loja — dá à capa padrão uma variação estável (ver `variacaoDaCapaPadrao`). */
  seed?: string | null;
  className?: string;
}) {
  const capa = capaSegura(cover);

  if (!capa) {
    return <CapaPadrao seed={seed} className={className} />;
  }

  const veu = capa.overlay / 100;

  return (
    <div
      className={`relative w-full overflow-hidden bg-muted ${PROPORCAO} ${className}`}
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

/**
 * Capa padrão da Kolecta — quem ainda não subiu a sua.
 *
 * É a identidade da casa (carbono + dourado), não uma foto genérica de banco de
 * imagem: assim a loja parece pronta em vez de inacabada, e continua óbvio que
 * quem tem arte própria se destaca. A `seed` desloca o brilho e inclina o
 * gradiente de um jeito estável por loja — visitar duas lojas seguidas não dá a
 * sensação de estar na mesma página, sem que nenhuma fique feia.
 */
export function CapaPadrao({
  seed,
  className = '',
}: {
  seed?: string | null;
  className?: string;
}) {
  const { brilhoX, angulo } = variacaoDaCapaPadrao(seed);

  return (
    <div
      aria-hidden="true"
      className={`relative w-full overflow-hidden bg-gradient-dark ${PROPORCAO} ${className}`}
    >
      {/* Trama de carbono: a mesma textura usada no resto do site. */}
      <div className="absolute inset-0 bg-carbon-texture opacity-70" />

      {/* Banho dourado inclinado + brilho deslocado. Alphas baixos de propósito:
          a capa é fundo de um cabeçalho de vidro, não um cartaz. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${angulo}deg,
            hsl(var(--kolecta-gold) / 0.16) 0%,
            transparent 55%),
            radial-gradient(60% 120% at ${brilhoX}% 0%,
            hsl(var(--kolecta-gold) / 0.14) 0%,
            transparent 70%)`,
        }}
      />

      {/* Fio dourado na borda de baixo, onde o cabeçalho encosta. */}
      <div className="line-tech absolute bottom-0 left-0 right-0" />
    </div>
  );
}
