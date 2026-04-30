// ─── Types ───────────────────────────────────────────────

export interface Subcategory {
  id: string
  name: string
  slug: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  description: string
  subcategories: Subcategory[]
}

export interface Seller {
  id: string;
  name: string;
  slug: string;
  avatar: string;
  verified: boolean;
  rating: number;
  totalSales: number;
  location: string;
  since: string;
}

export type ProductCondition = 'novo' | 'usado' | 'mint' | 'lacrado';
export type ProductType = 'direct' | 'auction';
export type ListingStatus = 'rascunho' | 'em_analise' | 'aprovado' | 'reprovado' | 'pausado' | 'vendido' | 'expirado';
export type AuctionStatus = 'agendado' | 'ativo' | 'encerrado' | 'pago' | 'nao_pago' | 'cancelado' | 'contestado';
export type OrderStatus = 'aguardando_pagamento' | 'preparar_envio' | 'enviado' | 'entregue' | 'disputa';

export interface Product {
  id: string;
  title: string;
  slug: string;
  images: string[];
  category: string;
  categorySlug: string;
  subcategorySlug: string;
  condition: ProductCondition;
  type: ProductType;
  price?: number;
  currentBid?: number;
  startingBid?: number;
  minIncrement?: number;
  bidsCount?: number;
  auctionEndsAt?: string;
  auctionStatus?: AuctionStatus;
  seller: Seller;
  description: string;
  details: Record<string, string>;
  featured: boolean;
  tags: string[];
  status: ListingStatus;
  createdAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;
  amount: number;
  createdAt: string;
}

// ─── Mock Sellers ────────────────────────────────────────

export const mockSellers: Seller[] = [
  {
    id: 's1',
    name: 'JDM Garage Collectibles',
    slug: 'jdm-garage',
    avatar: '/placeholder.svg',
    verified: true,
    rating: 4.9,
    totalSales: 342,
    location: 'São Paulo, SP',
    since: '2023',
  },
  {
    id: 's2',
    name: 'Escala Premium',
    slug: 'escala-premium',
    avatar: '/placeholder.svg',
    verified: true,
    rating: 4.8,
    totalSales: 189,
    location: 'Curitiba, PR',
    since: '2024',
  },
  {
    id: 's3',
    name: 'Coleção Turbo',
    slug: 'colecao-turbo',
    avatar: '/placeholder.svg',
    verified: true,
    rating: 4.7,
    totalSales: 276,
    location: 'Rio de Janeiro, RJ',
    since: '2023',
  },
  {
    id: 's4',
    name: 'Imports & Racers',
    slug: 'imports-racers',
    avatar: '/placeholder.svg',
    verified: false,
    rating: 4.5,
    totalSales: 58,
    location: 'Belo Horizonte, MG',
    since: '2025',
  },
  {
    id: 's5',
    name: 'MiniAuto Brasil',
    slug: 'miniauto-brasil',
    avatar: '/placeholder.svg',
    verified: true,
    rating: 4.9,
    totalSales: 512,
    location: 'Campinas, SP',
    since: '2022',
  },
];

// ─── Mock Categories ─────────────────────────────────────

export const mockCategories: Category[] = [
  {
    id: 'c1',
    name: 'Miniaturas & Diecast',
    slug: 'miniaturas-diecast',
    icon: '🏎️',
    description: 'Die-cast, miniaturas escala, réplicas e customizados',
    subcategories: [
      { id: 'c1s1', name: 'Die-cast', slug: 'die-cast' },
      { id: 'c1s2', name: 'Model Kits', slug: 'model-kits' },
      { id: 'c1s3', name: 'Réplicas', slug: 'replicas' },
      { id: 'c1s4', name: 'Customizados', slug: 'customizados' },
    ]
  },
  {
    id: 'c2',
    name: 'Cards Colecionáveis',
    slug: 'cards-colecionaveis',
    icon: '🃏',
    description: 'Pokémon, Magic, Dragon Ball, Sport Cards e outros',
    subcategories: [
      { id: 'c2s1', name: 'Pokémon', slug: 'pokemon' },
      { id: 'c2s2', name: 'Magic: The Gathering', slug: 'magic' },
      { id: 'c2s3', name: 'Dragon Ball', slug: 'dragon-ball' },
      { id: 'c2s4', name: 'Sport Cards', slug: 'sport-cards' },
      { id: 'c2s5', name: 'Outros', slug: 'outros-cards' },
    ]
  },
  {
    id: 'c3',
    name: 'Action Figures & Statues',
    slug: 'action-figures',
    icon: '🦸',
    description: 'Action figures articulados, statues e resin',
    subcategories: [
      { id: 'c3s1', name: 'Action Figures', slug: 'action-figures-articulados' },
      { id: 'c3s2', name: 'Statues & Resin', slug: 'statues-resin' },
      { id: 'c3s3', name: 'Outros', slug: 'outros-figures' },
    ]
  },
  {
    id: 'c4',
    name: 'Funko Pop',
    slug: 'funko-pop',
    icon: '🎭',
    description: 'Figuras vinil, edições especiais e exclusivos',
    subcategories: [
      { id: 'c4s1', name: 'Originais', slug: 'funko-originais' },
      { id: 'c4s2', name: 'Edições Especiais', slug: 'funko-especiais' },
      { id: 'c4s3', name: 'Chase', slug: 'funko-chase' },
      { id: 'c4s4', name: 'Exclusivos', slug: 'funko-exclusivos' },
    ]
  },
  {
    id: 'c5',
    name: 'Mangás & HQs',
    slug: 'mangas-hqs',
    icon: '📚',
    description: 'Mangá, HQs nacionais e importadas, edições especiais',
    subcategories: [
      { id: 'c5s1', name: 'Mangá', slug: 'manga' },
      { id: 'c5s2', name: 'HQ Nacional', slug: 'hq-nacional' },
      { id: 'c5s3', name: 'HQ Importada', slug: 'hq-importada' },
      { id: 'c5s4', name: 'Edições Especiais', slug: 'edicoes-especiais-hq' },
    ]
  },
]

// ─── Helper ──────────────────────────────────────────────

function futureDate(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

// ─── Mock Products ───────────────────────────────────────

export const mockProducts: Product[] = [
  {
    id: 'p1',
    title: 'Hot Wheels RLC Nissan Skyline GT-R R34 – Edição Exclusiva',
    slug: 'hw-rlc-skyline-r34',
    images: ['/placeholder.svg'],
    category: 'Carrinhos & Miniaturas',
    categorySlug: 'miniaturas-diecast',
    subcategorySlug: 'die-cast',
    condition: 'lacrado',
    type: 'auction',
    startingBid: 350,
    currentBid: 520,
    minIncrement: 20,
    bidsCount: 14,
    auctionEndsAt: futureDate(2.5),
    auctionStatus: 'ativo',
    seller: mockSellers[0],
    description: 'Edição limitada Red Line Club do icônico Skyline GT-R R34 em escala 1:64. Pintura Spectraflame azul, rodas de borracha Real Riders. Cartela original lacrada, nunca aberto.',
    details: { Marca: 'Hot Wheels', Linha: 'RLC', Escala: '1:64', Ano: '2024', Material: 'Metal/Metal' },
    featured: true,
    tags: ['JDM', 'Skyline', 'RLC', 'Premium'],
    status: 'aprovado',
    createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'p2',
    title: 'Tomica Limited Vintage Neo – Toyota AE86 Sprinter Trueno',
    slug: 'tlv-ae86-trueno',
    images: ['/placeholder.svg'],
    category: 'Carrinhos & Miniaturas',
    categorySlug: 'miniaturas-diecast',
    subcategorySlug: 'die-cast',
    condition: 'novo',
    type: 'direct',
    price: 289,
    seller: mockSellers[1],
    description: 'AE86 na versão Sprinter Trueno GT-APEX em escala 1:64 pela Tomica Limited Vintage Neo. Detalhamento excepcional, rodas articuladas e caixa display.',
    details: { Marca: 'Tomica', Linha: 'Limited Vintage Neo', Escala: '1:64', Ano: '2025', Material: 'Metal/Plástico' },
    featured: true,
    tags: ['JDM', 'AE86', 'Initial D', 'Tomica'],
    status: 'aprovado',
    createdAt: '2026-02-12T14:00:00Z',
  },
  {
    id: 'p3',
    title: 'Majorette Porsche 911 GT3 RS – Racing Edition',
    slug: 'majorette-911-gt3-rs',
    images: ['/placeholder.svg'],
    category: 'Carrinhos & Miniaturas',
    categorySlug: 'miniaturas-diecast',
    subcategorySlug: 'die-cast',
    condition: 'novo',
    type: 'direct',
    price: 45,
    seller: mockSellers[2],
    description: 'Porsche 911 GT3 RS em escala 1:64 da linha Racing Edition da Majorette. Pintura prata metálica com detalhes em vermelho racing.',
    details: { Marca: 'Majorette', Linha: 'Racing Edition', Escala: '1:64', Ano: '2025', Material: 'Metal/Plástico' },
    featured: false,
    tags: ['Porsche', 'GT3', 'Racing'],
    status: 'aprovado',
    createdAt: '2026-02-15T09:00:00Z',
  },
  {
    id: 'p4',
    title: 'Mini GT LB Works Lamborghini Huracán – Chase Version',
    slug: 'minigt-lb-huracan-chase',
    images: ['/placeholder.svg'],
    category: 'Carrinhos & Miniaturas',
    categorySlug: 'miniaturas-diecast',
    subcategorySlug: 'die-cast',
    condition: 'lacrado',
    type: 'auction',
    startingBid: 200,
    currentBid: 380,
    minIncrement: 15,
    bidsCount: 9,
    auctionEndsAt: futureDate(0.5),
    auctionStatus: 'ativo',
    seller: mockSellers[4],
    description: 'Versão Chase ultra rara do Lamborghini Huracán LB Works pela Mini GT. Pintura especial cromada, tiragem limitadíssima. Item de colecionador sério.',
    details: { Marca: 'Mini GT', Linha: 'Chase', Escala: '1:64', Ano: '2025', Material: 'Metal/Metal' },
    featured: true,
    tags: ['Chase', 'Lamborghini', 'LB Works', 'Raro'],
    status: 'aprovado',
    createdAt: '2026-02-18T11:00:00Z',
  },
  {
    id: 'p5',
    title: 'Kyosho 1:64 Nissan Silvia S15 – Midnight Purple III',
    slug: 'kyosho-silvia-s15',
    images: ['/placeholder.svg'],
    category: 'Carrinhos & Miniaturas',
    categorySlug: 'miniaturas-diecast',
    subcategorySlug: 'die-cast',
    condition: 'mint',
    type: 'direct',
    price: 175,
    seller: mockSellers[0],
    description: 'Silvia S15 na exclusiva cor Midnight Purple III (LV4) pela Kyosho. Perfeito estado, caixa original intacta. Peça de coleção.',
    details: { Marca: 'Kyosho', Linha: '1:64 Collection', Escala: '1:64', Ano: '2024', Material: 'Metal' },
    featured: false,
    tags: ['JDM', 'Silvia', 'S15', 'Kyosho'],
    status: 'aprovado',
    createdAt: '2026-02-08T16:00:00Z',
  },
  {
    id: 'p6',
    title: 'Hot Wheels Premium – Fast & Furious Mazda RX-7 FD3S',
    slug: 'hw-premium-rx7-fd',
    images: ['/placeholder.svg'],
    category: 'Carrinhos & Miniaturas',
    categorySlug: 'miniaturas-diecast',
    subcategorySlug: 'die-cast',
    condition: 'novo',
    type: 'auction',
    startingBid: 80,
    currentBid: 145,
    minIncrement: 10,
    bidsCount: 7,
    auctionEndsAt: futureDate(18),
    auctionStatus: 'ativo',
    seller: mockSellers[2],
    description: 'RX-7 FD3S da série Fast & Furious Premium. Rodas Real Riders, carroceria em metal com detalhes em tampo printing. Cartela selada.',
    details: { Marca: 'Hot Wheels', Linha: 'Premium Fast & Furious', Escala: '1:64', Ano: '2025', Material: 'Metal/Metal' },
    featured: true,
    tags: ['RX-7', 'Fast & Furious', 'JDM', 'Premium'],
    status: 'aprovado',
    createdAt: '2026-02-20T08:00:00Z',
  },
  {
    id: 'p7',
    title: 'Funko Pop! Initial D – Takumi Fujiwara #1042',
    slug: 'funko-initial-d-takumi',
    images: ['/placeholder.svg'],
    category: 'Funko Pop',
    categorySlug: 'funko-pop',
    subcategorySlug: 'funko-originais',
    condition: 'lacrado',
    type: 'direct',
    price: 199,
    seller: mockSellers[3],
    description: 'Funko Pop! do Takumi Fujiwara de Initial D, número 1042. Caixa em perfeito estado, filme protetor original.',
    details: { Marca: 'Funko', Linha: 'Pop! Animation', Número: '#1042', Ano: '2025' },
    featured: false,
    tags: ['Initial D', 'Takumi', 'Anime', 'Funko Pop'],
    status: 'aprovado',
    createdAt: '2026-02-14T12:00:00Z',
  },
  {
    id: 'p8',
    title: 'Greenlight Tokyo Torque – Datsun 510 Bluebird',
    slug: 'greenlight-datsun-510',
    images: ['/placeholder.svg'],
    category: 'Carrinhos & Miniaturas',
    categorySlug: 'miniaturas-diecast',
    subcategorySlug: 'die-cast',
    condition: 'usado',
    type: 'direct',
    price: 65,
    seller: mockSellers[3],
    description: 'Datsun 510 Bluebird da série Tokyo Torque da Greenlight. Fora da embalagem original, estado conservado sem marcas aparentes.',
    details: { Marca: 'Greenlight', Linha: 'Tokyo Torque', Escala: '1:64', Ano: '2023', Material: 'Metal/Plástico' },
    featured: false,
    tags: ['Datsun', '510', 'Tokyo Torque', 'JDM'],
    status: 'aprovado',
    createdAt: '2026-02-05T10:00:00Z',
  },
  {
    id: 'p9',
    title: 'Hot Wheels Super Treasure Hunt – Nissan 300ZX Z32',
    slug: 'hw-sth-300zx',
    images: ['/placeholder.svg'],
    category: 'Carrinhos & Miniaturas',
    categorySlug: 'miniaturas-diecast',
    subcategorySlug: 'die-cast',
    condition: 'lacrado',
    type: 'auction',
    startingBid: 500,
    currentBid: 780,
    minIncrement: 25,
    bidsCount: 11,
    auctionEndsAt: futureDate(6),
    auctionStatus: 'ativo',
    seller: mockSellers[4],
    description: 'Super Treasure Hunt do Nissan 300ZX (Z32). Pintura Spectraflame com rodas Real Riders gold. Um dos mais procurados da mainline 2025. Cartela perfeita.',
    details: { Marca: 'Hot Wheels', Linha: 'Super Treasure Hunt', Escala: '1:64', Ano: '2025', Material: 'Metal/Metal' },
    featured: true,
    tags: ['STH', '300ZX', 'Treasure Hunt', 'Raro', 'JDM'],
    status: 'aprovado',
    createdAt: '2026-02-19T15:00:00Z',
  },
  {
    id: 'p10',
    title: 'Auto World Ultra Red Chase – Ford Mustang Boss 429',
    slug: 'aw-ultra-red-mustang',
    images: ['/placeholder.svg'],
    category: 'Carrinhos & Miniaturas',
    categorySlug: 'miniaturas-diecast',
    subcategorySlug: 'die-cast',
    condition: 'lacrado',
    type: 'direct',
    price: 320,
    seller: mockSellers[1],
    description: 'Ultra Red Chase do Mustang Boss 429 pela Auto World. Edição limitada com pintura vermelha especial. Caixa original lacrada. Peça rara de coleção americana.',
    details: { Marca: 'Auto World', Linha: 'Ultra Red Chase', Escala: '1:64', Ano: '2024', Material: 'Metal' },
    featured: false,
    tags: ['Mustang', 'Chase', 'Muscle Car', 'Ultra Red'],
    status: 'aprovado',
    createdAt: '2026-02-11T13:00:00Z',
  },
  {
    id: 'p11',
    title: 'Inno64 Honda Civic EF9 – Kanjo Style',
    slug: 'inno64-civic-ef9-kanjo',
    images: ['/placeholder.svg'],
    category: 'Carrinhos & Miniaturas',
    categorySlug: 'miniaturas-diecast',
    subcategorySlug: 'die-cast',
    condition: 'novo',
    type: 'auction',
    startingBid: 120,
    currentBid: 185,
    minIncrement: 10,
    bidsCount: 6,
    auctionEndsAt: futureDate(48),
    auctionStatus: 'ativo',
    seller: mockSellers[0],
    description: 'Honda Civic EF9 estilo Kanjo pela Inno64. Detalhes de corrida de rua com adesivos Osaka JDM. Edição limitada a 2400 peças mundiais.',
    details: { Marca: 'Inno64', Linha: 'Kanjo Collection', Escala: '1:64', Ano: '2025', Material: 'Metal/Metal', Tiragem: '2400 pçs' },
    featured: false,
    tags: ['Honda', 'Civic', 'Kanjo', 'JDM', 'Osaka'],
    status: 'aprovado',
    createdAt: '2026-02-21T09:00:00Z',
  },
  {
    id: 'p12',
    title: 'Kaido House x Mini GT – Datsun Fairlady Z S30Z',
    slug: 'kaidohouse-fairlady-z',
    images: ['/placeholder.svg'],
    category: 'Carrinhos & Miniaturas',
    categorySlug: 'miniaturas-diecast',
    subcategorySlug: 'die-cast',
    condition: 'novo',
    type: 'direct',
    price: 135,
    seller: mockSellers[4],
    description: 'Colaboração Kaido House x Mini GT do Datsun Fairlady Z (S30Z). Estilo bosozoku com aero kit agressivo. Roda semi-deep dish. Uma obra de arte em miniatura.',
    details: { Marca: 'Kaido House x Mini GT', Linha: 'Collab', Escala: '1:64', Ano: '2025', Material: 'Metal' },
    featured: true,
    tags: ['Datsun', 'Fairlady Z', 'Kaido House', 'JDM', 'Bosozoku'],
    status: 'aprovado',
    createdAt: '2026-02-22T10:00:00Z',
  },
];

// ─── Mock Bids ───────────────────────────────────────────

export const mockBids: Bid[] = [
  { id: 'b1', auctionId: 'p1', userId: 'u1', userName: 'Col***or', amount: 520, createdAt: '2026-02-23T08:15:00Z' },
  { id: 'b2', auctionId: 'p1', userId: 'u2', userName: 'JDM***an', amount: 500, createdAt: '2026-02-23T07:45:00Z' },
  { id: 'b3', auctionId: 'p1', userId: 'u3', userName: 'Rac***er', amount: 480, createdAt: '2026-02-23T06:30:00Z' },
  { id: 'b4', auctionId: 'p1', userId: 'u1', userName: 'Col***or', amount: 450, createdAt: '2026-02-22T22:00:00Z' },
  { id: 'b5', auctionId: 'p1', userId: 'u4', userName: 'Min***ra', amount: 420, createdAt: '2026-02-22T20:15:00Z' },
  { id: 'b6', auctionId: 'p4', userId: 'u2', userName: 'JDM***an', amount: 380, createdAt: '2026-02-23T09:00:00Z' },
  { id: 'b7', auctionId: 'p4', userId: 'u5', userName: 'Cha***se', amount: 350, createdAt: '2026-02-23T08:30:00Z' },
  { id: 'b8', auctionId: 'p9', userId: 'u3', userName: 'Rac***er', amount: 780, createdAt: '2026-02-23T07:00:00Z' },
  { id: 'b9', auctionId: 'p9', userId: 'u1', userName: 'Col***or', amount: 750, createdAt: '2026-02-22T05:30:00Z' },
];

// ─── Helpers ─────────────────────────────────────────────

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getAuctionProducts(): Product[] {
  return mockProducts.filter((p) => p.type === 'auction');
}

export function getFeaturedProducts(): Product[] {
  return mockProducts.filter((p) => p.featured);
}

export function getProductsByCategory(slug: string): Product[] {
  return mockProducts.filter((p) => p.categorySlug === slug);
}

export function getProductBySlug(slug: string): Product | undefined {
  return mockProducts.find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return mockProducts.find((p) => p.id === id);
}

export function conditionLabel(c: ProductCondition): string {
  const map: Record<ProductCondition, string> = {
    novo: 'Novo',
    usado: 'Usado',
    mint: 'Mint',
    lacrado: 'Lacrado',
  };
  return map[c];
}
