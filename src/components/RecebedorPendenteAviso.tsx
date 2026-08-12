import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, X } from 'lucide-react';
import { useRecipient } from '@/hooks/use-api';

/**
 * Aviso proativo: "conclua seu cadastro de recebimento".
 *
 * Vendedor sem recebedor apto na Pagar.me (`canReceive` false) não vende: as
 * compras diretas travam no checkout e os leilões nascem PAUSADOS e somem da
 * vitrine, do perfil e da busca — tudo em silêncio. Foi a dor do ticket do
 * Malcolm ("aprovado mas não aparece"). Este banner no painel diz o porquê e
 * leva direto ao onboarding; assim que o recebedor fica ativo, os leilões voltam
 * ao ar sozinhos (evento `seller.apto-a-receber`).
 */
export default function RecebedorPendenteAviso() {
  const { pathname } = useLocation();
  const { statusQuery } = useRecipient();
  const [fechado, setFechado] = useState(
    () => sessionStorage.getItem('aviso_recebedor') === '1',
  );

  const data = statusQuery.data;
  // Só quando a consulta voltou E o vendedor não pode receber. Sem dado ainda,
  // não alarma.
  const pendente = !!data && data.canReceive === false;
  if (!pendente || fechado || pathname.startsWith('/painel/recebedor')) {
    return null;
  }

  return (
    <div className="mx-4 mt-4 lg:mx-6 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-foreground">
          Conclua seu cadastro de recebimento para vender.
        </p>
        <p className="mt-0.5 text-muted-foreground">
          Enquanto ele não estiver ativo, suas vendas não fecham e seus leilões ficam
          pausados (não aparecem na vitrine, no seu perfil nem na busca).{' '}
          <Link
            to="/painel/recebedor"
            className="font-medium text-primary underline underline-offset-2"
          >
            Concluir agora
          </Link>
        </p>
      </div>
      <button
        type="button"
        aria-label="Fechar aviso"
        className="text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => {
          sessionStorage.setItem('aviso_recebedor', '1');
          setFechado(true);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
