import { test, expect } from '@playwright/test';

test.describe('Jornada de Checkout', () => {
  test('Fluxo Completo de Compra - Produto ao Pagamento', async ({ page }) => {
    // 1. Mock do Produto
    await page.route('**/api/listings/1', async route => {
      await route.fulfill({
        json: {
          data: {
            id: '1',
            title: 'Action Figure Raríssima',
            description: 'Item de colecionador',
            priceInCents: 15000,
            condition: 'novo',
            type: 'direct',
            status: 'active',
            images: JSON.stringify(['/placeholder.svg']),
            sellerId: 'seller-test',
            sellerName: 'Vendedor Oficial',
            categoryId: 'cat-1'
          }
        }
      });
    });

    // 2. Mock do ViaCEP
    await page.route('https://viacep.com.br/ws/*/json/', async route => {
      await route.fulfill({
        json: {
          logradouro: 'Avenida Paulista',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
          erro: false
        }
      });
    });

    // 3. Mock da requisição de Checkout do Backend (Stripe Intent)
    await page.route('**/api/orders/checkout', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: {
            orderId: 'ord-12345',
            clientSecret: 'pi_mock_secret_test_123',
            totalInCents: 16890,
            paidViaWallet: false
          }
        });
      }
    });

    // Ignora a rota de carteira e endereços do usuário
    await page.route('**/api/wallet', async route => {
      await route.fulfill({ json: { data: { balanceInCents: 0, transactions: [] } } });
    });
    
    await page.route('**/api/addresses', async route => {
      await route.fulfill({ json: { data: [] } });
    });

    // Auth Bypass para o React Context e Clerk, garantindo que "ProtectedRoute" não bloqueie
    await page.addInitScript(() => {
      window.localStorage.setItem('dev_user_id', 'user-1');
    });

    // ── PASSO 1: Adicionar produto ao carrinho ──────────────────────────────────
    await page.goto('/produto/1');
    
    // Aguarda o botão "Comprar Agora"
    const comprarAgoraBtn = page.getByRole('button', { name: 'Comprar Agora' });
    await expect(comprarAgoraBtn).toBeVisible();
    await comprarAgoraBtn.click();

    // Carrinho lateral deve abrir e ter o botão "Finalizar compra"
    const irCheckoutBtn = page.getByRole('button', { name: 'Finalizar compra' });
    await expect(irCheckoutBtn).toBeVisible();
    await irCheckoutBtn.click();

    // ── PASSO 2: Tela de Checkout - Endereço e Frete ────────────────────────────
    // Confirma se estamos na página de Checkout
    await expect(page.locator('h1', { hasText: 'Checkout' })).toBeVisible();

    // Preenche o formulário manual de endereço
    await page.getByLabel('Nome completo *').fill('João da Silva');
    await page.getByLabel('CPF *').fill('12345678909');
    
    // Preenche o CEP e dispara o onBlur
    const cepInput = page.getByLabel('CEP *');
    await cepInput.fill('01311000');
    await cepInput.blur();

    // Verifica se os campos de endereço foram preenchidos pelo mock do ViaCEP
    await expect(page.getByLabel('Rua *')).toHaveValue('Avenida Paulista');
    await expect(page.getByLabel('Bairro *')).toHaveValue('Bela Vista');
    await expect(page.getByLabel('Cidade *')).toHaveValue('São Paulo');
    await expect(page.getByLabel('Estado *')).toHaveValue('SP');

    await page.getByLabel('Número *').fill('1000');

    // Seleciona a opção de Frete PAC
    // Clicando na label que contém o texto PAC
    await page.locator('label').filter({ hasText: 'PAC' }).click();

    // ── PASSO 3: Ir para Pagamento ──────────────────────────────────────────────
    // Clica no botão de prosseguir
    const irPagamentoBtn = page.getByRole('button', { name: /Ir para pagamento/i });
    await irPagamentoBtn.click();

    // ── PASSO 4: Tela de Pagamento (Stripe Elements) ────────────────────────────
    // Deve renderizar a palavra Pagamento no subtítulo
    await expect(page.locator('h1', { hasText: 'Pagamento' })).toBeVisible();

    // O botão de Voltar deve estar disponível (prova de que a transição funcionou)
    await expect(page.getByRole('button', { name: '← Voltar ao endereço' })).toBeVisible();

    // Como o Stripe iframe requer um clientSecret real para carregar completamente,
    // garantimos que o formulário de pagamento do nosso app foi montado na tela
    // verificando a presença do botão de confirmação.
    const confirmarBtn = page.locator('button', { hasText: /Confirmar pagamento/i });
    await expect(confirmarBtn).toBeVisible();
  });
});
