// ─── Compressão de imagem no cliente, antes do upload ────────────────────────
//
// Foto de celular moderno (ainda mais de iPhone/iPad) vem com 3 a 8 MB e vários
// milhares de pixels de lado. Subir isso cru dava "Multipart: Unexpected end of
// form": o corpo estoura o limite do servidor e o stream é cortado no meio.
//
// Aqui a imagem é redesenhada num canvas até um lado máximo e reexportada como
// JPEG. O anúncio não precisa de mais que isso, o upload fica leve, e o corpo
// nunca mais chega grande demais. Reencodar também gera um Blob limpo, com
// tamanho coerente, o que evita o corte de corpo que o iOS às vezes provoca.
//
// Regra de ouro: NUNCA piorar. Qualquer erro, ou resultado maior que o
// original, devolve o arquivo como veio. Compressão é um extra, não um risco.

/** Maior lado (px) que uma foto de anúncio precisa ter. */
export const LADO_MAXIMO = 1600;
/** Qualidade do JPEG reexportado. 0.82 mantém foto boa e corta muito peso. */
export const QUALIDADE = 0.82;
/** Abaixo disto não vale reencodar: já está leve. */
export const COMPRIMIR_ACIMA_DE = 900 * 1024;

/** Só imagens raster que o canvas desenha bem. HEIC o iOS já converte no input. */
const TIPOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Nova dimensão preservando proporção, só reduzindo. Nunca aumenta uma imagem
 * pequena (isso só adicionaria peso sem ganho).
 */
export function dimensaoAlvo(
  largura: number,
  altura: number,
  ladoMax = LADO_MAXIMO,
): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (maior <= ladoMax) return { largura, altura };
  const fator = ladoMax / maior;
  return {
    largura: Math.round(largura * fator),
    altura: Math.round(altura * fator),
  };
}

/**
 * Vale a pena tentar comprimir este arquivo? Só imagem raster suportada e que
 * esteja acima do piso de peso. Fora disso, sobe como está.
 */
export function deveComprimir(file: File, pisoBytes = COMPRIMIR_ACIMA_DE): boolean {
  return TIPOS.has(file.type) && file.size > pisoBytes;
}

/** Decodifica o arquivo respeitando a orientação EXIF (foto de celular deitada). */
async function decodificar(file: File): Promise<{ largura: number; altura: number; desenhar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; fechar: () => void }> {
  // createImageBitmap com from-image resolve a orientação EXIF de uma vez, e é o
  // caminho rápido nos navegadores atuais (inclui Safari iOS recente).
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return {
        largura: bitmap.width,
        altura: bitmap.height,
        desenhar: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        fechar: () => bitmap.close(),
      };
    } catch { /* cai no <img> */ }
  }
  // Fallback: <img> por object URL. O Safari atual já aplica a orientação EXIF
  // ao decodificar, então o canvas sai com os pixels na posição certa.
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('não decodificou'));
      el.src = url;
    });
    return {
      largura: img.naturalWidth,
      altura: img.naturalHeight,
      desenhar: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      fechar: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/**
 * Devolve uma versão leve da imagem para upload, ou o próprio arquivo se não
 * couber comprimir ou se algo falhar. Nunca lança.
 */
export async function comprimirImagem(file: File): Promise<File> {
  if (!deveComprimir(file)) return file;

  try {
    const fonte = await decodificar(file);
    const { largura, altura } = dimensaoAlvo(fonte.largura, fonte.altura);

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) { fonte.fechar(); return file; }
    // Fundo branco: JPEG não tem transparência, e um PNG transparente viraria
    // preto sem isto.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largura, altura);
    fonte.desenhar(ctx, largura, altura);
    fonte.fechar();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALIDADE),
    );
    // Se não gerou, ou ficou MAIOR que o original, o original vence.
    if (!blob || blob.size >= file.size) return file;

    const nome = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], nome, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}
