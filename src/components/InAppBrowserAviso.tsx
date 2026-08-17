import { useState } from 'react';
import { AlertTriangle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { detectInAppBrowser } from '@/lib/in-app-browser';

/**
 * Aviso nas telas de login/cadastro quando o site está aberto num navegador
 * EMBUTIDO (Instagram, Facebook, TikTok). Ali o cadastro trava: o Clerk pode
 * nem carregar e o "Continuar com Google" é recusado pelo Google nesses
 * webviews. A saída é abrir no navegador do sistema, então damos a instrução e
 * um botão pra copiar o link. Detecção em lib/in-app-browser.ts.
 */
export default function InAppBrowserAviso() {
  const [copiado, setCopiado] = useState(false);
  const { isInApp, app } = detectInAppBrowser();

  if (!isInApp) return null;

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard bloqueado no webview: o usuário copia da barra de endereço */
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="flex-1 text-sm">
          <p className="font-heading font-semibold text-foreground">
            Abra no seu navegador para criar a conta
          </p>
          <p className="mt-1 text-muted-foreground">
            Você está no navegador interno {app ? `do ${app}` : 'do app'}, e o
            cadastro não funciona por aqui. Toque no menu (os três pontinhos no
            canto da tela) e escolha <strong>"Abrir no navegador"</strong> (Chrome
            ou Safari). Aí é só criar sua conta normalmente.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copiarLink}
            className="mt-3"
          >
            {copiado ? (
              <>
                <Check className="mr-1.5 h-4 w-4 text-green-600" /> Link copiado
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-4 w-4" /> Copiar o link
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
