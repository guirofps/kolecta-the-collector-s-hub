import { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ShoppingBag, Store, Gavel, CreditCard, Package, Shield, Search, MessageCircle, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Mock Data ──────────────────────────────────────────────

const categories = [
  { slug: 'comprando', name: 'Comprando', icon: ShoppingBag, count: 12 },
  { slug: 'vendendo', name: 'Vendendo', icon: Store, count: 15 },
  { slug: 'modo-lance', name: 'Modo Lance', icon: Gavel, count: 8 },
  { slug: 'pagamentos', name: 'Pagamentos', icon: CreditCard, count: 10 },
  { slug: 'envio', name: 'Envio e entrega', icon: Package, count: 9 },
  { slug: 'conta', name: 'Conta e segurança', icon: Shield, count: 7 },
];

const mockFAQs: Record<string, { q: string; a: string }[]> = {
  comprando: [
    { q: 'Como faço para comprar um produto na Kolecta?', a: 'Para comprar, basta navegar pelo catálogo, selecionar o produto desejado, clicar em "Comprar agora" ou "Adicionar ao carrinho" e seguir o fluxo de checkout. Você precisará estar logado e ter um método de pagamento cadastrado.' },
    { q: 'Posso fazer uma proposta de preço ao vendedor?', a: 'Sim! Em anúncios que aceitam propostas, você verá o botão "Fazer proposta". O vendedor receberá sua oferta e poderá aceitar, recusar ou fazer uma contraproposta. O desconto máximo permitido é definido pelo vendedor.' },
    { q: 'Como sei se o produto é autêntico?', a: 'Recomendamos verificar a reputação do vendedor, ler avaliações de outros compradores e analisar as fotos detalhadas do anúncio. Vendedores verificados passaram pelo processo de KYC da Kolecta. Em caso de dúvida sobre autenticidade, abra uma disputa dentro do prazo previsto.' },
    { q: 'Qual o prazo para receber meu produto?', a: 'O prazo depende da modalidade de frete escolhida e da região de entrega. O vendedor tem até 3 dias úteis para postar o produto após a confirmação do pagamento. Após a postagem, o prazo segue o estimado pela transportadora (PAC, SEDEX, etc.).' },
    { q: 'E se o produto chegar danificado ou diferente do anúncio?', a: 'Você pode abrir uma disputa em até 7 dias após o recebimento. Acesse "Meus Pedidos", localize o pedido em questão e clique em "Abrir Disputa". A Kolecta irá mediar a resolução entre você e o vendedor, podendo determinar reembolso total ou parcial.' },
  ],
  vendendo: [
    { q: 'Como começo a vender na Kolecta?', a: 'Crie uma conta, acesse o Painel do Vendedor e complete a verificação de identidade (KYC). Após aprovação, você poderá criar seus primeiros anúncios. Também será necessário vincular uma conta Stripe para receber seus pagamentos.' },
    { q: 'Quanto custa vender na Kolecta?', a: 'A Kolecta cobra uma comissão sobre cada venda realizada, que varia por categoria (geralmente entre 10% e 14%). Vendas no Modo Lance têm uma taxa adicional. Confira a tabela completa em Taxas e Comissões. Não há mensalidade ou taxa para anunciar.' },
    { q: 'Quanto tempo leva para receber meu dinheiro?', a: 'Os repasses são realizados automaticamente em até 3 dias úteis após a confirmação de entrega pelo comprador. O valor já desconta a comissão da Kolecta. Saques podem ser solicitados a partir de R$ 20,00.' },
    { q: 'Posso editar meu anúncio depois de publicado?', a: 'Sim, você pode editar a maioria das informações do anúncio (descrição, fotos, preço) a qualquer momento, desde que não haja vendas pendentes. Anúncios no Modo Lance não podem ter o lance mínimo alterado após receberem o primeiro lance.' },
    { q: 'O que acontece se eu não enviar o produto no prazo?', a: 'O não envio no prazo pode resultar em penalidades na sua conta, incluindo redução da reputação, suspensão temporária e, em casos recorrentes, banimento da plataforma. O comprador também poderá solicitar cancelamento automático com reembolso integral.' },
  ],
  'modo-lance': [
    { q: 'O que é o Modo Lance?', a: 'O Modo Lance é o sistema de leilão da Kolecta. Vendedores podem colocar seus produtos em leilão com um lance mínimo e prazo definido. Compradores dão lances, e o maior lance ao final do prazo vence o leilão. É ideal para itens raros e colecionáveis de alto valor.' },
    { q: 'Posso cancelar um lance dado?', a: 'Não. Todos os lances são irrevogáveis e vinculantes. Ao dar um lance, você se compromete a comprar o produto caso seja o vencedor. Por isso, avalie bem o valor antes de dar seu lance. O não pagamento após vencer resultará em penalidades.' },
    { q: 'O que é extensão automática?', a: 'Se um lance é dado nos últimos minutos do leilão, o prazo é automaticamente estendido para dar oportunidade de novos lances. Isso evita o "sniping" (lances de último segundo) e garante uma competição justa entre os participantes.' },
    { q: 'Qual o prazo para pagar após vencer o leilão?', a: 'O vencedor tem até 48 horas para efetuar o pagamento. Após esse prazo, o leilão poderá ser reaberto ou o produto oferecido ao segundo maior lance. O não pagamento recorrente pode resultar em suspensão da conta.' },
    { q: 'Posso definir um valor de "Compre Já" no leilão?', a: 'Atualmente o Modo Lance opera exclusivamente por lances. Não há opção de "Compre Já" durante o leilão. Se desejar vender a um preço fixo, crie um anúncio padrão (preço fixo) ao invés de usar o Modo Lance.' },
  ],
  pagamentos: [
    { q: 'Quais formas de pagamento são aceitas?', a: 'A Kolecta aceita cartão de crédito (Visa, Mastercard, Elo, American Express), Pix e boleto bancário. As opções disponíveis podem variar conforme o vendedor e o tipo de transação (compra direta ou Modo Lance).' },
    { q: 'Os pagamentos são seguros?', a: 'Sim. Todos os pagamentos são processados pelo Stripe, uma das maiores plataformas de pagamentos do mundo. Os dados do seu cartão são criptografados e nunca armazenados nos servidores da Kolecta. Utilizamos criptografia TLS/SSL em todas as transações.' },
    { q: 'Posso parcelar minhas compras?', a: 'Sim, compras com cartão de crédito podem ser parceladas em até 12x, sujeito a juros da operadora do cartão. Compras via Pix e boleto são à vista. As condições de parcelamento são exibidas no checkout.' },
    { q: 'Como funciona o reembolso?', a: 'Em caso de reembolso aprovado (por disputa, cancelamento ou estorno), o valor é devolvido pela mesma forma de pagamento original. Reembolsos em cartão de crédito podem levar até 2 faturas para aparecer. Reembolsos via Pix são processados em até 5 dias úteis.' },
    { q: 'O que é o saldo disponível do vendedor?', a: 'O saldo disponível é o valor que o vendedor já pode sacar para sua conta bancária. Ele é composto pelos valores de vendas concluídas (entrega confirmada) menos a comissão da Kolecta. Saques podem ser solicitados a partir de R$ 20,00.' },
  ],
  envio: [
    { q: 'Quais transportadoras estão disponíveis?', a: 'A Kolecta trabalha com os Correios (PAC, SEDEX, SEDEX 10) e transportadoras parceiras. O vendedor define as opções de frete disponíveis ao criar o anúncio. O frete é calculado com base no CEP do comprador e nas dimensões do produto.' },
    { q: 'Posso retirar o produto pessoalmente?', a: 'Alguns vendedores oferecem a opção de retirada em mãos. Quando disponível, essa opção aparecerá no checkout. A retirada é combinada diretamente entre comprador e vendedor através do sistema de mensagens da plataforma.' },
    { q: 'Como rastreio meu pedido?', a: 'Após a postagem, o código de rastreamento é informado pelo vendedor e fica disponível na página do pedido (Meus Pedidos). Você também receberá notificações por e-mail a cada atualização de status da entrega.' },
    { q: 'E se meu pedido não chegar?', a: 'Se o prazo de entrega estimado expirar sem que você receba o produto, abra uma disputa na plataforma. A Kolecta irá analisar o rastreamento e mediar a situação. Em caso de extravio confirmado, você receberá reembolso integral.' },
    { q: 'Como devo embalar meu produto para envio?', a: 'Embale o produto com cuidado, utilizando materiais de proteção adequados (plástico-bolha, isopor, papel kraft). Para itens frágeis ou colecionáveis, recomendamos caixa dupla. Uma embalagem adequada protege sua reputação como vendedor e evita disputas por danos no transporte.' },
  ],
  conta: [
    { q: 'Como altero minha senha?', a: 'Acesse Configurações da Conta e clique em "Alterar senha". Você precisará informar sua senha atual e a nova senha desejada. A nova senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números.' },
    { q: 'O que é a verificação de identidade (KYC)?', a: 'KYC (Know Your Customer) é nosso processo de verificação que garante a segurança da plataforma. Para vendedores, é obrigatório enviar documentos de identificação (RG/CNH), comprovante de residência e selfie com documento. A análise leva em média 24 horas.' },
    { q: 'Posso ter mais de uma conta?', a: 'Não. Cada pessoa física ou jurídica pode ter apenas uma conta na Kolecta. Contas múltiplas detectadas serão suspensas, e o usuário poderá sofrer penalidades, incluindo banimento permanente e retenção de valores.' },
    { q: 'Como ativo a autenticação de dois fatores?', a: 'Acesse Configurações > Segurança e clique em "Ativar 2FA". Você poderá configurar a verificação por aplicativo autenticador (recomendado) ou SMS. A autenticação de dois fatores adiciona uma camada extra de proteção à sua conta.' },
    { q: 'Como excluo minha conta?', a: 'Acesse Configurações > Conta e clique em "Solicitar exclusão da conta". Você precisará confirmar digitando "CONFIRMAR". A exclusão é irreversível e será processada em até 30 dias. Obrigações pendentes (entregas, pagamentos, disputas) devem ser resolvidas antes.' },
  ],
};

// ── Component ──────────────────────────────────────────────

export default function HelpPage() {
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter(cat => {
      const faqs = mockFAQs[cat.slug] || [];
      return cat.name.toLowerCase().includes(q) ||
        faqs.some(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
    });
  }, [search]);

  const filteredFAQs = useMemo(() => {
    if (!search) return mockFAQs;
    const q = search.toLowerCase();
    const result: Record<string, { q: string; a: string }[]> = {};
    for (const [slug, faqs] of Object.entries(mockFAQs)) {
      const cat = categories.find(c => c.slug === slug);
      const matchCat = cat?.name.toLowerCase().includes(q);
      const filtered = faqs.filter(f => matchCat || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
      if (filtered.length) result[slug] = filtered;
    }
    return result;
  }, [search]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero Search */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl font-extrabold italic uppercase mb-4">Como podemos ajudar?</h1>
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar artigos de ajuda..."
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {filteredCategories.map(cat => (
            <Card
              key={cat.slug}
              className="bg-gradient-card border-border cursor-pointer hover:border-kolecta-gold/30 transition-colors"
              onClick={() => document.getElementById(`faq-${cat.slug}`)?.scrollIntoView({ behavior: 'smooth' })}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <cat.icon className="h-5 w-5 text-kolecta-gold" />
                </div>
                <div>
                  <p className="font-heading font-bold">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{cat.count} artigos</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Sections */}
        <div className="space-y-10">
          {categories.filter(c => filteredFAQs[c.slug]?.length).map(cat => (
            <div key={cat.slug} id={`faq-${cat.slug}`} className="scroll-mt-24">
              <h2 className="font-heading text-2xl font-bold mb-2">{cat.name}</h2>
              <div className="line-tech mb-4" />
              <Accordion type="single" collapsible className="space-y-2">
                {(filteredFAQs[cat.slug] || []).map((faq, i) => (
                  <AccordionItem key={i} value={`${cat.slug}-${i}`} className="border border-border rounded-lg px-4">
                    <AccordionTrigger className="text-sm font-medium text-left py-3 hover:no-underline">{faq.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <Button variant="ghost" size="sm" className="mt-3 text-xs text-muted-foreground" asChild>
                <a href={`/ajuda/${cat.slug}`}>Ver todos os artigos desta categoria →</a>
              </Button>
            </div>
          ))}
        </div>

        {/* Contact Card */}
        <Card className="bg-gradient-card border-border mt-12">
          <CardContent className="p-8 text-center">
            <h3 className="font-heading text-2xl font-bold mb-2">Não encontrou o que procurava?</h3>
            <p className="text-sm text-muted-foreground mb-6">Nossa equipe está pronta para ajudar você.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="glow-primary gap-2" asChild>
                <a href="/conta/disputas"><MessageCircle className="h-4 w-4" /> Abrir chamado</a>
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <a href="mailto:suporte@kolecta.com.br"><Mail className="h-4 w-4" /> Email de suporte</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
