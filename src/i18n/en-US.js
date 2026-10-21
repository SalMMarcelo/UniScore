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

  // @@novas-secoes
};

export default enUS;
