import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StoreSocials from '@/components/loja/StoreSocials';

const TODAS = {
  tiktok: 'https://www.tiktok.com/@lojanerd',
  instagram: 'https://www.instagram.com/lojanerd',
  youtube: 'https://www.youtube.com/@canaldaloja',
  website: 'https://lojanerd.com.br/',
};

describe('StoreSocials — a fileira de ícones da loja', () => {
  // A regra combinada com o dono: cada ícone é independente.
  it('mostra só os ícones das redes preenchidas', () => {
    const { container } = render(
      <StoreSocials
        social={{ ...TODAS, tiktok: null, youtube: null, website: null }}
      />,
    );
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', TODAS.instagram);
    expect(screen.getByLabelText(/Instagram/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/TikTok/)).not.toBeInTheDocument();
  });

  it('com as quatro preenchidas, mostra as quatro', () => {
    const { container } = render(<StoreSocials social={TODAS} />);
    expect(container.querySelectorAll('a')).toHaveLength(4);
  });

  // Sem nenhuma rede a fileira não pode existir — nem como bloco vazio com
  // margem, que deixaria um buraco entre as estatísticas e o "Membro desde".
  it('sem nenhuma rede, não renderiza nada', () => {
    const { container } = render(<StoreSocials social={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('objeto com os quatro campos nulos também não renderiza nada', () => {
    const { container } = render(
      <StoreSocials
        social={{ tiktok: null, instagram: null, youtube: null, website: null }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  // `/vendedor/:slug` é página pública e indexável: sem `nofollow` a loja vira
  // moeda de SEO, e sem `noopener` a página de destino mexe na aba de origem.
  it('todo link sai com target e rel completos', () => {
    const { container } = render(<StoreSocials social={TODAS} />);
    const links = Array.from(container.querySelectorAll('a'));
    expect(links).toHaveLength(4);

    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      const rel = link.getAttribute('rel') ?? '';
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
      expect(rel).toContain('nofollow');
    }
  });

  // O ícone sozinho não diz nada em leitor de tela e não há texto visível.
  it('todo link tem rótulo acessível', () => {
    render(<StoreSocials social={TODAS} />);
    for (const nome of ['Instagram', 'TikTok', 'YouTube', 'Site']) {
      expect(screen.getByLabelText(new RegExp(nome))).toBeInTheDocument();
    }
  });
});
