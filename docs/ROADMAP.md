# Roadmap

O que ainda não está pronto.

- **Entra aqui:** o que falta construir, onde o código ainda não segue o spec, o que foi adiado de
  propósito e as lacunas do spec que o agente decidiu sozinho.
- **Não entra aqui:** o que já está pronto (quando uma linha fica pronta, ela sai daqui; o git e as
  issues fechadas guardam o histórico), bugs e débito técnico (issues do GitHub) e as regras (`spec/`).

## Falta construir

| Feature | Fase | Spec | Observação |
| --- | --- | --- | --- |
| Identidade visual | 1 | — | A dona escolhe entre 3 ou 4 direções (skill `visual-identity`); hoje são as cores do template |
| Matérias, tópicos e cartas (básica, lacuna, macete, formatação) | 1 | `spec/cartas.md` | Cartas do sistema (admin) e pessoais (usuário) |
| Colar várias com prévia | 1 | `spec/cartas.md` | |
| Baralho inicial de Biologia | 1 | `spec/cartas.md` | Depende dos tópicos da escola dele (Em aberto) |
| Sessão de Revisão com FSRS, três botões, desfazer | 1 | `spec/estudo.md` | `ts-fsrs` entra como dependência, com ADR |
| Resumo, Refazer erros, Mais 5? | 1 | `spec/estudo.md` | |
| Hoje e termômetro | 1 | `spec/diagnostico.md`, `spec/meta-e-ofensiva.md` | Substitui a tela `Home` de exemplo e `src/domain/greeting.ts` |
| Piores cartas e tela Tópico | 1 | `spec/diagnostico.md` | |
| Véspera | 1 | `spec/vespera.md` | |
| Meta diária, ofensiva, rotina, cartão de aviso, Ajustes | 1 | `spec/meta-e-ofensiva.md` | |
| Tela inicial do admin (cartas do sistema) | 1 | `spec/meta-e-ofensiva.md` | |
| Imagem e oclusão de imagem | 2 | `spec/cartas.md` | Oclusão é a prioridade 1 da fase 2 |
| Data e nota da prova | 2 | `spec/vespera.md` | |
| Gráfico de evolução, dominadas, momentos de virada, resumo semanal, recomeço, tags | 2 | `spec/diagnostico.md`, `spec/estudo.md`, `spec/meta-e-ofensiva.md` | Tags ainda sem regra escrita |
| Outras matérias e lembrete diário | 3 | `spec/cartas.md`, `spec/meta-e-ofensiva.md` | O lembrete precisa de notificações push: origem nova e ADR |

## O código ainda não segue o spec

- A tela de membros só aparece para o admin — hoje aparece para todos (`src/ui/App.tsx`), e a
  consulta de membros não exige admin no servidor.

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
- [ ] A ofensiva conta qualquer sessão concluída, como na arquitetura da informação v3.1, e não
  "zerar as revisões", como no PRD v3 (`spec/meta-e-ofensiva.md`).
