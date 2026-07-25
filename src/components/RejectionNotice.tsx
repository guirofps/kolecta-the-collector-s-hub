import { AlertTriangle } from 'lucide-react';
import { formatarDescricao } from '@/lib/description-format';

/**
 * Motivo da reprovação, para o vendedor.
 *
 * O backend grava `rejectionReason` quando o admin reprova, e o e-mail de
 * "precisa de ajuste" leva o texto. Mas o painel mostrava só o selo "Reprovado":
 * quem apagasse o e-mail, ou não o recebesse, ficava sem saber o que corrigir e
 * sem caminho a seguir.
 *
 * Fica em vermelho e no topo de propósito. É a única informação que destrava o
 * vendedor, então não pode estar escondida atrás de um clique.
 */
export default function RejectionNotice({
  motivo,
  className = '',
  compacto = false,
}: {
  motivo: string | null | undefined;
  className?: string;
  compacto?: boolean;
}) {
  const texto = (motivo ?? '').trim();

  return (
    <div
      className={`flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 ${
        compacto ? 'p-2.5' : 'p-3'
      } ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0">
        <p className={`font-medium text-destructive ${compacto ? 'text-xs' : 'text-sm'}`}>
          {texto ? 'Motivo da reprovação' : 'Anúncio reprovado'}
        </p>
        {texto ? (
          // A moderação manda vários motivos como lista ("- item"). O mesmo
          // formatador da descrição transforma isso em itens legíveis; sem ele,
          // os motivos virariam um parágrafo corrido e metade passaria batido.
          <div className={`mt-0.5 space-y-1 ${compacto ? 'text-xs' : 'text-sm'}`}>
            {formatarDescricao(texto).map((bloco, i) =>
              bloco.tipo === 'lista' ? (
                <ul key={i} className="space-y-0.5">
                  {bloco.itens.map((item, j) => (
                    <li key={j} className="flex gap-1.5 leading-relaxed text-muted-foreground">
                      <span aria-hidden="true">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p key={i} className="leading-relaxed text-muted-foreground">{bloco.texto}</p>
              ),
            )}
          </div>
        ) : (
          // Anúncio reprovado antes do campo existir, ou motivo não preenchido.
          // Melhor assumir a falta do que deixar o vendedor achando que existe
          // um motivo escondido em algum lugar.
          <p className={`mt-0.5 text-muted-foreground ${compacto ? 'text-xs' : 'text-sm'} leading-relaxed`}>
            O motivo não foi registrado. Fale com a gente pelo suporte para entender o que ajustar.
          </p>
        )}
      </div>
    </div>
  );
}
