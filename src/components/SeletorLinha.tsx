// ─── Seletor de linha / série ────────────────────────────────────────────────
//
// Não dá para ser um <Select> comum como o da marca: a lista de linhas depende
// do FABRICANTE (Car Culture é Hot Wheels, QubeCarz é Mini GT), e linha nova
// aparece o tempo todo em colaboração e edição de evento.
//
// Então: sugestões da marca escolhida, mais "Outra", que abre campo livre.
// Fechar de vez empurraria toda série nova para um valor genérico, que é
// justamente o que apaga informação.

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LINHA_OUTRA, linhasDaMarca, normalizarLinha } from '@/lib/linhas';

interface SeletorLinhaProps {
  /** Marca já escolhida no formulário. Define quais linhas são sugeridas. */
  marca: string | null | undefined;
  value: string;
  onChange: (valor: string) => void;
  id?: string;
}

export default function SeletorLinha({ marca, value, onChange, id }: SeletorLinhaProps) {
  const sugeridas = linhasDaMarca(marca);

  // O valor salvo bate com alguma sugestão? Anúncio antigo chega com grafia
  // torta ("MAILINE"), então a comparação passa pela normalização — senão o
  // seletor apareceria vazio e o vendedor perderia o que tinha preenchido.
  const normalizada = normalizarLinha(value, marca).linha;
  const casa = normalizada != null && sugeridas.includes(normalizada);

  // "Outra" fica pegajoso: uma vez aberto o campo livre, ele não fecha sozinho
  // enquanto a pessoa digita (o texto ainda não casa com nada, e o seletor
  // pularia de volta a cada tecla).
  const [livreAberto, setLivreAberto] = useState(!casa && value.trim() !== '');
  const mostrarLivre = livreAberto || (!casa && value.trim() !== '');

  const escolher = (v: string) => {
    if (v === LINHA_OUTRA) {
      setLivreAberto(true);
      onChange('');
      return;
    }
    setLivreAberto(false);
    onChange(v);
  };

  return (
    <div className="space-y-2">
      <Select value={mostrarLivre ? LINHA_OUTRA : (normalizada ?? '')} onValueChange={escolher}>
        <SelectTrigger id={id} className="mt-1.5">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {sugeridas.map((l) => (
            <SelectItem key={l} value={l}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {mostrarLivre && (
        <Input
          placeholder="Ex: Mooneyes, exclusivo de evento, colaboração"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={60}
        />
      )}
    </div>
  );
}
