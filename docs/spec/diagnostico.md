# Diagnóstico

Onde ele está fraco: o termômetro em Hoje e a lista de Piores cartas.

- **Entra aqui:** domínio, cobertura, memória de longo prazo, cartas guardadas, o termômetro, Piores
  cartas, cartas-problema, o histórico de evolução e a previsão por tópico.
- **Não entra aqui:** a sessão em si (`spec/estudo.md`) e o resto da tela Hoje
  (`spec/meta-e-ofensiva.md`).

## Cálculos

- **Domínio de uma carta:** a chance estimada de ele lembrar hoje (a *retrievability* do FSRS), em
  %. *(1)*
- **Domínio de um tópico:** a média do domínio das cartas já estudadas do tópico. Cai sozinho com o
  tempo se ele parar de revisar. Sem nenhuma carta estudada, mostra "—", nunca 0%. *(1)*
  Por quê: o termômetro não mente; um tópico abandonado esfria.
- **Cobertura:** X de Y cartas do tópico já vistas. Suspensas não contam. *(1)*
- **Carta-problema:** carta em que ele apertou Errei 6 vezes ou mais. *(1)*
- O domínio se move com qualquer resposta, inclusive de treino. *(1)*
- **Memória de longo prazo (a métrica principal):** % de acerto na primeira resposta das cartas que
  ele não via havia 7 dias ou mais, nos últimos 14 dias, só em sessões de Revisão. Só aparece com
  pelo menos 20 respostas na janela; antes disso, o lugar dela diz "Aparece na sua 2ª semana: é o
  que ficou na cabeça". *(1)*
  Por quê: o FSRS agenda cada carta para voltar perto de 90% de chance de lembrar, então ela fica
  perto de 90% quando ele revisa em dia e cai quando ele some. Mede constância, não esforço.
- **Cartas guardadas:** quantas cartas ele já acertou depois de 21 dias ou mais sem ver. Só cresce
  com o tempo e a constância: adiantar novas hoje só conta daqui a semanas. *(1)*
  Por quê: a memória de longo prazo tende a ficar estável; as guardadas mostram o progresso.
- A memória de longo prazo e as cartas guardadas ficam numa linha no topo de Hoje, como "Lembra 89%
  do que não via há 7+ dias · 312 cartas guardadas". *(1)*

## Termômetro

- Fica em Hoje, logo abaixo do botão Estudar: os tópicos do mais fraco ao mais forte, com domínio,
  cobertura e uma minilinha das últimas 4 semanas. *(1)*
- Uma vez por dia, desde o primeiro uso, o app grava o domínio de cada tópico, a memória de longo
  prazo e as cartas guardadas. *(1)*
  Por quê: sem isso, não há histórico para mostrar depois.
- Abaixo de 60% de domínio, o tópico aparece em destaque. *(1)*
- Ao voltar de uma sessão, as barras dos tópicos estudados animam do valor antigo para o novo. *(1)*
- No celular dele, o tópico mais fraco aparece sem rolar a tela. *(1)*
- Tocar num tópico abre Piores cartas filtrada por esse tópico. *(1)*
- Com mais de uma matéria, o termômetro ganha um nível acima, por matéria. *(3)*

## Piores cartas

- É uma aba da barra inferior e também abre pelo termômetro e pela tela Tópico (Piores deste
  tópico). É uma tela só. *(1)*
- A lista é agrupada por tópico, do mais fraco ao mais forte. Aberta a partir de um tópico, mostra
  só o grupo dele. *(1)*
- Em cada grupo, as cartas-problema aparecem marcadas no topo, com a sugestão de reescrever. Depois,
  as demais, do menor domínio para o maior. *(1)*
- Cada linha, densa e em letra menor, mostra a frente, o domínio, quantas vezes ele errou e quando
  a viu pela última vez. *(1)*
  Por quê: nas telas de diagnóstico ele prefere ver mais informação; o botão principal continua
  grande.
- Cada grupo tem o botão Estudar <tópico>. Ele também seleciona várias cartas e toca Estudar estas
  agora. As duas são sessões de treino. Também pode Editar ou Suspender cada carta. *(1)*
  Por quê: a Revisão é sempre da matéria inteira; estudar um tópico só é treino.

## Tópico

- A tela Tópico mostra domínio e cobertura, os atalhos Piores deste tópico e Véspera deste tópico,
  busca, os filtros Todas / Novas / Suspensas / Problema e a lista de cartas. *(1)*
- A tela Tópico ganha o gráfico completo do domínio ao longo do tempo, com as datas e notas das
  provas marcadas na linha, e o contador de cartas guardadas do tópico. *(2)*
- Abaixo do domínio, a tela Tópico mostra a previsão do FSRS: "Fazendo só as revisões do dia,
  Citologia fica acima de 80% nos próximos 7 dias." É a primeira da fase 2. *(2)*
  Por quê: precisa de alguns dias de dados dele para ter credibilidade.
