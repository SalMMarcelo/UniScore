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

  // @@novas-secoes
};

export default ptBR;
