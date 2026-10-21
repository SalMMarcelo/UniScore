// en-US dictionary. Must have exactly the same keys as pt-BR.js.

const enUS = {
  comum: {
    pularConteudo: "Skip to content",
    carregando: "Loading...",
    redirecionando: "Redirecting...",
    usuario: "User",
    participante: "Participant",
    cancelar: "Cancel",
    salvar: "Save",
    fechar: "Close",
    voltar: "Back",
    sim: "yes",
    nao: "no",
    traco: "—"
  },

  idioma: {
    rotulo: "Language",
    portugues: "Português (Brasil)",
    ingles: "English (US)"
  },

  menu: {
    abrir: "Open menu",
    fechar: "Close menu",
    principal: "Main menu",
    navPrincipal: "Main",
    inicio: "Home",
    buscarEventos: "Find events",
    forum: "Forum",
    escrevaAvaliacao: "Write a review",
    ranking: "Ranking",
    paraUniversidades: "For universities",
    perfil: "Profile",
    entrar: "Sign in"
  },

  valores: {
    temas: {
      interculturalidade: "Interculturality",
      tecnologia: "Technology",
      inovacao_e_empreendedorismo: "Innovation and Entrepreneurship",
      ciencias_exatas: "Exact Sciences",
      ciencias_biologicas_e_saude: "Biological and Health Sciences",
      ciencias_humanas: "Humanities",
      ciencias_sociais_aplicadas: "Applied Social Sciences",
      direito: "Law",
      educacao: "Education",
      engenharia: "Engineering",
      artes_e_cultura: "Arts and Culture",
      meio_ambiente_e_sustentabilidade: "Environment and Sustainability",
      diversidade_e_inclusao: "Diversity and Inclusion",
      politica_e_sociedade: "Politics and Society",
      carreira_e_mercado_de_trabalho: "Careers and Job Market",
      esportes: "Sports",
      outro: "Other"
    },
    tipos: {
      palestra: "Lecture",
      workshop: "Workshop",
      congresso: "Conference",
      feira: "Fair",
      cultural: "Cultural",
      esportivo: "Sports",
      academico: "Academic",
      outro: "Other"
    },
    publicos: {
      universitarios: "University students",
      familiares: "Family members",
      visitantes: "Visitors",
      convidados: "Guests",
      todos: "Everyone"
    },
    tiposPerfil: {
      universitario: "University student",
      familiar: "Family member",
      visitante: "Visitor",
      convidado: "Guest"
    },
    motivosDenuncia: {
      ofensivo: "Offensive content",
      spam: "Spam or advertising",
      discriminacao: "Discrimination or hate speech",
      informacao_falsa: "False information",
      outro: "Other reason"
    },
    tiposDenuncia: {
      post: "Forum post",
      comentario: "Forum comment",
      avaliacao: "Review"
    }
  },

  erros: {
    auth: {
      contaExistenteComEmail: "An account with the email {email} already exists using another sign-in method. Sign in with the method you originally used (for example, email and password or Google).",
      contaExistente: "An account with this email already exists using another sign-in method. Sign in with the method you originally used (for example, email and password or Google).",
      popupFechado: "The sign-in window was closed before finishing. Please try again.",
      popupBloqueado: "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
      naoHabilitadoCom: "Sign-in with {provedor} is not enabled on the platform yet. Please use another sign-in method.",
      naoHabilitado: "Sign-in is not enabled on the platform yet. Please use another sign-in method.",
      dominioNaoAutorizado: "This domain is not authorized for sign-in. Please let the platform administrator know.",
      falhaConexao: "Connection failed. Check your internet connection and try again.",
      emailEmUso: "This email is already registered. Sign in or use another email.",
      emailInvalido: "Invalid email.",
      senhaFraca: "The password must be at least 6 characters long.",
      contaDesativada: "This account has been disabled.",
      muitasTentativas: "Too many attempts. Wait a few minutes and try again.",
      falhaAutenticarCom: "Failed to authenticate with {provedor}.",
      generico: "The operation could not be completed. Please try again."
    },
    carregarUniversidades: "Could not load the list of universities",
    denuncia: {
      precisaLogin: "You need to be signed in to report content.",
      tipoInvalido: "Invalid report type.",
      escolhaMotivo: "Choose a reason.",
      conteudoInvalido: "Invalid content."
    }
  },

  gamificacao: {
    niveis: {
      "1": "Beginner",
      "2": "Participant",
      "3": "Contributor",
      "4": "Reference",
      "5": "UniScore Ambassador"
    },
    selos: {
      "primeira-avaliacao": { nome: "First review", descricao: "Publish your first event review." },
      "avaliador-dedicado": { nome: "Dedicated reviewer", descricao: "Review 10 different events." },
      "olhar-intercultural": { nome: "Intercultural eye", descricao: "Answer the Interculturality criterion in 5 reviews." },
      "atento-acessibilidade": { nome: "Accessibility-minded", descricao: "Answer the Accessibility criterion in 5 reviews." },
      reporter: { nome: "Reporter", descricao: "Publish 5 reviews with an image." },
      debatedor: { nome: "Debater", descricao: "Post 10 comments on the forum." },
      popular: { nome: "Popular", descricao: "Get 50 likes on your forum posts." },
      explorador: { nome: "Explorer", descricao: "Review events from 3 different universities." }
    },
    detalhamento: {
      avaliacao: "Reviews",
      bonusComentario: "Bonus: comment with {min}+ characters",
      bonusImagem: "Bonus: review with an image",
      bonusCriterios: "Bonus: all criteria answered",
      post: "Forum posts",
      bonusMidia: "Bonus: post with media",
      comentario: "Forum comments",
      curtidaRecebida: "Likes received"
    }
  },

  acesso: {
    tiposAcesso: "Access type",
    estudante: "Student / Visitor",
    universidade: "Partner university",
    avisoAdmin: "Are you a platform administrator? Sign in here — access is granted automatically based on your registered email.",
    email: "Email",
    senha: "Password",
    placeholderEmail: "you@email.com",
    mostrarSenha: "Show password",
    ocultarSenha: "Hide password",
    entrando: "Signing in...",
    entrar: "Sign in",
    continuar: "Continue"
  },

  loginSocial: {
    acaoComProvedor: "{acao} with {provedor}"
  },

  login: {
    titulo: "Welcome back!",
    subtitulo: "Sign in to keep reviewing university events",
    credenciaisInvalidas: "Invalid username or password.",
    ouContinueCom: "Or continue with",
    naoTemConta: "Don't have an account?",
    cadastreSe: "Sign up for free",
    painelTitulo: "Review university events",
    painelTexto: "Share your experiences and help other students discover the best cultural and academic events.",
    recursoAvalie: "Review events and universities",
    recursoForum: "Join the student forum",
    recursoRelatorios: "Access reports and statistics"
  },

  loginUniversidades: {
    titulo: "Institutional Access",
    subtitulo: "Sign-in exclusively for partner universities",
    erroVerificar: "Error verifying the account. Please try again.",
    naoEUniversidade: "This account does not belong to a partner university. Use the student sign-in or register your university.",
    usuarioNaoEncontrado: "User not found. Check whether your university is registered.",
    senhaIncorreta: "Incorrect password. Please try again.",
    emailInvalido: "Invalid email. Check the email format.",
    erroLogin: "Error signing in. Check your credentials.",
    emailInstitucional: "Institutional Email",
    placeholderEmail: "dean@university.edu",
    ajudaEmail: "Use your institution's official email",
    acessarDashboard: "Open Dashboard",
    esqueceuSenha: "Forgot your password?",
    aindaNaoParceira: "Not a partner yet?",
    solicitarParceria: "Request Partnership",
    precisaAjuda: "Need help? Contact our",
    suporte: "dedicated support team",
    painelTitulo: "Institutional Dashboard",
    painelTexto: "Manage events, monitor reviews and strengthen your university's reputation.",
    recursoMetricas: "Metrics and performance analysis",
    recursoEventos: "Complete event management",
    recursoFeedbacks: "Feedback monitoring",
    recursoSeguranca: "Secure data and privacy",
    statUniversidades: "Partner Universities",
    statEventos: "Registered Events"
  },

  cadastro: {
    titulo: "Sign up",
    escolhaAvatar: "Choose your avatar",
    avatarMasculino: "Male avatar",
    avatarFeminino: "Female avatar",
    nome: "Name",
    placeholderSenha: "Password (at least 6 characters)",
    ajudaSenha: "At least 6 characters.",
    escolhaTipoPerfil: "Choose your profile type.",
    erroCadastrar: "Sign-up error: {mensagem}",
    sucesso: "Sign-up successful! Redirecting...",
    cadastrando: "Signing up...",
    cadastrar: "Sign up",
    ouCadastreCom: "Or sign up with",
    jaTemConta: "Already have an account?"
  },

  seletorPerfil: {
    escolha: "Choose your profile type",
    tipo: "Profile type",
    universidade: "University",
    opcional: "(optional)",
    prefiroNaoInformar: "I'd rather not say"
  },

  cadastroUniversidades: {
    voltar: "Back",
    tituloAntes: "Institutional",
    tituloDestaque: "registration",
    subtitulo: "Become a UniScore partner university",
    senhasNaoCoincidem: "Passwords do not match",
    erroCriar: "Error creating the account. Please try again.",
    nomeUniversidade: "University Name",
    placeholderNome: "Federal University of...",
    cnpj: "CNPJ (Brazilian company ID)",
    emailInstitucional: "Institutional Email",
    placeholderEmail: "contact@university.edu",
    telefone: "Phone",
    placeholderTelefone: "(11) 99999-9999",
    endereco: "Address",
    placeholderEndereco: "City, State",
    responsavel: "Contact person",
    placeholderResponsavel: "Full name",
    cargo: "Position",
    placeholderCargo: "Dean, Director, etc.",
    senha: "Password",
    confirmarSenha: "Confirm Password",
    processoTitulo: "Approval process:",
    processoTexto: "After you submit, our team will review your request. The process may take up to 3 business days. You will receive an email with the result.",
    enviando: "Sending request...",
    solicitar: "Request partnership",
    jaPossuiConta: "Already have an account?",
    fazerLogin: "Sign In"
  },

  cadastroSucesso: {
    tituloAntes: "Request",
    tituloDestaque: "Sent!",
    obrigado: "Thank you for your interest in becoming a UniScore partner university!",
    proximosPassos: "Next Steps",
    passo1Titulo: "Request Review",
    passo1Texto: "Our team will review all the information provided and verify the institution's authenticity.",
    passo2Titulo: "Email Contact",
    passo2Texto: "You will receive an email with the review result within 3 business days.",
    passo3Titulo: "Account Activation",
    passo3Texto: "Once approved, your account will be activated and you will be able to access the institutional dashboard.",
    enquantoIsso: "In the meantime, you can already sign in with the credentials you provided.",
    fazerLogin: "Sign In",
    voltarInicio: "Back to Home",
    duvidas: "Questions? Contact us:"
  },

  redirecionamento: {
    paraAvaliacao: "Redirecting to the review...",
    paraPainelAntes: "Redirecting to the",
    painelAdministrativo: "admin panel",
    paraPainelDepois: "..."
  },

  // @@novas-secoes
};

export default enUS;
