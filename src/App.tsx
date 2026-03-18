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
import ForgotPasswordPage from "./pages/auth/ForgotPassword";
import PlaceholderPage from "./components/PlaceholderPage";
import FeesPage from "./pages/Fees";
import SellerProfilePage from "./pages/SellerProfile";
import SecurityPage from "./pages/Security";
import HowItWorksPage from "./pages/HowItWorks";
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
import SellerListings from "./pages/seller/Listings";
import CreateListing from "./pages/seller/CreateListing";
import SellerOrdersPage from "./pages/seller/Orders";
import SellerOrderDetailPage from "./pages/seller/OrderDetail";
import SellerFinancialPage from "./pages/seller/Financial";
import AuctionManagerPage from "./pages/seller/AuctionManager";
import SellerMessagesPage from "./pages/seller/Messages";
import SellerSettingsPage from "./pages/seller/Settings";
import SellerMediaPage from "./pages/seller/Media";
import AdminOverview from "./pages/admin/Overview";
import AdminListings from "./pages/admin/Listings";
import AdminUsers from "./pages/admin/Users";
import AdminReports from "./pages/admin/Reports";
import AdminDisputes from "./pages/admin/Disputes";
import AdminSellerVerification from "./pages/admin/SellerVerification";
import AdminListingDetail from "./pages/admin/ListingDetail";
import AdminAuctionMonitor from "./pages/admin/AuctionMonitor";
import AdminFinancial from "./pages/admin/Financial";
import CartPage from "./pages/Cart";
import CheckoutPage from "./pages/Checkout";
import OrderConfirmationPage from "./pages/OrderConfirmation";
import { CartProvider } from "./contexts/CartContext";
import CartDrawer from "./components/CartDrawer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CartDrawer />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/pedido/confirmacao" element={<OrderConfirmationPage />} />
          <Route path="/busca" element={<SearchPage />} />
          <Route path="/produto/:id" element={<ProductDetail />} />
          <Route path="/modo-lance" element={<AuctionsPage />} />
          <Route path="/modo-lance/:id" element={<ProductDetail />} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route path="/categoria/:slug" element={<CategoryPage />} />
          <Route path="/entrar/*" element={<LoginPage />} />
          <Route path="/criar-conta/*" element={<RegisterPage />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
          <Route path="/vendedor/:slug" element={<SellerProfilePage />} />
          <Route path="/como-funciona" element={<HowItWorksPage />} />
          <Route path="/taxas-e-comissoes" element={<FeesPage />} />
          <Route path="/seguranca" element={<SecurityPage />} />
          <Route path="/ajuda" element={<PlaceholderPage title="Central de Ajuda" description="Perguntas frequentes e suporte." />} />
          <Route path="/ajuda/:slug" element={<PlaceholderPage title="Artigo de Ajuda" />} />
          <Route path="/termos" element={<PlaceholderPage title="Termos de Uso" />} />
          <Route path="/privacidade" element={<PlaceholderPage title="Política de Privacidade" />} />
          {/* Comprador */}
          <Route path="/conta" element={<AccountDashboard />} />
          <Route path="/conta/pedidos" element={<OrdersPage />} />
          <Route path="/conta/pedidos/:id" element={<OrderDetailPage />} />
          <Route path="/conta/lances" element={<MyBidsPage />} />
          <Route path="/conta/favoritos" element={<FavoritesPage />} />
          <Route path="/conta/enderecos" element={<AddressesPage />} />
          <Route path="/conta/pagamentos" element={<PaymentsPage />} />
          <Route path="/conta/verificacao" element={<VerificationPage />} />
          <Route path="/conta/mensagens" element={<MessagesPage />} />
          <Route path="/conta/avaliacoes" element={<ReviewsPage />} />
          <Route path="/conta/disputas" element={<AccountDisputesPage />} />
          {/* Vendedor */}
          <Route path="/painel-vendedor" element={<SellerDashboard />} />
          <Route path="/painel-vendedor/anuncios" element={<SellerListings />} />
          <Route path="/painel-vendedor/anuncios/novo" element={<CreateListing />} />
          <Route path="/painel-vendedor/anuncios/:id/editar" element={<PlaceholderPage title="Editar Anúncio" />} />
          <Route path="/painel-vendedor/pedidos" element={<SellerOrdersPage />} />
          <Route path="/painel-vendedor/pedidos/:id" element={<SellerOrderDetailPage />} />
          <Route path="/painel-vendedor/modo-lance" element={<AuctionManagerPage />} />
          <Route path="/painel-vendedor/financeiro" element={<SellerFinancialPage />} />
          <Route path="/painel-vendedor/stripe-onboarding" element={<StripeOnboardingPage />} />
          <Route path="/painel-vendedor/mensagens" element={<SellerMessagesPage />} />
          <Route path="/painel-vendedor/configuracoes" element={<SellerSettingsPage />} />
          <Route path="/painel-vendedor/midia" element={<SellerMediaPage />} />
          {/* Admin */}
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/usuarios" element={<AdminUsers />} />
          <Route path="/admin/vendedores/verificacao" element={<AdminSellerVerification />} />
          <Route path="/admin/anuncios" element={<AdminListings />} />
          <Route path="/admin/anuncios/:id" element={<AdminListingDetail />} />
          <Route path="/admin/modo-lance" element={<AdminAuctionMonitor />} />
          <Route path="/admin/disputas" element={<AdminDisputes />} />
          <Route path="/admin/comissoes-e-taxas" element={<PlaceholderPage title="Admin – Comissões e Taxas" />} />
          <Route path="/admin/financeiro" element={<AdminFinancial />} />
          <Route path="/admin/midia" element={<PlaceholderPage title="Admin – Mídia & Campanhas" />} />
          <Route path="/admin/relatorios" element={<AdminReports />} />
          <Route path="/admin/configuracoes" element={<PlaceholderPage title="Admin – Configurações" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
