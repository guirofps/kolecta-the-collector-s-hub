import { useNavigate } from 'react-router-dom';
import { useAuth, mockUsers, Role } from '@/contexts/AuthContext';
import { User, Store, Shield } from 'lucide-react';

/* DEV ONLY: remover ou manter oculto em produção.
   Este componente só aparece quando VITE_ENV=development */

const profiles: { role: Role; label: string; icon: typeof User; redirect: string }[] = [
  { role: 'buyer', label: 'Comprador', icon: User, redirect: '/conta' },
  { role: 'seller', label: 'Vendedor', icon: Store, redirect: '/painel-vendedor' },
  { role: 'admin', label: 'Admin', icon: Shield, redirect: '/admin' },
];

export default function DevUserSwitcher() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleSwitch = (role: Role) => {
    if (user.role === role) return;
    setUser(mockUsers[role]);
    const profile = profiles.find(p => p.role === role)!;
    navigate(profile.redirect);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] h-10 bg-kolecta-dark border-t border-kolecta-gold/20 flex items-center justify-center gap-3 px-4">
      <span className="font-heading text-xs font-bold uppercase tracking-widest text-kolecta-gold mr-2">
        DEV MODE
      </span>
      {profiles.map(({ role, label, icon: Icon }) => {
        const active = user.role === role;
        return (
          <button
            key={role}
            onClick={() => handleSwitch(role)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors border ${
              active
                ? 'bg-kolecta-gold/20 border-kolecta-gold text-kolecta-gold'
                : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
      <span className="text-[10px] text-muted-foreground ml-2 hidden sm:inline">
        {user.name} ({user.email})
      </span>
    </div>
  );
}
