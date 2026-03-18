import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
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
import AdminOverview from "./pages/admin/Overview";
import AdminListings from "./pages/admin/Listings";
import AdminUsers from "./pages/admin/Users";
import AdminReports from "./pages/admin/Reports";
import AdminDisputes from "./pages/admin/Disputes";
import AdminSellerVerification from "./pages/admin/SellerVerification";
import AdminListingDetail from "./pages/admin/ListingDetail";
import AdminAuctionMonitor from "./pages/admin/AuctionMonitor";
import AdminFinancial from "./pages/admin/Financial";
import AdminCommissionsAndFees from "./pages/admin/CommissionsAndFees";
import AdminSettings from "./pages/admin/Settings";
import AdminMedia from "./pages/admin/Media";
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
            {/* Public */}
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
            <Route path="/ajuda" element={<HelpPage />} />
            <Route path="/ajuda/:slug" element={<HelpArticlePage />} />
            <Route path="/termos" element={<TermsPage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />

            {/* Comprador — requireAuth + role buyer */}
            <Route path="/conta" element={<ProtectedRoute role="buyer"><AccountDashboard /></ProtectedRoute>} />
            <Route path="/conta/pedidos" element={<ProtectedRoute role="buyer"><OrdersPage /></ProtectedRoute>} />
            <Route path="/conta/pedidos/:id" element={<ProtectedRoute role="buyer"><OrderDetailPage /></ProtectedRoute>} />
            <Route path="/conta/lances" element={<ProtectedRoute role="buyer"><MyBidsPage /></ProtectedRoute>} />
            <Route path="/conta/favoritos" element={<ProtectedRoute role="buyer"><FavoritesPage /></ProtectedRoute>} />
            <Route path="/conta/enderecos" element={<ProtectedRoute role="buyer"><AddressesPage /></ProtectedRoute>} />
            <Route path="/conta/pagamentos" element={<ProtectedRoute role="buyer"><PaymentsPage /></ProtectedRoute>} />
            <Route path="/conta/verificacao" element={<ProtectedRoute role="buyer"><VerificationPage /></ProtectedRoute>} />
            <Route path="/conta/mensagens" element={<ProtectedRoute role="buyer"><MessagesPage /></ProtectedRoute>} />
            <Route path="/conta/avaliacoes" element={<ProtectedRoute role="buyer"><ReviewsPage /></ProtectedRoute>} />
            <Route path="/conta/disputas" element={<ProtectedRoute role="buyer"><AccountDisputesPage /></ProtectedRoute>} />

            {/* Vendedor — requireAuth + role seller */}
            <Route path="/painel-vendedor" element={<ProtectedRoute role="seller"><SellerDashboard /></ProtectedRoute>} />
            <Route path="/painel-vendedor/anuncios" element={<ProtectedRoute role="seller"><SellerListings /></ProtectedRoute>} />
            <Route path="/painel-vendedor/anuncios/novo" element={<ProtectedRoute role="seller"><CreateListing /></ProtectedRoute>} />
            <Route path="/painel-vendedor/anuncios/:id/editar" element={<ProtectedRoute role="seller"><EditListing /></ProtectedRoute>} />
            <Route path="/painel-vendedor/pedidos" element={<ProtectedRoute role="seller"><SellerOrdersPage /></ProtectedRoute>} />
            <Route path="/painel-vendedor/pedidos/:id" element={<ProtectedRoute role="seller"><SellerOrderDetailPage /></ProtectedRoute>} />
            <Route path="/painel-vendedor/modo-lance" element={<ProtectedRoute role="seller"><AuctionManagerPage /></ProtectedRoute>} />
            <Route path="/painel-vendedor/financeiro" element={<ProtectedRoute role="seller"><SellerFinancialPage /></ProtectedRoute>} />
            <Route path="/painel-vendedor/stripe-onboarding" element={<ProtectedRoute role="seller"><StripeOnboardingPage /></ProtectedRoute>} />
            <Route path="/painel-vendedor/mensagens" element={<ProtectedRoute role="seller"><SellerMessagesPage /></ProtectedRoute>} />
            <Route path="/painel-vendedor/configuracoes" element={<ProtectedRoute role="seller"><SellerSettingsPage /></ProtectedRoute>} />
            <Route path="/painel-vendedor/midia" element={<ProtectedRoute role="seller"><SellerMediaPage /></ProtectedRoute>} />

            {/* Admin — requireAuth + role admin */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminOverview /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/vendedores/verificacao" element={<ProtectedRoute role="admin"><AdminSellerVerification /></ProtectedRoute>} />
            <Route path="/admin/anuncios" element={<ProtectedRoute role="admin"><AdminListings /></ProtectedRoute>} />
            <Route path="/admin/anuncios/:id" element={<ProtectedRoute role="admin"><AdminListingDetail /></ProtectedRoute>} />
            <Route path="/admin/modo-lance" element={<ProtectedRoute role="admin"><AdminAuctionMonitor /></ProtectedRoute>} />
            <Route path="/admin/disputas" element={<ProtectedRoute role="admin"><AdminDisputes /></ProtectedRoute>} />
            <Route path="/admin/comissoes-e-taxas" element={<ProtectedRoute role="admin"><AdminCommissionsAndFees /></ProtectedRoute>} />
            <Route path="/admin/financeiro" element={<ProtectedRoute role="admin"><AdminFinancial /></ProtectedRoute>} />
            <Route path="/admin/midia" element={<ProtectedRoute role="admin"><AdminMedia /></ProtectedRoute>} />
            <Route path="/admin/relatorios" element={<ProtectedRoute role="admin"><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/configuracoes" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
