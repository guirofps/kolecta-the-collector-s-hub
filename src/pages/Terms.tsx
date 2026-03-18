import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'aceitacao', title: '1. Aceitação dos termos', content: `Ao acessar, navegar ou utilizar a plataforma Kolecta ("Plataforma"), disponível em kolecta.com.br e em seus aplicativos móveis, você declara que leu, compreendeu e concorda com estes Termos de Uso em sua totalidade. Caso não concorde com qualquer disposição aqui prevista, recomendamos que não utilize nossos serviços.\n\nEstes Termos constituem um contrato vinculante entre você ("Usuário") e a Kolecta Tecnologia Ltda., inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede na cidade de São Paulo/SP ("Kolecta" ou "nós"). A utilização da Plataforma implica na aceitação automática e integral de todas as condições aqui estabelecidas, bem como da nossa Política de Privacidade.` },
  { id: 'definicoes', title: '2. Definições', content: `Para fins destes Termos, consideram-se as seguintes definições:\n\n• **Plataforma**: o website kolecta.com.br e os aplicativos móveis da Kolecta.\n• **Usuário**: toda pessoa física ou jurídica que acessa ou utiliza a Plataforma, seja como comprador ou vendedor.\n• **Comprador**: Usuário que adquire ou demonstra interesse em adquirir Produtos na Plataforma.\n• **Vendedor**: Usuário que anuncia e comercializa Produtos através da Plataforma.\n• **Produto**: qualquer item colecionável, raro ou de nicho anunciado na Plataforma.\n• **Modo Lance**: funcionalidade de leilão disponível para Produtos selecionados.\n• **Anúncio**: a publicação de oferta de Produto na Plataforma pelo Vendedor.` },
  { id: 'cadastro', title: '3. Cadastro e conta', content: `Para utilizar determinados serviços da Plataforma, o Usuário deverá criar uma conta fornecendo informações verdadeiras, completas e atualizadas. O Usuário é o único responsável pela veracidade das informações cadastrais e pela manutenção da confidencialidade de sua senha e credenciais de acesso.\n\nCada pessoa física ou jurídica poderá manter apenas uma conta na Plataforma. A Kolecta reserva-se o direito de recusar o cadastro ou suspender contas que apresentem informações inconsistentes, fraudulentas ou que violem estes Termos.\n\nO Vendedor deverá, adicionalmente, passar por processo de verificação de identidade (KYC) antes de poder publicar anúncios, conforme exigido pela regulamentação aplicável e pelas políticas internas da Plataforma.` },
  { id: 'uso', title: '4. Uso da plataforma', content: `O Usuário compromete-se a utilizar a Plataforma de forma ética, legal e em conformidade com estes Termos. É expressamente vedado:\n\n• Utilizar a Plataforma para fins ilícitos ou que contrariem a moral e os bons costumes;\n• Publicar conteúdo ofensivo, discriminatório, difamatório ou que viole direitos de terceiros;\n• Manipular preços, lances ou avaliações de forma artificial;\n• Criar múltiplas contas para obter vantagens indevidas;\n• Utilizar bots, scripts ou ferramentas automatizadas sem autorização expressa;\n• Tentar acessar áreas restritas da Plataforma ou seus sistemas internos;\n• Praticar qualquer forma de fraude, incluindo mas não limitado a shill bidding.\n\nA Kolecta reserva-se o direito de remover conteúdo, suspender ou encerrar contas que violem estas regras, sem aviso prévio e sem prejuízo das medidas legais cabíveis.` },
  { id: 'anuncios', title: '5. Anúncios e vendas', content: `O Vendedor é o único e exclusivo responsável pelo conteúdo de seus anúncios, incluindo descrições, fotos, preços e condições de venda. Os anúncios devem refletir fielmente as características do Produto ofertado.\n\nA Kolecta realiza moderação de anúncios e reserva-se o direito de rejeitar, suspender ou remover anúncios que violem estes Termos, contenham informações falsas ou enganosas, ou que se refiram a produtos proibidos pela legislação brasileira ou pelas políticas da Plataforma.\n\nAo concluir uma venda, o Vendedor obriga-se a enviar o Produto nas condições anunciadas, dentro do prazo informado, e a fornecer o código de rastreamento ao Comprador. O não cumprimento destas obrigações poderá resultar em penalidades, incluindo suspensão da conta e retenção de valores.` },
  { id: 'modo-lance', title: '6. Modo Lance', content: `O Modo Lance é a funcionalidade de leilão da Plataforma, onde Compradores podem dar lances em Produtos selecionados. As seguintes regras se aplicam:\n\n• Cada lance é irrevogável e vinculante. Ao dar um lance, o Comprador compromete-se a adquirir o Produto caso seja o vencedor.\n• O lance mínimo é definido pelo Vendedor no momento da criação do anúncio.\n• O prazo para pagamento após vencer o leilão é de 48 horas. O não pagamento no prazo resultará em penalidades e poderá acarretar suspensão da conta.\n• A Kolecta poderá intervir em leilões que apresentem comportamento suspeito, incluindo cancelamento de lances fraudulentos.\n• A extensão automática do leilão poderá ocorrer quando houver lances nos minutos finais, conforme configuração da Plataforma.\n• O shill bidding (prática de dar lances em seu próprio leilão) é expressamente proibido e resultará no banimento permanente.` },
  { id: 'pagamentos', title: '7. Pagamentos e taxas', content: `A Kolecta cobra comissão sobre cada venda realizada na Plataforma, conforme tabela de comissões vigente disponível em kolecta.com.br/taxas-e-comissoes. As taxas podem variar por categoria de produto e tipo de venda (preço fixo ou Modo Lance).\n\nOs pagamentos são processados através da plataforma Stripe, e o Vendedor deverá vincular uma conta Stripe válida para receber seus repasses. Os repasses são realizados automaticamente após a confirmação de entrega do Produto, respeitando o prazo de segurança definido pela Plataforma.\n\nA Kolecta não se responsabiliza por problemas relacionados ao processamento de pagamentos pelo Stripe ou por instituições financeiras, incluindo chargebacks, estornos ou bloqueios de conta.` },
  { id: 'responsabilidades', title: '8. Responsabilidades', content: `A Kolecta atua como intermediadora, facilitando o contato e a transação entre Compradores e Vendedores. A Kolecta não é proprietária dos Produtos anunciados, não os mantém em estoque e não participa da negociação direta entre as partes.\n\nO Vendedor é exclusivamente responsável pela qualidade, autenticidade, entrega e garantia dos Produtos vendidos. O Comprador é responsável por verificar as informações do anúncio antes de efetuar a compra.\n\nA Kolecta não garante a autenticidade de nenhum Produto anunciado, embora se empenhe em manter a qualidade do marketplace através de seus processos de verificação e moderação. Em caso de disputa, a Kolecta poderá mediar a resolução, mas a decisão final caberá às partes ou ao Poder Judiciário.` },
  { id: 'propriedade', title: '9. Propriedade intelectual', content: `Todo o conteúdo da Plataforma, incluindo mas não limitado a logotipos, marcas, layout, textos, código-fonte, design e funcionalidades, é de propriedade exclusiva da Kolecta ou de seus licenciadores, sendo protegido pela legislação brasileira de propriedade intelectual.\n\nAo publicar conteúdo na Plataforma (fotos, descrições, avaliações), o Usuário concede à Kolecta uma licença não exclusiva, gratuita, irrevogável e mundial para utilizar, reproduzir e exibir tal conteúdo no âmbito da Plataforma e em materiais de divulgação.\n\nÉ vedada a reprodução, cópia, modificação, distribuição ou utilização comercial de qualquer conteúdo da Plataforma sem autorização prévia e expressa da Kolecta.` },
  { id: 'privacidade', title: '10. Privacidade e dados', content: `A coleta, armazenamento e tratamento de dados pessoais dos Usuários são regidos pela nossa Política de Privacidade, disponível em kolecta.com.br/privacidade, que integra estes Termos de Uso.\n\nA Kolecta está comprometida com a proteção dos dados pessoais de seus Usuários, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Para mais informações sobre como tratamos seus dados, consulte nossa Política de Privacidade.` },
  { id: 'cancelamento', title: '11. Cancelamento e suspensão', content: `O Usuário poderá solicitar o cancelamento de sua conta a qualquer momento, através das configurações da Plataforma ou por contato com o suporte. O cancelamento não isenta o Usuário de obrigações pendentes, incluindo entregas em andamento, pagamentos devidos ou disputas abertas.\n\nA Kolecta poderá, a seu exclusivo critério, suspender temporariamente ou cancelar definitivamente contas de Usuários que violem estes Termos, pratiquem fraudes, recebam avaliações negativas recorrentes ou cujo comportamento represente risco à segurança da Plataforma ou de outros Usuários.\n\nEm caso de cancelamento por violação, a Kolecta poderá reter valores pendentes para fins de ressarcimento a terceiros prejudicados.` },
  { id: 'disposicoes', title: '12. Disposições gerais', content: `Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer questões decorrentes destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.\n\nA Kolecta reserva-se o direito de alterar estes Termos a qualquer momento, mediante publicação da versão atualizada na Plataforma. As alterações entrarão em vigor a partir da data de publicação. O uso continuado da Plataforma após as alterações constitui aceitação tácita dos novos termos.\n\nSe qualquer disposição destes Termos for considerada inválida ou inexequível por qualquer tribunal competente, as demais disposições permanecerão em pleno vigor e efeito.\n\nA tolerância da Kolecta em relação ao descumprimento de qualquer cláusula destes Termos não constituirá renúncia ao direito de exigi-la a qualquer tempo.` },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowTop(window.scrollY > 300);

      const offsets = sections.map(s => {
        const el = document.getElementById(s.id);
        return { id: s.id, top: el ? el.getBoundingClientRect().top : Infinity };
      });
      const current = offsets.find(o => o.top > 0) || offsets[offsets.length - 1];
      if (current) setActiveSection(current.id);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Layout>
      <div className="max-w-[860px] mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-heading text-4xl font-extrabold italic uppercase">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground mt-2">Última atualização: março de 2025</p>
          <Badge variant="outline" className="mt-2 text-xs">Versão 1.0</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10">
          {/* Sidebar nav */}
          <nav className="hidden lg:block sticky top-20 self-start space-y-0.5 max-h-[calc(100vh-120px)] overflow-y-auto">
            {sections.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }); }}
                className={cn(
                  'block text-xs py-1.5 pl-3 border-l-2 transition-colors',
                  activeSection === s.id
                    ? 'border-kolecta-gold text-kolecta-gold font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {s.title}
              </a>
            ))}
          </nav>

          {/* Content */}
          <div className="space-y-0">
            {sections.map((s, i) => (
              <div key={s.id}>
                <div id={s.id} className="scroll-mt-24 py-6">
                  <h2 className="font-heading text-xl font-bold mb-4">{s.title}</h2>
                  <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{s.content}</div>
                </div>
                {i < sections.length - 1 && <div className="line-tech" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Back to top */}
      {showTop && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-50 rounded-full glow-primary animate-fade-in"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
    </Layout>
  );
}
