import { test, expect } from '@playwright/test';

// Constante de mock para um favorito
const mockFavorite = {
  id: 'fav-123',
  userId: 'user-1',
  listingId: 'listing-1',
  createdAt: new Date().toISOString(),
  listing: {
    id: 'listing-1',
    title: 'Item de Teste Favorito',
    priceInCents: 15000,
    condition: 'novo',
    type: 'direct',
    status: 'aprovado',
    images: JSON.stringify(['/placeholder.svg'])
  }
};

test.describe('Jornada de Favoritos', () => {
  
  test('Página de Detalhes do Produto - Toggling UI State', async ({ page }) => {
    // A página de detalhes do produto possui state local para o ícone de favoritos
    await page.route('**/api/listings/1', async route => {
      const json = {
        data: {
          id: '1',
          title: 'Produto de Teste',
          description: 'Descrição de teste',
          priceInCents: 10000,
          condition: 'usado',
          type: 'direct',
          status: 'active',
          images: JSON.stringify(['/placeholder.svg']),
          sellerId: 'seller-1',
          sellerName: 'Vendedor Teste'
        }
      };
      await route.fulfill({ json });
    });

    await page.goto('/produto/1');
    
    // O coração inicialmente não deve estar favoritado
    // Usamos role=main para evitar pegar o botão do cabeçalho
    const favoriteButton = page.locator('main button').filter({ has: page.locator('.lucide-heart') }).first();
    await expect(favoriteButton).toBeVisible();
    
    // Clica no botão de favorito
    await favoriteButton.click();
    
    // O ícone do coração deve ter a classe de "fill" que indica que foi favoritado
    await expect(favoriteButton.locator('.lucide-heart')).toHaveClass(/fill-kolecta-red/);
    
    // Clica novamente para desfavoritar
    await favoriteButton.click();
    await expect(favoriteButton.locator('.lucide-heart')).not.toHaveClass(/fill-kolecta-red/);
  });

  test('Meus Favoritos - Listagem e Remoção', async ({ page }) => {
    // 1. Intercepta a requisição GET para retornar a lista mockada
    await page.route('**/api/favorites', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: { data: [mockFavorite] }
        });
      }
    });

    // 2. Intercepta a requisição DELETE para simular o sucesso
    await page.route(`**/api/favorites/${mockFavorite.listingId}`, async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      }
    });

    // Adiciona localStorage falso para evitar redirecionamento
    await page.addInitScript(() => {
      window.localStorage.setItem('dev_user_id', 'user-1');
    });

    await page.goto('/conta/favoritos');

    // Verifica se o título da página está presente
    await expect(page.locator('h1', { hasText: 'Favoritos' })).toBeVisible();

    // Verifica se o item de teste renderizou
    await expect(page.getByText('Item de Teste Favorito')).toBeVisible();

    // Encontra o botão de remover (dentro do main, na lista de cards)
    const removeButton = page.locator('main button').filter({ has: page.locator('.lucide-heart') }).first();
    await removeButton.click();

    // Verifica se o modal de confirmação abriu
    await expect(page.getByText('Remover dos favoritos?')).toBeVisible();

    // Modifica a rota GET para retornar array vazio, simulando que foi removido com sucesso
    await page.route('**/api/favorites', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { data: [] } });
      }
    });

    // Confirma a remoção no modal
    await page.getByRole('button', { name: 'Remover', exact: true }).click();

    // Verifica se o empty state foi renderizado após o re-fetch
    await expect(page.getByText('Você ainda não salvou nenhum item')).toBeVisible();
    await expect(page.getByText('Item de Teste Favorito')).not.toBeVisible();
  });
});
