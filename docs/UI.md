# Interface

Regras visuais e de uso que valem para toda tela do app.

- **Entra aqui:** as regras de interface que valem para todas as telas, e onde cada uma é conferida.
- **Não entra aqui:** os valores (cores, tamanhos: ficam em `src/ui/theme/tokens.css`), o que cada
  tela faz (`docs/spec/`) e rascunhos de tela (`docs/rascunhos/`).

## O que o build confere

`src/ui/theme/tokens.test.ts` roda no `npm test` e no `npm run build`, e falha quando uma regra
abaixo é quebrada. Ao corrigir, use um token. Se nenhum servir, crie um no `tokens.css` (as cores
nos dois temas). Nunca afrouxe o teste.

1. **Nenhum valor solto fora do `tokens.css`:** cor (hex, `rgb()`, `white`), comprimento (`px`,
   `rem`, `em`), duração, tamanho, peso ou altura de linha de fonte. Isso vale para CSS, para TSX e
   para `style={{}}` (percentagens podem).
2. **Só tokens que existem:** um `var(--x)` sem definição falha.
3. **Escala tipográfica:** cada tamanho é de 1,125 a 1,5 vez o anterior. Os tamanhos
   `--font-size-display*` (um número em destaque, o título de uma tela de abertura) podem saltar
   mais. Nada abaixo de 12px. O texto corrido tem pelo menos 16px.
4. **Espaçamento na grade de 4px.**
5. **Contraste AA nos dois temas:** texto com 4,5:1 sobre o fundo em que aparece. Borda de
   controle, anel de foco e ícone com 3:1. Uma cor nova que leva texto ou marca um controle entra na
   lista de pares do teste.
6. **O tema escuro redefine todas as cores** do claro.
7. **Alvo de toque com 44px ou mais** (`--size-touch`).

## O que a revisão confere

Estas regras pedem julgamento. Quem revisa a interface (skill `ui-review`) olha estas, e não as de
cima.

**Hierarquia**
- Uma ação principal por tela (`<Button>` primário). As outras são `secondary`.
- Um `h1` por tela. Os níveis de título não pulam (`h1`, depois `h2`).
- Tamanho e peso marcam importância. Nunca três tamanhos diferentes no mesmo card.
- Coisas relacionadas ficam mais perto entre si do que de outros grupos (proximidade).

**Componentes**
- Use os de `src/ui/components/` (`Button`, `ButtonLink`, `Field`, `Notice`) antes de escrever
  CSS novo. Quando um padrão se repete em duas telas, ele vira componente.
- Todo campo tem rótulo visível. Placeholder não é rótulo.
- Ações que apagam ou removem usam `danger` e pedem confirmação.

**Estados**
- Toda lista e toda tela que carrega dados tem os estados vazio, carregando e erro. O vazio diz o
  que fazer em seguida.
- Botão que dispara uma ação fica desabilitado enquanto ela roda.

**Acessibilidade além do contraste**
- Tudo funciona pelo teclado, na ordem visual, com foco visível (`:focus-visible` no
  `global.css`).
- Ícone sem texto tem `aria-label`. Imagem decorativa tem `alt=""`.
- Cor nunca é o único sinal: erro também tem texto, e o estado ativo também tem forma ou peso.
- Animação respeita `prefers-reduced-motion` (o `global.css` já zera as durações).

**Layout**
- Funciona em 320px de largura sem rolagem horizontal. Texto longo (nome, e-mail) quebra ou corta
  com reticências, sem empurrar o layout.
- Conteúdo com no máximo `--size-content` de largura.

**Texto**
- Os textos da interface ficam em `src/domain/strings.ts`, com os termos do `docs/GLOSSARIO.md`.
- O botão diz o que acontece ("Enviar convite"), não "OK".

## Mudar a identidade visual

Mude só os valores do `tokens.css`, sem renomear os tokens. Depois, mude as mesmas cores no
`index.html`, no manifest e nos ícones (`src/app-identity.test.ts` confere). Rode `npm test`: o
teste de contraste diz qual par ficou ilegível.
