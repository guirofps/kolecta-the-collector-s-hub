import { useState } from 'react';
import { Search, ShieldCheck, ShieldOff, MoreHorizontal, Eye, Ban, Mail } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockSellers } from '@/lib/mock-data';

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'comprador' | 'vendedor' | 'admin';
  verified: boolean;
  status: 'ativo' | 'suspenso' | 'banido';
  registered: string;
  totalOrders: number;
  totalListings: number;
}

const mockUsers: MockUser[] = [
  ...mockSellers.map((s) => ({
    id: s.id,
    name: s.name,
    email: `${s.slug}@email.com`,
    role: 'vendedor' as const,
    verified: s.verified,
    status: 'ativo' as const,
    registered: s.since + '-01-15',
    totalOrders: s.totalSales,
    totalListings: Math.floor(s.totalSales * 0.3),
  })),
  { id: 'u1', name: 'Marcos Silva', email: 'marcos@email.com', role: 'comprador', verified: false, status: 'ativo', registered: '2025-06-10', totalOrders: 12, totalListings: 0 },
  { id: 'u2', name: 'Ana Oliveira', email: 'ana@email.com', role: 'comprador', verified: false, status: 'ativo', registered: '2025-08-22', totalOrders: 8, totalListings: 0 },
  { id: 'u3', name: 'Pedro Costa', email: 'pedro@email.com', role: 'comprador', verified: false, status: 'suspenso', registered: '2025-11-05', totalOrders: 3, totalListings: 0 },
  { id: 'u4', name: 'Carla Mendes', email: 'carla@email.com', role: 'comprador', verified: false, status: 'ativo', registered: '2026-01-18', totalOrders: 1, totalListings: 0 },
  { id: 'admin1', name: 'Admin Kolecta', email: 'admin@kolecta.com', role: 'admin', verified: true, status: 'ativo', registered: '2023-01-01', totalOrders: 0, totalListings: 0 },
];

const roleTabs = [
  { label: 'Todos', value: 'todos' },
  { label: 'Compradores', value: 'comprador' },
  { label: 'Vendedores', value: 'vendedor' },
  { label: 'Admin', value: 'admin' },
];

const statusColors: Record<string, string> = {
  ativo: 'bg-green-500/10 text-green-400',
  suspenso: 'bg-primary/10 text-primary',
  banido: 'bg-accent/10 text-accent',
};

const roleColors: Record<string, string> = {
  comprador: 'bg-blue-500/10 text-blue-400',
  vendedor: 'bg-primary/10 text-primary',
  admin: 'bg-accent/10 text-accent',
};

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState('todos');
  const [search, setSearch] = useState('');

  const filtered = mockUsers.filter((u) => {
    if (activeTab !== 'todos' && u.role !== activeTab) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-extrabold italic uppercase">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">{mockUsers.length} usuários cadastrados</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4">
          {roleTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-heading uppercase tracking-wider transition-colors ${
                activeTab === tab.value
                  ? 'bg-accent/10 text-accent'
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
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* User list */}
        <div className="space-y-2">
          {filtered.map((user) => (
            <Card key={user.id} className="bg-card border-border hover:border-primary/20 transition-colors">
              <CardContent className="p-0">
                <div className="flex items-center gap-4 px-4 py-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="font-heading text-sm font-bold">{user.name[0]}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium truncate">{user.name}</span>
                      {user.verified && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                      <Badge className={`text-[10px] ${roleColors[user.role]}`}>{user.role}</Badge>
                      <Badge className={`text-[10px] ${statusColors[user.status]}`}>{user.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.email} · Desde {user.registered}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 text-xs text-muted-foreground shrink-0">
                    {user.role === 'vendedor' && (
                      <div className="text-center">
                        <div className="font-heading font-bold text-foreground">{user.totalListings}</div>
                        <div>anúncios</div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="font-heading font-bold text-foreground">{user.totalOrders}</div>
                      <div>{user.role === 'vendedor' ? 'vendas' : 'pedidos'}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem className="gap-2 text-sm"><Eye className="h-3.5 w-3.5" /> Ver perfil</DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-sm"><Mail className="h-3.5 w-3.5" /> Enviar e-mail</DropdownMenuItem>
                      {user.role === 'vendedor' && !user.verified && (
                        <DropdownMenuItem className="gap-2 text-sm text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Verificar</DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="gap-2 text-sm text-accent"><Ban className="h-3.5 w-3.5" /> Suspender</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
