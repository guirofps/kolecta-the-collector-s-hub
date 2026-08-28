import { describe, it, expect } from 'vitest';
import {
  normalizarRedeFront,
  urlDaRedeFront,
  urlDeWebsiteFront,
  temAlgumaRede,
} from '@/lib/redes-sociais';

// Este módulo alimenta a PRÉVIA embaixo do input. Ele não é a barreira de
// segurança — essa é o backend — mas precisa concordar com ele, senão o
// vendedor vê "vai levar para X" e a loja não mostra ícone nenhum.
describe('Redes sociais (front)', () => {
  describe('normalizarRedeFront — as três formas convergem', () => {
    it('@handle, handle solto e URL dão o mesmo valor', () => {
      const a = normalizarRedeFront('instagram', '@lojanerd');
      const b = normalizarRedeFront('instagram', 'lojanerd');
      const c = normalizarRedeFront('instagram', 'https://instagram.com/lojanerd');
      expect(a).toBe('lojanerd');
      expect(b).toBe('lojanerd');
      expect(c).toBe('lojanerd');
    });

    it('aceita URL sem protocolo', () => {
      expect(normalizarRedeFront('tiktok', 'tiktok.com/@lojanerd')).toBe('lojanerd');
    });

    it('handle com ponto continua handle, não domínio', () => {
      expect(normalizarRedeFront('instagram', 'loja.nerd')).toBe('loja.nerd');
    });

    it('vazio e nulo não geram nada', () => {
      expect(normalizarRedeFront('instagram', '')).toBeNull();
      expect(normalizarRedeFront('instagram', '   ')).toBeNull();
      expect(normalizarRedeFront('instagram', null)).toBeNull();
    });
  });

  describe('normalizarRedeFront — YouTube', () => {
    it('cobre os três formatos de canal', () => {
      expect(normalizarRedeFront('youtube', 'https://youtube.com/@canal')).toBe('@canal');
      expect(normalizarRedeFront('youtube', 'https://youtube.com/c/canal')).toBe('c/canal');
      expect(
        normalizarRedeFront('youtube', 'https://youtube.com/channel/UCabcdefghij123'),
      ).toBe('channel/UCabcdefghij123');
    });

    it('é idempotente — normalizar o resultado não muda nada', () => {
      for (const entrada of [
        'https://youtube.com/@canal',
        'https://youtube.com/c/canal',
        'https://youtube.com/channel/UCabcdefghij123',
      ]) {
        const primeira = normalizarRedeFront('youtube', entrada);
        expect(normalizarRedeFront('youtube', primeira)).toBe(primeira);
      }
    });

    it('recusa youtu.be, que é link de vídeo e não de canal', () => {
      expect(normalizarRedeFront('youtube', 'https://youtu.be/dQw4w9WgXcQ')).toBeNull();
    });
  });

  describe('normalizarRedeFront — recusas', () => {
    it('recusa esquema que executa script', () => {
      expect(normalizarRedeFront('instagram', 'javascript:alert(1)')).toBeNull();
      expect(normalizarRedeFront('instagram', 'data:text/html,x')).toBeNull();
    });

    // Caractere de controle é ignorado pelo navegador ao resolver o href, então
    // um NUL no meio de "javascript:" ainda executa. Montado por código para não
    // entrar literal no arquivo, onde seria invisível a quem lê o teste.
    it('recusa esquema escondido atrás de caractere de controle', () => {
      const NUL = String.fromCharCode(0);
      expect(normalizarRedeFront('instagram', `java${NUL}script:alert(1)`)).toBeNull();
      expect(urlDeWebsiteFront(`java${NUL}script:alert(1)`)).toBeNull();
    });

    it('recusa o truque do userinfo', () => {
      expect(
        normalizarRedeFront('instagram', 'https://instagram.com@evil.com/loja'),
      ).toBeNull();
      expect(
        normalizarRedeFront('instagram', 'https://evil.com@instagram.com/loja'),
      ).toBeNull();
    });

    it('recusa domínio de outra rede no campo errado', () => {
      expect(normalizarRedeFront('instagram', 'https://tiktok.com/@loja')).toBeNull();
      expect(normalizarRedeFront('tiktok', 'https://instagram.com/loja')).toBeNull();
    });

    it('recusa domínio de fora', () => {
      expect(normalizarRedeFront('instagram', 'https://evil.com/loja')).toBeNull();
      expect(
        normalizarRedeFront('instagram', 'https://instagram.com.evil.com/loja'),
      ).toBeNull();
    });
  });

  describe('urlDaRedeFront — a prévia que o vendedor vê', () => {
    it('monta a URL de cada rede', () => {
      expect(urlDaRedeFront('tiktok', '@lojanerd')).toBe(
        'https://www.tiktok.com/@lojanerd',
      );
      expect(urlDaRedeFront('instagram', '@lojanerd')).toBe(
        'https://www.instagram.com/lojanerd',
      );
      expect(urlDaRedeFront('youtube', '@canal')).toBe(
        'https://www.youtube.com/@canal',
      );
    });

    it('não monta prévia para valor que o backend recusaria', () => {
      expect(urlDaRedeFront('instagram', 'javascript:alert(1)')).toBeNull();
      expect(urlDaRedeFront('instagram', 'https://evil.com/x')).toBeNull();
    });
  });

  describe('urlDeWebsiteFront', () => {
    it('aceita qualquer domínio de verdade', () => {
      expect(urlDeWebsiteFront('lojanerd.com.br')).toBe('https://lojanerd.com.br/');
    });

    it('recusa o que não é endereço', () => {
      expect(urlDeWebsiteFront('javascript:alert(1)')).toBeNull();
      expect(urlDeWebsiteFront('meu site')).toBeNull();
      expect(urlDeWebsiteFront('http://localhost:3000')).toBeNull();
      expect(urlDeWebsiteFront('')).toBeNull();
    });
  });

  describe('temAlgumaRede — decide se a fileira existe', () => {
    it('sem redes, não há fileira', () => {
      expect(temAlgumaRede(null)).toBe(false);
      expect(temAlgumaRede(undefined)).toBe(false);
    });

    // Uma resposta velha em cache pode trazer o objeto com os quatro nulos. Sem
    // esta checagem a fileira desenharia um bloco vazio com margem.
    it('objeto com os quatro campos nulos também não gera fileira', () => {
      expect(
        temAlgumaRede({ tiktok: null, instagram: null, youtube: null, website: null }),
      ).toBe(false);
    });

    it('uma rede só já basta', () => {
      expect(
        temAlgumaRede({
          tiktok: null,
          instagram: 'https://www.instagram.com/loja',
          youtube: null,
          website: null,
        }),
      ).toBe(true);
    });
  });
});
