// Quantas fotos um anúncio precisa ter.
//
// Fonte única. O número estava escrito em quatro lugares (wizard de criação,
// importação em massa, fila de moderação e a Central de Ajuda), então mudar a
// regra exigia lembrar de todos: dava para o vendedor conseguir publicar com
// uma quantidade que a moderação depois reprovava.

/**
 * Mínimo para publicar e para a moderação aprovar.
 *
 * Era 3. Baixou para 2 porque a exigência estava travando anúncio bom: em
 * miniatura embalada, frente e verso do blister já mostram tudo que o
 * comprador precisa julgar, e o terceiro ângulo virava foto repetida só para
 * destravar o botão.
 */
export const MIN_PHOTOS = 2;

/** Teto por anúncio. */
export const MAX_PHOTOS = 8;

/** Texto do limite, para não escrever "de 2 a 8" na mão em cada tela. */
export const FAIXA_FOTOS = `${MIN_PHOTOS} a ${MAX_PHOTOS}`;
