import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Criar Conta</h1>
            <p className="text-sm text-muted-foreground mt-2">Junte-se à comunidade Kolecta</p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card space-y-4">
            <div>
              <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1.5 block">Nome</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" placeholder="Seu nome" className="w-full h-10 rounded-md border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>

            <div>
              <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1.5 block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="email" placeholder="seu@email.com" className="w-full h-10 rounded-md border border-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>

            <div>
              <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1.5 block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Mín. 8 caracteres" className="w-full h-10 rounded-md border border-border bg-input pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Ao criar conta, você concorda com os{' '}
              <Link to="/termos" className="text-primary hover:text-primary/80">Termos de Uso</Link>{' '}
              e <Link to="/privacidade" className="text-primary hover:text-primary/80">Política de Privacidade</Link>.
            </div>

            <Button variant="kolecta" className="w-full">Criar Conta</Button>

            <div className="line-tech" />

            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <Link to="/entrar" className="text-primary hover:text-primary/80 font-medium">Entrar</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
