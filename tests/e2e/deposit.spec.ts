import { test, expect } from '@playwright/test';

test.describe('Jornada Financeira', () => {
  test('Fluxo de Depósito na Carteira (Cartão/Pix)', async ({ page }) => {
    // 1. Mock do Auth Clerk e User ID
    await page.addInitScript(() => {
      window.localStorage.setItem('dev_user_id', 'seller-001');
    });

    // 2. Mock dos dados da Wallet
    await page.route('**/api/wallet/me', async route => {
      await route.fulfill({
        json: {
          data: {
            id: 'wall-123',
            userId: 'seller-001',
            balanceInCents: 845000,
            pendingInCents: 1129000
          }
        }
      });
    });

    // 3. Mock dos Saques (para não quebrar a tela)
    await page.route('**/api/withdrawals/me', async route => {
      await route.fulfill({
        json: {
          data: []
        }
      });
    });

    // 4. Mock do Stripe Onboarding Status
    await page.route('**/api/connect/status', async route => {
      await route.fulfill({
        json: {
          data: {
            stripeAccountId: 'acct_123',
            status: 'active',
            chargesEnabled: true,
            payoutsEnabled: true
          }
        }
      });
    });

    // 5. Mock da criação de Checkout Session (Depósito)
    await page.route('**/api/wallet/deposit', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: {
            data: {
              url: '/mock-stripe-checkout-pix'
            }
          }
        });
      }
    });

    // ── PASSO 1: Acessar a página Financeiro ───────────────────────────────
    await page.goto('/painel/financeiro');

    // Assegura que a página carregou
    await expect(page.locator('h1', { hasText: 'Financeiro' })).toBeVisible();

    // ── PASSO 2: Abrir modal de depósito ───────────────────────────────────
    const adicionarSaldoBtn = page.getByRole('button', { name: /Adicionar Saldo/i });
    await expect(adicionarSaldoBtn).toBeVisible();
    await adicionarSaldoBtn.click();

    // Modal deve estar visível
    const dialogTitle = page.locator('[role="dialog"] h2', { hasText: /Adicionar Saldo/i });
    await expect(dialogTitle).toBeVisible();

    // Verifica a menção ao Pix na descrição
    await expect(page.locator('[role="dialog"]', { hasText: /Pix/i })).toBeVisible();

    // ── PASSO 3: Preencher valor ───────────────────────────────────────────
    const inputValor = page.getByLabel('Valor do depósito (R$)');
    await inputValor.fill('150,00');

    // ── PASSO 4: Clicar para pagar e depositar ─────────────────────────────
    const pagarBtn = page.getByRole('button', { name: 'Pagar e depositar' });
    await expect(pagarBtn).toBeVisible();

    // Interceptar a navegação para a URL mockada
    // A mutação chama window.location.href, então usamos waitForURL
    await pagarBtn.click();
    await page.waitForURL('**/mock-stripe-checkout-pix');

    // Como redirecionamos para a URL, validamos que chegamos nela
    expect(page.url()).toContain('/mock-stripe-checkout-pix');
  });
});
