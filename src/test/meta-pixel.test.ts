import { describe, it, expect, beforeEach, vi } from 'vitest';
import { metaTrack, metaTrackCustom, metaTrackSignupOnce, metaTrackPurchaseOnce, isCadastroRecente } from '@/lib/meta-pixel';

describe('meta-pixel', () => {
  beforeEach(() => {
    localStorage.clear();
    (window as { fbq?: unknown }).fbq = vi.fn();
  });

  const fbq = () => (window as unknown as { fbq: ReturnType<typeof vi.fn> }).fbq;

  it('não quebra quando o script do Meta não carregou', () => {
    delete (window as { fbq?: unknown }).fbq;
    expect(() => metaTrack('PageView')).not.toThrow();
    expect(() => metaTrackCustom('Qualquer')).not.toThrow();
  });

  it('dispara evento padrão sem parâmetros extras', () => {
    metaTrack('PageView');
    expect(fbq()).toHaveBeenCalledWith('track', 'PageView');
  });

  it('dispara evento customizado com dados', () => {
    metaTrackCustom('ClickQueroSerFundador', { cta: 'Quero ser Fundador' });
    expect(fbq()).toHaveBeenCalledWith('trackCustom', 'ClickQueroSerFundador', {
      cta: 'Quero ser Fundador',
    });
  });

  describe('isCadastroRecente', () => {
    it('conta como novo quem criou a conta agora', () => {
      expect(isCadastroRecente(new Date())).toBe(true);
    });

    it('não conta login de quem já era cadastrado', () => {
      expect(isCadastroRecente(new Date(Date.now() - 2 * 60 * 60 * 1000))).toBe(false);
    });

    it('tolera data ausente', () => {
      expect(isCadastroRecente(null)).toBe(false);
      expect(isCadastroRecente(undefined)).toBe(false);
    });
  });

  describe('metaTrackSignupOnce', () => {
    it('manda CompleteRegistration e Lead na primeira vez', () => {
      metaTrackSignupOnce('user_1');
      const eventos = fbq().mock.calls.map((c) => c[1]);
      expect(eventos).toContain('CompleteRegistration');
      expect(eventos).toContain('Lead');
    });

    it('não redispara para o mesmo usuário', () => {
      metaTrackSignupOnce('user_1');
      fbq().mockClear();
      metaTrackSignupOnce('user_1');
      expect(fbq()).not.toHaveBeenCalled();
    });

    it('dispara de novo para outro usuário no mesmo navegador', () => {
      metaTrackSignupOnce('user_1');
      fbq().mockClear();
      metaTrackSignupOnce('user_2');
      expect(fbq()).toHaveBeenCalled();
    });

    it('ignora id vazio', () => {
      metaTrackSignupOnce('');
      expect(fbq()).not.toHaveBeenCalled();
    });
  });

  describe('metaTrackPurchaseOnce', () => {
    it('dispara Purchase com valor e moeda', () => {
      metaTrackPurchaseOnce('order_1', { value: 149.9, currency: 'BRL' });
      expect(fbq()).toHaveBeenCalledWith('track', 'Purchase', {
        value: 149.9,
        currency: 'BRL',
      });
    });

    it('não redispara para o mesmo pedido (polling do PIX)', () => {
      metaTrackPurchaseOnce('order_1', { value: 10, currency: 'BRL' });
      fbq().mockClear();
      metaTrackPurchaseOnce('order_1', { value: 10, currency: 'BRL' });
      expect(fbq()).not.toHaveBeenCalled();
    });

    it('conta pedidos diferentes', () => {
      metaTrackPurchaseOnce('order_1', { value: 10, currency: 'BRL' });
      fbq().mockClear();
      metaTrackPurchaseOnce('order_2', { value: 20, currency: 'BRL' });
      expect(fbq()).toHaveBeenCalled();
    });

    it('ignora orderId vazio', () => {
      metaTrackPurchaseOnce('', { value: 1, currency: 'BRL' });
      expect(fbq()).not.toHaveBeenCalled();
    });
  });
});
