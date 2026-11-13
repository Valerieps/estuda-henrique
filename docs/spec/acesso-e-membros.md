# Acesso e membros

Quem entra no app, como entra e o que cada papel pode fazer. Já vem construído; aqui estão as
regras do Estuda Henrique: eu sou a admin e o Henrique é o único usuário.

- **Entra aqui:** login, convites, papéis, a lista de membros, remover membro e o nome no perfil.
- **Não entra aqui:** as features do app em si (cada uma no seu arquivo de `spec/`).

## Entrar

- Eu entro só com minha conta Google. Não há login com senha. *(1)*
- Só entra quem tem convite para o e-mail da conta Google. Com outro e-mail, o app avisa que não há
  convite e não cria a conta. *(1)*
- Os primeiros admins entram sem convite, pelos e-mails configurados no servidor, só enquanto o
  grupo não tem nenhum admin. *(1)*
- Eu continuo conectada por 180 dias, até sair. *(1)*

## Papéis

| Papel | O que pode |
| --- | --- |
| Usuário | Estudar: tudo de `spec/cartas.md`, `spec/estudo.md`, `spec/diagnostico.md`, `spec/vespera.md` e `spec/meta-e-ofensiva.md`. No código, é o "membro" |
| Admin | Convidar e remover pessoas; dar e tirar o papel de admin; adicionar e editar as cartas do sistema. Não estuda e não vê nada do que o usuário faz |

- Hoje há uma admin (eu) e um usuário (o Henrique). Pode haver mais de um admin; o app não deixa
  tirar o papel do último. *(1)*
- O admin não vê respostas, termômetro, ofensiva, rotina nem as cartas pessoais do usuário, e não
  edita nada que ele fez. *(1)*
  Por quê: ele é menor de idade e eu quis assim (ADR-009).

## Membros

- O admin vê a lista do grupo, com nome, foto, e-mail e papéis. O usuário não precisa dela e a
  tela de membros só aparece para o admin. *(1)*
- O admin remove um membro depois de confirmar. Ele não remove a si mesmo: outro admin faz isso.
  Assim sempre sobra um admin. *(1)*
- Quem é removido perde o acesso na hora, inclusive no app aberto. Um convite novo traz a pessoa de
  volta, com o mesmo histórico. *(1)*

## Perfil

- Meu nome começa como o da conta Google, e eu posso mudar. Ele tem de 1 a 40 caracteres. *(1)*
- A foto é a da conta Google e se atualiza a cada login. *(1)*

## Convites

- O admin convida uma pessoa pelo e-mail dela. O convite fica ligado a esse e-mail e só vale para
  quem entra com a conta Google dele. *(1)*
- O convite não expira. Ele deixa de valer só quando o admin o revoga. *(1)*
- O admin vê a lista de convites pendentes e aceitos e pode revogar um pendente. *(1)*
