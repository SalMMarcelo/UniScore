# Contrato: dashboard da universidade só com dados reais

Problema: `src/app/dashboard-universidade/page.js` mostra números inventados, iguais para todas as universidades:
- os "+15%" e "+28%" de engajamento;
- 12.847 visualizações, taxa de avaliação de 67,3% e NPS +72, com os comparativos "vs mês anterior";
- satisfação por categorias que não existem no formulário (Organização, Infraestrutura, Alimentação...);
- uma distribuição de notas com 623/389/156...

Além disso, numa conta sem vínculo nenhuma avaliação aparece, nem as feitas nos eventos que a própria conta criou.

## Quais avaliações são da universidade

Avaliações da universidade = a união, sem repetir, de:
1. `avaliacoes` com `universidadeId == conta.universidadeId`, quando a conta tem vínculo;
2. `avaliacoes` com `eventoId` em algum evento da conta (`eventos` com `universidadeUid == auth.uid`). Use
   `where("eventoId", "in", lote)` em lotes de até 30 ids.

Desconsidere as avaliações com `moderado == true`, que estão ocultas pela moderação.

Não use o catálogo de universidades (outro agente está mudando como ele funciona). Use só os dados da conta em
`universidades/{uid}`: `nomeUniversidade`, `universidadeId`.

## O que mostrar (tudo calculado a partir dos dados acima)

- **Cartões:**
  - avaliações recebidas;
  - nota média;
  - eventos avaliados;
  - **avaliações com presença verificada** (quantidade e % do total).
- **Presenças:** o total de check-ins nos eventos da conta (`contarPresencas` de `src/lib/presencas.js`, um por
  evento) e a **taxa de avaliação** = avaliações com presença verificada ÷ presenças. Se não houver presenças,
  mostre "—".
- **Satisfação por critério:** a média de cada um dos 5 critérios reais (`criterios.acessibilidade`, `conforto`,
  `interculturalidade`, `politizacao`, `impacto`), ignorando null ("não se aplica"). Mostre também quantas
  avaliações entraram em cada média. Reaproveite os rótulos de `t("criterios.*")`.
- **Distribuição de notas (1 a 5):** contagem real e percentual.
- **Avaliações dos últimos 30 dias** comparadas com os 30 dias anteriores, só se houver dados nos dois períodos;
  senão, não mostre o comparativo.
- **Por evento:** uma tabela simples com o nome, o nº de avaliações, a nota média, o nº de presenças e o nº de
  avaliações verificadas.
- **Avaliações recentes:** as últimas 10, com nota, comentário, data, evento e o selo `SeloPresencaVerificada`.
  É aqui que a universidade enxerga cada avaliação.

**Remover:** visualizações, NPS e todos os percentuais e comparativos inventados.

O aviso amarelo de "sem vínculo" passa a dizer que só aparecem as avaliações dos eventos cadastrados pela conta.

Estados de carregando, vazio ("Nenhuma avaliação ainda") e erro com `role="alert"`.

A lógica de busca e agregação fica em `src/lib/dashboardUniversidade.js` (funções puras para as agregações, para
facilitar a leitura). A página só exibe.
