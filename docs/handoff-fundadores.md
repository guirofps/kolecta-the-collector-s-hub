# Handoff: Programa Membro Fundador (backend)

Frente de frontend do pré-lançamento já está na `main` (commit da landing de Fundador). Este documento lista o que falta de backend/lógica para as travas funcionarem até o lançamento (25/07/2026, 12:00 BRT).

## Contexto: o que já está pronto no frontend

- **Landing** (`src/pages/LaunchCountdown.tsx`), renderizada em `/` quando o gate está ativo (`Index.tsx` usa `useLaunchGate`). Comunica a oferta de Fundador.
- **Gate de pré-lançamento** (`src/components/LaunchGate.tsx`): allowlist fail-closed. Já libera `/painel` para o fundador criar anúncio antes do lançamento. Vira sozinho na `VITE_LAUNCH_DATE`.
- **Selo** (`src/components/FounderBadge.tsx`): `<FounderMedal number={n} />` e `<FounderBadge number={n} />`. SVG dinâmico, formata 0 como `#000`. Basta o backend fornecer o número do usuário e onde renderizar (perfil, card de anúncio).
- **Taxa** (`src/lib/fees.ts`): taxa única de 11% (`COMMISSION_RATE`). A taxa de fundador (9%) NÃO está aplicada em lógica de cobrança nenhuma ainda (só existe como copy na landing).

## Regras do programa (números fechados)

- **100 vagas** públicas de fundador. Numeração: **#001 a #050 = evento presencial** (via código de convite), **#051 a #100 = landing**. **#000 = Artminis**. Total 101.
- **Fundador é benefício de LOJISTA.** Requisito para virar fundador: ter **5 anúncios enviados** antes do lançamento.
- **Grátis.** Sem cobrança/assinatura nesta fase.
- **Benefícios:**
  - Selo numerado, **permanente** (nunca se perde).
  - **Taxa de 9%** (em vez de 11%) durante os **6 primeiros meses** de plataforma, a contar do lançamento. Depois volta para 11%.
  - **5 créditos de destaque** (1 crédito = 1 anúncio em destaque por 7 dias). Expiram em 6 meses.
  - Vitrine em destaque no dia do lançamento.
- **Manutenção:** o fundador precisa manter **anúncio ativo**. Prazo de **15 dias**: 15 dias sem nenhum anúncio ativo faz **perder taxa de 9% e créditos** (o **selo é mantido**). Mantendo anúncio ativo, o benefício corre pelos 6 meses.

## Tarefas de backend

### 1. Modelo de dados do fundador  (prioridade alta)
Estender o perfil do usuário com:
- `founderNumber: int | null` (0 a 100)
- `founderStatus: 'none' | 'pending' | 'active' | 'lapsed'`
  - `pending`: cadastrou mas ainda não tem 5 anúncios enviados
  - `active`: virou fundador (>= 5 anúncios)
  - `lapsed`: perdeu taxa/créditos por inatividade (mas mantém `founderNumber` e o selo)
- `founderSince: datetime` (quando atingiu `active`; base para os 6 meses e para a taxa de 9%)

### 2. Qualificação (5 anúncios) e atribuição de número  (alta)
- Quando o usuário atinge **5 anúncios enviados** (status `em_analise` ou aprovado), promover `pending -> active`, gravar `founderSince` e **atribuir o próximo `founderNumber`** livre da faixa da landing (#051+).
- **Travar em 100** vagas preenchidas. Ao esgotar, novos cadastros não viram fundador (definir com o time: fila de espera ou simplesmente "vagas encerradas").
- Concorrência: a atribuição de número precisa ser atômica (evitar dois usuários pegando o mesmo número).

### 3. Códigos de convite do evento (#001 a #050)  (média)
- Gerar 50 códigos de convite. Resgatar um código atribui um número reservado da faixa 1 a 50.
- Reservar essa faixa para os códigos (a atribuição da landing só usa 51+).

### 4. Taxa de 9% por 6 meses  (média)
- Enquanto `founderStatus == 'active'` e `now < founderSince + 6 meses` e o benefício não estiver `lapsed`: comissão = 9%. Senão: 11% (`COMMISSION_RATE` do front).
- Reaproveitar a "regra de comissão especial por grupo/vendedor" que já existe em `admin/CommissionsAndFees.tsx`.
- O frontend do wizard e da página de taxas mostra 11% como padrão; a taxa efetiva do fundador é resolvida no fechamento do pedido (backend).

### 5. Carteira de créditos de destaque  (alta, maior esforço)
- Ao virar `active`, creditar **5 créditos** com validade de 6 meses.
- Consumir 1 crédito = colocar 1 anúncio em destaque por 7 dias (integrar com o sistema de destaque Bronze/Prata/Ouro que já existe em `admin/Media.tsx`).
- Créditos não usados expiram em 6 meses; não acumulam, não são transferíveis.
- Sugestão: **teto de destaques simultâneos** na plataforma, para o destaque não virar o padrão num catálogo novo.

### 6. Manutenção por atividade (regra dos 15 dias)  (média)
- Job diário: para cada fundador `active`, se ficou **15 dias sem nenhum anúncio ativo**, marcar `active -> lapsed` (perde taxa de 9% e congela/zera créditos; mantém `founderNumber` e selo).
- Se o fundador `lapsed` voltar a ter anúncio ativo dentro da janela dos 6 meses: definir com o time se reativa o benefício (recomendado: reativa a taxa; créditos já expirados não voltam).

### 7. Exibir o selo  (baixa, componente pronto)
- Renderizar `<FounderBadge number={user.founderNumber} />` no card do anúncio e no nome do vendedor; `<FounderMedal>` no perfil. Só quando `founderNumber != null`.

## Decisões ainda em aberto (produto)
- Ao esgotar as 100 vagas: fila de espera ou encerrar?
- Fundador `lapsed` que volta a ter anúncio ativo: reativa a taxa de 9%?
