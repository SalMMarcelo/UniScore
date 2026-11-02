# UniScore - Log de Progresso do Projeto

## 📅 Novembro 2025

### ✨ Funcionalidades Implementadas

#### 🎨 **Modernização Visual Completa**

- ✅ **Design System Unificado**
  - Gradientes modernos (roxo/rosa/azul) em todas as páginas
  - Glassmorphism effects (vidro fosco)
  - Animações e transições suaves
  - Elementos decorativos animados em todas as páginas
  - Sombras e bordas consistentes

#### 🌍 **Foco em Interculturalidade**

- ✅ **Mudança de Conceito**
  - Transição de "transculturalidade" para "interculturalidade"
  - Foco equilibrado entre avaliação geral de eventos e aspectos interculturais
  - Remoção de símbolos ativistas (LGBTQIA+)
  - Tom profissional e inclusivo mantido

#### 📄 **Páginas Modernizadas**

**Página Inicial (`/`)**

- ✅ Hero section com gradientes e animações
- ✅ Sistema de busca de universidades modernizado
- ✅ Carrossel de imagens automático (8 slides)
- ✅ Seção "Quem Somos" com design glassmorphism
- ✅ Grid de avaliações recentes com filtros
- ✅ Botão flutuante para acesso rápido ao fórum
- ✅ Menu de navegação simplificado (Fórum + Escreva uma avaliação)
- ✅ Links "Avaliar" redirecionando para `/avaliar`

**O Que Fazemos (`/o-que-fazemos`)**

- ✅ Hero section com título destacado
- ✅ Seção de vídeo apresentação
- ✅ Cards de missão e valores com efeitos glassmorphism
- ✅ Grid de funcionalidades da plataforma
- ✅ Header com navegação (Fórum + Relatórios)

**Relatórios Públicos (`/relatorio`)**

- ✅ Dashboard público de transparência
- ✅ Estatísticas animadas (contadores)
- ✅ Métricas de impacto intercultural
- ✅ Distribuição regional de universidades
- ✅ Seção "Interculturalidade" (atualizada)
- ✅ Gráficos de categorias culturais
- ✅ Header com navegação

**Página de Avaliação (`/avaliar`)**

- ✅ Formulário multi-etapas (3 etapas)
- ✅ Sistema de avaliação por estrelas
- ✅ Campo de categoria cultural (11 opções)
- ✅ Avaliações específicas: Qualidade do Conteúdo, Intercâmbio Cultural, Organização
- ✅ Limite de 280 caracteres para comentários
- ✅ Design responsivo e moderno
- ✅ Header com navegação

**Página da Universidade (`/universidade/[id]`)**

- ✅ Completa reformulação visual
- ✅ Hero section com logo e informações
- ✅ Grid com vídeo institucional + card de estatísticas
- ✅ Distribuição de estrelas com barras animadas
- ✅ Cards de avaliações modernizados
- ✅ Botão de avaliação com gradiente
- ✅ Header sticky com navegação

**Página de Perfil (`/perfil`)**

- ✅ Modernização completa
- ✅ Background com gradiente
- ✅ Header com navegação
- ✅ Design consistente com outras páginas

**Página de Avaliação da Universidade (`/universidade/[id]/avaliar`)**

- ✅ Formulário completo de avaliação
- ✅ Sistema de estrelas interativo
- ✅ Seletor de categoria cultural (opcional)
- ✅ Métricas balanceadas (Qualidade, Intercultural, Organização)
- ✅ Upload de imagem do evento
- ✅ Validação completa de campos

#### 💬 **Sistema de Fórum (Novo)**

- ✅ **Fórum Principal (`/forum`)**
  - Interface estilo Twitter/X
  - Criação de posts com texto, imagens e vídeos
  - Sistema de curtidas em tempo real
  - Limite de 280 caracteres
  - Feed atualizado em tempo real com Firebase
  - Autenticação obrigatória para postar
  - Design moderno com glassmorphism

- ✅ **Painel de Moderação (`/forum/moderacao`)**
  - Área exclusiva para moderadores
  - Filtros: Todos / Reportados / Moderados
  - Ações: Moderar, Desmoderar, Excluir posts
  - Controle de acesso via email
  - Dashboard completo de moderação

#### 🔒 **Firebase Security Rules**

- ✅ Regras para usuários (estudantes)
- ✅ Regras para avaliações (leitura pública, escrita autenticada)
- ✅ Regras para universidades (acesso próprio)
- ✅ Regras para eventos (universidades gerenciam)
- ✅ Regras para posts do fórum
- ✅ Sistema de moderadores (`isModerator()`)
- ✅ Validação de email institucional

#### 🎯 **Integração e Navegação**

- ✅ Links para fórum em todas as páginas principais
- ✅ Botão flutuante do fórum na página inicial
- ✅ Headers consistentes com navegação
- ✅ Todos os botões "Avaliar" redirecionam para `/avaliar`
- ✅ Navegação fluida entre páginas

### 📊 **Estrutura de Dados**

**Avaliações (`avaliacoes` collection)**

```javascript
{
  universidadeId: string,
  nota: number,
  comentario: string,
  titulo: string,
  data: string,
  imagem: string | null,
  categoriaCultural: string | null,
  criadoEm: timestamp,
  usuario: string,
  usuarioId: string,
  photoURL: string | null
}
```

**Posts do Fórum (`forumPosts` collection)**

```javascript
{
  conteudo: string,
  autor: {
    uid: string,
    nome: string,
    email: string,
    foto: string | null
  },
  mediaUrl: string | null,
  mediaType: 'image' | 'video' | null,
  curtidas: string[],
  comentarios: array,
  criadoEm: timestamp,
  moderado: boolean,
  moderadoPor: string | null,
  moderadoEm: date | null
}
```

### 🎨 **Design System**

**Cores Principais**

- Gradiente primário: `from-[#667eea] via-[#764ba2] to-[#f093fb]`
- Gradiente secundário: `from-[#ffe066] to-[#ff6b6b]`
- Glassmorphism: `bg-white/10 backdrop-blur-sm`

**Componentes Reutilizáveis**

- Cards com glassmorphism
- Botões com gradientes
- Headers sticky
- Elementos decorativos animados
- Stars rating system
- Loading states

### 🔐 **Moderadores Configurados**

- `salmeron.marcelo@gmail.com` (e-mail verificado; lista em `src/lib/admin.js` e `isModerator()` em `firestore.rules`)

### 📱 **Responsividade e Acessibilidade**

- ✅ Design mobile-first (breakpoints sm, md, lg, xl)
- ✅ Componente `MenuMobile` em todas as páginas
- ✅ Foco visível global, skip link (`LinkPularConteudo`) e landmark `main`
- ✅ Rótulos associados, erros com `role=alert` e nomes acessíveis em botões
- ✅ Contraste revisado, SVGs decorativos com `aria-hidden`
- ✅ Carrossel pausável e respeito a `prefers-reduced-motion`
- ✅ Diálogo acessível no aviso de instalação do PWA

## 📅 Outubro 2026 — Fase 3

### ✨ **Funcionalidades Implementadas**

- ✅ **Cadastro completo**: tipo de perfil, universidade, login social e modo `/perfil?completar=1`
- ✅ **Denúncias**: botão Denunciar em posts, comentários e avaliações; conteúdo moderado fica oculto
- ✅ **Gamificação**: painel de conquistas no perfil, pontos, estrelas, selos e página `/ranking`
- ✅ **Busca**: busca da home leva a `/eventos`, com sugestões acessíveis por teclado (RF06)
- ✅ **Painel administrativo (`/admin`)**: denúncias, universidades, avaliações, fórum, eventos, estatísticas e exportação CSV/PDF; `/forum/moderacao` redireciona para o painel
- ✅ **Regras do Firestore**: validação de `tipoPerfil`, `nome` e `universidadeId`; regras anti-fraude no fórum e moderação nas avaliações
- ✅ **Internacionalização (RNF07)**: pt-BR e en-US em todas as páginas, com `I18nProvider`, `SeletorIdioma` e dicionários em `src/i18n/` (pt-BR é a fonte da verdade; manter as mesmas chaves em en-US)

- ✅ **Relatório público (`/relatorio`) com dados reais**: avaliações (total e do mês), nota média, eventos, posts, avaliações por mês, impacto intercultural (médias dos critérios), avaliações por tema, eventos por tipo e avaliações recentes, via agregações do Firestore (`src/lib/estatisticas.js`)
- ✅ **Fórum**: busca (texto, autor e comentários, sem diferenciar acentos), filtro por tema, "só com mídia", "só meus posts", ordenação (recentes, curtidos, comentados), tema opcional ao publicar e respostas a comentários (um nível, campo `respostaA`) — lógica em `src/lib/forum.js`
- ✅ **Mídia no fórum**: imagens até 10 MB e vídeos até 50 MB, validados no cliente e em `storage.rules`
- ✅ **Paginação do fórum**: 20 posts por vez em tempo real, botão "Carregar mais posts"; o post de um link `/forum#id` (notificações) é buscado à parte se ainda não foi carregado, e a página rola até ele com destaque
- ✅ **Testes das regras**: `npm run test:rules` (150 casos no emulador)
- ✅ **Filtros do fórum no servidor**: tema, "só meus posts", "só com mídia" e a ordenação (recentes, curtidos, comentados) são consultas no Firestore com índices; os posts guardam `totalCurtidas`/`totalComentarios`, gravados em transação e validados pelas regras. Posts antigos ganham os contadores pelo botão "Recalcular contadores" no painel admin (aba Fórum). A busca por texto continua valendo só para os posts carregados
- ✅ **Notificações**: curtidas, comentários, respostas e ações da moderação; sino com não lidas, página `/notificacoes`; regras aceitam só notificações ligadas a uma ação real (`src/lib/notificacoes.js`)

### ⏳ **Pendências (para 23/10/2026)**

1. **Credencial do deploy automático**: criar a conta de serviço `github-deploy` no Google Cloud (papéis: Administrador de regras do Firebase, Administrador de índices do Cloud Datastore, Consumidor do Service Usage), baixar a chave JSON e salvá-la no GitHub como secret `FIREBASE_SERVICE_ACCOUNT` (Settings → Secrets and variables → Actions); depois apagar o arquivo baixado. Sem isso o job `publicar` do workflow "Regras do Firebase" falha e as regras continuam sendo publicadas à mão
2. **Decidir o caminho das notificações push**: Netlify Functions (grátis) ou Cloud Functions (plano Blaze)

### 🚀 **Próximos Passos Sugeridos**

1. **Notificações push (PWA)** — avisar fora do site via Firebase Cloud Messaging
2. **Busca por texto no servidor** — hoje vale só para os posts carregados; exigiria um serviço de busca (ex.: Algolia ou Typesense via extensão do Firebase)
3. **Usuários no relatório público** — exige um contador mantido no servidor (Cloud Function), pois as regras não permitem contar `users`

### 📝 **Notas Técnicas**

**Stack Tecnológica**

- Next.js 16.2 (Turbopack)
- React 19
- Tailwind CSS 4
- Firebase (Auth + Firestore + Storage)
- JavaScript (ES6+)

**Build**

- O build precisa das variáveis `NEXT_PUBLIC_FIREBASE_*` (em `.env.local`); sem elas o prerender falha com `auth/invalid-api-key`

**Testes das regras**

- `npm run test:rules` sobe os emuladores do Firestore e do Storage e roda `tests/regras/*.test.mjs` (150 casos: usuários, avaliações, universidades, eventos, fórum, denúncias, notificações e uploads)
- Precisa de Java 21+ no PATH (exigência do `firebase-tools`); não usa nenhum projeto real (`demo-uniscore`)
- Toda mudança em `firestore.rules` ou `storage.rules` deve vir com casos novos aqui

**Padrões de Código**

- "use client" para componentes interativos
- Hooks: useState, useEffect, useParams, useRouter
- Real-time updates com onSnapshot
- Server timestamps do Firebase
- Textos de interface sempre via `t("chave")` do `useI18n()`

---

**Última atualização:** 22 de Outubro de 2026  
**Status do Projeto:** ✅ Fase 3 concluída (moderação, gamificação, admin, acessibilidade e i18n)  
**Próximo Milestone:** 🔔 Notificações push (PWA)
