// Aferição de qualidade da foto no momento do upload.
//
// Um vendedor subiu 40+ anúncios com imagens de 140×140 px (3-5 KB): thumbnails,
// não fotos de produto. Na aprovação isso passava batido, porque o card do admin
// mostra a imagem pequena e ela "parece" ok. A defesa barata é avisar na origem:
// quem sobe a foto vê na hora que ela está miúda demais.

/** Menor lado recomendado para foto de produto. Abaixo disso, avisa. */
export const LADO_MINIMO_RECOMENDADO = 800;

/** Baixa resolução = o menor lado da imagem está abaixo do recomendado. */
export function resolucaoBaixa(
  largura: number,
  altura: number,
  minimo: number = LADO_MINIMO_RECOMENDADO,
): boolean {
  if (!largura || !altura) return false; // não sabemos: não alarma à toa
  return Math.min(largura, altura) < minimo;
}

/**
 * Dimensões reais do arquivo escolhido, antes de qualquer compressão (que nunca
 * aumenta a imagem). Depende do DOM (decodifica no navegador); em erro devolve
 * 0×0 para não travar o upload por causa da aferição.
 */
export async function medirImagem(
  file: File,
): Promise<{ largura: number; altura: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ largura: img.naturalWidth, altura: img.naturalHeight });
      img.onerror = () => resolve({ largura: 0, altura: 0 });
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
