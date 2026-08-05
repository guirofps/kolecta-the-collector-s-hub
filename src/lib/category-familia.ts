// ─── Família dentro de Miniaturas: miniatura vs acessório ────────────────────
//
// Acessório (roda de resina, expositor, decal) é peça PARA miniatura, não uma
// categoria à parte na home. Fica aninhado DENTRO da página de Miniaturas, e um
// seletor troca entre as duas famílias. No banco continua sendo a categoria
// 'acessorios' (wizard, import e Bling intactos): só a navegação a apresenta
// como subcategoria.
//
// A decisão de "qual família, quais anúncios, qual prateleira" vive aqui, pura e
// testável, porque a página de categoria não roda sem o backend e o Clerk.

export type Familia = 'miniaturas' | 'acessorios';

const SLUG_MINIATURAS = 'miniaturas-diecast';
const SLUG_ACESSORIOS = 'acessorios';

export interface FamiliaView {
  /** A página atual é a de Miniaturas (a única que aninha acessórios). */
  ehMiniaturas: boolean;
  /** A família ativa é a de acessórios (e existe acessório publicado). */
  emAcessorios: boolean;
  /** Slug que decide campos e prateleiras (subcategoriaField). */
  slugAtivo: string | undefined;
  /** Id da categoria cujos anúncios a página deve listar agora. */
  categoriaIdAtiva: string | undefined;
  totalMiniaturas: number;
  totalAcessorios: number;
  /** Mostrar o seletor só quando há acessório publicado (nunca aba vazia). */
  mostrarSeletor: boolean;
}

/** Só o que importa de um anúncio para contar por categoria. */
interface ComCategoria {
  categoryId?: string | null;
}

/**
 * Resolve a família ativa da página de categoria.
 *
 * `idPorSlug` mapeia slug → id da categoria (a de acessórios tem id próprio no
 * banco, por isso vem por aqui e não por constante). `publicos` são os anúncios
 * já filtrados para a vitrine.
 */
export function resolverFamilia(params: {
  slug: string | undefined;
  familia: Familia;
  idPorSlug: (slug: string) => string | undefined;
  publicos: ComCategoria[];
}): FamiliaView {
  const { slug, familia, idPorSlug, publicos } = params;

  const ehMiniaturas = slug === SLUG_MINIATURAS;
  const idMiniaturas = idPorSlug(SLUG_MINIATURAS);
  const idAcessorios = ehMiniaturas ? idPorSlug(SLUG_ACESSORIOS) : undefined;

  const conta = (id: string | undefined) =>
    id ? publicos.filter((l) => l.categoryId === id).length : 0;

  const totalMiniaturas = conta(idMiniaturas);
  const totalAcessorios = conta(idAcessorios);

  const emAcessorios = ehMiniaturas && familia === 'acessorios' && totalAcessorios > 0;

  return {
    ehMiniaturas,
    emAcessorios,
    slugAtivo: emAcessorios ? SLUG_ACESSORIOS : slug,
    categoriaIdAtiva: emAcessorios ? idAcessorios : idPorSlug(slug ?? ''),
    totalMiniaturas,
    totalAcessorios,
    mostrarSeletor: ehMiniaturas && totalAcessorios > 0,
  };
}
