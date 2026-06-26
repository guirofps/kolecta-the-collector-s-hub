/**
 * Valida um CPF brasileiro pelos dígitos verificadores (não só o formato).
 * Espelha a validação do backend (deposits) — a Pagar.me rejeita CPF inválido
 * com um genérico "Erro no gateway", então barramos antes de enviar.
 */
export function isValidCpf(value: string): boolean {
  const cpf = String(value ?? '').replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === parseInt(cpf[10], 10);
}
