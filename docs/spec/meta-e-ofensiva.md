# Hoje, meta e ofensiva

A tela Hoje e o que faz ele voltar todo dia: a meta, a ofensiva, a rotina e o cartão de aviso.

- **Entra aqui:** a tela Hoje e seus estados, a meta diária, a ofensiva, a rotina, o cartão de aviso
  e os ajustes.
- **Não entra aqui:** o termômetro (`spec/diagnostico.md`) e a sessão (`spec/estudo.md`).

## Em aberto

- [ ] Recomeço ("semana ou bimestre novo"): o que o app faz? Proposta: depois de 4 ou mais dias sem estudar, o cartão de aviso oferece Recomeçar; recomeçar espalha as revisões atrasadas pelos próximos 7 dias (em vez de despejar todas hoje) e não mexe no histórico nem na ofensiva. No início de um bimestre (datas que eu cadastro?), o mesmo cartão aparece mesmo sem a pausa.
- [ ] Resumo semanal: quando aparece e o que tem? Proposta: no domingo e na segunda, no cartão de aviso; mostra dias estudados, cartas respondidas, guardadas novas na semana, memória de longo prazo e o tópico que mais subiu.
- [ ] Compartilhar o resumo semanal: como texto (WhatsApp) ou como imagem? Proposta: texto pelo compartilhamento do Android, sem link para o app.

## Hoje

- O app abre em Hoje, de cima para baixo: a rotina dele numa linha (ex.: "no ônibus da escola"); o
  herói "Missões de hoje", com a chama da ofensiva (tocar abre a folha Ofensiva) e uma barra por
  missão: "Zerar as revisões" e "Ver N novas", cada uma com "feito de total"; Estudar, em largura
  total, e abaixo os chips Só 5 cartas e Piores; o cartão de aviso; o termômetro em grade de duas
  colunas (`spec/diagnostico.md`); no fim, a memória de longo prazo e as cartas guardadas, lado a
  lado. *(1)*
  Por quê: Missões é só a apresentação da meta, sem pontos; o que pesa é a constância.
- Uma missão cumprida ganha um check e a cor de sucesso. Uma missão sem cartas (0 novas, por
  exemplo) não aparece. *(1)*
- A memória de longo prazo e as cartas guardadas só aparecem quando há dado (taxa calculada ou
  pelo menos uma carta guardada); antes, uma linha diz que aparecem depois de alguns dias de estudo. *(1)*
- **Primeiro uso:** baralho inicial carregado, meta "20 novas", termômetro com cobertura 0 de N,
  domínio "—" e sem minilinha. *(1)*
- **Pronto por hoje:** o herói vira "Missões cumpridas", com confete (ao zerar o dia enquanto ele
  está em Hoje) e a chama acesa. Sem Estudar nem os chips; no lugar, a frase "Hoje você já fez o que
  mais rende" e o que vale se ele quiser mais: Adiantar mais 10 novas (`spec/estudo.md`) e Piores
  cartas. *(1)*
  Por quê: constância vale mais que horas; o app mostra que voltar amanhã rende mais, sem travar.
- **Dia de folga:** o herói diz "Hoje é folga" (sem barras de missão, mas com a chama), com Estudar ainda disponível se houver cartas. *(1)*
- Para o admin, a tela inicial é a das cartas do sistema, não Hoje. *(1)*

## Meta diária

- A meta é zerar as revisões do dia e as novas até o limite. *(1)*
- Hoje mostra quanto da meta já foi feito, em revisões e novas: "feito de total", onde o total é o
  feito mais o que falta. Cada carta conta uma vez, pela primeira resposta do dia: revisão se ele já
  a tinha visto antes de hoje, nova se não. O treino (Véspera, Refazer erros, Estudar estas) não
  conta para a meta. O dia vira à meia-noite de Brasília. *(1)*
- O limite de cartas novas por dia (padrão: 20, de 5 a 50) é a única configuração de estudo. O app
  funciona sem abrir os Ajustes nenhuma vez. *(1)*
- Ao mudar o limite, o app avisa em uma linha que mais novas hoje significam mais revisões nos
  próximos dias. *(1)*
- Depois de zerar o dia, ele ainda pode adiantar novas (`spec/estudo.md`). *(1)*

## Ofensiva

- A ofensiva conta os dias seguidos de estudo. Um dia conta quando ele conclui ao menos uma sessão,
  de qualquer tamanho e em qualquer modo, ou quando abre o app num dia em que não havia nada para
  estudar. *(1)*
  Por quê: zerar as revisões é a meta do dia, não a condição da ofensiva.
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
  dia (com o aviso sobre as revisões dos próximos dias), rotina, dias de folga e Sobre. *(1)*
