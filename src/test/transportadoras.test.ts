import { describe, it, expect } from 'vitest';
import {
  marcadasNaTela,
  alternarTransportadora,
  semCoberturaNacional,
  type TransportadoraDisponivel,
} from '@/lib/transportadoras';

// As seis que a Kolecta oferece hoje (MELHOR_ENVIO_SERVICOS=1,2,3,17,31,33).
const DISPONIVEIS: TransportadoraDisponivel[] = [
  { id: 1, carrier: 'Correios', service: 'PAC', nacional: true, aviso: null },
  { id: 2, carrier: 'Correios', service: 'SEDEX', nacional: true, aviso: null },
  { id: 3, carrier: 'Jadlog', service: '.Package', nacional: false, aviso: 'Postagem em agência.' },
  { id: 17, carrier: 'Correios', service: 'Mini Envios', nacional: false, aviso: 'Até 300 g.' },
  { id: 31, carrier: 'Loggi', service: 'Express', nacional: false, aviso: 'Regional.' },
  { id: 33, carrier: 'JeT', service: 'Standard', nacional: false, aviso: 'Regional.' },
];

describe('marcadasNaTela', () => {
  it('nada gravado mostra TODAS marcadas', () => {
    // Vazio significa "não escolheu", e a cotação usa todas. Mostrar tudo
    // desmarcado faria o vendedor achar que está sem frete nenhum.
    expect(marcadasNaTela([], DISPONIVEIS)).toEqual([1, 2, 3, 17, 31, 33]);
  });

  it('com escolha, mostra só o que ele escolheu', () => {
    expect(marcadasNaTela([1, 33], DISPONIVEIS)).toEqual([1, 33]);
  });
});

describe('alternarTransportadora', () => {
  it('desmarcar a primeira parte de tudo marcado, não de uma lista vazia', () => {
    // Sem isso o clique produziria outra lista vazia, que o sistema lê como
    // "todas": nada mudaria e o vendedor tentaria de novo achando que travou.
    expect(alternarTransportadora([], DISPONIVEIS, 31, false)).toEqual([1, 2, 3, 17, 33]);
  });

  it('marcar acrescenta sem duplicar', () => {
    expect(alternarTransportadora([1], DISPONIVEIS, 33, true)).toEqual([1, 33]);
    expect(alternarTransportadora([1, 33], DISPONIVEIS, 33, true)).toEqual([1, 33]);
  });

  it('desmarcar remove só a pedida', () => {
    expect(alternarTransportadora([1, 2, 33], DISPONIVEIS, 2, false)).toEqual([1, 33]);
  });
});

describe('semCoberturaNacional', () => {
  it('só regionais deixaria a loja invisível fora da região', () => {
    expect(semCoberturaNacional([31, 33], DISPONIVEIS)).toBe(true);
  });

  it('Mini Envios não salva: é nacional mas trava em 300 g', () => {
    expect(semCoberturaNacional([17, 31], DISPONIVEIS)).toBe(true);
  });

  it('PAC ou SEDEX resolvem', () => {
    expect(semCoberturaNacional([1, 31], DISPONIVEIS)).toBe(false);
    expect(semCoberturaNacional([2], DISPONIVEIS)).toBe(false);
  });

  it('nada marcado não é problema: vazio quer dizer todas', () => {
    expect(semCoberturaNacional([], DISPONIVEIS)).toBe(false);
  });
});
