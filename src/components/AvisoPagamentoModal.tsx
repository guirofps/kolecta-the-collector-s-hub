import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { jaViuAviso, marcarAvisoVisto } from '@/lib/aviso-pagamento';

/**
 * Comunicado sobre a mudança nos meios de pagamento.
 *
 * Bloqueante por decisão de produto: não fecha no ESC, no clique fora nem no X.
 * A única saída é o botão de confirmação — a mesma régua do LegalConsentModal.
 *
 * Só para quem tem conta: o aviso é sobre como a pessoa vai pagar, e quem
 * ainda não se cadastrou não tem o que fazer com ele. Quem criar conta depois
 * cai na mesma regra e vê o aviso no primeiro acesso já autenticado — o gatilho
 * é o estado da sessão, não uma data de corte.
 *
 * Ainda assim o modal se cala em /criar-conta. O Clerk autentica a pessoa ali
 * mesmo, antes de redirecionar, e nessa janela o LegalConsentModal (Termos +
 * LGPD) pode estar aberto: dois diálogos modais ao mesmo tempo disputam o foco,
 * o de baixo fica inerte e o cadastro trava. O aviso cede a vez e aparece na
 * sequência, em /conta, para onde o Clerk redireciona.
 *
 * ─── TEMPORÁRIO ────────────────────────────────────────────────────────────
 * Existe só durante a migração de meio de pagamento. Com a integração nova da
 * Pagar.me no ar, remover:
 *
 *   1. o import e a linha <AvisoPagamentoModal />, em App.tsx;
 *   2. este arquivo, lib/aviso-pagamento.ts e test/AvisoPagamentoModal.test.tsx.
 *
 * Não reverter o commit inteiro: ele também adicionou a prop `hideClose` ao
 * DialogContent, que é útil por si só e outros modais podem já estar usando.
 * As chaves `kolecta_aviso_visto:*` podem ficar no localStorage de quem já viu:
 * são inertes e não custam nada.
 * ───────────────────────────────────────────────────────────────────────────
 */
const ROTA_CADASTRO = '/criar-conta';

export default function AvisoPagamentoModal() {
  // Começa fechado e abre no efeito: ler localStorage durante o render faria o
  // modal piscar para quem já dispensou.
  const [aberto, setAberto] = useState(false);
  const { pathname } = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const emCadastro = pathname.startsWith(ROTA_CADASTRO);
  const userId = user?.id ?? '';

  useEffect(() => {
    // Espera o Clerk resolver a sessão: decidir durante o carregamento
    // esconderia o aviso de quem está logado, porque `isAuthenticated` ainda
    // é falso nesse instante.
    if (isLoading) return;
    if (!isAuthenticated || !userId || emCadastro) {
      setAberto(false);
      return;
    }
    if (!jaViuAviso(userId)) setAberto(true);
  }, [isAuthenticated, isLoading, emCadastro, userId]);

  const confirmar = () => {
    marcarAvisoVisto(userId);
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={() => { /* só o botão fecha */ }}>
      <DialogContent
        className="sm:max-w-md"
        // Sem saída lateral: nem clique fora, nem ESC, nem o X do canto.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideClose
      >
        <DialogHeader>
          <DialogTitle className="font-heading uppercase italic">
            Estamos melhorando os meios de pagamento
          </DialogTitle>
          <DialogDescription className="sr-only">
            Comunicado sobre a mudança nos meios de pagamento da Kolecta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm leading-relaxed text-foreground">
          <p>
            Estamos passando por melhorias na Kolecta e mudando nossos meios de
            pagamento — tudo para deixar sua compra mais rápida e mais segura.
          </p>

          <div className="rounded-md border-l-2 border-primary bg-muted/40 px-4 py-3">
            <p>
              Durante a transição, o pagamento com{' '}
              <strong>cartão de crédito</strong> pode ficar indisponível em
              alguns momentos. O <strong>Pix</strong> segue funcionando
              normalmente para todas as compras.
            </p>
          </div>

          <p className="text-muted-foreground">
            A equipe Kolecta agradece a paciência e a compreensão de todos.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={confirmar} className="w-full sm:w-auto">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
