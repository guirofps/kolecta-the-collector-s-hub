import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Fotos de um post da comunidade, com lightbox.
 *
 * No grid a foto vem cortada em quadrado (`object-cover`), pequena, e no celular
 * some o detalhe. Clicar abre a imagem inteira em tela cheia, com navegação
 * entre as fotos do post. Foi o pedido: dá para ver a coleção de perto.
 */
export default function PostImages({ images }: { images: string[] }) {
  // Índice aberto no lightbox; null = fechado.
  const [aberto, setAberto] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  // Mostra até 3 no grid; se houver mais, a terceira ganha o "+N" e abre a
  // galeria a partir dela, para nenhuma foto ficar inacessível.
  const visiveis = images.slice(0, 3);
  const extras = images.length - visiveis.length;

  return (
    <>
      <div className={`grid gap-2 ${visiveis.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {visiveis.map((img, i) => {
          const ultima = i === visiveis.length - 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setAberto(i)}
              aria-label={`Ampliar foto ${i + 1} de ${images.length}`}
              className={`group relative overflow-hidden rounded-md ${
                visiveis.length === 1 ? 'max-h-[70vh]' : 'aspect-square'
              }`}
            >
              <img
                src={img}
                alt=""
                loading="lazy"
                className={`h-full w-full transition-transform duration-300 group-hover:scale-105 ${
                  visiveis.length === 1 ? 'object-contain bg-secondary' : 'object-cover'
                }`}
              />
              {/* "+N" na última quando há mais fotos do que cabem no grid. */}
              {ultima && extras > 0 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-heading text-lg font-bold text-white">
                  +{extras}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {aberto !== null && (
        <Lightbox
          images={images}
          inicial={aberto}
          onClose={() => setAberto(null)}
        />
      )}
    </>
  );
}

/**
 * Visor de tela cheia. Renderizado em portal, no `body`, para o overlay cobrir
 * a página inteira mesmo dentro de um card com `overflow-hidden`. Fecha no Esc,
 * navega com as setas do teclado, e no celular tem os botões grandes.
 */
function Lightbox({
  images,
  inicial,
  onClose,
}: {
  images: string[];
  inicial: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(inicial);
  const varias = images.length > 1;

  const anterior = useCallback(
    () => setI((n) => (n - 1 + images.length) % images.length),
    [images.length],
  );
  const proxima = useCallback(
    () => setI((n) => (n + 1) % images.length),
    [images.length],
  );

  // Teclado: Esc fecha, setas navegam. E trava o scroll do fundo enquanto
  // aberto, senão o corpo da página rolava por baixo do visor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && varias) anterior();
      else if (e.key === 'ArrowRight' && varias) proxima();
    };
    document.addEventListener('keydown', onKey);
    const scrollAntes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = scrollAntes;
    };
  }, [onClose, anterior, proxima, varias]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {varias && (
        <>
          <button
            type="button"
            // stopPropagation: o clique no fundo fecha, mas na seta só navega.
            onClick={(e) => { e.stopPropagation(); anterior(); }}
            aria-label="Foto anterior"
            className="absolute left-2 sm:left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); proxima(); }}
            aria-label="Próxima foto"
            className="absolute right-2 sm:right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* A imagem em si. object-contain para caber inteira sem cortar, e o
          clique nela não fecha (só o fundo fecha). */}
      <img
        src={images[i]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] object-contain"
      />

      {varias && (
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
          {i + 1} / {images.length}
        </span>
      )}
    </div>,
    document.body,
  );
}
