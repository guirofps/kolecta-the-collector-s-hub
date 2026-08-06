import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import LaunchGate from "./components/LaunchGate";
import ErrorBoundary from "./components/ErrorBoundary";
import DevUserSwitcher from "./components/DevUserSwitcher";
import ConsentSync from "./components/ConsentSync";
import AvisoPagamentoModal from "./components/AvisoPagamentoModal";
import { AuthProvider } from "./contexts/AuthContext";
import { CLERK_ENABLED } from "./lib/clerk";
import Index from "./pages/Index";
import LaunchCountdown from "./pages/LaunchCountdown";
import NotFound from "./pages/NotFound";
import SearchPage from "./pages/Search";
import ProductDetail from "./pages/ProductDetail";
import AuctionsPage from "./pages/Auctions";
import AuctionDetail from "./pages/AuctionDetail";
import CommunityPage from "./pages/Community";
import CategoriesPage from "./pages/Categories";
import CategoryPage from "./pages/CategoryPage";
import LoginPage from "./pages/auth/Login";
import RegisterPage from "./pages/auth/Register";
import ForgotPasswordPage from "./pages/auth/ForgotPassword";
import FeesPage from "./pages/Fees";
import SellerProfilePage from "./pages/SellerProfile";
import SecurityPage from "./pages/Security";
import HowItWorksPage from "./pages/HowItWorks";
import TermsPage from "./pages/Terms";
import PrivacyPage from "./pages/Privacy";
import HelpPage from "./pages/Help";
import HelpArticlePage from "./pages/HelpArticle";
import MyBidsPage from "./pages/account/MyBids";
import OrdersPage from "./pages/account/Orders";
import OrderDetailPage from "./pages/account/OrderDetail";
import VerificationPage from "./pages/account/Verification";
import AccountDashboard from "./pages/account/Dashboard";
import PaymentsPage from "./pages/account/Payments";
import AddressesPage from "./pages/account/Addresses";
import FavoritesPage from "./pages/account/Favorites";
import MessagesPage from "./pages/account/Messages";
import ReviewsPage from "./pages/account/Reviews";
import AccountDisputesPage from "./pages/account/Disputes";
import SellerDashboard from "./pages/seller/Dashboard";
import StripeOnboardingPage from "./pages/seller/StripeOnboarding";
import RecipientOnboardingPage from "./pages/seller/RecipientOnboarding";
import SellerListings from "./pages/seller/Listings";
import CreateListing from "./pages/seller/CreateListing";
import EditListing from "./pages/seller/EditListing";
import SellerOrdersPage from "./pages/seller/Orders";
import SellerOrderDetailPage from "./pages/seller/OrderDetail";
import SellerFinancialPage from "./pages/seller/Financial";
import AuctionManagerPage from "./pages/seller/AuctionManager";
import SellerMessagesPage from "./pages/seller/Messages";
import SellerSettingsPage from "./pages/seller/Settings";
import SellerMediaPage from "./pages/seller/Media";
import BulkImportPage from "./pages/seller/BulkImport";
import IntegrationsPage from "./pages/seller/Integrations";
import BlingImportPage from "./pages/seller/BlingImport";
import CompletarAnunciosPage from "./pages/seller/CompletarAnuncios";
import AdminOverview from "./pages/admin/Overview";
import AdminListings from "./pages/admin/Listings";
import AdminCommunity from "./pages/admin/Community";
import AdminUsers from "./pages/admin/Users";
import AdminFounders from "./pages/admin/Founders";
import AdminReports from "./pages/admin/Reports";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminDisputes from "./pages/admin/Disputes";
import AdminSellerVerification from "./pages/admin/SellerVerification";
import AdminListingDetail from "./pages/admin/ListingDetail";
import AdminAuctionMonitor from "./pages/admin/AuctionMonitor";
import AdminFinancial from "./pages/admin/Financial";
import AdminCommissionsAndFees from "./pages/admin/CommissionsAndFees";
import AdminSettings from "./pages/admin/Settings";
import AdminMedia from "./pages/admin/Media";
import AdminOrders from "./pages/admin/Orders";
import AdminOrderDetail from "./pages/admin/OrderDetail";
import CartPage from "./pages/Cart";
import CheckoutPage from "./pages/Checkout";
import OrderConfirmationPage from "./pages/OrderConfirmation";
import ConnectSuccessPage from "./pages/connect/Success";
import { CartProvider } from "./contexts/CartContext";
import CartDrawer from "./components/CartDrawer";
import { MetaPixelPageView, MetaPixelSignup } from "./components/MetaPixel";
import TrafficTracker from "./components/TrafficTracker";
import { Analytics } from "@vercel/analytics/react";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const isLovablePreview =
  typeof window !== "undefined" && /(^|\.)[\w-]*--[\w-]+\.lovable\.app$/.test(window.location.hostname);

const showDevUserSwitcher =
  import.meta.env.DEV ||
  import.meta.env.VITE_ENV === "development" ||
  isLovablePreview;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CartDrawer />
          <ScrollToTop />
          <MetaPixelPageView />
          <TrafficTracker />
          {/* Medição de tráfego própria. O Meta Pixel mede para a campanha; este
              mede para nós, e o número não fica preso na conta de anúncios.
              Não usa cookie nem identifica a pessoa, então não entra no fluxo de
              consentimento. Fora do <Routes> de propósito: conta a navegação
              inteira, e um erro dentro dele não derrubaria a página. */}
          <Analytics />
          {CLERK_ENABLED && <MetaPixelSignup />}
          {CLERK_ENABLED && <ConsentSync />}
          {showDevUserSwitcher && <DevUserSwitcher />}
          <LaunchGate>
          {/* Comunicado da mudança nos meios de pagamento. Dentro do LaunchGate
              de propósito: quem ainda vê a contagem regressiva não tem o que
              fazer com um aviso sobre pagamento. */}
          <AvisoPagamentoModal />
          {/* Rede contra tela branca: erro em qualquer rota vira uma mensagem
              com saída, em vez de apagar a página inteira. */}
          <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            {/* Captação de Fundador permanente. Antes do lançamento a landing
                vivia na raiz, via LaunchGate; depois a raiz virou a home e a
                landing ficaria órfã. Aqui ela ganha URL fixa, para a campanha
                de anúncios continuar mandando tráfego e recrutando lojista. */}
            <Route path="/fundadores" element={<LaunchCountdown />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/pedido/confirmacao" element={<OrderConfirmationPage />} />
            <Route path="/busca" element={<SearchPage />} />
            <Route path="/produto/:id" element={<ProductDetail />} />
            <Route path="/modo-lance" element={<AuctionsPage />} />
            <Route path="/modo-lance/:id" element={<AuctionDetail />} />
            <Route path="/comunidade" element={<CommunityPage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
            <Route path="/categoria/:slug" element={<CategoryPage />} />
            <Route path="/entrar/*" element={<LoginPage />} />
            <Route path="/criar-conta/*" element={<RegisterPage />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
            <Route path="/vendedor/:slug" element={<SellerProfilePage />} />
            <Route path="/como-funciona" element={<HowItWorksPage />} />
            <Route path="/taxas-e-comissoes" element={<FeesPage />} />
            <Route path="/seguranca" element={<SecurityPage />} />
            <Route path="/ajuda" element={<HelpPage />} />
            <Route path="/ajuda/:slug" element={<HelpArticlePage />} />
            <Route path="/termos" element={<TermsPage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />

            {/* Stripe Connect Callbacks */}
            <Route path="/connect/success" element={<ConnectSuccessPage />} />
            <Route path="/connect/refresh" element={<Navigate to="/painel/recebedor" replace />} />

            {/* Conta — requireAuth (todo user autenticado) */}
            <Route path="/conta" element={<ProtectedRoute><AccountDashboard /></ProtectedRoute>} />
            <Route path="/conta/pedidos" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/conta/pedidos/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
            <Route path="/conta/lances" element={<ProtectedRoute><MyBidsPage /></ProtectedRoute>} />
            <Route path="/conta/favoritos" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
            <Route path="/conta/enderecos" element={<ProtectedRoute><AddressesPage /></ProtectedRoute>} />
            <Route path="/conta/pagamentos" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
            <Route path="/conta/verificacao" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
            <Route path="/conta/mensagens" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/conta/avaliacoes" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
            <Route path="/conta/disputas" element={<ProtectedRoute><AccountDisputesPage /></ProtectedRoute>} />

            {/* Painel — requireAuth (todo user pode comprar e vender) */}
            <Route path="/painel" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
            <Route path="/painel/anuncios" element={<ProtectedRoute><SellerListings /></ProtectedRoute>} />
            <Route path="/painel/anuncios/novo" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
            <Route path="/painel/anuncios/:id/editar" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
            <Route path="/painel/pedidos" element={<ProtectedRoute><SellerOrdersPage /></ProtectedRoute>} />
            <Route path="/painel/pedidos/:id" element={<ProtectedRoute><SellerOrderDetailPage /></ProtectedRoute>} />
            <Route path="/painel/modo-lance" element={<ProtectedRoute><AuctionManagerPage /></ProtectedRoute>} />
            <Route path="/painel/integracoes" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
            <Route path="/painel/anuncios/importar-bling" element={<ProtectedRoute><BlingImportPage /></ProtectedRoute>} />
            <Route path="/painel/anuncios/completar" element={<ProtectedRoute><CompletarAnunciosPage /></ProtectedRoute>} />
            <Route path="/painel/financeiro" element={<ProtectedRoute><SellerFinancialPage /></ProtectedRoute>} />
            {/* Stripe Connect aposentado (migração p/ Pagar.me): redireciona ao recebedor. */}
            <Route path="/painel/stripe-onboarding" element={<Navigate to="/painel/recebedor" replace />} />
            <Route path="/painel/recebedor" element={<ProtectedRoute><RecipientOnboardingPage /></ProtectedRoute>} />
            <Route path="/painel/mensagens" element={<ProtectedRoute><SellerMessagesPage /></ProtectedRoute>} />
            <Route path="/painel/configuracoes" element={<ProtectedRoute><SellerSettingsPage /></ProtectedRoute>} />
            <Route path="/painel/midia" element={<ProtectedRoute><SellerMediaPage /></ProtectedRoute>} />
            <Route path="/painel/importar" element={<ProtectedRoute><BulkImportPage /></ProtectedRoute>} />

            {/* Admin — requireAuth + role admin */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminOverview /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/vendedores/verificacao" element={<ProtectedRoute role="admin"><AdminSellerVerification /></ProtectedRoute>} />
            <Route path="/admin/fundadores" element={<ProtectedRoute role="admin"><AdminFounders /></ProtectedRoute>} />
            <Route path="/admin/anuncios" element={<ProtectedRoute role="admin"><AdminListings /></ProtectedRoute>} />
            <Route path="/admin/comunidade" element={<ProtectedRoute role="admin"><AdminCommunity /></ProtectedRoute>} />
            <Route path="/admin/anuncios/:id" element={<ProtectedRoute role="admin"><AdminListingDetail /></ProtectedRoute>} />
            <Route path="/admin/modo-lance" element={<ProtectedRoute role="admin"><AdminAuctionMonitor /></ProtectedRoute>} />
            <Route path="/admin/disputas" element={<ProtectedRoute role="admin"><AdminDisputes /></ProtectedRoute>} />
            <Route path="/admin/comissoes-e-taxas" element={<ProtectedRoute role="admin"><AdminCommissionsAndFees /></ProtectedRoute>} />
            <Route path="/admin/financeiro" element={<ProtectedRoute role="admin"><AdminFinancial /></ProtectedRoute>} />
            <Route path="/admin/pedidos" element={<ProtectedRoute role="admin"><AdminOrders /></ProtectedRoute>} />
            <Route path="/admin/pedidos/:id" element={<ProtectedRoute role="admin"><AdminOrderDetail /></ProtectedRoute>} />
            <Route path="/admin/midia" element={<ProtectedRoute role="admin"><AdminMedia /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/relatorios" element={<ProtectedRoute role="admin"><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/configuracoes" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
          </LaunchGate>
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
