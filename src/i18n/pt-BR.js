// Dicionário pt-BR (fonte da verdade). Mantenha as mesmas chaves em en-US.js.
// Agrupado por página/componente. Variáveis: {nome}.

const ptBR = {
  comum: {
    pularConteudo: "Pular para o conteúdo",
    carregando: "Carregando...",
    redirecionando: "Redirecionando...",
    usuario: "Usuário",
    participante: "Participante",
    cancelar: "Cancelar",
    salvar: "Salvar",
    fechar: "Fechar",
    voltar: "Voltar",
    sim: "sim",
    nao: "não",
    traco: "—"
  },

  idioma: {
    rotulo: "Idioma",
    portugues: "Português (Brasil)",
    ingles: "English (US)"
  },

  menu: {
    abrir: "Abrir menu",
    fechar: "Fechar menu",
    principal: "Menu principal",
    navPrincipal: "Principal",
    inicio: "Início",
    buscarEventos: "Buscar eventos",
    forum: "Fórum",
    escrevaAvaliacao: "Escreva uma avaliação",
    ranking: "Ranking",
    paraUniversidades: "Para universidades",
    perfil: "Perfil",
    entrar: "Entrar"
  },

  // Rótulos de valores gravados no Firestore (o valor gravado não muda)
  valores: {
    temas: {
      interculturalidade: "Interculturalidade",
      tecnologia: "Tecnologia",
      inovacao_e_empreendedorismo: "Inovação e Empreendedorismo",
      ciencias_exatas: "Ciências Exatas",
      ciencias_biologicas_e_saude: "Ciências Biológicas e Saúde",
      ciencias_humanas: "Ciências Humanas",
      ciencias_sociais_aplicadas: "Ciências Sociais Aplicadas",
      direito: "Direito",
      educacao: "Educação",
      engenharia: "Engenharia",
      artes_e_cultura: "Artes e Cultura",
      meio_ambiente_e_sustentabilidade: "Meio Ambiente e Sustentabilidade",
      diversidade_e_inclusao: "Diversidade e Inclusão",
      politica_e_sociedade: "Política e Sociedade",
      carreira_e_mercado_de_trabalho: "Carreira e Mercado de Trabalho",
      esportes: "Esportes",
      outro: "Outro"
    },
    tipos: {
      palestra: "Palestra",
      workshop: "Workshop",
      congresso: "Congresso",
      feira: "Feira",
      cultural: "Cultural",
      esportivo: "Esportivo",
      academico: "Acadêmico",
      outro: "Outro"
    },
    publicos: {
      universitarios: "Universitários",
      familiares: "Familiares",
      visitantes: "Visitantes",
      convidados: "Convidados",
      todos: "Todos"
    },
    tiposPerfil: {
      universitario: "Universitário",
      familiar: "Familiar",
      visitante: "Visitante",
      convidado: "Convidado"
    },
    motivosDenuncia: {
      ofensivo: "Conteúdo ofensivo",
      spam: "Spam ou propaganda",
      discriminacao: "Discriminação ou discurso de ódio",
      informacao_falsa: "Informação falsa",
      outro: "Outro motivo"
    },
    tiposDenuncia: {
      post: "Post do fórum",
      comentario: "Comentário do fórum",
      avaliacao: "Avaliação"
    }
  },

  // Mensagens de src/lib/usuarios.js (mensagemErroAuth) e afins
  erros: {
    auth: {
      contaExistenteComEmail: "Já existe uma conta com o e-mail {email} criada por outro método de login. Entre usando o método que você usou originalmente (por exemplo, e-mail e senha ou Google).",
      contaExistente: "Já existe uma conta com este e-mail criada por outro método de login. Entre usando o método que você usou originalmente (por exemplo, e-mail e senha ou Google).",
      popupFechado: "A janela de login foi fechada antes de concluir. Tente novamente.",
      popupBloqueado: "O navegador bloqueou a janela de login. Permita pop-ups para este site e tente novamente.",
      naoHabilitadoCom: "O login com {provedor} ainda não está habilitado na plataforma. Use outro método de acesso.",
      naoHabilitado: "O login ainda não está habilitado na plataforma. Use outro método de acesso.",
      dominioNaoAutorizado: "Este domínio não está autorizado para login. Avise o administrador da plataforma.",
      falhaConexao: "Falha de conexão. Verifique sua internet e tente novamente.",
      emailEmUso: "Este e-mail já está cadastrado. Faça login ou use outro e-mail.",
      emailInvalido: "E-mail inválido.",
      senhaFraca: "A senha deve ter pelo menos 6 caracteres.",
      contaDesativada: "Esta conta foi desativada.",
      muitasTentativas: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      falhaAutenticarCom: "Falha ao autenticar com {provedor}.",
      generico: "Não foi possível concluir a operação. Tente novamente."
    },
    carregarUniversidades: "Não foi possível carregar a lista de universidades",
    denuncia: {
      precisaLogin: "É preciso estar logado para denunciar.",
      tipoInvalido: "Tipo de denúncia inválido.",
      escolhaMotivo: "Escolha um motivo.",
      conteudoInvalido: "Conteúdo inválido."
    }
  },

  // Gamificação (src/lib/gamificacao.js): níveis, selos e detalhamento de pontos
  gamificacao: {
    niveis: {
      "1": "Iniciante",
      "2": "Participante",
      "3": "Colaborador",
      "4": "Referência",
      "5": "Embaixador UniScore"
    },
    selos: {
      "primeira-avaliacao": { nome: "Primeira avaliação", descricao: "Publique sua primeira avaliação de evento." },
      "avaliador-dedicado": { nome: "Avaliador dedicado", descricao: "Avalie 10 eventos diferentes." },
      "olhar-intercultural": { nome: "Olhar intercultural", descricao: "Responda o critério Interculturalidade em 5 avaliações." },
      "atento-acessibilidade": { nome: "Atento à acessibilidade", descricao: "Responda o critério Acessibilidade em 5 avaliações." },
      reporter: { nome: "Repórter", descricao: "Publique 5 avaliações com imagem." },
      debatedor: { nome: "Debatedor", descricao: "Faça 10 comentários no fórum." },
      popular: { nome: "Popular", descricao: "Receba 50 curtidas nos seus posts do fórum." },
      explorador: { nome: "Explorador", descricao: "Avalie eventos de 3 universidades diferentes." }
    },
    detalhamento: {
      avaliacao: "Avaliações",
      bonusComentario: "Bônus: comentário com {min}+ caracteres",
      bonusImagem: "Bônus: avaliação com imagem",
      bonusCriterios: "Bônus: todos os critérios respondidos",
      post: "Posts no fórum",
      bonusMidia: "Bônus: post com mídia",
      comentario: "Comentários no fórum",
      curtidaRecebida: "Curtidas recebidas"
    }
  },

  // Campos e ações comuns aos formulários de acesso
  acesso: {
    tiposAcesso: "Tipo de acesso",
    estudante: "Estudante / Visitante",
    universidade: "Universidade parceira",
    avisoAdmin: "É administrador da plataforma? Entre por aqui — o acesso é liberado automaticamente pelo seu e-mail cadastrado.",
    email: "E-mail",
    senha: "Senha",
    placeholderEmail: "seu@email.com",
    mostrarSenha: "Mostrar senha",
    ocultarSenha: "Ocultar senha",
    entrando: "Entrando...",
    entrar: "Entrar",
    continuar: "Continuar"
  },

  loginSocial: {
    acaoComProvedor: "{acao} com {provedor}"
  },

  login: {
    titulo: "Bem-vindo de volta!",
    subtitulo: "Entre para continuar avaliando eventos universitários",
    credenciaisInvalidas: "Usuário ou senha inválidos.",
    ouContinueCom: "Ou continue com",
    naoTemConta: "Não tem uma conta?",
    cadastreSe: "Cadastre-se grátis",
    painelTitulo: "Avalie eventos universitários",
    painelTexto: "Compartilhe suas experiências e ajude outros estudantes a descobrir os melhores eventos culturais e acadêmicos.",
    recursoAvalie: "Avalie eventos e universidades",
    recursoForum: "Participe do fórum estudantil",
    recursoRelatorios: "Acesse relatórios e estatísticas"
  },

  loginUniversidades: {
    titulo: "Acesso Institucional",
    subtitulo: "Login exclusivo para universidades parceiras",
    erroVerificar: "Erro ao verificar a conta. Tente novamente.",
    naoEUniversidade: "Esta conta não é de uma universidade parceira. Use o login de estudante ou cadastre sua universidade.",
    usuarioNaoEncontrado: "Usuário não encontrado. Verifique se sua universidade está cadastrada.",
    senhaIncorreta: "Senha incorreta. Tente novamente.",
    emailInvalido: "Email inválido. Verifique o formato do email.",
    erroLogin: "Erro ao fazer login. Verifique suas credenciais.",
    emailInstitucional: "Email Institucional",
    placeholderEmail: "reitor@universidade.edu.br",
    ajudaEmail: "Use seu email oficial da instituição",
    acessarDashboard: "Acessar Dashboard",
    esqueceuSenha: "Esqueceu sua senha?",
    aindaNaoParceira: "Ainda não é parceira?",
    solicitarParceria: "Solicitar Parceria",
    precisaAjuda: "Precisa de ajuda? Entre em contato com nosso",
    suporte: "suporte especializado",
    painelTitulo: "Dashboard Institucional",
    painelTexto: "Gerencie eventos, monitore avaliações e fortaleça a reputação da sua universidade.",
    recursoMetricas: "Análise de métricas e desempenho",
    recursoEventos: "Gestão completa de eventos",
    recursoFeedbacks: "Monitoramento de feedbacks",
    recursoSeguranca: "Dados seguros e privacidade",
    statUniversidades: "Universidades Parceiras",
    statEventos: "Eventos Cadastrados"
  },

  cadastro: {
    titulo: "Cadastro",
    escolhaAvatar: "Escolha seu avatar",
    avatarMasculino: "Avatar masculino",
    avatarFeminino: "Avatar feminino",
    nome: "Nome",
    placeholderSenha: "Senha (mínimo 6 caracteres)",
    ajudaSenha: "Mínimo de 6 caracteres.",
    escolhaTipoPerfil: "Escolha seu tipo de perfil.",
    erroCadastrar: "Erro ao cadastrar: {mensagem}",
    sucesso: "Cadastro realizado com sucesso! Redirecionando...",
    cadastrando: "Cadastrando...",
    cadastrar: "Cadastrar",
    ouCadastreCom: "Ou cadastre-se com",
    jaTemConta: "Já tem uma conta?"
  },

  seletorPerfil: {
    escolha: "Escolha seu tipo de perfil",
    tipo: "Tipo de perfil",
    universidade: "Universidade",
    opcional: "(opcional)",
    prefiroNaoInformar: "Prefiro não informar"
  },

  cadastroUniversidades: {
    voltar: "Voltar",
    tituloAntes: "Cadastro",
    tituloDestaque: "institucional",
    subtitulo: "Torne-se uma universidade parceira da UniScore",
    senhasNaoCoincidem: "As senhas não coincidem",
    erroCriar: "Erro ao criar conta. Tente novamente.",
    nomeUniversidade: "Nome da Universidade",
    placeholderNome: "Universidade Federal do...",
    cnpj: "CNPJ",
    emailInstitucional: "Email Institucional",
    placeholderEmail: "contato@universidade.edu.br",
    telefone: "Telefone",
    placeholderTelefone: "(11) 99999-9999",
    endereco: "Endereço",
    placeholderEndereco: "Cidade, Estado",
    responsavel: "Responsável",
    placeholderResponsavel: "Nome completo",
    cargo: "Cargo",
    placeholderCargo: "Reitor, Diretor, etc.",
    senha: "Senha",
    confirmarSenha: "Confirmar Senha",
    processoTitulo: "Processo de aprovação:",
    processoTexto: "Após o envio, nossa equipe irá revisar sua solicitação. O processo pode levar até 3 dias úteis. Você receberá um email com o resultado.",
    enviando: "Enviando solicitação...",
    solicitar: "Solicitar parceria",
    jaPossuiConta: "Já possui uma conta?",
    fazerLogin: "Fazer Login"
  },

  cadastroSucesso: {
    tituloAntes: "Solicitação",
    tituloDestaque: "Enviada!",
    obrigado: "Obrigado por se interessar em se tornar uma universidade parceira da UniScore!",
    proximosPassos: "Próximos Passos",
    passo1Titulo: "Análise da Solicitação",
    passo1Texto: "Nossa equipe irá revisar todas as informações fornecidas e verificar a autenticidade da instituição.",
    passo2Titulo: "Contato por Email",
    passo2Texto: "Você receberá um email com o resultado da análise em até 3 dias úteis.",
    passo3Titulo: "Ativação da Conta",
    passo3Texto: "Após a aprovação, sua conta será ativada e você poderá acessar o dashboard institucional.",
    enquantoIsso: "Enquanto isso, você já pode fazer login com as credenciais fornecidas.",
    fazerLogin: "Fazer Login",
    voltarInicio: "Voltar ao Início",
    duvidas: "Dúvidas? Entre em contato conosco:"
  },

  redirecionamento: {
    paraAvaliacao: "Redirecionando para a avaliação...",
    paraPainelAntes: "Redirecionando para o",
    painelAdministrativo: "painel administrativo",
    paraPainelDepois: "..."
  },

  // @@novas-secoes
};

export default ptBR;
