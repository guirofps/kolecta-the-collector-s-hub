import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldCheck, MoreHorizontal, Eye, Ban, Mail, Shield } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminUsers, useUpdateUserRole } from '@/hooks/use-api';
import type { AdminUser } from '@/lib/api';

const roleTabs = [
  { label: 'Todos', value: 'todos' },
  { label: 'Usuários', value: 'user' },
  { label: 'Admin', value: 'admin' },
];

const roleColors: Record<string, string> = {
  user:  'bg-blue-500/10 text-blue-400',
  admin: 'bg-accent/10 text-accent',
};

/**
 * Letra do avatar. Existe cadastro com nome em branco no banco (string vazia,
 * não nula), e `??` não pega string vazia: o `''[0]` virava undefined e o
 * `.toUpperCase()` derrubava a página inteira. Aqui cai para o e-mail e, no
 * pior caso, para uma interrogação.
 */
function inicial(nome: string | null | undefined, email: string): string {
  const base = (nome || '').trim() || (email || '').trim();
  return base ? base[0].toUpperCase() : '?';
}

export default function AdminUsers() {
  // Carrega todos os usuários (a tela não pagina; busca/filtro cobrem o conjunto).
  // Limite alto o suficiente para o volume atual — trocar por paginação real se escalar.
  const { data: users = [], isLoading } = useAdminUsers(1000);
  const updateRole = useUpdateUserRole();
  const [activeTab, setActiveTab] = useState('todos');
  const [search, setSearch] = useState('');

  const filtered = users.filter((u) => {
    if (activeTab !== 'todos' && u.role !== activeTab) return false;
    const q = search.toLowerCase();
    if (q && !(u.name ?? '').toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-extrabold italic uppercase">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading
              ? 'Carregando...'
              : filtered.length === users.length
                ? `${users.length} usuários cadastrados`
                : `${filtered.length} de ${users.length} usuários`}
          </p>
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
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-card py-16 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search || activeTab !== 'todos'
                ? 'Nenhum usuário encontrado com esse filtro.'
                : 'Nenhum usuário cadastrado ainda.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((user: AdminUser) => (
              <Card key={user.id} className="bg-card border-border hover:border-primary/20 transition-colors">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <span className="font-heading text-sm font-bold">{inicial(user.name, user.email)}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">
                          {(user.name || '').trim() || <span className="text-muted-foreground italic">Sem nome</span>}
                        </span>
                        {user.role === 'admin' && <ShieldCheck className="h-3.5 w-3.5 text-accent shrink-0" />}
                        <Badge className={`text-[10px] ${roleColors[user.role]}`}>{user.role}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email} · Desde {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem asChild className="gap-2 text-sm">
                          <Link to={`/vendedor/${user.id}`}>
                            <Eye className="h-3.5 w-3.5" /> Ver perfil
                          </Link>
                        </DropdownMenuItem>
                        {user.role !== 'admin' ? (
                          <DropdownMenuItem
                            className="gap-2 text-sm text-accent"
                            onClick={() => updateRole.mutate({ userId: user.id, role: 'admin' })}
                          >
                            <Shield className="h-3.5 w-3.5" /> Promover a admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="gap-2 text-sm text-muted-foreground"
                            onClick={() => updateRole.mutate({ userId: user.id, role: 'user' })}
                          >
                            <Ban className="h-3.5 w-3.5" /> Remover admin
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
