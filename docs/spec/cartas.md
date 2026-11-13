# Cartas

Matérias, tópicos e cartas: o que existe para estudar e como as cartas são criadas e corrigidas.

- **Entra aqui:** matérias, tópicos, cartas do sistema e pessoais, tipos de carta, macete,
  formatação, suspender, criar em lote.
- **Não entra aqui:** como as cartas são estudadas (`spec/estudo.md`) e o domínio de cada carta
  (`spec/diagnostico.md`).

## Em aberto

- [ ] Quando o Henrique edita a frente ou o verso de uma carta do sistema (na sessão ou na tela
  Carta), a mudança vale só para ele (uma cópia dele) ou ele não pode editar o texto da carta do
  sistema, só suspender e escrever o macete?
- [ ] Quando eu edito uma carta do sistema que ele já estudou, o histórico dele com ela continua? E
  se eu mudar uma lacuna (somar ou tirar um trecho)?
- [ ] Eu posso apagar uma carta do sistema? Se sim, o que acontece com o histórico dele nela?
- [ ] Quais tópicos de Biologia o 2º ano dele cobre, e em que ordem por bimestre? (define o baralho
  inicial)
- [ ] Quem escreve o baralho inicial: eu, pelas telas do admin, ou um arquivo colado de uma vez?

## Matérias e tópicos

- O app vem com uma matéria, Biologia. A estrutura aceita outras, mas só a fase 3 traz mais
  matérias. *(1)*
- Cada matéria tem tópicos (Citologia, Botânica, Fisiologia Humana...), na ordem do planejamento da
  escola dele. *(1)*
- Eu, como admin, crio, renomeio e reordeno os tópicos. *(1)*
- Com uma matéria só, a aba Matérias abre direto nos tópicos de Biologia. A partir da segunda, ganha
  um nível acima, por matéria. *(3)*

## Cartas do sistema e cartas pessoais

- Uma carta do sistema é criada por mim, como admin, e aparece para o Henrique estudar. *(1)*
- Uma carta pessoal é criada por ele e é só dele. Eu não vejo nem edito as cartas dele. *(1)*
  Por quê: eu adiciono cartas "do sistema"; o que ele faz é dele (ADR-009).
- Na interface dele, as duas aparecem juntas no tópico; só a origem muda. *(1)*
- O baralho inicial são de 80 a 150 cartas do sistema, cobrindo os tópicos do bimestre atual,
  revisadas por mim antes de entrar no app. *(1)*

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
  criadas em Citologia". *(1)*
- Para ele, Colar várias cria cartas pessoais; para mim, cartas do sistema. *(1)*
- Na sessão, depois de virar a carta, ele toca Adicionar macete (ou Editar macete) e abre só esse
  campo, sem sair da sessão. *(1)*

## Suspender

- Suspender tira a carta de todas as filas sem apagar. Ele suspende pelo verso da carta, pela lista
  de Piores cartas ou pela tela Carta. *(1)*
- Para reativar: Tópico → filtro Suspensas → Carta → Reativar. *(1)*
- Suspender uma carta do sistema vale só para ele. *(1)*
