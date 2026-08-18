import { describe, it, expect } from 'vitest';
import { casarPorSku } from '@/lib/casar-fotos';

describe('casarPorSku', () => {
  const skus = ['HW001', 'HW002', 'HW0010'];

  it('casa SKU-ordem e lê a ordem', () => {
    expect(casarPorSku('HW001-1.jpg', skus)).toEqual({ sku: 'HW001', ordem: 1 });
    expect(casarPorSku('HW001-3.png', skus)).toEqual({ sku: 'HW001', ordem: 3 });
  });

  it('sem número, a ordem é 1', () => {
    expect(casarPorSku('HW002.jpg', skus)).toEqual({ sku: 'HW002', ordem: 1 });
  });

  it('ignora caixa e separador (_, espaço)', () => {
    expect(casarPorSku('hw001_2.JPEG', skus)).toEqual({ sku: 'HW001', ordem: 2 });
    expect(casarPorSku('HW001 2.jpg', skus)).toEqual({ sku: 'HW001', ordem: 2 });
  });

  it('o SKU mais longo vence (HW0010 não vira HW001)', () => {
    expect(casarPorSku('HW0010-1.jpg', skus)).toEqual({ sku: 'HW0010', ordem: 1 });
  });

  it('não casa quando o SKU é só prefixo sem separador', () => {
    // HW0013 não é nenhum SKU conhecido; não pode "colar" no HW001.
    expect(casarPorSku('HW0013-1.jpg', skus)).toBeNull();
  });

  it('não casa nome fora do padrão', () => {
    expect(casarPorSku('foto-do-carrinho.jpg', skus)).toBeNull();
  });

  it('ignora SKU vazio na lista', () => {
    expect(casarPorSku('qualquer.jpg', ['', '  '])).toBeNull();
  });
});
