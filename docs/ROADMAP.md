# Roadmap

O que ainda não está pronto.

- **Entra aqui:** o que falta construir, onde o código ainda não segue o spec, o que foi adiado de
  propósito e as lacunas do spec que o agente decidiu sozinho.
- **Não entra aqui:** o que já está pronto (quando uma linha fica pronta, ela sai daqui; o git e as
  issues fechadas guardam o histórico), bugs e débito técnico (issues do GitHub) e as regras (`spec/`).

## Falta construir

| Feature | Fase | Spec | Observação |
| --- | --- | --- | --- |
| Colar várias com prévia | 1 | `spec/cartas.md` | |
| Confete no "Pronto por hoje" | 1 | `spec/estudo.md` | O Resumo (`src/ui/screens/StudySummary.tsx`) já faz o resto, mas sem confete (em Hoje também). |
| Tela Rotina depois do primeiro Resumo, e a chama acender no Resumo | 1 | `spec/meta-e-ofensiva.md` | Hoje, a chama, a folha Ofensiva, o cartão de aviso e os Ajustes (com a rotina) já existem; falta a tela Rotina, que pertence ao fim da sessão (Resumo) |
| Tela inicial do admin (cartas do sistema) | 1 | `spec/meta-e-ofensiva.md` | |
| Imagem e oclusão de imagem | 2 | `spec/cartas.md` | Oclusão é a prioridade 1 da fase 2 |
| Data e nota da prova | 2 | `spec/vespera.md` | |
| Previsão por tópico | 2 | `spec/diagnostico.md` | Prioridade 1 da fase 2, ao lado da oclusão |
| Gráfico de evolução, guardadas por tópico, momentos de virada, resumo semanal, recomeço, tags | 2 | `spec/diagnostico.md`, `spec/estudo.md`, `spec/meta-e-ofensiva.md` | Tags ainda sem regra escrita |
| Outras matérias e lembrete diário | 3 | `spec/cartas.md`, `spec/meta-e-ofensiva.md` | O lembrete precisa de notificações push: origem nova e ADR |

## O código ainda não segue o spec

- Nada no momento.

## Adiado

- Backup em arquivo e funcionamento offline do PRD — a dona escolheu o app na nuvem (ADR-008).

## Revisar as lacunas que o agente decidiu

- [ ] O admin cria, renomeia e reordena os tópicos; o usuário não (`spec/cartas.md`).
- [ ] Papéis: quem entra por convite é usuário; ninguém fica sem papel; só quem é usuário estuda
  (o servidor recusa o estudo a um admin que não é usuário); quem tem os dois papéis chega a
  Membros e Convites pelos Ajustes e, no estudo, cria cartas pessoais e versões só suas
  (`spec/acesso-e-membros.md`, `spec/cartas.md`).
- [ ] A versão de um usuário de uma lacuna do sistema mantém os mesmos trechos; quando eu mudo os
  trechos da minha, a versão dele não acompanha (`spec/cartas.md`).
- [ ] Na tela Tópico, o filtro Todas mostra também as cartas suspensas (marcadas); Novas são as
  nunca estudadas e não suspensas; Problema são as com 6 ou mais Errei; a busca ignora maiúsculas
  e acentos e olha frente e verso (`spec/diagnostico.md`).

