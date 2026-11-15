# Cartas

Matérias, tópicos e cartas: o que existe para estudar e como as cartas são criadas e corrigidas.

- **Entra aqui:** matérias, tópicos, cartas do sistema e pessoais, tipos de carta, macete,
  formatação, suspender, criar em lote.
- **Não entra aqui:** como as cartas são estudadas (`spec/estudo.md`), o domínio de cada carta
  (`spec/diagnostico.md`) e como escrever uma boa carta (`spec/boas-cartas.md`).

## Em aberto

- [ ] Imagem: quem põe imagem em quê? Proposta: eu, nas cartas do sistema; ele, nas pessoais; uma imagem por lado (frente e/ou verso), além do texto.
- [ ] Oclusão: ao estudar, a carta cobre só a área perguntada (as outras ficam à mostra) ou cobre todas e destaca a perguntada? Proposta: cobre todas, a perguntada em destaque.
- [ ] Oclusão: as áreas são retângulos (desenhados com o dedo) ou também formas livres? Proposta: só retângulos, com um rótulo opcional por área que aparece no verso.
- [ ] A versão dele de uma carta do sistema com imagem (ou oclusão) pode trocar a imagem ou as áreas? Proposta: não; ele edita só o texto e o macete, como na lacuna.
- [ ] Tags: para que servem? Proposta: eu marco cartas do sistema com tags do PAS (ex.: "PAS 2", "Etapa 2023") e ele filtra por tag na tela Tópico e ao montar a Véspera; ele não cria tags. Se não for isso, diga o uso que você imagina.

## Matérias e tópicos

- O app vem com uma matéria, Biologia. A estrutura aceita outras, mas só a fase 3 traz mais
  matérias. *(1)*
- Cada matéria tem tópicos (Bacterioses, Gametogênese, Fungi...), na ordem do planejamento da
  escola dele. *(1)*
- Os tópicos de Biologia do 2º ano dele, na lista da escola, que a agrupa por área: *(1)*
  - **Seres vivos:** Classificação biológica; Grupos zoológicos (comparativo); Ênfase em
    Platelmintos, Nematelmintos, Moluscos, Artrópodes e Cordados; Grupos vegetais (comparativo);
    Ênfase em Angiospermas; Fisiologia vegetal (hormônios, transporte de seiva); Monera; Fungi;
    Protoctista.
  - **Parasitologia e Programas de Saúde:** Bacterioses; Viroses; Protozooses; Verminoses.
  - **Histologia:** Animal (tecidos epitelial, conjuntivos, muscular e nervoso); Vegetal
    (meristemas primários e secundários, tecidos de revestimento, sustentação, condução,
    preenchimento e reserva).
  - **Reprodução humana:** Sistemas genitais; Gametogênese; Regulação hormonal; Métodos
    contraceptivos; IST's.
- Eu, como admin, crio, renomeio e reordeno os tópicos. *(1)*
- Com uma matéria só, a aba Matérias abre direto nos tópicos de Biologia. A partir da segunda, ganha
  um nível acima, por matéria. *(3)*
- Na aba Matérias, os tópicos vêm na ordem do planejamento. Ele pode ligar "Mais fracos primeiro"
  (do menor domínio para o maior, os novos no fim) e filtrar por estado (Fracos, Em andamento,
  Novos, Dominados), com quantos tópicos há em cada um. *(1)*
  Por quê: com dezenas de tópicos, achar os fracos rolando a grade não funciona.
- Um toque em "O que é domínio?" explica a métrica, em Matérias e na tela Tópico. *(1)*

## Cartas do sistema e cartas pessoais

- Uma carta do sistema é criada por mim, como admin, e aparece para o Henrique estudar. *(1)*
- Uma carta pessoal é criada por ele e é só dele. Eu não vejo nem edito as cartas dele. *(1)*
  Por quê: eu adiciono cartas "do sistema"; o que ele faz é dele (ADR-009).
- Ele pode editar tudo numa carta do sistema: frente, verso e macete, não só suspender e escrever o
  macete. *(1)*
- A carta do sistema que um usuário edita muda só para ele: os outros continuam vendo a minha
  versão, e eu também. A versão dele vale na sessão, no Resumo, em Piores cartas e no tópico, e o
  histórico de estudo da carta continua o mesmo. *(1)*
  Por quê: ninguém vê nada de ninguém (`spec/acesso-e-membros.md`).
- Quando eu corrijo uma carta do sistema, a correção vale para todos, menos para quem já tem a
  própria versão dela. *(1)*
- Na versão dele de uma lacuna do sistema, os trechos marcados continuam os mesmos (pode mudar o
  texto, não o número de lacunas). *(1)*
- Quem tem os dois papéis cria e edita como usuário (cartas pessoais, versões só suas); nas telas
  do admin, cria e edita as cartas do sistema. *(1)*
- Eu não posso mudar nem apagar nada do histórico dele. Editar ou apagar uma carta do sistema nunca
  mexe no histórico de estudo dele (respostas e agendamento). *(1)*
- Ele pode excluir qualquer carta, do sistema ou pessoal, pelo botão Excluir da carta (com
  confirmação). Excluir uma carta do sistema a esconde só para ele: os outros usuários, eu, e quem
  entrar depois, com o baralho inicial completo, continuam vendo a carta. Excluir uma carta
  pessoal a apaga de vez. O histórico de estudo não muda. *(1)*
  Por quê: ninguém vê nada de ninguém, e o baralho inicial é igual para todos.
- Quando eu excluo uma carta do sistema pelas telas do admin, ela some para todos. *(1)*
- Na interface dele, as duas aparecem juntas no tópico; só a origem muda. *(1)*
- O baralho inicial são cartas do sistema que eu mesma escrevi e revisei, num arquivo só
  (`server/seed/biologia-decks.json`), e que entram no app de uma vez, antes do primeiro acesso do
  Henrique: ele já encontra cartas nos tópicos. O texto das cartas é o do arquivo; depois, eu as
  corrijo pelo app. *(1)*
- As cartas do baralho inicial que não seguiam `spec/boas-cartas.md` foram reescritas como cartas
  novas (`server/seed/biologia-revisao-1.json`), e as antigas ficam suspensas para todos. *(1)*
  Por quê: não escrevi o baralho carta a carta pelas telas do admin.
- Depois, as cartas do sistema foram revisadas pela matriz do PAS 2: as decoreba, burocráticas ou
  fora da matriz foram apagadas para todos, e as que não seguiam `spec/boas-cartas.md` foram
  editadas no lugar (`server/seed/biologia-revisao-2.json`, com o motivo de cada uma). *(1)*
- As cartas do arquivo que não têm tópico na lista da escola ganham tópicos próprios, depois dos da
  lista: Embriologia e planos corporais, Fisiologia humana e Ecologia em contexto (Cerrado e
  águas). *(1)*

## Tipos de carta

- **Básica:** frente (pergunta), verso (resposta) e um macete opcional, que aparece com o
  verso. *(1)*
- **Lacuna:** uma frase com trechos marcados, como `A {{mitocôndria}} realiza a {{respiração
  celular}}`. Cada trecho vira uma carta. *(1)*
- Frente, verso e macete aceitam negrito, itálico (nomes científicos), subscrito e sobrescrito
  (CO₂, Ca²⁺). *(1)*
- **Imagem:** foto da câmera ou da galeria, na frente ou no verso. *(2)*
- **Oclusão de imagem:** cobrir partes de um diagrama (célula, coração, flor); cada área coberta
  vira uma carta. É a primeira da fase 2. *(2)*

## Criar e corrigir

- O botão + no meio da barra inferior abre a folha Criar: Nova carta ou Colar várias. Ela abre por
  cima da tela atual e volta para ela. *(1)*
- Nova carta abre a carta em branco, com o último tópico usado. *(1)*
- **Colar várias:** escolho o tópico e colo uma carta por linha, no formato
  `Pergunta ; Resposta ; Macete (opcional)` ou como frase com `{{lacunas}}`. Antes de salvar, a
  prévia mostra quantas cartas foram reconhecidas (lacunas já contadas como cartas) e as linhas não
  reconhecidas em destaque, editáveis. Ao salvar, volto para onde estava, com o aviso "N cartas
  criadas em Verminoses". *(1)*
- Para ele, Colar várias cria cartas pessoais; para mim, cartas do sistema. *(1)*
- Na sessão, depois de virar a carta, ele toca Adicionar macete (ou Editar macete) e abre só esse
  campo, sem sair da sessão. *(1)*

## Suspender

- Suspender tira a carta de todas as filas sem apagar. Ele suspende pelo verso da carta, pela lista
  de Piores cartas ou pela tela Carta. *(1)*
- Para reativar: Tópico → filtro Suspensas → Carta → Reativar. *(1)*
- Suspender uma carta do sistema vale só para ele. *(1)*
