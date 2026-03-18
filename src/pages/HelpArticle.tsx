import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────

const mockArticles: Record<string, {
  title: string; category: string; categorySlug: string;
  updatedAt: string; readTime: string;
  content: { type: 'p' | 'h3' | 'list' | 'highlight'; text: string }[];
}> = {
  comprando: {
    title: 'Como comprar seu primeiro produto na Kolecta',
    category: 'Comprando',
    categorySlug: 'comprando',
    updatedAt: 'Março de 2025',
    readTime: '4 min de leitura',
    content: [
      { type: 'p', text: 'A Kolecta é o marketplace especializado em colecionáveis do Brasil. Comprar na plataforma é simples e seguro. Neste guia, vamos te acompanhar em cada etapa do processo de compra, desde a busca pelo produto ideal até a confirmação de recebimento.' },
      { type: 'h3', text: 'Passo 1: Encontre o produto' },
      { type: 'p', text: 'Utilize a barra de busca para encontrar o que procura, ou navegue pelas categorias. Você pode filtrar por preço, condição do produto, localização do vendedor e tipo de venda (preço fixo ou Modo Lance). Cada anúncio exibe fotos detalhadas, descrição completa e avaliações do vendedor.' },
      { type: 'h3', text: 'Passo 2: Análise e decisão' },
      { type: 'p', text: 'Antes de comprar, verifique a reputação do vendedor (número de vendas e avaliação média), leia a descrição completa do produto e analise todas as fotos disponíveis. Se tiver dúvidas, utilize o sistema de mensagens para falar diretamente com o vendedor.' },
      { type: 'highlight', text: 'Dica: Vendedores com o selo de verificação passaram pelo processo de KYC da Kolecta, o que adiciona uma camada extra de segurança à sua compra.' },
      { type: 'h3', text: 'Passo 3: Finalize a compra' },
      { type: 'p', text: 'Adicione o produto ao carrinho e siga para o checkout. Escolha o endereço de entrega, o método de frete e a forma de pagamento. Aceitamos cartão de crédito, Pix e boleto bancário. Após a confirmação do pagamento, o vendedor será notificado para preparar o envio.' },
      { type: 'h3', text: 'Passo 4: Acompanhe e receba' },
      { type: 'p', text: 'Após o envio, o código de rastreamento ficará disponível em "Meus Pedidos". Ao receber o produto, confirme o recebimento na plataforma. Se houver qualquer problema, você tem até 7 dias para abrir uma disputa. Sua satisfação e segurança são prioridades para nós.' },
    ],
  },
  vendendo: {
    title: 'Guia completo para começar a vender',
    category: 'Vendendo',
    categorySlug: 'vendendo',
    updatedAt: 'Março de 2025',
    readTime: '5 min de leitura',
    content: [
      { type: 'p', text: 'Vender na Kolecta é uma excelente oportunidade para monetizar sua coleção ou construir um negócio no mercado de colecionáveis. Este guia cobre tudo o que você precisa saber para começar.' },
      { type: 'h3', text: 'Criando sua conta de vendedor' },
      { type: 'p', text: 'Após criar sua conta na Kolecta, acesse o Painel do Vendedor e inicie o processo de verificação de identidade (KYC). Você precisará enviar documentos de identificação, comprovante de residência e uma selfie com documento. A análise é feita em até 24 horas.' },
      { type: 'h3', text: 'Configurando pagamentos' },
      { type: 'p', text: 'Para receber seus pagamentos, vincule uma conta Stripe ao seu perfil de vendedor. O processo é rápido e seguro. Os repasses são feitos automaticamente em até 3 dias úteis após a confirmação de entrega.' },
      { type: 'highlight', text: 'Importante: Configure suas políticas de envio e devolução no Painel do Vendedor antes de criar seu primeiro anúncio. Isso transmite confiança aos compradores.' },
      { type: 'h3', text: 'Criando seu primeiro anúncio' },
      { type: 'p', text: 'No Painel do Vendedor, clique em "Novo Anúncio". Preencha todas as informações do produto: título claro, descrição detalhada, condição exata do item, fotos de alta qualidade (mínimo 3 fotos) e preço competitivo. Anúncios completos e bem elaborados vendem até 3x mais rápido.' },
    ],
  },
};

const mockRelatedArticles = [
  { slug: 'comprando', title: 'Como comprar seu primeiro produto na Kolecta', category: 'Comprando', readTime: '4 min' },
  { slug: 'vendendo', title: 'Guia completo para começar a vender', category: 'Vendendo', readTime: '5 min' },
  { slug: 'modo-lance', title: 'Tudo sobre o Modo Lance', category: 'Modo Lance', readTime: '3 min' },
];

// ── Component ──────────────────────────────────────────────

export default function HelpArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [feedback, setFeedback] = useState<boolean | null>(null);

  const article = mockArticles[slug || ''] || mockArticles.comprando;
  const related = mockRelatedArticles.filter(r => r.slug !== slug);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
          <Link to="/ajuda" className="hover:text-foreground transition-colors">Ajuda</Link>
          <ChevronRight className="h-3 w-3" />
          <span>{article.category}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground truncate max-w-[200px]">{article.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold italic uppercase mb-3">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="text-xs">{article.category}</Badge>
            <span className="text-xs text-muted-foreground">{article.updatedAt}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {article.readTime}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-12">
          {article.content.map((block, i) => {
            switch (block.type) {
              case 'h3': return <h3 key={i} className="font-heading text-lg font-bold mt-6">{block.text}</h3>;
              case 'list': return <ul key={i} className="text-sm leading-relaxed text-muted-foreground list-disc pl-5 space-y-1">{block.text.split('\n').map((li, j) => <li key={j}>{li}</li>)}</ul>;
              case 'highlight': return (
                <div key={i} className="border-l-2 border-kolecta-gold pl-4 py-2 bg-[hsl(var(--kolecta-gold))]/5 rounded-r-md">
                  <p className="text-sm leading-relaxed text-kolecta-gold font-medium">{block.text}</p>
                </div>
              );
              default: return <p key={i} className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>;
            }
          })}
        </div>

        <Separator className="mb-8" />

        {/* Feedback */}
        {/* API: POST /api/help/articles/:slug/feedback Body: { helpful: boolean } */}
        <div className="text-center mb-12">
          {feedback === null ? (
            <>
              <p className="text-sm font-medium mb-3">Este artigo foi útil?</p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setFeedback(true)}>
                  <ThumbsUp className="h-4 w-4" /> Sim
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setFeedback(false)}>
                  <ThumbsDown className="h-4 w-4" /> Não
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground animate-fade-in">
              {feedback ? 'Obrigado pelo feedback! Ficamos felizes em ajudar. 😊' : 'Obrigado! Vamos melhorar este artigo. Se precisar, entre em contato com o suporte.'}
            </p>
          )}
        </div>

        {/* Related articles */}
        <div>
          <h3 className="font-heading text-xl font-bold mb-4">Artigos relacionados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {related.map(r => (
              <Card key={r.slug} className="bg-gradient-card border-border hover:border-kolecta-gold/30 transition-colors">
                <CardContent className="p-4">
                  <Link to={`/ajuda/${r.slug}`} className="block">
                    <p className="text-sm font-medium mb-1 hover:text-kolecta-gold transition-colors">{r.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                      <span>{r.readTime}</span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
