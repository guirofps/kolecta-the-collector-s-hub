import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUp } from '@clerk/clerk-react';
import Layout from '@/components/layout/Layout';
import LegalConsentModal from '@/components/LegalConsentModal';
import { hasValidConsent } from '@/lib/legal-consent';

export default function RegisterPage() {
  const navigate = useNavigate();
  // Já aceitou a versão atual dos termos? Então libera o cadastro direto.
  const [consented, setConsented] = useState(() => hasValidConsent());

  return (
    <Layout>
      <LegalConsentModal
        open={!consented}
        onAccept={() => setConsented(true)}
        onCancel={() => navigate('/')}
      />

      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Criar Conta</h1>
            <p className="text-sm text-muted-foreground mt-2">Junte-se à comunidade Kolecta</p>
          </div>
          {/* Só renderiza o formulário do Clerk após o aceite dos termos (T10). */}
          {consented && (
            <SignUp
              path="/criar-conta"
              routing="path"
              signInUrl="/entrar"
              fallbackRedirectUrl="/conta"
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
