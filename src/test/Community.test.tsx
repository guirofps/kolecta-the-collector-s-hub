import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/use-api', () => ({
  useCommunityFeed: vi.fn(),
  useCommunityHighlights: vi.fn(() => ({ data: null, isLoading: false })),
  useCommunityTrends: vi.fn(() => ({ data: { window: '24h', posts: [] } })),
  useCategories: vi.fn(() => ({ data: [] })),
  useMyListings: vi.fn(() => ({ data: [] })),
  useUploadImage: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCreateCommunityPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useTogglePostLike: vi.fn(() => ({ mutate: vi.fn() })),
  useTogglePostSave: vi.fn(() => ({ mutate: vi.fn() })),
  useReportCommunity: vi.fn(() => ({ mutate: vi.fn() })),
  useCommunityComments: vi.fn(() => ({ data: [], isLoading: false })),
  useAddCommunityComment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', isSignedIn: true }),
}));

vi.mock('@/components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'layout' }, children),
}));

// ── Imports após mock ─────────────────────────────────────────────────────────

import {
  useCommunityFeed,
  useTogglePostLike,
} from '@/hooks/use-api';
import CommunityPage from '@/pages/Community';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makePost = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: `post_${Math.random().toString(36).slice(2)}`,
  authorId: 'author_1',
  type: 'discussion',
  title: 'Minha coleção de Dragon Ball',
  body: 'Finalmente completa!',
  images: [],
  categoryId: null,
  listingId: null,
  status: 'active',
  likeCount: 3,
  saveCount: 1,
  commentCount: 2,
  pinCount: 0,
  score: 10,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  author: { id: 'author_1', name: 'Goku Fan' },
  listing: null,
  category: null,
  ...overrides,
});

function renderCommunity() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, React.createElement(CommunityPage)),
    ),
  );
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('CommunityPage', () => {
  const mockUseFeed = vi.mocked(useCommunityFeed);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe skeletons durante o carregamento', () => {
    mockUseFeed.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderCommunity();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('exibe EmptyState quando não há publicações', () => {
    mockUseFeed.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
    } as any);
    renderCommunity();
    expect(screen.getByText('Ainda não há publicações')).toBeInTheDocument();
  });

  it('renderiza os posts do feed com título e contadores', () => {
    mockUseFeed.mockReturnValue({
      data: {
        data: [makePost({ title: 'Post A', likeCount: 5 })],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
    } as any);
    renderCommunity();
    expect(screen.getByText('Post A')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // likeCount
  });

  it('dispara toggleLike ao clicar no botão de curtir', () => {
    const likeMutate = vi.fn();
    vi.mocked(useTogglePostLike).mockReturnValue({ mutate: likeMutate } as any);
    const post = makePost({ id: 'p_like', title: 'Curte aí' });
    mockUseFeed.mockReturnValue({
      data: { data: [post], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
    } as any);

    renderCommunity();
    fireEvent.click(screen.getByLabelText('Curtir'));
    expect(likeMutate).toHaveBeenCalledWith('p_like');
  });
});
