import { Link, useLocation, useNavigate } from 'react-router-dom';
import BotaoTema from '@/components/BotaoTema';
import CoachMark, { AVISOS } from '@/components/CoachMark';
import {
  Search, Heart, MessageSquare, X, Gavel, User,
  ShoppingCart, Home, LogOut, MapPin, AlertCircle,
  Tag, PlusCircle, DollarSign, Package, List,
  HelpCircle, ChevronRight, Users, Store, ShoppingBag, CreditCard, Settings
} from 'lucide-react';
import { SignedIn, SignedOut, UserButton, useUser, useClerk } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import kolectaLogo from '@/assets/kolecta-logo.png';
import { CLERK_ENABLED } from '@/lib/clerk';
import { useCart } from '@/contexts/CartContext';
import { useLaunchGate } from '@/hooks/use-launch-gate';
import { isOpenRoute } from '@/components/LaunchGate';

const Logo = () => (
  <Link to="/" className="flex items-center select-none">
    <img src={kolectaLogo} alt="Kolecta" className="h-7 w-auto" />
  </Link>
);

const navLinks = [
  { label: 'Explorar', href: '/busca' },
  { label: 'Categorias', href: '/categorias' },
  { label: 'Modo Lance', href: '/modo-lance', icon: Gavel },
  { label: 'Comunidade', href: '/comunidade', icon: Users },
  { label: 'Vender', href: '/painel/anuncios/novo' },
  { label: 'Ajuda', href: '/ajuda' },
];

function DrawerContent() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { gateActive } = useLaunchGate();

  // O menu não pode decidir sozinho o que está aberto. A seção Vendedor estava
  // atrás de `!gateActive` e sumia inteira no pré-lançamento, mas `/painel` é
  // rota liberada de propósito: é onde o Fundador monta a vitrine antes do
  // lançamento. No celular, quem entrava não achava "Criar Anúncio" nem "Meus
  // Anúncios" e precisava saber a URL de cabeça. Agora quem responde é a mesma
  // função que o gate usa para redirecionar, então menu e gate não divergem.
  const acessivel = (href: string) => !gateActive || isOpenRoute(href);

  return (
    <div className="flex flex-col h-full bg-kolecta-dark text-white overflow-hidden">
      <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
      {/* Top Header */}
      <div className="p-4 border-b border-white/10 bg-white/5 shrink-0">
        {CLERK_ENABLED ? (
          <>
            <SignedIn>
              {user && (
                /* Tocar no cabeçalho leva ao painel da conta (/conta). No mobile
                   era o único lugar sem acesso: o drawer tinha os atalhos soltos
                   mas não a visão geral (carteira, Painel Admin, Painel de Vendas). */
                <SheetClose asChild>
                  <Link to="/conta" className="flex items-center gap-3 group">
                    <img src={user.imageUrl} alt={user.fullName || 'User'} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex flex-col overflow-hidden flex-1">
                      <span className="font-semibold text-white truncate text-sm">{user.fullName}</span>
                      <span className="text-xs text-white/50 truncate">{user.primaryEmailAddress?.emailAddress}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white shrink-0" />
                  </Link>
                </SheetClose>
              )}
            </SignedIn>
            <SignedOut>
              <div className="flex gap-2">
                <SheetClose asChild>
                  <Link to="/entrar" className="flex-1">
                    <Button className="w-full bg-kolecta-gold text-kolecta-gold-foreground hover:bg-kolecta-gold/90 h-9 text-sm">Entrar</Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/criar-conta" className="flex-1">
                    <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 h-9 text-sm">Criar conta</Button>
                  </Link>
                </SheetClose>
              </div>
            </SignedOut>
          </>
        ) : (
          <div className="flex gap-2">
            <SheetClose asChild>
              <Link to="/entrar" className="flex-1">
                <Button className="w-full bg-kolecta-gold text-kolecta-gold-foreground hover:bg-kolecta-gold/90 h-9 text-sm">Entrar</Button>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link to="/criar-conta" className="flex-1">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 h-9 text-sm">Criar conta</Button>
              </Link>
            </SheetClose>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Navegar */}
        <div>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Navegar</h3>
          <div className="space-y-1">
            {acessivel('/busca') && (
              <SheetClose asChild>
                <Link to="/busca" className="flex items-center gap-3 py-2 text-white/70 hover:text-white transition-colors">
                  <Search className="w-4 h-4" />
                  <span className="text-sm">Explorar</span>
                </Link>
              </SheetClose>
            )}
            {acessivel('/categorias') && (
              <SheetClose asChild>
                <Link to="/categorias" className="flex items-center gap-3 py-2 text-white/70 hover:text-white transition-colors">
                  <List className="w-4 h-4" />
                  <span className="text-sm">Categorias</span>
                </Link>
              </SheetClose>
            )}
            {acessivel('/modo-lance') && (
              <SheetClose asChild>
                <Link to="/modo-lance" className="flex items-center gap-3 py-2 text-white/70 hover:text-white transition-colors">
                  <Gavel className="w-4 h-4" />
                  <span className="text-sm">Modo Lance</span>
                </Link>
              </SheetClose>
            )}
            {acessivel('/comunidade') && (
              <SheetClose asChild>
                <Link to="/comunidade" className="flex items-center gap-3 py-2 text-white/70 hover:text-white transition-colors">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Comunidade</span>
                </Link>
              </SheetClose>
            )}
            <SheetClose asChild>
              <Link to="/como-funciona" className="flex items-center gap-3 py-2 text-white/70 hover:text-white transition-colors">
                <HelpCircle className="w-4 h-4" />
                <span className="text-sm">Como funciona</span>
              </Link>
            </SheetClose>
          </div>
        </div>

        {CLERK_ENABLED && (
          <SignedIn>
            {/* Minha Conta */}
            <div>
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Minha Conta</h3>
              <div className="space-y-1">
                <SheetClose asChild>
                  <Link to="/conta" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4" />
                      <span className="text-sm">Painel da Conta</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/conta/pedidos" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4" />
                      <span className="text-sm">Meus Pedidos</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/conta/lances" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <Gavel className="w-4 h-4" />
                      <span className="text-sm">Meus Lances</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
                {/* Carteira e cartão: é aqui que se cadastra o cartão usado para
                    dar lance. Faltava no menu do celular, e quem procurava caía
                    no "Financeiro" do vendedor, que é outra coisa (repasses). */}
                <SheetClose asChild>
                  <Link to="/conta/pagamentos" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm">Carteira e Cartão</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/conta/favoritos" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">Favoritos</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/conta/mensagens" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">Mensagens</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/conta/enderecos" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">Endereços</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/conta/disputas" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Disputas</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
              </div>
            </div>

            {/* Vendedor */}
            {acessivel('/painel') && (
            <div>
              <h3 className="text-xs font-semibold text-kolecta-gold uppercase tracking-wider mb-3">Vendedor</h3>
              <div className="space-y-1">
                <SheetClose asChild>
                  <Link to="/painel/anuncios" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4" />
                      <span className="text-sm">Meus Anúncios</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/painel/anuncios/novo" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <PlusCircle className="w-4 h-4" />
                      <span className="text-sm">Criar Anúncio</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/painel/pedidos" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4" />
                      <span className="text-sm">Pedidos Recebidos</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/painel/financeiro" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Financeiro</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
                {/* Configurações da loja (nome da loja, foto, políticas). No
                    mobile não havia caminho nenhum para cá, e é onde o vendedor
                    troca o nome que aparece nos anúncios. */}
                <SheetClose asChild>
                  <Link to="/painel/configuracoes" className="flex items-center justify-between py-2 text-white/70 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">Configurações da Loja</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </SheetClose>
              </div>
            </div>
            )}
          </SignedIn>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 shrink-0 bg-white/5 pb-8">
        <SheetClose asChild>
          <Link to="/ajuda" className="flex items-center gap-3 py-2 text-white/70 hover:text-white transition-colors mb-2">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">Central de Ajuda</span>
          </Link>
        </SheetClose>
        {CLERK_ENABLED && (
          <SignedIn>
            <button 
              onClick={() => signOut()}
              className="flex items-center gap-3 py-2 text-red-400 hover:text-red-300 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sair</span>
            </button>
          </SignedIn>
        )}
      </div>
    </div>
  );
}

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { totalItems, openCart } = useCart();
  const { gateActive } = useLaunchGate();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // No pré-lançamento (não-admin), fica só o que o gate deixa passar. Quem
  // decide é `isOpenRoute`, a mesma função do redirecionamento: assim "Vender"
  // continua no topo antes do lançamento, que é o que o Fundador precisa
  // fazer agora, e nenhum link aponta para uma rota que vai redirecionar.
  const visibleNavLinks = gateActive
    ? navLinks.filter((l) => isOpenRoute(l.href))
    : navLinks;

  useEffect(() => {
    const updateBodyPadding = () => {
      if (window.innerWidth < 1024) {
        document.body.style.paddingBottom = '56px';
      } else {
        document.body.style.paddingBottom = '0px';
      }
    };
    
    updateBodyPadding();
    window.addEventListener('resize', updateBodyPadding);
    return () => {
      window.removeEventListener('resize', updateBodyPadding);
      document.body.style.paddingBottom = '0px';
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/busca?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-kolecta-carbon/20 bg-kolecta-dark backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between lg:justify-start gap-4 px-4">
          
          {/* Logo */}
          <Logo />

          {/* Desktop search */}
          {!gateActive && (
          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Buscar colecionáveis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 rounded-md border border-white/20 bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </form>
          )}

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {visibleNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="font-heading text-sm font-semibold uppercase tracking-wider text-white/70 hover:text-primary transition-colors flex items-center gap-1.5"
              >
                {link.icon && <link.icon className="h-3.5 w-3.5" />}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto lg:ml-0">
            {/* Mobile search toggle */}
            {!gateActive && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white/70 hover:text-primary"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </Button>
            )}

            {/* O header tem fundo escuro próprio nos dois temas, então o botão
                herda o mesmo tratamento dos vizinhos em vez dos tokens.
                O coach mark apresenta o modo escuro uma vez por pessoa. */}
            <CoachMark
              aviso={AVISOS.tema}
              candidatas={[AVISOS.tema, AVISOS.kpv]}
              titulo="Agora tem modo escuro"
              texto="Prefere o site mais escuro? Toque aqui pra alternar entre claro e escuro quando quiser."
            >
              <BotaoTema className="text-white/70 hover:text-primary" />
            </CoachMark>

            <Link to="/conta/favoritos" className="hidden lg:block">
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-primary">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>

            {!gateActive && (
            <Button variant="ghost" size="icon" className="relative text-white/70 hover:text-primary" onClick={openCart}>
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] bg-kolecta-gold text-kolecta-gold-foreground rounded-full">
                  {totalItems}
                </Badge>
              )}
            </Button>
            )}

            <Link to="/conta/mensagens" className="hidden lg:block">
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white">
                <MessageSquare className="h-5 w-5" />
              </Button>
            </Link>

            {CLERK_ENABLED ? (
              <>
                <SignedIn>
                  <Link to="/conta" className="hidden lg:flex items-center gap-2 text-white/70 hover:text-primary transition-colors ml-2">
                    <span className="text-sm font-medium">Minha Conta</span>
                  </Link>
                  <div className="hidden lg:block ml-2">
                    <UserButton>
                      <UserButton.MenuItems>
                        {/* Atalhos de navegação Kolecta (ocultos no pré-lançamento) */}
                        {!gateActive && (
                          <UserButton.Action
                            label="Painel de Vendas"
                            labelIcon={<Store className="h-4 w-4" />}
                            onClick={() => navigate('/painel')}
                          />
                        )}
                        {!gateActive && (
                          <UserButton.Action
                            label="Explorar"
                            labelIcon={<ShoppingBag className="h-4 w-4" />}
                            onClick={() => navigate('/busca')}
                          />
                        )}
                        {!gateActive && (
                          <UserButton.Action
                            label="Modo Lance"
                            labelIcon={<Gavel className="h-4 w-4" />}
                            onClick={() => navigate('/modo-lance')}
                          />
                        )}
                        {/* Atalhos rápidos da Conta */}
                        <UserButton.Action
                          label="Meus Pedidos"
                          labelIcon={<Package className="h-4 w-4" />}
                          onClick={() => navigate('/conta/pedidos')}
                        />
                        <UserButton.Action
                          label="Pagamentos"
                          labelIcon={<CreditCard className="h-4 w-4" />}
                          onClick={() => navigate('/conta/pagamentos')}
                        />
                        <UserButton.Action
                          label="Mensagens"
                          labelIcon={<MessageSquare className="h-4 w-4" />}
                          onClick={() => navigate('/conta/mensagens')}
                        />
                        {/* Ações nativas do Clerk (reposicionadas) */}
                        <UserButton.Action label="manageAccount" />
                        <UserButton.Action label="signOut" />
                      </UserButton.MenuItems>
                    </UserButton>
                  </div>
                </SignedIn>
                <SignedOut>
                  <Link to="/entrar" className="hidden lg:block ml-2">
                    <Button variant="outline-gold" size="sm" className="flex gap-1.5">
                      <User className="h-4 w-4" />
                      Entrar
                    </Button>
                  </Link>
                </SignedOut>
              </>
            ) : (
              <Link to="/entrar" className="hidden lg:block ml-2">
                <Button variant="outline-gold" size="sm" className="flex gap-1.5">
                  <User className="h-4 w-4" />
                  Entrar
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="lg:hidden border-t border-white/10 bg-kolecta-dark px-4 py-3 animate-slide-up">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar colecionáveis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full h-10 rounded-md border border-white/20 bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-kolecta-dark border-t border-kolecta-carbon/20 z-50 flex items-center justify-around px-2">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname === '/' ? 'text-kolecta-gold' : 'text-white/60 hover:text-white'}`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">Início</span>
        </Link>
        {/* Antes do lançamento estes dois lugares ficavam vazios: busca e
            leilão estão fechados. Como o que o vendedor tem para fazer agora é
            montar a vitrine, o espaço vira atalho do painel, que é rota aberta.
            No dia da virada volta a ser busca e leilão sozinho. */}
        {gateActive ? (
          <>
            <Link
              to="/painel/anuncios"
              className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname.startsWith('/painel/anuncios') && pathname !== '/painel/anuncios/novo' ? 'text-kolecta-gold' : 'text-white/60 hover:text-white'}`}
            >
              <Tag className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">Anúncios</span>
            </Link>
            <Link
              to="/painel/anuncios/novo"
              className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname === '/painel/anuncios/novo' ? 'text-kolecta-gold' : 'text-white/60 hover:text-white'}`}
            >
              <PlusCircle className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">Anunciar</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/busca"
              className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname === '/busca' ? 'text-kolecta-gold' : 'text-white/60 hover:text-white'}`}
            >
              <Search className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">Busca</span>
            </Link>
            <Link
              to="/modo-lance"
              className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname === '/modo-lance' ? 'text-kolecta-gold' : 'text-white/60 hover:text-white'}`}
            >
              <Gavel className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">Lances</span>
            </Link>
          </>
        )}
        <Link 
          to="/conta/mensagens" 
          className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname.startsWith('/conta/mensagens') ? 'text-kolecta-gold' : 'text-white/60 hover:text-white'}`}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">Mensagens</span>
        </Link>
        
        <Sheet>
          <SheetTrigger asChild>
            <button 
              className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname.startsWith('/conta') && !pathname.startsWith('/conta/mensagens') && pathname !== '/modo-lance' ? 'text-kolecta-gold' : 'text-white/60 hover:text-white'}`}
            >
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">Conta</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] max-w-sm bg-kolecta-dark border-l border-white/10 p-0 sm:max-w-sm">
            <DrawerContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}


