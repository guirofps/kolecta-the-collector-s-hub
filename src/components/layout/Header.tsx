import { Link } from 'react-router-dom';
import { Search, Heart, ShoppingCart, MessageSquare, Menu, X, Gavel, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Logo = () => (
  <Link to="/" className="flex items-center gap-0 select-none">
    <span className="font-heading text-2xl font-extrabold italic tracking-tight text-foreground">K</span>
    <span className="font-heading text-2xl font-extrabold italic tracking-tight text-primary">/</span>
    <span className="font-heading text-2xl font-extrabold italic tracking-tight text-foreground">OLECTA</span>
  </Link>
);

const navLinks = [
  { label: 'Categorias', href: '/categorias' },
  { label: 'Leilões', href: '/leiloes', icon: Gavel },
  { label: 'Vender', href: '/painel-vendedor/anuncios/novo' },
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
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-background border-border">
            <div className="mt-8 flex flex-col gap-6">
              <Logo />
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="font-heading text-lg font-semibold uppercase tracking-wider text-foreground/80 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="line-tech my-2" />
                <Link to="/como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Como funciona</Link>
                <Link to="/ajuda" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Central de Ajuda</Link>
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Logo />

        {/* Desktop search */}
        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar colecionáveis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </form>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground/70 hover:text-primary transition-colors flex items-center gap-1.5"
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
            <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-primary">
              <Heart className="h-5 w-5" />
            </Button>
          </Link>

          <Link to="/conta/mensagens" className="hidden sm:block">
            <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-foreground">
              <MessageSquare className="h-5 w-5" />
            </Button>
          </Link>

          <Link to="/entrar">
            <Button variant="outline-gold" size="sm" className="hidden sm:flex gap-1.5">
              <User className="h-4 w-4" />
              Entrar
            </Button>
            <Button variant="ghost" size="icon" className="sm:hidden text-foreground/70">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 py-3 animate-slide-up">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar colecionáveis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full h-10 rounded-md border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
