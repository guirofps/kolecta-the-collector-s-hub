import { Check } from 'lucide-react';
import { formatarDescricao } from '@/lib/description-format';

/**
 * Descrição do anúncio, reorganizada em parágrafos e listas.
 *
 * Antes era um `<p>` só. Como HTML colapsa quebra de linha, tudo que o vendedor
 * separou virava um bloco corrido, e os diferenciais marcados com ✓ ficavam
 * espremidos no meio da frase.
 */
export default function ProductDescription({
  texto,
  className = '',
}: {
  texto: string | null | undefined;
  className?: string;
}) {
  const blocos = formatarDescricao(texto);

  if (blocos.length === 0) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>
        Sem descrição disponível.
      </p>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {blocos.map((bloco, i) =>
        bloco.tipo === 'lista' ? (
          <ul key={i} className="space-y-1.5">
            {bloco.itens.map((item, j) => (
              <li key={j} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="text-sm leading-relaxed text-foreground/90">
            {bloco.texto}
          </p>
        ),
      )}
    </div>
  );
}
