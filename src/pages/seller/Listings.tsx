import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Search, MoreHorizontal, Eye, Pencil, Pause, Play, Trash2, Loader2 } from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatBRL, conditionLabel } from '@/lib/mock-data';
import { useMyListings, useDeleteListing, useTogglePauseListing } from '@/hooks/use-api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusTabs = [
  { label: 'Todos', value: 'todos' },
  { label: 'Aprovados', value: 'active' },
  { label: 'Em Análise', value: 'draft' },
  { label: 'Reprovados', value: 'rejected' },
  { label: 'Pausados', value: 'paused' },
  { label: 'Vendidos', value: 'sold' },
];

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400',
  draft: 'bg-primary/10 text-primary',
  rejected: 'bg-accent/10 text-accent',
  paused: 'bg-secondary text-muted-foreground',
  sold: 'bg-blue-500/10 text-blue-400',
  expired: 'bg-secondary text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  active: 'Aprovado',
  draft: 'Em Análise',
  rejected: 'Reprovado',
  paused: 'Pausado',
  sold: 'Vendido',
  expired: 'Expirado',
};

export default function SellerListings() {
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data: myProducts, isLoading } = useMyListings();
  const deleteMutation = useDeleteListing();
  const togglePauseMutation = useTogglePauseListing();

  const filtered = (myProducts || []).filter((p) => {
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
            <p className="text-sm text-muted-foreground mt-1">{(myProducts || []).length} anúncios no total</p>
          </div>
          <Button variant="kolecta" asChild>
            <Link to="/painel/anuncios/novo">
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
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="font-heading text-lg font-bold text-muted-foreground uppercase">Buscando seus anúncios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">Nenhum anúncio encontrado.</p>
            <Button variant="kolecta" asChild>
              <Link to="/painel/anuncios/novo">Criar primeiro anúncio</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((product) => {
              let imgs: string[] = [];
              try {
                if (product.images) imgs = JSON.parse(product.images);
              } catch (e) {
                console.error('Failed to parse images', e);
              }

              return (
              <Card key={product.id} className="bg-card border-border hover:border-primary/20 transition-colors">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-secondary shrink-0 flex justify-center items-center">
                      {imgs[0] ? (
                         <img src={imgs[0]} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                         <span className="text-[10px] text-muted-foreground">Sem Foto</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/produto/${product.id}`} className="text-sm font-medium truncate hover:text-primary transition-colors">
                          {product.title}
                        </Link>
                        <Badge className={`text-[10px] shrink-0 ${statusColors[product.status] || ''}`}>
                          {statusLabels[product.status] || product.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{product.brand || 'Sem marca'}</span>
                        <span>·</span>
                        <span>{conditionLabel(product.condition) || product.condition}</span>
                        <span>·</span>
                        <span>{product.type === 'auction' ? 'Modo Lance' : 'Venda Direta'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="font-heading text-sm font-bold">
                        {formatBRL(product.priceInCents || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {product.type === 'auction' ? 'Lances abertos' : 'Preço fixo'}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem className="gap-2 text-sm" onClick={() => navigate(`/produto/${product.id}`)}>
                          <Eye className="h-3.5 w-3.5" /> Ver anúncio
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-sm" onClick={() => navigate(`/painel/anuncios/${product.id}/editar`)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-sm"
                          disabled={togglePauseMutation.isPending}
                          onClick={() => togglePauseMutation.mutate(product.id)}
                        >
                          {product.status === 'paused' ? (
                            <><Play className="h-3.5 w-3.5" /> Reativar</>
                          ) : (
                            <><Pause className="h-3.5 w-3.5" /> Pausar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-sm text-accent" onClick={() => {
                          if (confirm('Tem certeza que deseja excluir esse anúncio?')) {
                            deleteMutation.mutate(product.id || '');
                          }
                        }}>
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
