import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FounderProgress from '@/components/FounderProgress';
import type { Listing } from '@/lib/api';

// Mantém a campanha "aberta" para o card renderizar no teste.
vi.mock('@/lib/launch', () => ({ hasLaunched: () => false }));

function listing(status: string, i: number): Listing {
  return { id: `l${i}`, status } as Listing;
}

function renderWith(statuses: string[]) {
  render(
    <MemoryRouter>
      <FounderProgress listings={statuses.map(listing)} />
    </MemoryRouter>,
  );
}

describe('FounderProgress', () => {
  it('conta os status REAIS do banco (draft = em analise, active = aprovado)', () => {
    // Bug: contava por nomes em portugues e zerava o placar de todo mundo.
    renderWith(['draft', 'draft', 'active']);
    expect(screen.getByText(/3 de 5 an[úu]ncios/i)).toBeInTheDocument();
  });

  it('nao conta anuncio recusado', () => {
    renderWith(['draft', 'rejected', 'draft']);
    expect(screen.getByText(/2 de 5 an[úu]ncios/i)).toBeInTheDocument();
  });

  it('ao bater o minimo, diz que esta concorrendo (nao que garantiu)', () => {
    renderWith(['draft', 'draft', 'draft', 'active', 'active']);
    expect(screen.getByText(/concorrendo/i)).toBeInTheDocument();
    expect(screen.queryByText(/garantid/i)).not.toBeInTheDocument();
  });

  it('sem anuncio, mostra zero', () => {
    renderWith([]);
    expect(screen.getByText(/0 de 5 an[úu]ncios/i)).toBeInTheDocument();
  });
});
