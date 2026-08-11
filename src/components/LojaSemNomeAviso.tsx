import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Store, X } from 'lucide-react';
import { useSellerSelfProfile } from '@/hooks/use-api';

/**
 * Aviso proativo: "sua loja está com seu nome pessoal".
 *
 * O campo "Nome da loja" existe em Configurações e a vitrine já o usa quando
 * preenchido (senão cai no nome do usuário). Só que ele fica enterrado, e vários
 * vendedores aparecem com o nome pessoal sem saber como trocar — já perguntaram
 * o mesmo três vezes. Este banner no painel leva direto ao campo enquanto a loja
 * não tiver nome próprio. Some sozinho quando o nome é definido.
 */
export default function LojaSemNomeAviso() {
  const { pathname } = useLocation();
  const { data: profile } = useSellerSelfProfile();
  const [fechado, setFechado] = useState(
    () => sessionStorage.getItem('aviso_nome_loja') === '1',
  );

  const semNome = !!profile && !(profile.storeName ?? '').trim();
  // Não aparece se já tem nome, se foi fechado, ou na própria tela do campo.
  if (!semNome || fechado || pathname.startsWith('/painel/configuracoes')) {
    return null;
  }

  const nomePessoal = profile?.account?.name?.trim() || 'seu nome pessoal';

  return (
    <div className="mx-4 mt-4 lg:mx-6 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
      <Store className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-foreground">
          Seus anúncios estão aparecendo como “{nomePessoal}”.
        </p>
        <p className="mt-0.5 text-muted-foreground">
          Defina o <strong>nome da sua loja</strong> para os compradores reconhecerem você.{' '}
          <Link
            to="/painel/configuracoes"
            className="font-medium text-primary underline underline-offset-2"
          >
            Definir nome da loja
          </Link>
        </p>
      </div>
      <button
        type="button"
        aria-label="Fechar aviso"
        className="text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => {
          sessionStorage.setItem('aviso_nome_loja', '1');
          setFechado(true);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
