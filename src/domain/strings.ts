// Every user-facing text, in Brazilian Portuguese, in the app's voice (docs/GLOSSARIO.md has the
// terms). The UI imports from here; it never writes its own text.
export const strings = {
  appName: 'Estuda Henrique',
  genericError: 'Algo deu errado. Tenta de novo?',
  retry: 'Tentar de novo',
  forbidden: 'Você não tem permissão para isso.',
  offline: 'Sem conexão. Mostrando o último estado carregado.',

  signIn: {
    tagline: 'Flashcards de Biologia: abra, estude e veja onde você está fraco.',
    button: 'Entrar com Google',
    noInvite: 'Não há convite para esse e-mail. Peça a um admin para te convidar.',
    failed: 'O login não deu certo. Tenta de novo?',
    devTitle: 'Entrar sem Google (só para testes neste computador)',
    devEmail: 'E-mail',
    devName: 'Nome',
    devButton: 'Entrar para testar',
    devHint: 'Precisa de DEV_SIGN_IN=1 no .dev.vars. As mesmas regras de convite valem.',
    devOff: 'O login de teste está desligado. Ponha DEV_SIGN_IN=1 no .dev.vars e reinicie o servidor.',
  },

  nav: {
    main: 'Navegação principal',
    today: 'Hoje',
    subjects: 'Matérias',
    exam: 'Prova',
    worst: 'Piores cartas',
    systemCards: 'Cartas do sistema',
    members: 'Membros',
    invites: 'Convites',
    create: 'Criar',
    settings: 'Ajustes',
    signOut: 'Sair',
  },

  create: {
    title: 'Criar',
    close: 'Fechar',
    newCard: 'Nova carta',
    pasteMany: 'Colar várias',
    back: 'Voltar',
  },

  card: {
    title: 'Nova carta',
    topic: 'Tópico',
    kind: 'Tipo',
    basic: 'Básica',
    cloze: 'Lacuna',
    front: 'Frente (pergunta)',
    clozeFront: 'Frase com {{lacunas}}',
    clozeHelp: 'Marque cada trecho escondido entre {{ e }}. Cada trecho vira uma carta.',
    clozeCount: (n: number) => (n === 1 ? 'Essa frase cria 1 carta.' : `Essa frase cria ${n} cartas.`),
    back: 'Verso (resposta)',
    hint: 'Macete (opcional)',
    save: 'Salvar carta',
    saved: (topic: string) => `Carta criada em ${topic}.`,
    needsClozeGap: 'Marque pelo menos um trecho entre {{ e }}.',
    noTopics: 'Ainda não há tópicos para guardar cartas.',
  },

  paste: {
    title: 'Colar várias',
    topic: 'Tópico',
    text: 'Cartas, uma por linha',
    help: 'Pergunta ; Resposta ; Macete (opcional). Ou uma frase com {{lacunas}}.',
    save: (n: number) => (n === 1 ? 'Criar 1 carta' : `Criar ${n} cartas`),
    saved: (n: number, topic: string) => (n === 1 ? `1 carta criada em ${topic}.` : `${n} cartas criadas em ${topic}.`),
    recognized: (lines: number, cards: number) =>
      `${lines === 1 ? '1 linha reconhecida' : `${lines} linhas reconhecidas`}, ${cards === 1 ? '1 carta' : `${cards} cartas`}.`,
    unrecognizedTitle: (n: number) => (n === 1 ? '1 linha não reconhecida' : `${n} linhas não reconhecidas`),
    unrecognizedHelp: 'Corrija aqui ou apague a linha. Sem "Pergunta ; Resposta" ou {{lacuna}}, ela não vira carta.',
    notRecognized: 'Não reconhecida.',
    fixLine: (n: number) => `Corrigir a linha ${n}`,
    nothing: 'Cole as cartas acima para ver a prévia.',
  },

  subjects: {
    title: 'Matérias',
    topicsOf: (subject: string) => `Tópicos de ${subject}`,
    noTopics: 'Sem tópicos ainda.',
    empty: 'Ainda não há matérias.',
    loading: 'Carregando...',
  },

  // Empty screens of the shell: each later feature replaces its own.
  empty: {
    today: { title: 'Hoje', text: 'Quando houver cartas para estudar, elas aparecem aqui.' },
    exam: { title: 'Prova', text: 'Aqui você monta a Véspera: escolha os tópicos da prova e estude.' },
    worst: { title: 'Piores cartas', text: 'As cartas em que você mais erra aparecem aqui, depois de algumas sessões.' },
    systemCards: { title: 'Cartas do sistema', text: 'As cartas do sistema aparecem aqui.' },
    settings: { title: 'Ajustes', text: 'Os ajustes de estudo aparecem aqui.' },
    study: { title: 'Sessão', text: 'Nenhuma carta para estudar agora.' },
  },

  study: {
    exit: 'Sair da sessão',
    exitTitle: 'Sair da sessão?',
    exitText: 'As respostas ficam salvas.',
    exitNow: 'Sair agora',
    keepGoing: 'Continuar',
  },

  invites: {
    title: 'Convites',
    emailLabel: 'E-mail da conta Google',
    send: 'Convidar',
    revoke: 'Revogar',
    pending: 'Pendente',
    accepted: 'Aceito',
    revoked: 'Revogado',
    invalidEmail: 'Esse e-mail não parece certo.',
    alreadyMember: 'Essa pessoa já está no grupo.',
    empty: 'Nenhum convite ainda.',
  },

  members: {
    title: 'Membros',
    you: '(você)',
    admin: 'Admin',
    member: 'Usuário',
    makeAdmin: 'Admin',
    rolesOf: (name: string) => `Papéis de ${name}`,
    lastAdmin: 'O grupo precisa de pelo menos um admin. Dê o papel a outra pessoa antes.',
    remove: 'Remover',
    removeOf: (name: string) => `Remover ${name} do grupo`,
    removeConfirm: (name: string) => `Remover ${name} do grupo? O acesso acaba na hora. Para voltar, é só convidar de novo.`,
    empty: 'Só você por aqui. Convide alguém!',
  },
} as const;
