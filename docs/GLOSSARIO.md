# Glossário

Um termo, um sentido. Estes nomes valem para os textos da interface e para as docs.

- **Entra aqui:** cada termo do app, com uma definição curta e o arquivo de `spec/` que o usa.
- **Não entra aqui:** as regras em si, que ficam em `spec/`. Se uma definição daqui e uma regra
  divergirem, vale o spec, e o termo daqui é corrigido.

O app fala a língua da escola, não a do Anki: os termos entre parênteses em "não usar" nunca
aparecem na interface.

- **Adiantar novas:** estudar mais 10 cartas novas depois de zerar o dia (não usar: estudo extra, modo livre). (`spec/estudo.md`)
- **Admin:** o papel de quem convida, remove, dá papéis e adiciona as cartas do sistema; sem o papel
  de usuário, não estuda. Sempre há pelo menos um. (`spec/acesso-e-membros.md`)
- **Carta do sistema:** carta criada pelo admin, que aparece para o usuário estudar. (`spec/cartas.md`)
- **Carta pessoal:** carta criada pelo usuário; só ele a vê. (`spec/cartas.md`)
- **Carta-problema:** carta em que ele apertou Errei 6 vezes ou mais (não usar: leech). (`spec/diagnostico.md`)
- **Cartão de aviso:** o único espaço de avisos em Hoje, com um aviso por vez. (`spec/meta-e-ofensiva.md`)
- **Cobertura:** X de Y cartas do tópico já vistas (não usar: progresso). (`spec/diagnostico.md`)
- **Convite:** permissão para um e-mail entrar no grupo; pendente, aceito ou revogado. (`spec/acesso-e-membros.md`)
- **Domínio:** chance estimada de lembrar hoje, em % (não usar: retrievability, retenção). (`spec/diagnostico.md`)
- **Errei / Acertei com esforço / Acertei:** os três botões (não usar: Again/Hard/Good, Difícil/Fácil). (`spec/estudo.md`)
- **Estudar:** começar a sessão de Revisão (não usar: Revisar, Iniciar). (`spec/estudo.md`)
- **Folga:** dia da semana que não quebra a ofensiva (não usar: freeze). (`spec/meta-e-ofensiva.md`)
- **Consertar:** recuperar um dia perdido da ofensiva, uma vez por mês. (`spec/meta-e-ofensiva.md`)
- **Guardada:** carta que ele acertou depois de 21 dias ou mais sem ver (não usar: dominada, madura). (`spec/diagnostico.md`)
- **Grupo:** todas as pessoas que usam o app; há um só. (`spec/acesso-e-membros.md`)
- **Hoje:** a tela inicial e a meta do dia (não usar: Início, Dashboard). (`spec/meta-e-ofensiva.md`)
- **Lacuna:** carta com trecho escondido (não usar: cloze). (`spec/cartas.md`)
- **Macete:** dica que aparece com o verso (não usar: nota, observação). (`spec/cartas.md`)
- **Memória de longo prazo:** % que ele lembra das cartas que não via há 7 dias ou mais, nos últimos 14 dias; a métrica principal (não usar: retenção, true retention). (`spec/diagnostico.md`)
- **Membro:** quem entrou no grupo com um convite; é o nome no código para o usuário e o admin. (`spec/acesso-e-membros.md`)
- **Novas / Revisões:** cartas nunca vistas / vencidas hoje (não usar: fila, learning). (`spec/estudo.md`)
- **Ofensiva:** dias seguidos com ao menos uma sessão concluída (não usar: streak). (`spec/meta-e-ofensiva.md`)
- **Piores cartas:** as cartas com menor domínio (não usar: leeches). (`spec/diagnostico.md`)
- **Pronto por hoje:** revisões e novas do dia zeradas (não usar: Parabéns, Concluído). (`spec/meta-e-ofensiva.md`)
- **Prova / Véspera:** a aba / o modo de estudo intensivo (não usar: cram, baralho filtrado). (`spec/vespera.md`)
- **Rotina:** quando e onde ele estuda (não usar: âncora, hábito). (`spec/meta-e-ofensiva.md`)
- **Só 5 cartas / Mais 5?:** sessão curta em Hoje / oferta de mais 5 no Resumo (não usar: modo rápido). (`spec/estudo.md`)
- **Suspensa / Reativar:** fora do estudo, sem ser apagada / voltar ao estudo (não usar: arquivada, oculta). (`spec/cartas.md`)
- **Termômetro:** a lista de tópicos por domínio em Hoje (não usar: estatísticas). (`spec/diagnostico.md`)
- **Tópico:** um assunto de uma matéria, como Citologia (não usar: baralho, deck). (`spec/cartas.md`)
- **Treino:** sessão que não entra no histórico de acerto: Véspera, Refazer erros, Estudar estas agora, Estudar <tópico> (não usar: modo livre, prática). (`spec/estudo.md`)
- **Usuário:** o papel de quem estuda; hoje, só o Henrique. Uma pessoa pode ser admin e usuário. (`spec/acesso-e-membros.md`)
