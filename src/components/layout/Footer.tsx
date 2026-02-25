import { Link } from 'react-router-dom';
import kolectaLogo from '@/assets/kolecta-logo.png';

const footerLinks = {
  marketplace: [
    { label: 'Categorias', href: '/categorias' },
    { label: 'Modo Lance', href: '/modo-lance' },
    { label: 'Destaques', href: '/busca?sort=featured' },
    { label: 'Como funciona', href: '/como-funciona' },
    { label: 'Taxas e Comissões', href: '/taxas-e-comissoes' },
  ],
  vendedores: [
    { label: 'Vender na Kolecta', href: '/painel-vendedor' },
    { label: 'Painel do Vendedor', href: '/painel-vendedor' },
    { label: 'Verificação', href: '/painel-vendedor/configuracoes' },
    { label: 'Mídia & Destaque', href: '/painel-vendedor/midia' },
  ],
  suporte: [
    { label: 'Central de Ajuda', href: '/ajuda' },
    { label: 'Segurança', href: '/seguranca' },
    { label: 'Contato', href: '/ajuda' },
  ],
  legal: [
    { label: 'Termos de Uso', href: '/termos' },
    { label: 'Privacidade', href: '/privacidade' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-kolecta-dark">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <Link to="/" className="flex items-center select-none mb-4">
              <img src={kolectaLogo} alt="Kolecta" className="h-6 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              O marketplace dos colecionadores. Compre, venda e dê lances com segurança.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-widest text-primary mb-4">Marketplace</h4>
            <ul className="space-y-2.5">
              {footerLinks.marketplace.map((link) => (
                <li key={link.href + link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-widest text-primary mb-4">Vendedores</h4>
            <ul className="space-y-2.5">
              {footerLinks.vendedores.map((link) => (
                <li key={link.href + link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-widest text-primary mb-4">Suporte</h4>
            <ul className="space-y-2.5">
              {footerLinks.suporte.map((link) => (
                <li key={link.href + link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="font-heading text-xs font-bold uppercase tracking-widest text-primary mb-4 mt-6">Legal</h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.href + link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="line-tech mt-10 mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Kolecta. Todos os direitos reservados.</p>
          <p>Feito para colecionadores, por colecionadores.</p>
        </div>
      </div>
    </footer>
  );
}
