import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, Eye, Pencil, Trash2, ArrowRightLeft, Ban, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const lgpdRights = [
  { icon: Eye, name: 'Acesso', desc: 'Solicitar acesso aos dados pessoais que mantemos sobre você.' },
  { icon: Pencil, name: 'Correção', desc: 'Solicitar a correção de dados incompletos, inexatos ou desatualizados.' },
  { icon: Trash2, name: 'Exclusão', desc: 'Solicitar a exclusão de dados tratados com base no consentimento.' },
  { icon: ArrowRightLeft, name: 'Portabilidade', desc: 'Solicitar a transferência dos seus dados para outro serviço.' },
  { icon: Ban, name: 'Oposição', desc: 'Opor-se ao tratamento de dados em hipóteses de descumprimento da LGPD.' },
  { icon: KeyRound, name: 'Revogação de consentimento', desc: 'Revogar o consentimento previamente dado a qualquer momento.' },
];

const sections = [
  { id: 'coleta', title: '1. Informações que coletamos', content: `A Kolecta coleta diferentes tipos de informações para fornecer e melhorar nossos serviços:\n\n**Dados fornecidos por você**: nome completo, CPF/CNPJ, endereço de e-mail, telefone, endereço de entrega, dados bancários (para vendedores), documentos de identificação (para verificação KYC) e fotos de perfil.\n\n**Dados coletados automaticamente**: endereço IP, tipo de navegador, sistema operacional, páginas visitadas, horários de acesso, dados de localização aproximada, informações do dispositivo e dados de uso da Plataforma.\n\n**Dados de transações**: histórico de compras e vendas, valores transacionados, lances realizados, métodos de pagamento utilizados e avaliações feitas ou recebidas.` },
  { id: 'uso', title: '2. Como usamos suas informações', content: `Utilizamos suas informações pessoais para as seguintes finalidades:\n\n• Criar e gerenciar sua conta na Plataforma;\n• Processar transações de compra e venda, incluindo pagamentos e repasses;\n• Verificar sua identidade e prevenir fraudes;\n• Fornecer suporte ao cliente e resolver disputas;\n• Enviar comunicações transacionais (confirmações de pedido, atualizações de envio);\n• Enviar comunicações de marketing, quando autorizado por você;\n• Personalizar sua experiência na Plataforma, recomendando produtos relevantes;\n• Realizar análises estatísticas e melhorar nossos serviços;\n• Cumprir obrigações legais e regulatórias.` },
  { id: 'compartilhamento', title: '3. Compartilhamento de dados', content: `A Kolecta poderá compartilhar seus dados pessoais com terceiros nas seguintes situações:\n\n**Com outros Usuários**: quando necessário para a realização de transações (ex: endereço de entrega compartilhado com o Vendedor para envio do produto).\n\n**Com processadores de pagamento**: compartilhamos dados com o Stripe para processamento de pagamentos e repasses financeiros.\n\n**Com prestadores de serviço**: empresas que nos auxiliam na operação da Plataforma, como serviços de hospedagem, envio de e-mails, análise de dados e suporte ao cliente.\n\n**Por exigência legal**: quando obrigados por lei, ordem judicial ou solicitação de autoridades competentes.\n\n**Em caso de reestruturação**: em caso de fusão, aquisição ou venda de ativos, seus dados poderão ser transferidos ao novo controlador.\n\nTodos os terceiros com quem compartilhamos dados são obrigados a manter a confidencialidade e segurança das informações, de acordo com a LGPD.` },
  { id: 'cookies', title: '4. Cookies e rastreamento', content: `A Plataforma utiliza cookies e tecnologias de rastreamento semelhantes para:\n\n**Cookies essenciais**: necessários para o funcionamento básico da Plataforma, como manter sua sessão ativa e lembrar itens no carrinho.\n\n**Cookies de desempenho**: coletam informações sobre como você usa a Plataforma (páginas mais visitadas, erros encontrados) para melhorar nossos serviços.\n\n**Cookies de funcionalidade**: lembram suas preferências, como idioma e região, para personalizar sua experiência.\n\n**Cookies de publicidade**: podem ser usados para exibir anúncios relevantes dentro e fora da Plataforma.\n\nVocê pode gerenciar suas preferências de cookies através das configurações do seu navegador. No entanto, a desativação de cookies essenciais poderá afetar o funcionamento da Plataforma.` },
  { id: 'seguranca', title: '5. Segurança dos dados', content: `A Kolecta adota medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Nossas medidas incluem:\n\n• Criptografia de dados em trânsito (TLS/SSL) e em repouso;\n• Controle de acesso baseado em funções para funcionários e sistemas internos;\n• Monitoramento contínuo de atividades suspeitas;\n• Testes regulares de segurança e auditorias;\n• Treinamento periódico de nossa equipe sobre proteção de dados.\n\nApesar de todos os nossos esforços, nenhum sistema de segurança é 100% inviolável. Em caso de incidente de segurança que possa gerar riscos relevantes aos titulares, notificaremos os afetados e a Autoridade Nacional de Proteção de Dados (ANPD) conforme determina a LGPD.` },
  { id: 'retencao', title: '6. Retenção de dados', content: `Mantemos seus dados pessoais pelo tempo necessário para cumprir as finalidades para as quais foram coletados, ou conforme exigido por lei. Os critérios para definição do período de retenção incluem:\n\n• **Dados de conta**: mantidos enquanto sua conta estiver ativa e por até 5 anos após o encerramento, conforme legislação tributária e comercial.\n• **Dados de transações**: mantidos por no mínimo 5 anos para fins fiscais e contábeis.\n• **Dados de comunicações**: mantidos por até 2 anos após o encerramento da conta.\n• **Dados de verificação (KYC)**: mantidos por no mínimo 5 anos após o último uso, conforme regulamentação antilavagem de dinheiro.\n\nApós os períodos de retenção, seus dados serão anonimizados ou excluídos de forma segura.` },
  { id: 'direitos', title: '7. Seus direitos (LGPD)', content: `A Lei Geral de Proteção de Dados (LGPD) garante a você, como titular de dados, os seguintes direitos:`, hasRightsCards: true },
  { id: 'menores', title: '8. Dados de menores', content: `A Plataforma não se destina a menores de 18 anos. Não coletamos intencionalmente dados pessoais de menores de idade. Se tomarmos conhecimento de que coletamos dados de um menor sem o consentimento dos pais ou responsáveis legais, tomaremos medidas para excluir essas informações o mais rápido possível.\n\nSe você é pai, mãe ou responsável legal e acredita que seu filho menor de idade forneceu dados pessoais à Kolecta, entre em contato conosco pelo e-mail privacidade@kolecta.com.br para que possamos tomar as providências cabíveis.` },
  { id: 'transferencias', title: '9. Transferências internacionais', content: `A Kolecta poderá transferir dados pessoais para fora do Brasil nas seguintes situações:\n\n• Quando o processamento for realizado por prestadores de serviço localizados em outros países (ex: servidores de hospedagem, processador de pagamentos Stripe);\n• Para cumprimento de obrigações legais internacionais.\n\nNesses casos, garantimos que as transferências ocorram para países que ofereçam nível adequado de proteção de dados, ou mediante a adoção de cláusulas-padrão contratuais aprovadas pela ANPD, conforme previsto na LGPD.` },
  { id: 'alteracoes', title: '10. Alterações nesta política', content: `A Kolecta poderá atualizar esta Política de Privacidade periodicamente para refletir mudanças em nossas práticas de tratamento de dados, atualizações legais ou melhorias em nossos serviços.\n\nQuando realizarmos alterações significativas, notificaremos você por e-mail e/ou através de um aviso destacado na Plataforma. A data da última atualização será sempre indicada no início deste documento.\n\nRecomendamos que você revise esta Política periodicamente para estar ciente de como protegemos suas informações.` },
  { id: 'contato', title: '11. Contato e DPO', content: `Se você tiver dúvidas, preocupações ou quiser exercer qualquer um dos seus direitos, entre em contato conosco:\n\n**E-mail geral**: suporte@kolecta.com.br\n**E-mail de privacidade**: privacidade@kolecta.com.br\n\n**Encarregado de Proteção de Dados (DPO)**:\nNome: Ana Carolina Silva\nE-mail: dpo@kolecta.com.br\nTelefone: (11) 9999-0000\n\nNos comprometemos a responder todas as solicitações no prazo de 15 dias corridos, conforme estabelecido pela LGPD.\n\nCaso não esteja satisfeito com nossa resposta, você tem o direito de registrar uma reclamação junto à Autoridade Nacional de Proteção de Dados (ANPD).` },
];

export default function PrivacyPage() {
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
        <div className="mb-10">
          <h1 className="font-heading text-4xl font-extrabold italic uppercase">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground mt-2">Última atualização: março de 2025</p>
          <Badge variant="outline" className="mt-2 text-xs">Versão 1.0</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10">
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

          <div className="space-y-0">
            {sections.map((s, i) => (
              <div key={s.id}>
                <div id={s.id} className="scroll-mt-24 py-6">
                  <h2 className="font-heading text-xl font-bold mb-4">{s.title}</h2>
                  <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{s.content}</div>

                  {s.hasRightsCards && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                      {lgpdRights.map(r => (
                        <Card key={r.name} className="bg-gradient-card border-border">
                          <CardContent className="p-4 flex items-start gap-3">
                            <r.icon className="h-5 w-5 text-kolecta-gold shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-heading font-bold">{r.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <div className="sm:col-span-2 mt-2">
                        <Button variant="outline" className="glow-primary" asChild>
                          <a href="mailto:privacidade@kolecta.com.br">Exercer meus direitos</a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {i < sections.length - 1 && <div className="line-tech" />}
              </div>
            ))}
          </div>
        </div>
      </div>

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
