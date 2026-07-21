import { describe, it, expect } from 'vitest';
import { conditionLabel } from '@/lib/conditions';

describe('conditionLabel', () => {
  it('traduz os valores que o anuncio realmente salva', () => {
    expect(conditionLabel('novo-lacrado')).toBe('Novo na embalagem');
    expect(conditionLabel('novo-sem-caixa')).toBe('Novo sem caixa');
    expect(conditionLabel('usado-conservado')).toBe('Usado conservado');
    expect(conditionLabel('usado-com-marcas')).toBe('Usado com marcas');
  });
  it('nao diz mais "lacrado" (caixa de Funko nao tem lacre)', () => {
    expect(conditionLabel('novo-lacrado').toLowerCase()).not.toContain('lacrado');
  });
  it('ainda entende o vocabulario antigo', () => {
    expect(conditionLabel('novo')).toBe('Novo');
    expect(conditionLabel('mint')).toBe('Mint');
  });
  it('nunca devolve undefined (era o bug: condicao sumia da tela)', () => {
    expect(conditionLabel('valor-desconhecido')).toBe('valor-desconhecido');
    expect(conditionLabel(null)).toBe('');
  });
});
