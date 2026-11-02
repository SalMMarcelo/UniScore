# Envio de notificações push

Quando um documento é criado em `notificacoes`, um push é enviado para os navegadores em que o
destinatário ativou "Receber notificações no celular/computador" (página `/notificacoes`).

- `mensagens.js`: título, corpo e link no idioma de cada token (textos espelham `src/i18n/*.js`).
- `envio.js`: lê `users/{uid}/tokensPush`, envia pelo FCM (`firebase-admin`) e apaga tokens inválidos.
  Não depende do gatilho.
- `index.js`: Cloud Function v2 `enviarPushNotificacao` (`onDocumentCreated("notificacoes/{id}")`),
  um invólucro fino sobre `envio.js`.
- `npm test`: testes de `mensagens.js` e `envio.js` com Firestore/Messaging falsos.

O lado do site (token, permissão, service worker `public/sw.js`, regras de `tokensPush`) vale para
qualquer forma de envio.

## Para ligar

1. **VAPID key** (necessária nos dois caminhos): Console do Firebase → Configurações do projeto →
   Cloud Messaging → Configuração da Web → *Certificados push da Web* → **Gerar par de chaves**.
   Copie a chave pública para `NEXT_PUBLIC_FIREBASE_VAPID_KEY` no Netlify (Site configuration →
   Environment variables) e no `.env.local`, e refaça o deploy do site. Sem essa variável a opção
   fica oculta.
2. **API**: Cloud Messaging API (V1) ativada no Google Cloud (normalmente já vem ativa).
3. **Regras**: o bloco `tokensPush` de `firestore.rules` sobe pelo workflow das regras.

### Caminho A: Cloud Functions (este diretório)

- Exige o **plano Blaze** (pago por uso; a cota gratuita cobre um projeto deste tamanho).
- Confira `REGIAO` em `index.js`: tem de ser compatível com a localização do Firestore
  (`nam5` → `us-central1`; `southamerica-east1` → `southamerica-east1`).
- Deploy manual, da raiz do projeto:

  ```bash
  cd functions && npm ci && npm test && cd ..
  npx firebase deploy --only functions
  ```

  No primeiro deploy o Firebase ativa as APIs (Cloud Functions, Cloud Build, Artifact Registry,
  Eventarc) e pode pedir para conceder papéis; aceite.
- O workflow `.github/workflows/firebase-regras.yml` **não** publica functions (de propósito).

### Caminho B: Netlify Function (grátis, não implementado)

1. Depois de criar a notificação, o cliente chama `/.netlify/functions/enviar-push` com
   `{ notificacaoId }` e o ID token do Firebase (`Authorization: Bearer <user.getIdToken()>`).
2. A função verifica o token com `getAuth().verifyIdToken()`, lê `notificacoes/{id}` com o Admin SDK
   e só continua se o documento existe e `autorUid` é igual ao uid do token (ninguém dispara push
   de notificação alheia; as regras já garantem que a notificação corresponde a uma ação real).
3. Chama `enviarPushDaNotificacao({ db, messaging, id, notificacao })` de `envio.js`.
4. Credencial: JSON de uma conta de serviço numa variável de ambiente do Netlify.

Desvantagem: depende do navegador do autor chamar a função (se a chamada falhar, o push se perde),
enquanto o gatilho do Firestore não depende do cliente.

## Testar

1. Com a VAPID key no `.env.local`, `npm run dev`, entre e ative a opção em `/notificacoes`
   (aceite a permissão). Deve aparecer um documento em `users/{uid}/tokensPush`.
2. Com outra conta, curta ou comente um post do primeiro usuário. Com a função publicada, o aviso
   aparece mesmo com a aba fechada; clicar abre `/forum#<postId>`.
3. Sem publicar a função: Console do Firebase → Messaging → *Enviar mensagem de teste* com o token
   (a mensagem de teste é do tipo "notification" e o `sw.js` também a mostra, abrindo
   `/notificacoes`).
