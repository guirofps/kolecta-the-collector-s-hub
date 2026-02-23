import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SearchPage from "./pages/Search";
import ProductDetail from "./pages/ProductDetail";
import AuctionsPage from "./pages/Auctions";
import CategoriesPage from "./pages/Categories";
import CategoryPage from "./pages/CategoryPage";
import LoginPage from "./pages/auth/Login";
import RegisterPage from "./pages/auth/Register";
import PlaceholderPage from "./components/PlaceholderPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/busca" element={<SearchPage />} />
          <Route path="/produto/:id" element={<ProductDetail />} />
          <Route path="/leiloes" element={<AuctionsPage />} />
          <Route path="/leilao/:id" element={<ProductDetail />} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route path="/categoria/:slug" element={<CategoryPage />} />
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/criar-conta" element={<RegisterPage />} />
          <Route path="/esqueci-senha" element={<PlaceholderPage title="Esqueci a Senha" description="Recuperação de senha por e-mail." />} />
          <Route path="/vendedor/:slug" element={<PlaceholderPage title="Loja do Vendedor" description="Perfil público e anúncios do vendedor." />} />
          <Route path="/como-funciona" element={<PlaceholderPage title="Como Funciona" description="Guia completo do marketplace Kolecta." />} />
          <Route path="/taxas-e-comissoes" element={<PlaceholderPage title="Taxas e Comissões" description="Calculadora de taxas e comissões do marketplace." />} />
          <Route path="/seguranca" element={<PlaceholderPage title="Segurança" description="Como protegemos vendedores e compradores." />} />
          <Route path="/ajuda" element={<PlaceholderPage title="Central de Ajuda" description="Perguntas frequentes e suporte." />} />
          <Route path="/ajuda/:slug" element={<PlaceholderPage title="Artigo de Ajuda" />} />
          <Route path="/termos" element={<PlaceholderPage title="Termos de Uso" />} />
          <Route path="/privacidade" element={<PlaceholderPage title="Política de Privacidade" />} />
          {/* Comprador */}
          <Route path="/conta" element={<PlaceholderPage title="Minha Conta" description="Visão geral da sua conta Kolecta." />} />
          <Route path="/conta/pedidos" element={<PlaceholderPage title="Meus Pedidos" />} />
          <Route path="/conta/pedidos/:id" element={<PlaceholderPage title="Detalhe do Pedido" />} />
          <Route path="/conta/favoritos" element={<PlaceholderPage title="Favoritos" description="Itens que você salvou." />} />
          <Route path="/conta/enderecos" element={<PlaceholderPage title="Endereços" />} />
          <Route path="/conta/pagamentos" element={<PlaceholderPage title="Pagamentos" phase="Fase 2" />} />
          <Route path="/conta/mensagens" element={<PlaceholderPage title="Mensagens" />} />
          <Route path="/conta/avaliacoes" element={<PlaceholderPage title="Avaliações" />} />
          <Route path="/conta/disputas" element={<PlaceholderPage title="Disputas" />} />
          {/* Vendedor */}
          <Route path="/painel-vendedor" element={<PlaceholderPage title="Painel do Vendedor" description="Dashboard com métricas de vendas e leilões." />} />
          <Route path="/painel-vendedor/anuncios" element={<PlaceholderPage title="Meus Anúncios" />} />
          <Route path="/painel-vendedor/anuncios/novo" element={<PlaceholderPage title="Criar Anúncio" description="Wizard de criação: tipo, categoria, fotos, preço e revisão." />} />
          <Route path="/painel-vendedor/anuncios/:id/editar" element={<PlaceholderPage title="Editar Anúncio" />} />
          <Route path="/painel-vendedor/pedidos" element={<PlaceholderPage title="Pedidos Recebidos" />} />
          <Route path="/painel-vendedor/pedidos/:id" element={<PlaceholderPage title="Detalhe do Pedido" />} />
          <Route path="/painel-vendedor/leiloes" element={<PlaceholderPage title="Meus Leilões" />} />
          <Route path="/painel-vendedor/financeiro" element={<PlaceholderPage title="Financeiro" description="Saldo, comissões, repasses e saques." />} />
          <Route path="/painel-vendedor/mensagens" element={<PlaceholderPage title="Mensagens" />} />
          <Route path="/painel-vendedor/configuracoes" element={<PlaceholderPage title="Configurações do Vendedor" />} />
          <Route path="/painel-vendedor/midia" element={<PlaceholderPage title="Mídia & Destaque" description="Compre destaque para seus anúncios." />} />
          {/* Admin */}
          <Route path="/admin" element={<PlaceholderPage title="Admin – Overview" description="Dashboard geral do marketplace." />} />
          <Route path="/admin/usuarios" element={<PlaceholderPage title="Admin – Usuários" />} />
          <Route path="/admin/vendedores/verificacao" element={<PlaceholderPage title="Admin – Verificação de Vendedores" />} />
          <Route path="/admin/anuncios" element={<PlaceholderPage title="Admin – Fila de Aprovação" description="Aprovar ou reprovar anúncios." />} />
          <Route path="/admin/anuncios/:id" element={<PlaceholderPage title="Admin – Detalhe do Anúncio" />} />
          <Route path="/admin/leiloes" element={<PlaceholderPage title="Admin – Monitoramento de Leilões" />} />
          <Route path="/admin/denuncias" element={<PlaceholderPage title="Admin – Denúncias" />} />
          <Route path="/admin/comissoes-e-taxas" element={<PlaceholderPage title="Admin – Comissões e Taxas" />} />
          <Route path="/admin/financeiro" element={<PlaceholderPage title="Admin – Financeiro" />} />
          <Route path="/admin/midia" element={<PlaceholderPage title="Admin – Mídia & Campanhas" />} />
          <Route path="/admin/relatorios" element={<PlaceholderPage title="Admin – Relatórios" description="GMV, receita, conversão, top categorias." />} />
          <Route path="/admin/configuracoes" element={<PlaceholderPage title="Admin – Configurações" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
