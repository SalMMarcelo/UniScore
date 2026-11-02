# UniScore

Plataforma de avaliação de eventos universitários com foco intercultural.
Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4 + Firebase (Auth, Firestore, Storage).
JavaScript puro (sem TypeScript). Site publicado pelo Netlify; regras e índices do Firebase pelo
GitHub Actions (`.github/workflows/firebase-regras.yml`).

- Especificação: `docs/UniScore_Spec_IEEE830.md` (RF01–RF08, RNF01–RNF07)
- Histórico e decisões: `PROGRESS.md` (atualize ao concluir uma funcionalidade)
- Contratos de funcionalidades em andamento: `docs/*.md` (ex.: `docs/checkin-presenca.md`)

## Comandos

```bash
npm run dev          # servidor local
npm run build        # precisa de .env.local (NEXT_PUBLIC_FIREBASE_*); sem ele: auth/invalid-api-key
npm run test:i18n    # pt-BR e en-US com as mesmas chaves
# Testes das regras (emulador; precisa de Java 21 e de um emulador por vez na máquina):
PATH=/usr/lib/jvm/java-21-openjdk-amd64/bin:$PATH flock /tmp/uniscore-emulador.lock npm run test:rules
```

**Dependências**: o CI usa Node 22 (npm 10) com `npm ci`, e o npm local é mais novo e grava um lock que o npm 10
recusa. Ao instalar ou atualizar pacotes, regenere o lock com `npx -y npm@10 install --package-lock-only`.

Não há testes de interface; valide páginas com `npm run build` e, quando possível, abrindo no navegador.

## Regras do código

- **Idioma**: código, comentários, nomes e mensagens de commit em português (sem acento nos commits:
  `feat: ...`, `fix: ...`, `test: ...`, `docs: ...`, `ci: ...`).
- **i18n (RNF07)**: todo texto de interface via `t("secao.chave")` de `useI18n()`
  (`src/i18n/I18nProvider.js`). `src/i18n/pt-BR.js` é a fonte da verdade; acrescente a mesma chave em
  `src/i18n/en-US.js`. Seções novas vão antes do marcador `// @@novas-secoes`. Rode `npm run test:i18n`.
- **Regras do Firebase**: toda mudança em `firestore.rules` ou `storage.rules` vem com casos novos em
  `tests/regras/*.test.mjs` (padrão: `criarAmbiente()` de `tests/regras/ambiente.mjs`, `assertSucceeds`/
  `assertFails`). Comente no próprio arquivo de regras o porquê de cada restrição e qual código cliente grava
  o documento. Consultas novas que filtram + ordenam precisam de índice em `firestore.indexes.json`.
- **Moderador**: só `salmeron.marcelo@gmail.com`, sincronizado em `src/lib/admin.js` (`ADMIN_EMAILS`),
  `isModerator()` em `firestore.rules` e `EMAIL_MODERADOR` em `tests/regras/ambiente.mjs`.
- **Acesso a dados** fica em `src/lib/*.js` (as páginas não montam consultas complexas sozinhas).
- Componentes interativos com `"use client"`; `serverTimestamp()` nas datas de criação.
- **Acessibilidade (WCAG)**: rótulos associados, erros com `role="alert"`, foco visível, `aria-hidden` em
  SVGs decorativos, layout que funciona no celular (`MenuMobile`).
- **Visual**: gradiente `from-[#667eea] via-[#764ba2] to-[#f093fb]`, cartões com glassmorphism
  (`bg-white/10 backdrop-blur-sm`); siga as páginas vizinhas.
- Eventos legados (ids numéricos) vêm de `public/events.json`; os do Firestore não podem ter id numérico.

## Trabalho com vários agentes

O agente principal orquestra: define o contrato em `docs/`, dispara subagentes em worktrees isoladas
(`isolation: "worktree"`), revisa e faz o merge na `main`. Agentes em `.claude/agents/`:
`regras-firebase`, `i18n` e `revisor`.

Numa worktree nova, antes de buildar ou testar:

```bash
ln -s /home/marcelo/UniScore/node_modules node_modules
cp /home/marcelo/UniScore/.env.local .env.local
```

- Faça commits na branch da worktree; nunca dê push nem mexa na `main`.
- Edite só os arquivos que a tarefa atribui a você; se precisar de outro, explique no relatório final.
- O emulador é compartilhado: use sempre o `flock` acima.
