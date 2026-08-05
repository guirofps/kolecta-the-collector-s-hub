import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  fieldsForCategory, isFieldApplicable, formatFieldValue,
  type CategoryField,
} from '@/lib/category-fields';
import SeletorLinha from '@/components/SeletorLinha';

interface CategoryFieldsEditorProps {
  /** Slug da categoria do anúncio. Desconhecido = não renderiza nada. */
  categorySlug: string | null | undefined;
  /** Valores atuais (attributes + colunas próprias). */
  values: Record<string, unknown>;
  onChange: (key: string, value: string) => void;
}

/**
 * Campos específicos da categoria, montados a partir de `CATEGORY_FIELDS`.
 *
 * A tela de edição tinha cinco campos fixos — Marca, Linha, Escala, Ano e
 * Edição — iguais para toda categoria, porque são as que têm coluna própria no
 * banco. Tudo que vive no JSON `attributes` ficava inacessível: quem tinha um
 * card reprovado por falta de "Jogo / Universo" não tinha onde preencher, e a
 * correção virava beco sem saída. Para carta a tela ainda pedia escala, que
 * carta não tem.
 *
 * Orientado pelos dados de propósito: o wizard de criação desenha esses campos
 * em JSX à mão, e duplicar aquilo criaria uma segunda lista para divergir — foi
 * exatamente o que já aconteceu entre o wizard e a moderação. Aqui a lista vem
 * da fonte única, então categoria nova aparece nas duas telas sozinha.
 */
export default function CategoryFieldsEditor({
  categorySlug,
  values,
  onChange,
}: CategoryFieldsEditorProps) {
  const campos = fieldsForCategory(categorySlug);
  if (campos.length === 0) return null;

  // Campo dependente (nota do grading só quando "Gradada = Sim") some quando a
  // condição não bate, em vez de aparecer inerte.
  const visiveis = campos.filter((c) => isFieldApplicable(c, values));

  const valorDe = (campo: CategoryField) =>
    formatFieldValue(values[campo.key]) ?? '';

  return (
    <div>
      <h3 className="font-heading text-sm font-bold uppercase tracking-wide mb-1">
        Detalhes da categoria
      </h3>
      <p className="text-[11px] text-muted-foreground mb-3">
        Os campos marcados com * são exigidos para o anúncio ir ao ar.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visiveis.map((campo) => (
          <div key={campo.key}>
            <Label htmlFor={`cat-${campo.key}`}>
              {campo.label}
              {campo.required && <span className="text-destructive"> *</span>}
            </Label>

            {campo.key === 'line' ? (
              /* Linha é o único campo cuja lista depende de OUTRO campo (o
                 fabricante), então não cabe em `options` estático. */
              <SeletorLinha
                id={`cat-${campo.key}`}
                marca={formatFieldValue(values.brand) ?? ''}
                value={valorDe(campo)}
                onChange={(v) => onChange(campo.key, v)}
              />
            ) : campo.options ? (
              <Select
                value={valorDe(campo)}
                onValueChange={(v) => onChange(campo.key, v)}
              >
                <SelectTrigger id={`cat-${campo.key}`} className="mt-1.5">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {campo.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`cat-${campo.key}`}
                className="mt-1.5"
                value={valorDe(campo)}
                onChange={(e) => onChange(campo.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
