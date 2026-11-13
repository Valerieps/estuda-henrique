# Hoje, meta e ofensiva

A tela Hoje e o que faz ele voltar todo dia: a meta, a ofensiva, a rotina e o cartão de aviso.

- **Entra aqui:** a tela Hoje e seus estados, a meta diária, a ofensiva, a rotina, o cartão de aviso
  e os ajustes.
- **Não entra aqui:** o termômetro (`spec/diagnostico.md`) e a sessão (`spec/estudo.md`).

## Hoje

- O app abre em Hoje, de cima para baixo: a rotina dele numa linha (ex.: "no ônibus da escola"); a
  meta do dia ou "Pronto por hoje"; Estudar e Só 5 cartas; o cartão de aviso; o termômetro. *(1)*
- **Primeiro uso:** baralho inicial carregado, meta "10 novas", termômetro com cobertura 0 de N e
  domínio "—". *(1)*
- **Pronto por hoje:** meta cumprida e chama acesa. Sem Estudar nem Só 5 cartas; no lugar, os
  atalhos Piores cartas e Prova. *(1)*
- **Dia de folga:** a frase "Hoje é folga", com Estudar ainda disponível se houver cartas. *(1)*
- Para o admin, a tela inicial é a das cartas do sistema, não Hoje. *(1)*

## Meta diária

- A meta é zerar as revisões do dia e as novas até o limite. *(1)*
- O limite de cartas novas por dia (padrão: 10) é a única configuração de estudo. O app funciona
  sem abrir os Ajustes nenhuma vez. *(1)*

## Ofensiva

- A ofensiva conta os dias seguidos em que ele concluiu ao menos uma sessão. *(1)*
- Ele escolhe nos Ajustes os dias de folga da semana (ex.: domingo). Uma folga não quebra a
  sequência; se ele estudar na folga, o dia conta normalmente. *(1)*
- A chama, com o número de dias, fica na barra superior. Ela acende no Resumo da primeira sessão do
  dia. Tocar nela abre a folha Ofensiva: o calendário da sequência, com as folgas marcadas. *(1)*
- Uma vez por mês, ele pode consertar um dia perdido que não era folga, pelo botão Consertar
  ofensiva (no cartão de aviso ou na folha Ofensiva). Sem conserto disponível, a chama recomeça do
  zero, sem mensagem de culpa. *(1)*

## Rotina

- Ao sair do primeiro Resumo, uma vez só, a tela Rotina pergunta quando e onde ele vai estudar, com
  sugestões tocáveis e Pular sempre visível. *(1)*
  Por quê: combinar quando e onde ajuda o hábito, mas sem atrasar a primeira sessão.
- A resposta aparece numa linha no topo de Hoje e pode ser mudada nos Ajustes. *(1)*
- Um lembrete diário chega no horário da rotina. *(3)*

## Cartão de aviso

- Hoje tem um só cartão de aviso, com um aviso por vez, nesta ordem: ofensiva quebrada e
  consertável → instalar o app na tela inicial (só depois da primeira sessão). *(1)*
  Por quê: o termômetro não pode descer da tela.
- Na fase 2 entram, abaixo desses: como foi a prova, semana ou bimestre novo (para recomeçar) e o
  resumo semanal, com Compartilhar. *(2)*

## Ajustes

- Os Ajustes ficam na engrenagem da barra superior, não na barra inferior. Têm: limite de novas por
  dia, rotina, dias de folga e Sobre. *(1)*
