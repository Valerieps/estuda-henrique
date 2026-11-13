---
name: ui-review
description: Review this app's interface (a screen, a component, a diff or the whole app) against docs/UI.md. Use when the owner asks to critique, review or evaluate the UI or UX ("critique a UI", "revise a tela", "o que acha da interface").
---

# UI review

The machine-checkable rules (literals, scale, contrast, touch size) are enforced by
`src/ui/theme/tokens.test.ts`. Do not spend the review on them: run the test, and report only
what it cannot see.

1. Run `npx vitest run src/ui/theme/tokens.test.ts`. If it fails, the first finding is
   "o build falha em N regras de token", with the count per rule, not one line per offense.
2. Read `docs/UI.md`, section "O que a revisão confere", and the screens in scope
   (`src/ui/screens/`, the components they use, `src/ui/theme/global.css`).
3. Check each rule of that section against the screens. Use the browser only if the owner asked;
   otherwise reason from the code and say so.
4. Look for what the rules do not name yet: confusing flow, wrong emphasis, a term that differs
   from `docs/GLOSSARIO.md`, a step that could be removed.

## Output

In Brazilian Portuguese, in one message:

- **Veredito:** two or three sentences.
- **Achados:** a table `| # | Tela | Problema | Regra (docs/UI.md) | Correção |`, most serious
  first. At most ten. A problem repeated on several screens is one row.
- **Regras novas:** when a finding is a general rule that docs/UI.md does not have, propose its
  text. If a test could check it, say how. The owner decides whether it goes into docs/UI.md
  or the test.

Fix nothing unless the owner asks.
