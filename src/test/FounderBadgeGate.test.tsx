import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/use-api', () => ({
  useFounderBadge: vi.fn(),
}));

const mockHasLaunched = vi.fn();
vi.mock('@/lib/launch', () => ({
  hasLaunched: () => mockHasLaunched(),
}));

import { useFounderBadge } from '@/hooks/use-api';
import { FounderBadgeFor, FounderMedalFor } from '@/components/FounderBadge';

/**
 * O selo de Fundador não pode aparecer antes de 25/07.
 *
 * A seleção é curada pela equipe, mas o backend atribui número sozinho ao
 * avaliar a qualificação na leitura. Sem esta trava, quem só cumpriu os 5
 * anúncios já aparecia em público como "Fundador #053", antes de qualquer
 * decisão nossa. Foi exatamente o que aconteceu em produção.
 */
describe('Selo de Fundador: trava até o lançamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useFounderBadge as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { founderNumber: 53 },
    });
  });

  afterEach(() => vi.clearAllMocks());

  it('não mostra o pill antes do lançamento, mesmo com número atribuído', () => {
    mockHasLaunched.mockReturnValue(false);
    const { container } = render(React.createElement(FounderBadgeFor, { userId: 'u1' }));
    expect(container).toBeEmptyDOMElement();
  });

  it('não mostra a medalha antes do lançamento', () => {
    mockHasLaunched.mockReturnValue(false);
    const { container } = render(React.createElement(FounderMedalFor, { userId: 'u1' }));
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o pill depois do lançamento', () => {
    mockHasLaunched.mockReturnValue(true);
    render(React.createElement(FounderBadgeFor, { userId: 'u1' }));
    expect(screen.getByText(/Fundador #053/)).toBeInTheDocument();
  });

  it('segue sem mostrar nada para quem não é fundador, mesmo pós-lançamento', () => {
    mockHasLaunched.mockReturnValue(true);
    (useFounderBadge as ReturnType<typeof vi.fn>).mockReturnValue({ data: null });
    const { container } = render(React.createElement(FounderBadgeFor, { userId: 'u1' }));
    expect(container).toBeEmptyDOMElement();
  });
});
