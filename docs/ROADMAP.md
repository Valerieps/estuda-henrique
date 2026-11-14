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
| Baralho inicial de Biologia | 1 | `spec/cartas.md` | Tópicos já definidos; falta a ordem por bimestre (Em aberto) |
| Confete no "Pronto por hoje" e Adiantar mais 10 novas dentro de Hoje | 1 | `spec/estudo.md` | O Resumo (`src/ui/screens/StudySummary.tsx`) já faz o resto, mas sem confete. Em Hoje (Pronto por hoje), o botão chama `startStudy({ kind: 'review', aheadTopicId })` e lê a consulta `studyOutlook` |
| Hoje, termômetro, memória de longo prazo e cartas guardadas | 1 | `spec/diagnostico.md`, `spec/meta-e-ofensiva.md` | Hoje é hoje uma tela vazia da casca (`src/ui/App.tsx`); Estudar e Só 5 cartas chamam `startStudy` (`src/ui/study-launch.ts`); a sessão já abre em `/estudo`; a consulta `thermometer` já devolve termômetro, memória de longo prazo e cartas guardadas |
| Piores cartas e tela Tópico | 1 | `spec/diagnostico.md` | A consulta `worstCards` já devolve os grupos; falta a tela e a busca e os filtros do Tópico; a tela Tópico também traz o atalho Véspera deste tópico, que chama `openExamWithTopic` (`src/ui/exam-launch.ts`) |
| Meta diária, ofensiva, rotina, cartão de aviso, Ajustes | 1 | `spec/meta-e-ofensiva.md` | |
| Tela inicial do admin (cartas do sistema) | 1 | `spec/meta-e-ofensiva.md` | |
| Imagem e oclusão de imagem | 2 | `spec/cartas.md` | Oclusão é a prioridade 1 da fase 2 |
| Data e nota da prova | 2 | `spec/vespera.md` | |
| Previsão por tópico | 2 | `spec/diagnostico.md` | Prioridade 1 da fase 2, ao lado da oclusão |
| Gráfico de evolução, guardadas por tópico, momentos de virada, resumo semanal, recomeço, tags | 2 | `spec/diagnostico.md`, `spec/estudo.md`, `spec/meta-e-ofensiva.md` | Tags ainda sem regra escrita |
| Outras matérias e lembrete diário | 3 | `spec/cartas.md`, `spec/meta-e-ofensiva.md` | O lembrete precisa de notificações push: origem nova e ADR |

## O código ainda não segue o spec

- O limite de novas por dia vai de 5 a 50 — o servidor ainda não limita a faixa
  (`src/domain/study/settings.ts`; o padrão de 20 já vale).

## Adiado

- Backup em arquivo e funcionamento offline do PRD — a dona escolheu o app na nuvem (ADR-008).

## Revisar as lacunas que o agente decidiu

- [ ] O admin não estuda: a tela inicial dele é a das cartas do sistema, não Hoje
  (`spec/meta-e-ofensiva.md`).
- [ ] Colar várias cria cartas pessoais para o usuário e cartas do sistema para o admin
  (`spec/cartas.md`).
- [ ] Suspender uma carta do sistema vale só para o usuário que suspendeu (`spec/cartas.md`).
- [ ] O admin cria, renomeia e reordena os tópicos; o usuário não (`spec/cartas.md`).
- [ ] O cartão de aviso perdeu o aviso de backup vencido, porque não há backup (`spec/meta-e-ofensiva.md`).
- [ ] Estudar <tópico>, em Piores cartas, é treino, como Estudar estas agora, porque a Revisão é
  sempre da matéria inteira (`spec/diagnostico.md`).
- [ ] Domínio e cobertura de um tópico não contam as cartas suspensas; o domínio só conta cartas já
  estudadas (`spec/diagnostico.md`).
- [ ] As cartas guardadas contam cada carta uma vez, em qualquer sessão (Revisão ou treino); a
  memória de longo prazo só conta Revisão. O "tempo sem ver" é em dias de estudo, desde a resposta
  anterior à carta em qualquer sessão (`spec/diagnostico.md`).
- [ ] Piores cartas lista só cartas já estudadas e não suspensas; tópicos sem domínio ainda ficam
  por último no termômetro (`spec/diagnostico.md`).
