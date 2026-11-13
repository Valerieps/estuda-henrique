---
name: visual-identity
description: Create or change the app's visual identity (palette, type, shapes) by setting the values in src/ui/theme/tokens.css. Use in the bootstrap or when the owner asks for a new look, colors, theme or "identidade visual".
---

# Visual identity

The identity is the VALUES of `src/ui/theme/tokens.css`. The token names, the components and the
rules of `docs/UI.md` stay as they are.

1. Read `docs/UI.md`, the current `tokens.css`, and the app's purpose in `CLAUDE.md` and `docs/SPEC.md`.
2. Show three or four directions side by side in ONE artifact or page. Each one has its palette in
   both themes, its font stack, its radius, and a sample of a card, a primary and a secondary
   button, a field and a notice, drawn with those values. Give the contrast of text on the
   background for each direction. Wait for the owner's choice.
3. Write the chosen values into `tokens.css`, in both themes. Keep every token name.
   - Fonts: prefer system stacks. A web font is bundled in `public/` (never from a CDN, see
     `docs/SEGURANCA.md`), with at most two weights.
   - The type scale may change its sizes, but each step stays 1.125 to 1.5 times the one before.
   - A brand color too light for text on white stays the brand. Add a darker variant for text, and
     add the new pair to the contrast list in `tokens.test.ts`.
4. Change the same colors in `index.html` (theme-color), `public/manifest.webmanifest` and the icons.
5. Run `npm test`. A failing contrast pair means changing the color, not the test.
6. Record the choice and the reason in an ADR (`docs/adr/`, copy `000-template.md`).
