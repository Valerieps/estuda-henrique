# Plano da fase 2

Como construir a fase 2 em sessões do Claude Code, orquestradas por uma sessão Sonnet que só
distribui o trabalho e confere os merges.

- **Entra aqui:** a ordem das sessões, o modelo de cada uma, do que cada uma depende e o prompt que
  ela recebe. Cada sessão, ao terminar, tira a sua linha da tabela "Sessões"; quando a tabela
  esvaziar, este arquivo é apagado.
- **Não entra aqui:** as regras (`spec/`), o que falta construir além da fase 2 (`ROADMAP.md`), as
  decisões técnicas (`adr/`: ADR-012 imagens, ADR-013 gráficos, ADR-014 previsão).

## Antes de começar

- O critério de `SPEC.md` para passar à fase 2 (2 semanas de uso, 3 sessões por semana) é decisão
  minha; a orquestradora pergunta uma vez, junto com as perguntas abaixo.
- As perguntas de negócio estão no "Em aberto" de `spec/cartas.md`, `spec/vespera.md`,
  `spec/diagnostico.md`, `spec/estudo.md` e `spec/meta-e-ofensiva.md`, cada uma com uma proposta.
  A onda A não depende delas; cada sessão da onda B diz de quais depende.

## Como a orquestradora trabalha

- O estado é a tabela abaixo, no `main`: uma linha que sumiu é uma sessão que fez merge.
- **Arquivos compartilhados** (`server/application/schema.ts`, `src/application/api-contract.ts`,
  `server/application/group-service.ts`, `src/domain/strings.ts`): no máximo uma sessão marcada
  "sim" roda por vez, para as migrações e os registros não colidirem. Sessões "não" podem rodar ao
  lado, até 3 ao mesmo tempo.
- Cada sessão recebe só: `Leia docs/PLANO-FASE-2.md, seção "Regras comuns" e a sessão <ID>, e
  execute.` O prompt completo mora aqui, não na conversa da orquestradora.

## Sessões

| ID | Sessão | Modelo | Compartilhados | Depende de |
| --- | --- | --- | --- | --- |
| D0 | Incorporar as respostas da dona ao spec | Sonnet | não | respostas no chat |
| A2 | Previsão por tópico: domínio e consulta | Sonnet | sim | — |
| A3 | Gráfico em SVG e histórico do tópico | Sonnet | sim | — |
| A4 | Cartão de aviso como regra pura e Compartilhar | Sonnet | sim | — |
| B1 | Notas com imagem e oclusão: dados e domínio | Opus | sim | A1, D0 (cartas.md) |
| B2 | Oclusão e imagem: telas | Opus | não | B1 |
| B3 | Datas e nota da prova | Sonnet | sim | A3, A4, D0 (vespera.md) |
| B4 | Tela Tópico: previsão, gráfico e guardadas | Sonnet | não | A2, A3, B3, D0 (diagnostico.md) |
| B5 | Fim da sessão: guardada e momentos de virada | Sonnet | sim | D0 (estudo.md) |
| B6 | Recomeço | Opus | sim | A4, D0 (meta-e-ofensiva.md) |
| B7 | Resumo semanal com Compartilhar | Sonnet | sim | A4, B6 |
| B8 | Tags | Sonnet | sim | D0 (cartas.md, regra das tags) |
| Z1 | Revisão final da fase 2 | Sonnet | não | todas as outras |

## Regras comuns

```text
You are one session of docs/PLANO-FASE-2.md, running unattended. Follow CLAUDE.md (hard rules,
UI hard rules, "Adding a feature", "Handling Spec Gaps" for an autonomous run).
- First: git fetch origin && git merge origin/main. Read only the spec sections and ADRs your
  session names; grep headings before reading a doc.
- A migration is the next free number in MIGRATIONS on the merged main; never edit a shipped one.
- Member data stays private (ADR-009): per-member tables only through study-store.ts.
- UI texts in src/domain/strings.ts, in the spec's voice; values only from tokens.css; reuse
  src/ui/components/. New logic gets unit tests (domain, and server use cases on node:sqlite).
- A rule the spec does not give: decide the smallest sensible one, write it into docs/spec/ with
  its phase marker, and list it under "Revisar as lacunas que o agente decidiu" in docs/ROADMAP.md.
  Do not stop to ask.
- A data-model change updates the table in docs/ARQUITETURA.md. A feature now complete leaves
  docs/ROADMAP.md. Remove your own row from the "Sessões" table of docs/PLANO-FASE-2.md, and your
  "### <ID>" section below it.
- Do only your session. Problems you notice elsewhere: one GitHub issue each (t:bug or
  t:debito-tecnico, p:, s:), not fixed.
- Done when npm run build and npm run docs:check pass. Then npm run ship -- "<message>".
- Your last message, in Portuguese, at most 5 lines: the PR link, what changed, issues opened,
  rules you decided alone.
```

## Prompts

### D0

```text
The owner answered the open questions of phase 2. Her answers are below. For each answered item in
the "Em aberto" sections of docs/spec/cartas.md, vespera.md, diagnostico.md, estudo.md and
meta-e-ofensiva.md: fold the answer into the rule text of the right section, in her first-person
voice, with the (2) marker and a "Por quê:" line when the reason is not obvious, then delete the
question. "ok" means the question's own proposal. Remove an "Em aberto" heading left empty. If she
wrote the tags rule, the ROADMAP row loses "Tags ainda sem regra escrita". No code.
Answers:
<paste the owner's answers here>
```

### A2

```text
Build the topic forecast of ADR-014 (read it and ADR-010; spec: docs/spec/diagnostico.md,
section "Tópico"). No UI.
- src/domain/study/forecast.ts: forecastTopic(cards, today, days = 7) → { dailyMastery: number[],
  lowest: number } using ts-fsrs as src/domain/study/scheduler.ts does; cards due in the window are
  advanced with Rating.Good on their due day; new cards are ignored. Thorough tests (no studied
  card → null; a card due tomorrow recovers; an overdue topic drops).
- A query topicForecast({ topicId }) in api-contract.ts, served from diagnostics.ts with the
  reader's own card_states, Topic 'study'. Also return how many distinct study days the topic
  has, so the screen can apply the spec's minimum.
```

### A3

```text
Build the chart and the topic history (ADR-013; spec: docs/spec/diagnostico.md, "Tópico").
- src/ui/components/chart-scale.ts (pure, tested): map a series of { day, value } and markers
  { day, label } to SVG coordinates in a viewBox; gaps (days without a snapshot) are not drawn as
  zero.
- src/ui/components/LineChart.tsx: line, optional markers (vertical line + label), y axis 0–100%,
  first and last day labels, role="img" with an aria-label; tokens only (add chart tokens to
  tokens.css and the contrast pairs to tokens.test.ts). Render test in components.test.tsx.
- A query topicHistory({ topicId }) → { points: { day, mastery }[] from topic_snapshots, savedCards
  (the topic's cards he got right after 21+ days, via the existing savedCards rule), markers: [] }.
  markers stays empty: B3 fills it with exam dates.
- No screen change yet.
```

### A4

```text
Make the warning card (docs/spec/meta-e-ofensiva.md, "Cartão de aviso") a pure rule, ready for the
phase 2 warnings, and add sharing.
- src/domain/study/warning-card.ts: pickWarning(state) returns the one warning to show, by the
  spec's order, as a discriminated union. Today it has 'streak-repair' and 'install'; add the kinds
  'exam-result', 'restart' and 'weekly-summary' with the state fields they will need as optional
  inputs that are never set yet, so B3, B6 and B7 only fill them. Tests for the order.
- Today.tsx's WarningCard renders from pickWarning; behavior unchanged.
- src/infrastructure/share.ts behind a port: navigator.share({ text }) when present, else copy to
  the clipboard and return 'copied' so the UI can say so. Test with both paths stubbed.
```

### B1

```text
Image cards and image occlusion, data and domain (docs/spec/cartas.md "Tipos de carta", answered;
ADR-012; docs/ARQUITETURA.md "Modelo de dados"). A1 built the image store. Design carefully: cards
are shared by all members and their history must never break.
- Migration: notes.front_image_id, notes.back_image_id, notes.occlusion (JSON: image id and the
  areas, each { id, x, y, w, h } normalized 0–1 and an optional label); kind 'occlusion'.
- src/domain/study/occlusion.ts, like cloze.ts: one card per area (cloze_index = the area's stable
  position), a removed area retires its card, a moved one keeps it. Tests.
- Commands that create and edit notes accept the images and the areas (validate: image exists and
  the actor may use it; 1–20 areas; inside the image). Queries that return notes return image ids
  and areas, also through note-text.ts for a user's version (by the spec's answer on what a
  user's version may change). Tests on node:sqlite.
```

### B2

```text
Image and occlusion screens (docs/spec/cartas.md, answered; docs/UI.md). B1 built the data.
- In Nova carta: add a photo (camera or gallery: <input type="file" accept="image/*"
  capture="environment"> plus a gallery option) to the front or back, through the upload port.
- Occlusion editor: pick an image, draw rectangles with a finger (pointer events, touch-action
  none on the canvas), move, resize and delete them, optional label; touch targets at least the
  size in docs/UI.md. Pure geometry in a tested helper.
- In the study session and the card screen: show the images (<img src="/api/images/<id>">, alt
  from the card text) and the occlusion card as the spec says (an SVG overlay over the image,
  the asked area highlighted, revealed on the back).
- Run the ui-review skill on the new screens and fix what it finds in them.
```

### B3

```text
Exam dates and score (docs/spec/vespera.md "Datas de prova", answered; docs/spec/meta-e-ofensiva.md
"Cartão de aviso"). Existing src/domain/study/exam.ts is the Véspera, not dates: name yours
exam-dates.ts.
- Tables by the answers (if exams are his: member-private, through study-store.ts): exams (id,
  member_id, name, date, score, scored_at) and exam_topics (exam_id, topic_id). Commands to add,
  edit, delete an exam and to record its score; query of upcoming and past exams.
- Revisão priority before an exam: the rule in src/domain/study/review-queue.ts, tested.
- Aba Prova: the exams with dates above the topics; on the eve, the app suggests the Véspera of
  that exam's topics (reuse exam-launch.ts).
- Fill the 'exam-result' warning of warning-card.ts: after the date, ask how it went and save the
  score. Fill topicHistory's markers with the topic's exams and scores.
```

### B4

```text
Tópico screen, phase 2 (docs/spec/diagnostico.md "Tópico", answered). A2, A3 and B3 built the
data and the chart. UI only: src/ui/screens/Topic.tsx.
- Below the mastery: the forecast line, worded by the spec, with the spec's minimum of study days.
- The full chart (LineChart with topicHistory, exam markers with their scores) and the topic's
  saved-cards counter.
- Run the ui-review skill on Tópico and fix what it finds there.
```

### B5

```text
End of the session (docs/spec/estudo.md "Responder" and "Resumo", answered).
- The answer command returns whether the card just became saved (the savedCards rule of
  diagnostic.ts: right after 21+ days without seeing it, for the first time); the study screen
  plays the spec's animation on the back, off under prefers-reduced-motion.
- Turning points: a pure rule in src/domain/study/ (tested) from the card's history and this
  session's answers; study-summary.ts returns them; StudySummary.tsx shows them as the spec says.
```

### B6

```text
Recomeço (docs/spec/meta-e-ofensiva.md, answered). Design carefully: it may move FSRS due dates,
which every screen reads.
- The pure rule for when the 'restart' warning shows (warning-card.ts state) and what restarting
  does, in src/domain/study/, tested; if it spreads overdue reviews, it changes only due (never
  stability, difficulty or the reviews history), deterministically, within the member's own
  card_states, in one transaction.
- The command, the warning card and its texts. If the answer involves bimestre dates the admin
  sets, add them the smallest way (a table and an admin field in Ajustes) and say so.
- An ADR if the due-date change needs one (copy docs/adr/000-template.md, next number).
```

### B7

```text
Weekly summary (docs/spec/meta-e-ofensiva.md "Cartão de aviso", answered).
- A pure rule for the week's numbers (src/domain/study/weekly-summary.ts, tested) fed by the
  member's own reviews, sessions and daily_snapshots; a query weeklySummary.
- Fill the 'weekly-summary' warning: when it shows, its card, and Compartilhar through the share
  port of A4 with the text the spec gives (no link, no other member's data).
```

### B8

```text
Tags (docs/spec/cartas.md, the tags rule D0 wrote; stop and report if it is not there).
- Tables tags and note_tags (shared content, like notes), the commands for who may tag by the
  rule, and the filters the rule asks for (Tópico, Véspera or wherever it says), with tests.
- The screens' tag chips with the existing Chip component.
```

### Z1

```text
Final pass on phase 2. Do not add features.
- Run /code-review high on the changes since the commit that created docs/PLANO-FASE-2.md
  (git log --diff-filter=A -- docs/PLANO-FASE-2.md); fix confirmed bugs only.
- Run the ui-review skill on Tópico, Prova, Hoje and the study session; fix only rule breaks.
- docs/ROADMAP.md: no phase 2 row left that is built. Delete docs/PLANO-FASE-2.md and its row in
  the CLAUDE.md table "Where information lives".
```
