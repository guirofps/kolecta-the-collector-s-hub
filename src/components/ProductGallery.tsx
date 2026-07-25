import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  /** URLs já parseadas. A primeira é a capa. */
  images: string[];
  /** Título do anúncio — vira o alt da imagem principal. */
  title: string;
  className?: string;
}

const FALLBACK = '/placeholder.svg';

function onImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  (e.target as HTMLImageElement).src = FALLBACK;
}

/**
 * Galeria do anúncio: imagem principal + miniaturas clicáveis.
 *
 * O vendedor envia até 8 fotos, mas as telas de detalhe mostravam só a
 * `images[0]` — as outras eram carregadas e descartadas. Quem compra
 * colecionável precisa ver verso, embalagem e estado da peça antes de decidir.
 *
 * Mesmo padrão da ficha de moderação (`admin/ListingDetail`), com o que faz
 * sentido em vitrine: setas no desktop, swipe no mobile e teclado.
 */
export default function ProductGallery({
  images,
  title,
  className,
}: ProductGalleryProps) {
  const [atual, setAtual] = useState(0);
  const touchX = useRef<number | null>(null);

  const fotos = images.length > 0 ? images : [FALLBACK];
  const temVarias = fotos.length > 1;

  // Trocar de anúncio (mesma rota, id diferente) precisa voltar para a capa,
  // senão a galeria abre na 3ª foto do item anterior.
  useEffect(() => {
    setAtual(0);
  }, [images.join('|')]);

  const ir = (delta: number) =>
    setAtual((i) => (i + delta + fotos.length) % fotos.length);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Principal */}
      <div
        className="group relative aspect-square rounded-lg overflow-hidden bg-kolecta-dark border border-border"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          // 40px evita que um toque trêmulo conte como swipe.
          if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <img
          src={fotos[atual]}
          alt={title}
          className="w-full h-full object-cover"
          onError={onImgError}
        />

        {temVarias && (
          <>
            <button
              type="button"
              onClick={() => ir(-1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => ir(1)}
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Contador: no mobile as setas ficam escondidas, então é o que
                informa que existem mais fotos. */}
            <span className="absolute bottom-2 right-2 rounded-full bg-background/80 backdrop-blur border border-border px-2.5 py-0.5 text-xs tabular-nums">
              {atual + 1}/{fotos.length}
            </span>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {temVarias && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Fotos do anúncio"
        >
          {fotos.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === atual}
              aria-label={`Foto ${i + 1} de ${fotos.length}`}
              onClick={() => setAtual(i)}
              className={cn(
                'w-16 h-16 rounded border-2 shrink-0 overflow-hidden transition-colors',
                i === atual
                  ? 'border-[hsl(var(--kolecta-gold))]'
                  : 'border-transparent hover:border-border',
              )}
            >
              <img
                src={img}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
                onError={onImgError}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
