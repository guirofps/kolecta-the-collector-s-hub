import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Rede de segurança contra tela branca.
 *
 * No React, um erro em qualquer componente derruba a árvore inteira e o
 * usuário fica olhando uma página em branco, sem saber o que houve nem o que
 * fazer. Aconteceu de verdade: um erro de escopo no formulário de anúncio
 * apagava a tela quando o vendedor confirmava a categoria.
 *
 * Isto não conserta o erro, mas troca a tela branca por uma mensagem com saída.
 * O vendedor entende o que aconteceu e continua trabalhando.
 *
 * Precisa ser componente de classe: `componentDidCatch` não existe em função.
 */
interface Props {
  children: ReactNode;
  /** Nome da área, para a mensagem e para o log. Ex: "criação de anúncio". */
  area?: string;
}

interface State {
  erro: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // Console é o que temos hoje. Quando houver monitoramento de erro, é aqui
    // que o envio entra: sem isso, só descobrimos a quebra quando um vendedor
    // avisa pelo Instagram.
    console.error(
      `[Kolecta] erro em ${this.props.area ?? 'tela'}:`,
      erro,
      info.componentStack,
    );
  }

  private tentarDeNovo = () => this.setState({ erro: null });

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="font-heading text-xl font-bold uppercase">
          Algo deu errado por aqui
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {this.props.area
            ? `Tivemos um problema em ${this.props.area}.`
            : 'Tivemos um problema ao carregar esta tela.'}
          {' '}
          Não foi culpa sua, e nada do que você já salvou foi perdido.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="kolecta" onClick={this.tentarDeNovo}>
            <RefreshCw className="h-4 w-4" />
            Tentar de novo
          </Button>
          <Button variant="outline" asChild>
            <Link to="/painel/anuncios">Ir para meus anúncios</Link>
          </Button>
        </div>

        {/* Detalhe técnico fica recolhido: ajuda no suporte sem assustar. */}
        {import.meta.env.DEV && (
          <pre className="mt-6 max-w-full overflow-x-auto rounded bg-secondary/40 p-3 text-left text-[11px] text-muted-foreground">
            {this.state.erro.message}
          </pre>
        )}
      </div>
    );
  }
}
