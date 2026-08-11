import { useState } from 'react';
import { resolucaoBaixa } from '@/lib/qualidade-imagem';

/**
 * Imagem para a moderação do admin com aviso de baixa resolução.
 *
 * O admin aprovava sem perceber que a foto era um thumbnail de 140×140: no card
 * pequeno ela "parece" ok. Aqui a resolução real é medida no `onLoad` e, se for
 * baixa, um selo vermelho mostra as dimensões — o problema para de passar batido
 * na aprovação.
 */
export default function ImagemModeracao({
  src,
  alt,
  className,
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
        Sem foto
      </div>
    );
  }

  const baixa = dim ? resolucaoBaixa(dim.w, dim.h) : false;

  return (
    <div className="relative w-full h-full">
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={(e) =>
          setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
        }
      />
      {baixa && dim && (
        <span className="absolute inset-x-0 bottom-0 bg-destructive/90 text-destructive-foreground text-[9px] font-semibold text-center leading-tight py-0.5">
          ⚠ {dim.w}×{dim.h}
        </span>
      )}
    </div>
  );
}
