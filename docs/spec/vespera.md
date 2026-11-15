# Véspera

O estudo intensivo perto da prova, na aba Prova.

- **Entra aqui:** montar e fazer uma sessão de Véspera, e as datas de prova.
- **Não entra aqui:** a sessão de todo dia (`spec/estudo.md`).

## Em aberto

- [ ] Quem cadastra as datas de prova: eu (admin) ou ele? Proposta: ele, porque a nota é dado de estudo dele e eu não vejo (ADR-009).
- [ ] A nota da prova é em que escala? Proposta: livre, de 0 a 10 com uma casa decimal; o PAS dá nota em outra escala, então o campo aceita também "sem nota".
- [ ] "Nos dias anteriores" são quantos dias, e o que é priorizar? Proposta: nos 14 dias antes da prova, as cartas vencidas dos tópicos dela vêm primeiro na Revisão, e as novas do dia saem primeiro desses tópicos.

## A prova

- A prova-alvo dele é o PAS (Programa de Avaliação Seriada). A Véspera é feita para os dias antes
  de uma prova do PAS, e as datas de prova abaixo são as dele. *(1)*

## Montar

- A aba Prova lista os tópicos em blocos de duas colunas que eu marco com um toque (o bloco marcado
  ganha borda forte e um check); cada um mostra o estado, o domínio e quantas cartas já vistas e
  novas tem. No topo, a linha "Treino: não entra no seu histórico de acerto". *(1)*
- Ao marcar tópicos, ele vê o total selecionado, separado entre vistas e novas. As novas também
  entram. *(1)*
- Ele escolhe, em dois botões de opção, entre todas as cartas (novas incluídas) ou as 30 de menor
  domínio, só entre as vistas, e toca Começar Véspera. O total e o botão ficam fixos embaixo; sem
  tópico marcado, o botão diz "Marque ao menos um tópico". *(1)*
  Por quê: as novas ainda não têm domínio.
- A tela Tópico tem o atalho Véspera deste tópico, que abre a aba Prova com ele marcado. *(1)*

## Fazer

- A sessão ignora o agendamento e mostra as cartas embaralhadas, com as mesmas telas da sessão de
  todo dia e o cabeçalho de treino. *(1)*
- As respostas atualizam o FSRS (e o termômetro se move), mas o % de acerto não entra no
  histórico. *(1)*
- Suspensas não entram. *(1)*

## Datas de prova

- Eu associo uma data de prova a tópicos. As provas com data aparecem acima dos tópicos na aba
  Prova. *(2)*
- Nos dias anteriores, a Revisão prioriza as cartas desses tópicos, e na véspera o app sugere a
  Véspera. *(2)*
- Depois da data, o cartão de aviso em Hoje pergunta como foi a prova; a nota aparece no gráfico do
  Tópico. *(2)*
