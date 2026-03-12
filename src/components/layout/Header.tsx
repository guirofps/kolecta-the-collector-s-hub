import { Link } from 'react-router-dom';
import { Search, Heart, MessageSquare, Menu, X, Gavel, User } from 'lucide-react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import kolectaLogo from '@/assets/kolecta-logo.png';
import { CLERK_ENABLED } from '@/lib/clerk';

const Logo = () => (
  <Link to="/" className="flex items-center select-none">
    <img src={kolectaLogo} alt="Kolecta" className="h-7 w-auto" />
  </Link>
);

const navLinks = [
  { label: 'Explorar', href: '/busca' },
  { label: 'Categorias', href: '/categorias' },
  { label: 'Modo Lance', href: '/modo-lance', icon: Gavel },
  { label: 'Vender', href: '/painel-vendedor/anuncios/novo' },
  { label: 'Ajuda', href: '/ajuda' },
];

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/busca?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-kolecta-carbon/20 bg-kolecta-dark backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-kolecta-dark border-kolecta-carbon/30">
            <div className="mt-8 flex flex-col gap-6">
              <Logo />
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="font-heading text-lg font-semibold uppercase tracking-wider text-white/80 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="line-tech my-2" />
                <Link to="/como-funciona" className="text-sm text-white/50 hover:text-white transition-colors">Como funciona</Link>
                <Link to="/ajuda" className="text-sm text-white/50 hover:text-white transition-colors">Central de Ajuda</Link>
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Logo />

        {/* Desktop search */}
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

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
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
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          <Link to="/conta/favoritos">
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-primary">
              <Heart className="h-5 w-5" />
            </Button>
          </Link>

          <Link to="/conta/mensagens" className="hidden sm:block">
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white">
              <MessageSquare className="h-5 w-5" />
            </Button>
          </Link>

          {CLERK_ENABLED ? (
            <>
              <SignedIn>
                <Link to="/conta" className="hidden sm:flex items-center gap-2 text-white/70 hover:text-primary transition-colors">
                  <span className="text-sm font-medium">Minha Conta</span>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <Link to="/entrar">
                  <Button variant="outline-gold" size="sm" className="hidden sm:flex gap-1.5">
                    <User className="h-4 w-4" />
                    Entrar
                  </Button>
                  <Button variant="ghost" size="icon" className="sm:hidden text-white/70">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              </SignedOut>
            </>
          ) : (
            <Link to="/entrar">
              <Button variant="outline-gold" size="sm" className="hidden sm:flex gap-1.5">
                <User className="h-4 w-4" />
                Entrar
              </Button>
              <Button variant="ghost" size="icon" className="sm:hidden text-white/70">
                <User className="h-5 w-5" />
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
  );
}
