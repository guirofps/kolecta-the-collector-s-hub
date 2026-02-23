import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Mail, Phone, FileText, Camera, ShieldCheck } from 'lucide-react';

interface Step {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
}

export default function VerificationPage() {
  const [steps, setSteps] = useState<Step[]>([
    { key: 'email', label: 'Email confirmado', description: 'Verifique seu endereço de e-mail.', icon: Mail, completed: true },
    { key: 'phone', label: 'Telefone confirmado', description: 'Confirme seu número de celular via SMS.', icon: Phone, completed: true },
    { key: 'document', label: 'Documento de identidade', description: 'Envie foto do seu RG ou CNH.', icon: FileText, completed: false },
    { key: 'selfie', label: 'Selfie com documento', description: 'Tire uma selfie segurando o documento.', icon: Camera, completed: false },
  ]);

  const completedCount = steps.filter((s) => s.completed).length;
  const allComplete = completedCount === steps.length;

  const handleComplete = (key: string) => {
    setSteps((prev) => prev.map((s) => s.key === key ? { ...s, completed: true } : s));
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-heading text-3xl font-extrabold italic uppercase">Verificação</h1>
            <p className="text-sm text-muted-foreground">Complete todas as etapas para verificar sua conta</p>
          </div>
        </div>

        {/* Progress */}
        <div className="p-4 rounded-lg border border-border bg-card mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Progresso</span>
            <span className="text-sm font-heading font-bold text-primary">{completedCount}/{steps.length}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {allComplete && (
          <div className="p-5 rounded-lg border border-primary/20 bg-primary/5 mb-6 text-center glow-primary">
            <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="font-heading text-lg font-bold text-primary uppercase">Conta verificada!</p>
            <p className="text-xs text-muted-foreground mt-1">Você já pode participar do Modo Lance e vender na Kolecta.</p>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const Icon = step.completed ? CheckCircle2 : step.icon;
            return (
              <div
                key={step.key}
                className={`p-4 rounded-lg border transition-colors ${
                  step.completed ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    step.completed ? 'bg-primary/10' : 'bg-secondary'
                  }`}>
                    <Icon className={`h-5 w-5 ${step.completed ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-medium ${step.completed ? 'text-primary' : 'text-foreground'}`}>{step.label}</h3>
                      {step.completed && <Badge className="bg-primary/10 text-primary text-[10px] border-none">Concluído</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                  {!step.completed && (
                    <Button variant="outline-gold" size="sm" className="text-xs shrink-0" onClick={() => handleComplete(step.key)}>
                      Verificar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
