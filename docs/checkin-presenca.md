# Contrato — Avaliação com presença verificada (check-in por QR)

Objetivo: comprovar que quem avaliou um evento esteve nele, para que o `/relatorio` e o dashboard da
universidade tragam dados que a universidade possa citar oficialmente.

## Fluxo

1. A universidade dona do evento abre o painel de check-in do evento (dashboard), ativa o check-in e recebe
   um QR (para projetar em tela cheia ou baixar em PNG). Pode gerar um código novo a qualquer momento
   (o anterior deixa de valer) e desativar.
2. O participante escaneia o QR → `/checkin?evento={eventoId}&c={codigo}`. Sem login, vai para o login e
   volta ao check-in. Com login, a página grava a presença e mostra "Presença confirmada" com o botão
   "Avaliar agora" → `/avaliar?eventoId={eventoId}`.
3. Em `/avaliar`, se o usuário tem presença no evento escolhido, a avaliação sai com
   `presencaVerificada: true` e exibe o selo "Presença verificada".
4. A universidade pode marcar o evento com `exigeCheckin: true` (opcional, no formulário do evento).
   Nesses eventos, só avalia quem fez check-in; nos demais, avaliar continua livre (a avaliação só não ganha o
   selo). Por isso o check-in é opt-in e os eventos legados (`public/events.json`) não mudam.

## Dados (Firestore)

### `eventos/{eventoId}` — campo novo

| campo | tipo | regra |
|---|---|---|
| `exigeCheckin` | bool, opcional | entra em `eventoFields()`; se presente, `is bool` |

### `eventos/{eventoId}/privado/checkin` — segredo do check-in (documento único)

| campo | tipo |
|---|---|
| `codigo` | string `^[A-Za-z0-9]{16,64}$` (gerado no cliente com `crypto.getRandomValues`, 24 caracteres) |
| `ativo` | bool |
| `expiraEm` | timestamp (padrão no cliente: fim do dia seguinte à data do evento) |
| `atualizadoEm` | timestamp == `request.time` |

- Ler/criar/atualizar/apagar: universidade aprovada dona do evento (`eventos/{eventoId}.universidadeUid ==
  auth.uid`) ou moderador. Ninguém mais lê (o código é o segredo).
- `keys().hasOnly([...])` com exatamente esses campos.

### `presencas/{eventoId}_{uid}` — presença confirmada (id determinístico: uma por pessoa e evento)

| campo | tipo |
|---|---|
| `eventoId` | string, igual ao prefixo do id |
| `usuarioId` | string == `auth.uid` |
| `codigo` | string, o código lido no QR |
| `criadoEm` | timestamp == `request.time` |

- Criar: usuário logado; id == `eventoId + '_' + auth.uid`; `hasOnly` desses campos; o documento
  `eventos/{eventoId}/privado/checkin` existe, `ativo == true`, `request.time < expiraEm` e `codigo` igual ao
  dele. (A regra lê o segredo com `get()`, que ignora as regras de leitura.)
- Atualizar: ninguém. Apagar: moderador ou universidade dona do evento (revogar presença indevida).
- Ler: o próprio usuário, a universidade dona do evento e moderadores. A consulta
  `where("eventoId", "==", id)` (e a contagem `getCountFromServer` dela) precisa funcionar para a universidade
  dona — ter teste disso.

### `avaliacoes/{id}` — campo novo

| campo | tipo | regra |
|---|---|---|
| `presencaVerificada` | bool, opcional | ver abaixo |

- Na criação: se `presencaVerificada == true`, exige `eventoId` e
  `exists(presencas/{eventoId}_{auth.uid})`.
- Na criação: se `eventoId` aponta para um evento do Firestore com `exigeCheckin == true`, exige
  `presencaVerificada == true` (use `exists()` antes de `get()` — eventos legados não estão no Firestore).
- Na atualização pelo autor: `presencaVerificada` e `eventoId` não mudam.

## Código cliente — `src/lib/presencas.js` (API combinada)

```js
gerarCodigo()                               // string de 24 caracteres [A-Za-z0-9]
obterCheckin(eventoId)                      // { codigo, ativo, expiraEm: Date } | null (só a dona lê)
salvarCheckin(eventoId, { ativo, expiraEm, codigo? }) // cria/atualiza; sem codigo, mantém o atual ou gera um
rotacionarCodigo(eventoId)                  // novo código, mantém ativo/expiraEm
urlCheckin(eventoId, codigo, origem = window.location.origin)
registrarPresenca(eventoId, codigo)         // grava presencas/{eventoId}_{uid}; já existente = sucesso
temPresenca(eventoId, uid)                  // bool
contarPresencas(eventoId)                   // number (getCountFromServer)
```

Erros de `registrarPresenca` viram códigos para a interface: `codigo-invalido`, `checkin-encerrado`
(inativo ou expirado — a interface não distingue, porque o participante não pode ler o segredo),
`nao-logado`.

QR: biblioteca `qrcode` (npm), gerado no cliente.

## Onde aparece

- `dashboard-universidade`: botão "Check-in" em cada evento → painel com ativar/desativar, validade, QR
  (tela cheia + baixar PNG), gerar código novo e número de presenças.
- `FormularioEvento.js`: caixa "Exigir check-in para avaliar".
- `/checkin` (página nova).
- `/avaliar`: grava `presencaVerificada`; bloqueia com explicação quando o evento exige check-in.
- Selo "Presença verificada" nas avaliações (detalhes do evento, página da universidade, avaliações recentes
  da home).
- `/relatorio` (em `src/lib/estatisticas.js`): total e % de avaliações com presença verificada.

## Limites conhecidos

- Quem recebe uma foto do QR durante a validade consegue fazer check-in sem estar presente. O que mitiga:
  validade curta, gerar código novo durante o evento e projetar o QR só no local. Um QR rotativo (a cada
  poucos minutos) é uma evolução possível.
- Sem Cloud Functions, não há como vincular a presença à localização do participante.
