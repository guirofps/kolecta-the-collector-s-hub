import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, MoreHorizontal, Eye, Pencil, Pause, Trash2 } from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { mockProducts, formatBRL, conditionLabel } from '@/lib/mock-data';
import type { ListingStatus } from '@/lib/mock-data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusTabs: { label: string; value: ListingStatus | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Aprovados', value: 'aprovado' },
  { label: 'Em Análise', value: 'em_analise' },
  { label: 'Rascunho', value: 'rascunho' },
  { label: 'Reprovados', value: 'reprovado' },
  { label: 'Pausados', value: 'pausado' },
  { label: 'Vendidos', value: 'vendido' },
];

const statusColors: Record<string, string> = {
  aprovado: 'bg-green-500/10 text-green-400',
  em_analise: 'bg-primary/10 text-primary',
  rascunho: 'bg-secondary text-muted-foreground',
  reprovado: 'bg-accent/10 text-accent',
  pausado: 'bg-secondary text-muted-foreground',
  vendido: 'bg-blue-500/10 text-blue-400',
  expirado: 'bg-secondary text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  aprovado: 'Aprovado',
  em_analise: 'Em Análise',
  rascunho: 'Rascunho',
  reprovado: 'Reprovado',
  pausado: 'Pausado',
  vendido: 'Vendido',
  expirado: 'Expirado',
};

// Use first 3 sellers' products as "mine"
const sellerProducts = mockProducts.filter((p) => p.seller.id === 's1');

export default function SellerListings() {
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [search, setSearch] = useState('');

  const filtered = sellerProducts.filter((p) => {
    if (activeTab !== 'todos' && p.status !== activeTab) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <SellerLayout>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-extrabold italic uppercase">Meus Anúncios</h1>
            <p className="text-sm text-muted-foreground mt-1">{sellerProducts.length} anúncios no total</p>
          </div>
          <Button variant="kolecta" asChild>
            <Link to="/painel-vendedor/anuncios/novo">
              <PlusCircle className="h-4 w-4" />
              Novo Anúncio
            </Link>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-heading uppercase tracking-wider whitespace-nowrap transition-colors ${
                activeTab === tab.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar nos seus anúncios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Listings */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">Nenhum anúncio encontrado.</p>
            <Button variant="kolecta" asChild>
              <Link to="/painel-vendedor/anuncios/novo">Criar primeiro anúncio</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((product) => (
              <Card key={product.id} className="bg-card border-border hover:border-primary/20 transition-colors">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-secondary shrink-0">
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/produto/${product.id}`} className="text-sm font-medium truncate hover:text-primary transition-colors">
                          {product.title}
                        </Link>
                        <Badge className={`text-[10px] shrink-0 ${statusColors[product.status]}`}>
                          {statusLabels[product.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{product.category}</span>
                        <span>·</span>
                        <span>{conditionLabel(product.condition)}</span>
                        <span>·</span>
                        <span>{product.type === 'auction' ? 'Leilão' : 'Venda Direta'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="font-heading text-sm font-bold">
                        {product.type === 'auction' ? formatBRL(product.currentBid || product.startingBid || 0) : formatBRL(product.price || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {product.type === 'auction' ? `${product.bidsCount || 0} lances` : 'Preço fixo'}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem className="gap-2 text-sm">
                          <Eye className="h-3.5 w-3.5" /> Ver anúncio
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-sm">
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-sm">
                          <Pause className="h-3.5 w-3.5" /> Pausar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-sm text-accent">
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
