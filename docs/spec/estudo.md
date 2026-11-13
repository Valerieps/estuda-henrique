# Estudo

A sessão de estudo de todo dia: que cartas entram, em que ordem, e como ele responde.

- **Entra aqui:** a sessão de Revisão, o agendamento FSRS, os três botões, desfazer, a barra de
  progresso, Só 5 cartas, o Resumo e Refazer erros.
- **Não entra aqui:** a Véspera (`spec/vespera.md`), o termômetro e Piores cartas
  (`spec/diagnostico.md`), a meta e a ofensiva (`spec/meta-e-ofensiva.md`).

## Em aberto

- [ ] Quanto tempo por dia ele estuda, e em que momento? Isso pode mudar o limite padrão de 10
  cartas novas por dia.

## Começar

- Em Hoje, Estudar começa a sessão em um toque. Ao lado, Só 5 cartas começa uma sessão de 5. *(1)*
  Por quê: a preguiça vem antes de começar; um começo minúsculo vence ela.
- A sessão abre em tela cheia, sem as barras do app. Ele sai pelo X no topo, que pergunta: Sair
  agora (as respostas ficam salvas e vai para o Resumo parcial) ou Continuar. *(1)*
- A Revisão é sempre da matéria inteira, não de um tópico. *(1)*

## Que cartas entram

- Primeiro as cartas em aprendizado, depois as revisões vencidas hoje e, por último, as novas, até o
  limite diário (padrão: 10). *(1)*
- O agendamento usa o FSRS, com os parâmetros padrão e retenção desejada de 90%. *(1)*
- Cartas suspensas nunca entram. *(1)*
- O dia vira à meia-noite no horário de Brasília (`America/Sao_Paulo`). *(1)*

## Responder

- A frente mostra a barra de progresso (quantas cartas faltam), o tópico e a pergunta. Ele vira a
  carta tocando nela ou em Mostrar resposta. Não há gestos de deslizar. *(1)*
- A carta vira em 3D, em cerca de 200 ms. O verso mostra frente, verso e macete, e embaixo, na zona
  do polegar, os três botões. *(1)*
- Virar a carta e registrar a resposta levam menos de 150 ms. *(1)*

| Botão | Nota no FSRS | Conta como acerto? | O que acontece |
| --- | --- | --- | --- |
| Errei | Again | Não | Volta na mesma sessão (passos de 1 min e 10 min) |
| Acertei com esforço | Hard | Sim | Intervalo curto, definido pelo FSRS |
| Acertei | Good | Sim | Sai da sessão; volta no intervalo do FSRS |

- Não existe botão "Fácil". *(1)*
  Por quê: ele costuma ser usado quando a resposta só estava certa, e isso infla os intervalos.
- Cada botão dá uma vibração curta. Errei desliza a carta para trás com "volta já já", sem vermelho
  e sem som. O verso não comemora Acertei nem pune Errei. *(1)*
- No topo do verso: Desfazer (desfaz a última resposta da sessão) e um menu com Editar carta e
  Suspender. Editar salva e volta para o mesmo verso; Suspender passa para a próxima carta. *(1)*
- Uma carta que passa de 21 dias de intervalo vira dominada, com uma animação no verso. *(2)*

## Resumo

- Toda sessão termina no Resumo: % de acerto, contagem por botão, tempo e quantas novas ele viu. *(1)*
- O acerto conta só a primeira resposta de cada carta na sessão: (Acertei + Acertei com esforço) ÷
  total. As repetições de uma carta errada não inflam o número. *(1)*
- Abaixo de 80% de acerto, Refazer erros aparece em destaque: uma sessão de treino só com as cartas
  em que ele apertou Errei ou Acertei com esforço. *(1)*
- Enquanto houver cartas para hoje, o Resumo oferece Mais 5?. Ao zerar o dia, mostra confete e
  "Pronto por hoje" no lugar. Não existe sessão infinita. *(1)*
- Se ele saiu no meio, o Resumo é parcial, com as respostas já dadas. *(1)*
- Do Resumo, ele volta para a tela de onde saiu. *(1)*
- O Resumo destaca momentos de virada (uma carta que ele errava e agora acerta). *(2)*

## Treino

- Véspera, Refazer erros e Estudar estas agora são treino: as mesmas telas, com o cabeçalho
  "Treino: não entra no seu histórico de acerto". *(1)*
- As respostas do treino atualizam o agendamento das cartas (e por isso o domínio), mas o % de
  acerto não entra no histórico. *(1)*
