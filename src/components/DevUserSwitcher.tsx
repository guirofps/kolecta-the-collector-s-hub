import { useAuth, Role } from '@/contexts/AuthContext';
import { User, Shield } from 'lucide-react';

/* DEV ONLY: Indicador visual da role real do usuário autenticado.
   Não permite mais trocar — a role vem do backend (Turso). */

const roleConfig: Record<Role, { label: string; icon: typeof User }> = {
  user: { label: 'Colecionador', icon: User },
  admin: { label: 'Admin', icon: Shield },
};

export default function DevUserSwitcher() {
  const { user, isLoading } = useAuth();
  const config = roleConfig[user.role] ?? roleConfig.user;
  const Icon = config.icon;

  if (isLoading) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] h-10 bg-kolecta-dark border-t border-kolecta-gold/20 flex items-center justify-center gap-3 px-4">
      <span className="font-heading text-xs font-bold uppercase tracking-widest text-kolecta-gold mr-2">
        DEV MODE
      </span>
      <div className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-kolecta-gold/20 border border-kolecta-gold text-kolecta-gold">
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </div>
      <span className="text-[10px] text-muted-foreground ml-2 hidden sm:inline">
        {user.name} ({user.email})
      </span>
    </div>
  );
}
