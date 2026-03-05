import { SignUp } from '@clerk/clerk-react';
import Layout from '@/components/layout/Layout';

export default function RegisterPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Criar Conta</h1>
            <p className="text-sm text-muted-foreground mt-2">Junte-se à comunidade Kolecta</p>
          </div>
          <SignUp
            path="/criar-conta"
            routing="path"
            signInUrl="/entrar"
            fallbackRedirectUrl="/"
          />
        </div>
      </div>
    </Layout>
  );
}
