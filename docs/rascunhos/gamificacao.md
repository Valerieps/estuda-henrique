# Interface gamificada (direção Missões)

Brief de implementação do redesenho de todas as telas, na direção B ("Missões") escolhida pela
dona em 14/11/2026. Uma sessão orquestradora (Sonnet) lê este arquivo e abre as sessões abaixo, na
ordem das ondas.

- **Entra aqui:** o objetivo visual, as decisões já tomadas, as sessões (prompt, modelo, arquivos)
  e a ordem.
- **Não entra aqui:** as regras de produto (cada sessão as escreve em `docs/spec/`) e os valores
  visuais (`src/ui/theme/tokens.css`). Quando a última onda termina, este arquivo é apagado.

## Objetivo

O app parece amador porque tudo tem o mesmo peso: uma coluna de cartões brancos iguais, barras
cinzas iguais, um só roxo e nenhuma reação ao progresso. A direção Missões resolve isso sem XP nem
ranking (ele estuda sozinho e ninguém vê os dados dele):

- **Um herói por tela.** Em Hoje, o cartão Missões de hoje (meta do dia em duas barras com número e
  a ofensiva) com Estudar logo abaixo. Os números de longo prazo descem e somem enquanto não há
  dados.
- **Ritmo, não coluna única.** Herói em largura total, depois blocos em grade de 2 colunas (tópicos,
  números) e chips em linha. Cada tela alterna pelo menos dois desses formatos.
- **Cor por estado, igual em todas as telas.** Novo, fraco (< 60%), em andamento, dominado (≥ 90%):
  cada um com cor e ícone próprios. Nunca uma cor por tópico.
- **Retorno a cada passo.** Barra com número ("3 de 20"), vibração e pulso ao responder, confete e
  chama acendendo ao zerar o dia.
- **Botões com profundidade.** O primário ganha a base mais escura embaixo (o "botão de jogo") e
  afunda ao tocar.

## Decisões tomadas (a dona pode revisar)

1. Missões é só a apresentação da meta do dia: "Zerar as revisões" e "Ver N novas", cada uma com
   barra e número. Sem XP, pontos, ligas ou conquistas. Por quê: o spec premia constância, e
   premiar volume gera avalanche de revisões.
2. O termômetro vira grade de 2 colunas, mantendo a ordem do mais fraco ao mais forte e o toque que
   abre Piores. O tópico mais fraco continua visível sem rolar.
3. Os tópicos não ganham ícone próprio (exigiria campo novo e escolha manual). O ícone é o do estado.
4. O + continua no meio da barra inferior (regra de `spec/cartas.md`), mas com menos destaque: ele
   deixa de ser o elemento mais forte da tela.
5. Ao responder: Acertei e Acertei com esforço dão um pulso na cor de sucesso; Errei continua sem
   vermelho, deslizando a carta com "volta já já" (`spec/estudo.md`).
6. A fonte de títulos e números continua Space Grotesk; o roxo continua a marca. A mudança é de
   hierarquia, ritmo e estados, não de identidade.

## Ondas

| Onda | Sessão | Modelo | Depende de | Pode rodar junto com |
| --- | --- | --- | --- | --- |
| 1 | S1 Fundação visual | Opus | — | S2 |
| 1 | S2 Progresso do dia na API | Sonnet | — | S1 |
| 2 | S3 Hoje | Opus | S1, S2 | S4, S5, S6, S7, S8 |
| 2 | S4 Sessão de estudo | Sonnet | S1 | S3, S5, S6, S7, S8 |
| 2 | S5 Resumo e confete | Sonnet | S1 | S3, S4, S6, S7, S8 |
| 2 | S6 Prova | Sonnet | S1 | S3, S4, S5, S7, S8 |
| 2 | S7 Matérias, Tópico e Piores | Sonnet | S1 | S3, S4, S5, S6, S8 |
| 2 | S8 Moldura, Ajustes, Entrar e admin | Sonnet | S1 | S3, S4, S5, S6, S7 |
| 3 | S9 Revisão final | Opus | todas | — |

Na onda 2, cada sessão é dona dos seus arquivos (lista em cada prompt) e nunca edita os das outras.
Os arquivos compartilhados são só `src/domain/strings.ts` (cada sessão edita só o seu bloco) e
`docs/`. A S1 tira o CSS de cada tela do `global.css` para um arquivo por tela, justamente para que
a onda 2 não dispute o mesmo arquivo.

## Regras para toda sessão

Valem para todos os prompts abaixo; a orquestradora cola este bloco no início de cada um.

```text
Projeto: Estuda Henrique (C:\Users\valer\Documents\GitHub\estuda-henrique). Leia o CLAUDE.md e o
docs/rascunhos/gamificacao.md (seções Objetivo e Decisões) antes de começar. Siga as regras de
docs/UI.md e docs/SEGURANCA.md. Nenhum literal de cor, tamanho ou duração fora de
src/ui/theme/tokens.css; use os componentes de src/ui/components/. Textos em
src/domain/strings.ts, em português, com os termos de docs/GLOSSARIO.md. Edite só os arquivos
listados como seus; se precisar de outro, pare e diga qual e por quê. Lógica nova ganha teste.
Mudança de regra de produto vai para docs/spec/ na mesma PR; quando fizer algo do ROADMAP, tire a
linha. Verifique com npm test e npm run build. Termine com
npm run ship -- "<mensagem em inglês>". Se o ship acusar conflito com a main, faça merge da main,
resolva mantendo as duas mudanças, rode os testes e rode o ship de novo. Não abra o navegador.
```

## S1 Fundação visual (Opus, onda 1)

```text
Tarefa: criar a base visual da direção Missões, sem mudar o que nenhuma tela faz.

1. CSS por tela: mova as regras de cada tela de src/ui/theme/global.css para
   src/ui/screens/<Tela>.css (e src/ui/Shell.css, src/ui/CreateSheet.css, src/ui/card-list.css),
   importadas pelo próprio componente. O global.css fica só com reset, base, layout comum e os
   componentes compartilhados. Nada muda na tela: é uma mudança de lugar.
2. Tokens em tokens.css, nos dois temas: cores de estado (--color-state-new, -weak, -progress,
   -mastered, cada uma com fundo suave e texto), --color-brand-deep (a base do botão de jogo),
   sombra/realce do botão, durações de pulso e de comemoração. Coloque os novos pares de texto na
   lista de contraste de tokens.test.ts.
3. Componentes novos em src/ui/components/, com testes: ProgressBar (barra sempre com rótulo
   "3 de 20" e aria-valuenow), Tile (bloco de grade com ícone, título, linha de apoio e tom de
   estado), Chip (rótulo curto com ícone, opcionalmente tocável), StateBadge (novo/fraco/em
   andamento/dominado, com cor e ícone), Hero (cartão de destaque da tela). Uma função de domínio
   pura topicState(mastery, seen) em src/domain/ decide o estado, com testes.
4. Button primário com profundidade: base em --color-brand-deep e afundar ao tocar, respeitando
   prefers-reduced-motion. Botão desabilitado aceita um motivo (disabledReason) mostrado em texto.
5. Ícones novos que as telas vão precisar em Icon.tsx (chama, coroa, alerta, brilho, check,
   alvo), no mesmo traço dos atuais.
6. docs/UI.md, seção "O que a revisão confere": acrescente as regras "barra de progresso sempre
   com número", "botão desabilitado diz por quê", "estado de progresso usa StateBadge e as cores
   de estado" e "cada tela alterna largura total, grade e chips; nunca só uma coluna de cartões
   iguais". Se alguma puder ser checada em teste, adicione o teste.

Seus arquivos: src/ui/theme/*, src/ui/components/*, src/ui/**/*.css, o import de CSS no topo de
cada tela (só essa linha), src/domain/topic-state.ts (+ teste), docs/UI.md.
Pronto quando: o build passa, nenhuma tela mudou de comportamento, e os componentes novos têm
teste.
```

## S2 Progresso do dia na API (Sonnet, onda 1)

```text
Tarefa: a tela Hoje vai mostrar a meta do dia como barras "feito de total". Hoje o TodayView só
diz o que falta (reviewsLeft, newLeft).

1. Em src/application/api-contract.ts, acrescente a TodayView: reviewsDone e newDone (quantas
   revisões e novas ele já fez hoje, no dia de America/Sao_Paulo). Total = feito + falta.
2. Calcule no use case de Hoje em server/application/ (siga "Adding a feature" do CLAUDE.md),
   contando a primeira resposta de cada carta no dia: revisão se a carta já tinha sido vista antes
   de hoje, nova se não. Treino (Véspera, Refazer erros, Estudar estas) não conta para a meta.
   Sem migração se os dados já existem; se faltar coluna, use a próxima entrada de MIGRATIONS.
3. Testes em node:sqlite: dia vazio, só revisões, novas, treino não conta, virada à meia-noite de
   Brasília.
4. Escreva a regra em docs/spec/meta-e-ofensiva.md, seção Meta diária: "Hoje mostra quanto da meta
   já foi feito, em revisões e novas".

Seus arquivos: src/application/api-contract.ts, server/application/*, src/domain/ (só se a regra
for de domínio), docs/spec/meta-e-ofensiva.md (só a seção Meta diária).
Não toque em src/ui/.
Pronto quando: os testes novos passam e o build passa.
```

## S3 Hoje (Opus, onda 2)

```text
Tarefa: redesenhar a tela Hoje na direção Missões. Leia docs/spec/meta-e-ofensiva.md e a seção
Termômetro de docs/spec/diagnostico.md.

De cima para baixo:
1. Rotina numa linha (como hoje).
2. Hero "Missões de hoje": a chama com os dias da ofensiva (tocar abre a folha Ofensiva) e duas
   linhas de missão com ProgressBar: "Zerar as revisões" (reviewsDone de reviewsDone+reviewsLeft)
   e "Ver N novas" (newDone de newDone+newLeft). Missão cumprida ganha check e cor de sucesso. Dia
   de folga: o hero diz "Hoje é folga" e mantém Estudar se houver cartas.
3. Estudar (primário, largura total, botão de jogo) e, abaixo, Chips: Só 5 cartas, Piores.
4. O cartão de aviso, como hoje.
5. Termômetro em grade de 2 colunas de Tile, do mais fraco ao mais forte: nome, StateBadge,
   domínio em % ou "novo", cobertura "3 de 11". Tocar abre Piores filtrada. As barras animam do
   valor antigo para o novo (a lógica lastShown que já existe).
6. Memória de longo prazo e cartas guardadas: dois Tile lado a lado, no fim; enquanto não há dado
   (rate null e 0 guardadas), não aparecem, e uma linha diz quando vão aparecer.
Pronto por hoje: o hero vira "Missões cumpridas", com confete (o mesmo componente da S5; se ela
ainda não fez merge, use um efeito simples e deixe uma nota para a S9) e a chama acesa; depois
Adiantar mais 10 novas e Piores cartas, como o spec manda.
Atualize a ordem de Hoje em docs/spec/meta-e-ofensiva.md e a forma do termômetro em
docs/spec/diagnostico.md. Tire do ROADMAP a parte "em Hoje" da linha do confete.

Seus arquivos: src/ui/screens/Today.tsx, src/ui/screens/Today.css, src/ui/Streak.tsx, os blocos
today, thermometer, streak e notice de strings.ts, as seções citadas do spec.
```

## S4 Sessão de estudo (Sonnet, onda 2)

```text
Tarefa: deixar a sessão de estudo (src/ui/screens/Study.tsx) com cara de jogo, seguindo
docs/spec/estudo.md, seções Responder e Treino.

1. Topo: X menor (botão de ícone com aria-label) e ProgressBar com o número "3 de 20".
2. Carta: o cartão encolhe até o conteúdo (sem o branco vazio em cima). No verso, a pergunta fica
   em cima, um divisor, e a resposta em tamanho igual ou menor que a pergunta; o macete abaixo.
3. Desfazer só aparece quando há o que desfazer.
4. Os três botões de resposta têm a mesma altura, como botões de jogo, com "volta em ..." embaixo.
   Rótulos continuam os do glossário.
5. Retorno: Acertei e Acertei com esforço dão um pulso na cor de sucesso; Errei desliza a carta
   com "volta já já", sem vermelho; os três vibram (spec). Respeite prefers-reduced-motion e o
   limite de 150 ms do spec.
6. Treino mantém o cabeçalho de treino, no novo estilo.

Seus arquivos: src/ui/screens/Study.tsx, src/ui/screens/Study.css, o bloco study de strings.ts.
```

## S5 Resumo e confete (Sonnet, onda 2)

```text
Tarefa: o Resumo (src/ui/screens/StudySummary.tsx) vira a tela de comemoração, seguindo a seção
Resumo de docs/spec/estudo.md.

1. Topo: título grande e a chama acendendo quando a sessão conta para a ofensiva.
2. Números em grade de 2 colunas de Tile: acerto da sessão, cartas, tempo, lembradas depois de
   dias sem ver.
3. Tópicos estudados com ProgressBar animando de antes para depois.
4. Erros e Refazer erros como hoje (Refazer em destaque abaixo de 80%), Mais 5? como chip.
5. Confete ao zerar o dia: um componente src/ui/components/Confetti.tsx, só CSS e DOM (sem
   dependência nova), desligado com prefers-reduced-motion, com teste. A S3 vai usar o mesmo.
Tire do ROADMAP a parte do Resumo da linha do confete.

Seus arquivos: src/ui/screens/StudySummary.tsx, src/ui/screens/StudySummary.css,
src/ui/components/Confetti.tsx (+ teste), o bloco summary de strings.ts.
```

## S6 Prova (Sonnet, onda 2)

```text
Tarefa: redesenhar a aba Prova (src/ui/screens/Exam.tsx), seguindo docs/spec/vespera.md.

1. Os tópicos viram Tile selecionáveis em grade de 2 colunas (o check e a borda marcam o
   selecionado, não só a cor), com StateBadge, domínio e "vistas · novas".
2. Um resumo fixo embaixo mostra o total selecionado (vistas e novas) e Começar Véspera. A lista
   tem espaço no fim para nunca ficar por baixo do botão.
3. Sem tópico marcado, o botão diz por quê (disabledReason: "Marque ao menos um tópico").
4. A escolha "todas" ou "as 30 de menor domínio" vira dois Chip.

Seus arquivos: src/ui/screens/Exam.tsx, src/ui/screens/Exam.css, src/ui/exam-launch.ts, o bloco
exam de strings.ts.
```

## S7 Matérias, Tópico e Piores (Sonnet, onda 2)

```text
Tarefa: trazer Matérias, Tópico e Piores cartas para a direção Missões, seguindo
docs/spec/diagnostico.md e docs/spec/cartas.md.

1. Matérias (Subjects.tsx): tópicos em grade de Tile com StateBadge e cobertura.
2. Tópico (Topic.tsx): Hero com domínio e cobertura (ProgressBar com número); atalhos Piores
   deste tópico e Véspera deste tópico como Chip; filtros como Chip.
3. Piores (Worst.tsx e card-list.tsx): cabeçalho de cada grupo com StateBadge e Estudar <tópico>;
   cartas-problema marcadas com ícone e texto, não só cor; linhas densas como o spec pede.
4. Estados vazio, carregando e erro em todas, com o vazio dizendo o que fazer.

Seus arquivos: Subjects.tsx, Topic.tsx, Worst.tsx, src/ui/card-list.tsx e os .css deles, os
blocos subjects, topic e worst de strings.ts.
```

## S8 Moldura, Ajustes, Entrar e admin (Sonnet, onda 2)

```text
Tarefa: a moldura do app e as telas restantes na direção Missões.

1. Barra superior: a marca menor e a chama como Chip (o componente Flame continua em Streak.tsx,
   que é da S3: só posicione).
2. Barra inferior: o + continua no meio (spec/cartas.md) com menos peso que hoje (contorno ou
   tamanho igual às abas); aba ativa marcada por forma e peso, não só cor.
3. Folha Criar (CreateSheet.tsx) e Ajustes (Settings.tsx): grupos em cartões, limite de novas com
   o aviso de uma linha, sem mudar regras.
4. Entrar (SignIn.tsx): uma tela de boas-vindas com a marca e o botão do Google, sem prometer o
   que o app não faz.
5. Admin (Members.tsx, Invites.tsx e a tela de cartas do sistema): mesmos componentes, sem
   gamificação (ela não estuda).

Seus arquivos: src/ui/Shell.tsx, src/ui/CreateSheet.tsx, Settings.tsx, SignIn.tsx, Members.tsx,
Invites.tsx e os .css deles, os blocos nav, create, card, paste, settings, signIn, members e
invites de strings.ts.
```

## S9 Revisão final (Opus, onda 3)

```text
Tarefa: revisar o app inteiro depois do redesenho e fechar o trabalho.

1. Rode a skill ui-review em todas as telas. Corrija o que for pequeno; para o resto, abra issues
   (t:debito-tecnico, com p: e s:).
2. Confira a consistência entre as telas: mesmas cores de estado, mesmos Tile/Chip/Hero, nenhum
   CSS que repete um componente.
3. Se a S3 deixou nota sobre o confete, troque pelo Confetti da S5.
4. Confira que docs/spec/, docs/UI.md e docs/ROADMAP.md descrevem o que foi feito; registre as
   decisões deste brief que viraram regra em "Revisar as lacunas que o agente decidiu".
5. Apague docs/rascunhos/gamificacao.md e a linha dele em docs/rascunhos/README.md.
6. npm run docs:check, npm run build, ship.
```

## Sessão orquestradora (Sonnet)

```text
Você orquestra o redesenho gamificado do Estuda Henrique
(C:\Users\valer\Documents\GitHub\estuda-henrique). O plano está em docs/rascunhos/gamificacao.md
(na main). Você não escreve código: abre sessões, acompanha e confere.

1. Leia o arquivo inteiro. Para cada sessão, o prompt é o bloco "Regras para toda sessão" seguido
   do bloco da sessão. Abra cada uma com start_session (initiation "user_asked", context "fresh",
   use_worktree true, com o modelo indicado na tabela Ondas).
2. Onda 1: abra S1 e S2 juntas. Espere as duas terminarem e confira que cada PR foi mergeado
   (npm run branches, ou o link da PR na nota da sessão). Uma PR que não mergeou: mande a sessão
   resolver (SendMessage), não resolva você.
3. Onda 2: só depois do merge da S1 e da S2, abra S3 a S8 juntas. Quando uma termina, confira o
   merge. Se uma sessão pedir um arquivo de outra, responda que espere a dona daquele arquivo e
   anote; não deixe duas sessões editarem o mesmo arquivo.
4. Onda 3: depois de todas mergeadas, abra a S9.
5. Ao fim, rode npm run branches e diga à dona, em poucas linhas: o que mergeou (com os links das
   PRs), o que ficou em issue e as decisões que ela deve revisar.
Se uma sessão falhar duas vezes no mesmo ponto, pare e pergunte à dona.
```
