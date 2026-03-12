import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
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
import FeesPage from "./pages/Fees";
import SecurityPage from "./pages/Security";
import HowItWorksPage from "./pages/HowItWorks";
import MyBidsPage from "./pages/account/MyBids";
import OrderDetailPage from "./pages/account/OrderDetail";
import VerificationPage from "./pages/account/Verification";
import AccountDashboard from "./pages/account/Dashboard";
import PaymentsPage from "./pages/account/Payments";
import SellerDashboard from "./pages/seller/Dashboard";
import SellerListings from "./pages/seller/Listings";
import CreateListing from "./pages/seller/CreateListing";
import AdminOverview from "./pages/admin/Overview";
import AdminListings from "./pages/admin/Listings";
import AdminUsers from "./pages/admin/Users";
import AdminReports from "./pages/admin/Reports";
import AdminDisputes from "./pages/admin/Disputes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/busca" element={<SearchPage />} />
          <Route path="/produto/:id" element={<ProductDetail />} />
          <Route path="/modo-lance" element={<AuctionsPage />} />
          <Route path="/modo-lance/:id" element={<ProductDetail />} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route path="/categoria/:slug" element={<CategoryPage />} />
          <Route path="/entrar/*" element={<LoginPage />} />
          <Route path="/criar-conta/*" element={<RegisterPage />} />
          <Route path="/esqueci-senha" element={<PlaceholderPage title="Esqueci a Senha" description="Recuperação de senha por e-mail." />} />
          <Route path="/vendedor/:slug" element={<PlaceholderPage title="Loja do Vendedor" description="Perfil público e anúncios do vendedor." />} />
          <Route path="/como-funciona" element={<HowItWorksPage />} />
          <Route path="/taxas-e-comissoes" element={<FeesPage />} />
          <Route path="/seguranca" element={<SecurityPage />} />
          <Route path="/ajuda" element={<PlaceholderPage title="Central de Ajuda" description="Perguntas frequentes e suporte." />} />
          <Route path="/ajuda/:slug" element={<PlaceholderPage title="Artigo de Ajuda" />} />
          <Route path="/termos" element={<PlaceholderPage title="Termos de Uso" />} />
          <Route path="/privacidade" element={<PlaceholderPage title="Política de Privacidade" />} />
          {/* Comprador */}
          <Route path="/conta" element={<AccountDashboard />} />
          <Route path="/conta/pedidos" element={<PlaceholderPage title="Meus Pedidos" />} />
          <Route path="/conta/pedidos/:id" element={<OrderDetailPage />} />
          <Route path="/conta/lances" element={<MyBidsPage />} />
          <Route path="/conta/favoritos" element={<PlaceholderPage title="Favoritos" description="Itens que você salvou." />} />
          <Route path="/conta/enderecos" element={<PlaceholderPage title="Endereços" />} />
          <Route path="/conta/pagamentos" element={<PaymentsPage />} />
          <Route path="/conta/verificacao" element={<VerificationPage />} />
          <Route path="/conta/mensagens" element={<PlaceholderPage title="Mensagens" />} />
          <Route path="/conta/avaliacoes" element={<PlaceholderPage title="Avaliações" />} />
          <Route path="/conta/disputas" element={<PlaceholderPage title="Disputas" />} />
          {/* Vendedor */}
          <Route path="/painel-vendedor" element={<SellerDashboard />} />
          <Route path="/painel-vendedor/anuncios" element={<SellerListings />} />
          <Route path="/painel-vendedor/anuncios/novo" element={<CreateListing />} />
          <Route path="/painel-vendedor/anuncios/:id/editar" element={<PlaceholderPage title="Editar Anúncio" />} />
          <Route path="/painel-vendedor/pedidos" element={<PlaceholderPage title="Pedidos Recebidos" />} />
          <Route path="/painel-vendedor/pedidos/:id" element={<PlaceholderPage title="Detalhe do Pedido" />} />
          <Route path="/painel-vendedor/modo-lance" element={<PlaceholderPage title="Meu Modo Lance" />} />
          <Route path="/painel-vendedor/financeiro" element={<PlaceholderPage title="Financeiro" description="Saldo, comissões, repasses e saques." />} />
          <Route path="/painel-vendedor/mensagens" element={<PlaceholderPage title="Mensagens" />} />
          <Route path="/painel-vendedor/configuracoes" element={<PlaceholderPage title="Configurações do Vendedor" />} />
          <Route path="/painel-vendedor/midia" element={<PlaceholderPage title="Mídia & Destaque" description="Compre destaque para seus anúncios." />} />
          {/* Admin */}
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/usuarios" element={<AdminUsers />} />
          <Route path="/admin/vendedores/verificacao" element={<PlaceholderPage title="Admin – Verificação de Vendedores" />} />
          <Route path="/admin/anuncios" element={<AdminListings />} />
          <Route path="/admin/anuncios/:id" element={<PlaceholderPage title="Admin – Detalhe do Anúncio" />} />
          <Route path="/admin/modo-lance" element={<PlaceholderPage title="Admin – Monitoramento Modo Lance" />} />
          <Route path="/admin/disputas" element={<AdminDisputes />} />
          <Route path="/admin/comissoes-e-taxas" element={<PlaceholderPage title="Admin – Comissões e Taxas" />} />
          <Route path="/admin/financeiro" element={<PlaceholderPage title="Admin – Financeiro" />} />
          <Route path="/admin/midia" element={<PlaceholderPage title="Admin – Mídia & Campanhas" />} />
          <Route path="/admin/relatorios" element={<AdminReports />} />
          <Route path="/admin/configuracoes" element={<PlaceholderPage title="Admin – Configurações" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
