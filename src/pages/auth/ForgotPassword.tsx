import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, MailCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

function getPasswordStrength(password: string): { label: string; score: number; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Fraca', score: 1, color: 'bg-destructive' };
  if (score <= 2) return { label: 'Média', score: 2, color: 'bg-[hsl(40,90%,50%)]' };
  return { label: 'Forte', score: 3, color: 'bg-green-500' };
}

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();

  // Step control: token in URL → step 3, otherwise start at 1
  const [step, setStep] = useState<1 | 2 | 3>(token ? 3 : 1);

  // Step 1
  const [email, setEmail] = useState('');

  // Step 2
  const [countdown, setCountdown] = useState(0);

  // Step 3
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    {/* API: POST /api/auth/forgot-password
        Body: { email: string }
        Retorna: { message: string } */}
    setStep(2);
    setCountdown(60);
    toast({ title: 'Email enviado', description: 'Verifique sua caixa de entrada.' });
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCountdown(60);
    toast({ title: 'Email reenviado', description: 'Verifique sua caixa de entrada.' });
  };

  const passwordValid = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const strength = getPasswordStrength(password);

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid || !passwordsMatch) return;
    {/* API: POST /api/auth/reset-password
        Body: { token: string, password: string } */}
    toast({ title: 'Senha redefinida!', description: 'Faça login com sua nova senha.' });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-[440px]">
          {/* Step 1 — Request recovery */}
          {step === 1 && (
            <div className="text-center">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-extrabold italic uppercase">Esqueci minha senha</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Informe seu email para receber o link de recuperação
                </p>
              </div>
              <form onSubmit={handleSubmitEmail} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full glow-primary" variant="kolecta">
                  Enviar link de recuperação
                </Button>
              </form>
              <Link
                to="/entrar"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mt-6"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para o login
              </Link>
            </div>
          )}

          {/* Step 2 — Email sent */}
          {step === 2 && (
            <div className="text-center">
              <MailCheck className="h-16 w-16 text-primary mx-auto mb-6 animate-fade-in" />
              <h1 className="font-heading text-3xl font-extrabold italic uppercase mb-3">
                Verifique seu email
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enviamos um link de recuperação para{' '}
                <span className="text-primary font-medium">{email}</span>
              </p>
              <Button
                variant="ghost"
                onClick={handleResend}
                disabled={countdown > 0}
                className="mb-4"
              >
                {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar email'}
              </Button>
              <div>
                <Link
                  to="/entrar"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar para o login
                </Link>
              </div>
            </div>
          )}

          {/* Step 3 — New password (when ?token=xxx is present) */}
          {step === 3 && (
            <div className="text-center">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-extrabold italic uppercase">Redefinir senha</h1>
                <p className="text-sm text-muted-foreground mt-2">Crie uma nova senha para sua conta</p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`flex-1 rounded-full transition-colors ${
                              level <= strength.score ? strength.color : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Força: <span className="font-medium">{strength.label}</span>
                      </p>
                    </div>
                  )}
                  {password.length > 0 && !passwordValid && (
                    <p className="text-xs text-destructive">
                      Mínimo 8 caracteres, uma maiúscula e um número
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-destructive">As senhas não coincidem</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full glow-primary"
                  variant="kolecta"
                  disabled={!passwordValid || !passwordsMatch}
                >
                  Redefinir senha
                </Button>
              </form>
              <Link
                to="/entrar"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mt-6"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para o login
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
