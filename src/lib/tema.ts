// ─── Tema claro / escuro ─────────────────────────────────────────────────────
//
// Três estados, não dois. "Sistema" é o padrão e existe porque a maioria das
// pessoas nunca vai abrir esta configuração: quem já deixou o computador no
// escuro merece o site escuro sem ter que pedir. Só quem escolhe explicitamente
// fica preso à escolha.
//
// A lógica vive aqui, fora do React, para poder ser testada sem montar árvore
// de componente e para ser reaproveitada pelo script que roda antes da página
// pintar (ver index.html).

export type Tema = 'claro' | 'escuro' | 'sistema';

export const TEMAS: Tema[] = ['claro', 'escuro', 'sistema'];

/** Chave no localStorage. Prefixo para não colidir com outras coisas do app. */
export const CHAVE_TEMA = 'kolecta_tema';

/** O que de fato é aplicado na tela: só existe claro ou escuro. */
export type TemaEfetivo = 'claro' | 'escuro';

/** Aceita só os três valores conhecidos. Lixo no storage cai em 'sistema'. */
export function normalizarTema(valor: unknown): Tema {
  return TEMAS.includes(valor as Tema) ? (valor as Tema) : 'sistema';
}

/** Resolve 'sistema' para o que o aparelho pede. */
export function resolverTema(escolha: Tema, sistemaPrefereEscuro: boolean): TemaEfetivo {
  if (escolha === 'claro') return 'claro';
  if (escolha === 'escuro') return 'escuro';
  return sistemaPrefereEscuro ? 'escuro' : 'claro';
}

/**
 * O próximo tema quando a pessoa clica no botão.
 *
 * Alterna entre claro e escuro em vez de girar pelos três. Um botão que passa
 * por "sistema" no meio confunde: a pessoa clica esperando trocar de cor e às
 * vezes nada muda, porque o sistema dela já estava naquele modo.
 */
export function proximoTema(atual: Tema, sistemaPrefereEscuro: boolean): Tema {
  return resolverTema(atual, sistemaPrefereEscuro) === 'escuro' ? 'claro' : 'escuro';
}

/** Aplica no documento. É a única função aqui que toca no DOM. */
export function aplicarTema(efetivo: TemaEfetivo, raiz: HTMLElement): void {
  raiz.classList.toggle('dark', efetivo === 'escuro');
  // `color-scheme` faz o navegador pintar barra de rolagem, campo de formulário
  // e menu nativo no tom certo. Sem isso, um <select> aberto vem branco no meio
  // do tema escuro.
  raiz.style.colorScheme = efetivo === 'escuro' ? 'dark' : 'light';
}

/** Rótulo curto para o botão e para leitor de tela. */
export function rotuloTema(efetivo: TemaEfetivo): string {
  return efetivo === 'escuro' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro';
}
