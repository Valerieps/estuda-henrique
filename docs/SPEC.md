# Spec

O que o app faz. É a fonte da verdade: quando outro documento diverge daqui, vale o spec.

- **Entra aqui:** o que o app é, para quem, as fases e qual arquivo de `spec/` cobre cada feature.
- **Não entra aqui:** as regras em si (ficam em `spec/`), o que falta construir (`ROADMAP.md`) e
  como o app é construído (`ARQUITETURA.md` e `adr/`).

## O app

Eu fiz o Estuda Henrique para o meu sobrinho, o Henrique, que está no 2º ano do Ensino Médio e
estuda Biologia para o PAS. O que mais pega para ele é decorar nomes e conceitos, e o Anki
exige configuração demais: dá preguiça antes de começar. Aqui, ele abre o app em Hoje, toca Estudar
e, em segundos, vê no termômetro quais tópicos estão fracos. Eu sou a admin: convido ele e adiciono
as cartas do sistema, sem ver nada do que ele estuda.

- É um app pessoal, para um aluno, no celular Android dele, instalado na tela de início.
- Fica na nuvem, com login Google, e precisa de internet (ADR-008). Não há backup em arquivo: os
  dados ficam no Cloudflare.
- Ele estuda de dois jeitos: um pouco por dia (Revisão) e intensivo perto da prova (Véspera).
- Constância vale mais que horas: a métrica principal é a memória de longo prazo. O app nunca trava
  o estudo, mas mostra com os números dele que voltar amanhã rende mais que mais uma hora hoje.

## Fases

Cada fase precisa ser usável sozinha. Cada regra em `spec/` diz de que fase vale, como *(1)*.

| Fase | O que entra |
| --- | --- |
| 1 | O ciclo completo de Biologia: estudar no dia a dia ou na véspera, ver o resumo, refazer os erros, adiantar novas, olhar o termômetro e a memória de longo prazo, consultar as piores cartas, manter a ofensiva. Cartas do sistema (minhas) e pessoais (dele), lacuna, colar várias |
| 2 | Biologia visual e provas: imagem e oclusão de imagem, previsão por tópico, data da prova e nota, gráfico de evolução, tags, cartas guardadas por tópico, momentos de virada, resumo semanal, recomeço |
| 3 | Outras matérias de memorização (Química, História) e o lembrete diário |

**Para passar à fase 2:** ele usar a fase 1 por 2 semanas, com pelo menos 3 sessões por semana. Se
não usar, a próxima conversa é entender o porquê, não adicionar features.

**Como saber se funcionou:** 3 ou mais sessões por semana no período letivo; olhando o termômetro,
ele sabe dizer qual tópico precisa estudar; memória de longo prazo acima de 85% e cartas guardadas
subindo semana a semana; a nota de Biologia do bimestre seguinte, comparada com a
anterior; uma conversa com ele depois de 2 semanas.

## Arquivos

| Arquivo | O que cobre |
| --- | --- |
| [spec/acesso-e-membros.md](spec/acesso-e-membros.md) | Login com Google, convites, papéis (admin e usuário) e membros |
| [spec/cartas.md](spec/cartas.md) | Matérias, tópicos, cartas do sistema e pessoais, tipos, criar em lote, suspender |
| [spec/estudo.md](spec/estudo.md) | A sessão de Revisão, FSRS, os três botões, Resumo, Refazer erros, treino |
| [spec/diagnostico.md](spec/diagnostico.md) | Domínio, cobertura, termômetro, Piores cartas, tela Tópico |
| [spec/vespera.md](spec/vespera.md) | A aba Prova e a sessão de Véspera; datas de prova |
| [spec/meta-e-ofensiva.md](spec/meta-e-ofensiva.md) | A tela Hoje, meta diária, ofensiva, rotina, cartão de aviso, Ajustes |
| [spec/_modelo.md](spec/_modelo.md) | Modelo para um arquivo de feature novo |

Os termos estão definidos em [GLOSSARIO.md](GLOSSARIO.md).
