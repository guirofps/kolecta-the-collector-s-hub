import { describe, it, expect } from 'vitest';
import {
  TAG_PRE_VENDA,
  JANELA_MAXIMA_DIAS,
  temTagPreVenda,
  removerTagPreVenda,
  aplicarTagPreVenda,
  tituloComPreVenda,
  limiteTitulo,
  diasAte,
  validarDataPrevista,
  dataMaximaPreVenda,
  formatarDataPrevista,
  dadosPreVenda,
  ehPreVenda,
  dataPrevistaDe,
  avisoPreVenda,
} from '@/lib/pre-venda';

// Data fixa de referência, construída LOCAL: usar new Date('2026-08-04') faria
// o teste passar em UTC e falhar em UTC-3, que é onde o app roda.
const HOJE = new Date(2026, 7, 4); // 04/08/2026
const iso = (ano: number, mes: number, dia: number) =>
  `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

describe('tag no título', () => {
  it('põe a tag na frente', () => {
    expect(aplicarTagPreVenda('Nissan Skyline GT-R R34')).toBe(
      '[PRÉ-VENDA] Nissan Skyline GT-R R34',
    );
  });

  it('aplicar duas vezes dá o mesmo que aplicar uma', () => {
    const uma = aplicarTagPreVenda('Supra MK4');
    expect(aplicarTagPreVenda(uma)).toBe(uma);
  });

  it('não duplica quando o vendedor já escreveu à mão', () => {
    // Grafias que aparecem de verdade em anúncio de colecionável.
    const escritos = [
      'PRÉ-VENDA Supra MK4',
      'PRE VENDA Supra MK4',
      'pré venda - Supra MK4',
      '[PRE-VENDA] Supra MK4',
      '(Pré-Venda) Supra MK4',
      'PRÉ-VENDA: Supra MK4',
    ];
    for (const t of escritos) {
      expect(aplicarTagPreVenda(t)).toBe('[PRÉ-VENDA] Supra MK4');
    }
  });

  it('reconhece a tag em qualquer grafia', () => {
    expect(temTagPreVenda('[PRÉ-VENDA] Supra')).toBe(true);
    expect(temTagPreVenda('pre venda supra')).toBe(true);
    expect(temTagPreVenda('Supra MK4')).toBe(false);
    expect(temTagPreVenda(null)).toBe(false);
  });

  it('não confunde palavra parecida no meio do título', () => {
    expect(temTagPreVenda('Supra MK4 em pré-venda no Japão')).toBe(false);
    expect(temTagPreVenda('Lote para venda rápida')).toBe(false);
  });

  it('desligar a pré-venda tira a tag, sem sobrar resto', () => {
    expect(tituloComPreVenda('[PRÉ-VENDA] Supra MK4', false)).toBe('Supra MK4');
    expect(tituloComPreVenda('Supra MK4', true)).toBe('[PRÉ-VENDA] Supra MK4');
  });

  it('ligar e desligar volta ao título original', () => {
    const original = 'Mini GT Nissan Skyline GT-R (R34) 1:64';
    expect(tituloComPreVenda(tituloComPreVenda(original, true), false)).toBe(original);
  });

  it('título vazio não vira só a tag', () => {
    expect(aplicarTagPreVenda('')).toBe('');
    expect(aplicarTagPreVenda(null)).toBe('');
    expect(aplicarTagPreVenda('   ')).toBe('');
  });

  it('remover tag de título sem tag não estraga o texto', () => {
    expect(removerTagPreVenda('Supra MK4')).toBe('Supra MK4');
  });
});

describe('limite do título', () => {
  it('desconta a tag para o publicado não estourar 80', () => {
    const limite = limiteTitulo(80, true);
    expect(limite).toBe(80 - (TAG_PRE_VENDA.length + 1));
    expect(aplicarTagPreVenda('x'.repeat(limite)).length).toBeLessThanOrEqual(80);
  });

  it('sem pré-venda o limite é o cheio', () => {
    expect(limiteTitulo(80, false)).toBe(80);
  });
});

describe('data prevista', () => {
  it('conta os dias que faltam', () => {
    expect(diasAte(iso(2026, 8, 4), HOJE)).toBe(0);
    expect(diasAte(iso(2026, 8, 5), HOJE)).toBe(1);
    expect(diasAte(iso(2026, 8, 3), HOJE)).toBe(-1);
  });

  it('não erra o dia por fuso', () => {
    // O bug clássico: new Date('2026-12-15') é meia-noite UTC, que em UTC-3 é
    // 21h do dia 14. A data escolhida tem que continuar sendo a mesma.
    expect(formatarDataPrevista(iso(2026, 12, 15))).toBe('15/12/2026');
    expect(formatarDataPrevista(iso(2026, 1, 1))).toBe('01/01/2026');
  });

  it('a hora de "hoje" não muda a contagem', () => {
    const cedo = new Date(2026, 7, 4, 0, 5);
    const tarde = new Date(2026, 7, 4, 23, 55);
    expect(diasAte(iso(2026, 8, 10), cedo)).toBe(diasAte(iso(2026, 8, 10), tarde));
  });

  it('aceita prazo dentro da janela', () => {
    expect(validarDataPrevista(iso(2026, 10, 1), HOJE)).toBeNull();
  });

  it('aceita a data de hoje: quem recebeu de manhã e despacha à tarde', () => {
    expect(validarDataPrevista(iso(2026, 8, 4), HOJE)).toBeNull();
  });

  it('recusa data no passado', () => {
    expect(validarDataPrevista(iso(2026, 8, 3), HOJE)?.mensagem).toMatch(/passado/i);
  });

  it('recusa prazo além da janela de 90 dias', () => {
    const dentro = new Date(HOJE.getTime() + JANELA_MAXIMA_DIAS * 24 * 3600 * 1000);
    const fora = new Date(HOJE.getTime() + (JANELA_MAXIMA_DIAS + 1) * 24 * 3600 * 1000);
    const fmt = (d: Date) => iso(d.getFullYear(), d.getMonth() + 1, d.getDate());

    expect(validarDataPrevista(fmt(dentro), HOJE)).toBeNull();
    expect(validarDataPrevista(fmt(fora), HOJE)?.mensagem).toMatch(/90 dias/);
  });

  it('recusa data vazia: sem prazo escrito não existe prazo a cumprir', () => {
    expect(validarDataPrevista('', HOJE)?.mensagem).toMatch(/informe/i);
    expect(validarDataPrevista(null, HOJE)).not.toBeNull();
  });

  it('recusa data que não existe no calendário', () => {
    // 2026 não é bissexto, e fevereiro nunca teve 31.
    expect(validarDataPrevista('2026-02-30', HOJE)?.mensagem).toMatch(/inválida/i);
    expect(validarDataPrevista('2026-13-01', HOJE)?.mensagem).toMatch(/inválida/i);
    expect(validarDataPrevista('15/12/2026', HOJE)?.mensagem).toMatch(/inválida/i);
  });

  it('a data máxima oferecida é aceita pela própria validação', () => {
    const max = dataMaximaPreVenda(HOJE);
    expect(validarDataPrevista(max, HOJE)).toBeNull();
    expect(diasAte(max, HOJE)).toBe(JANELA_MAXIMA_DIAS);
  });

  it('data inválida formata vazio, nunca "Invalid Date"', () => {
    expect(formatarDataPrevista('nada')).toBe('');
    expect(formatarDataPrevista(null)).toBe('');
  });
});

describe('leitura do anúncio salvo', () => {
  it('grava a marcação e a data', () => {
    expect(dadosPreVenda(iso(2026, 12, 15))).toEqual({
      preVenda: true,
      preVendaDataPrevista: '2026-12-15',
    });
  });

  it('anúncio comum não é pré-venda', () => {
    expect(ehPreVenda({})).toBe(false);
    expect(ehPreVenda(null)).toBe(false);
    expect(avisoPreVenda({ brand: 'Mini GT' }, HOJE)).toBeNull();
  });

  it('aceita o booleano vindo como texto do JSON', () => {
    expect(ehPreVenda({ preVenda: 'true' })).toBe(true);
  });

  it('pré-venda sem data utilizável não inventa aviso', () => {
    expect(dataPrevistaDe({ preVenda: true })).toBeNull();
    expect(dataPrevistaDe({ preVenda: true, preVendaDataPrevista: 'qualquer' })).toBeNull();
    expect(avisoPreVenda({ preVenda: true }, HOJE)).toBeNull();
  });

  it('monta o aviso da vitrine', () => {
    const a = avisoPreVenda({ preVenda: true, preVendaDataPrevista: iso(2026, 10, 1) }, HOJE);
    expect(a?.dataFormatada).toBe('01/10/2026');
    expect(a?.dias).toBe(58);
    expect(a?.atrasado).toBe(false);
  });

  it('prazo estourado aparece como atraso em vez de sumir', () => {
    // É justamente o que o comprador precisa ver ANTES de comprar.
    const a = avisoPreVenda({ preVenda: true, preVendaDataPrevista: iso(2026, 7, 20) }, HOJE);
    expect(a?.atrasado).toBe(true);
    expect(a?.dias).toBeLessThan(0);
  });

  it('a data de hoje ainda não é atraso', () => {
    const a = avisoPreVenda({ preVenda: true, preVendaDataPrevista: iso(2026, 8, 4) }, HOJE);
    expect(a?.atrasado).toBe(false);
  });
});
