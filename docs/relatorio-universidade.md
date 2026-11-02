# Contrato: relatório da universidade (para imprimir / salvar em PDF)

Objetivo: a universidade leva para fora da plataforma os próprios dados (credenciamento, reitoria, marketing),
com a presença verificada como argumento de credibilidade.

## Rota e acesso

- `/dashboard-universidade/relatorio` (página nova). No dashboard, um botão **"Gerar relatório"** abre essa
  rota numa aba nova.
- Só a conta de universidade logada vê o próprio relatório. Sem login ou com conta não institucional, redireciona
  como o dashboard faz.
- Os dados vêm de `carregarDashboard` (`src/lib/dashboardUniversidade.js`), a mesma fonte do dashboard. Assim os
  números são sempre iguais nos dois lugares.
- **Período:** seletor "Últimos 30 dias / Últimos 12 meses / Tudo" (padrão "Tudo"). O filtro é aplicado sobre as
  avaliações já carregadas, por `criadoEm`. As presenças não têm filtro de período (contagem total), e o relatório
  diz isso.

## Conteúdo

- **Cabeçalho:** logo da UniScore (`/uniscore_star_logo.png`), "Relatório de avaliações", **o nome da
  universidade** em destaque, o período e a data/hora de geração.
- **Números principais:**
  - avaliações;
  - nota média;
  - eventos avaliados;
  - avaliações com presença verificada (nº e %);
  - check-ins;
  - taxa de avaliação (verificadas ÷ check-ins).
- **Médias dos 5 critérios**, com o nº de avaliações em cada uma.
- **Distribuição de notas de 1 a 5.**
- **Tabela por evento:** nome, data, avaliações, nota média, check-ins e verificadas.
- **Avaliações recentes:** até 20, com nota, data, evento, comentário e a marca "Presença verificada".
  Não mostrar o nome nem o e-mail do autor.
- **Rodapé (metodologia):**
  - como a presença é verificada (check-in por QR exibido no local do evento, código secreto com validade, uma
    presença por pessoa e evento);
  - que contas institucionais não avaliam;
  - que avaliações ocultas pela moderação ficam de fora;
  - "Gerado por UniScore em {data}" e a URL do site.

## Visual de impressão

- **Marca-d'água:** logo da UniScore grande, centralizado, com opacidade em torno de 6%, atrás do conteúdo,
  repetido em todas as páginas impressas (`position: fixed` no `@media print`).
- `print-color-adjust: exact` para manter as cores e as barras.
- Fundo branco, tipografia sóbria, tabelas com borda fina e cabeçalho que se repete entre páginas (`thead`).
  Nenhum card quebrado no meio da página (`break-inside: avoid`).
- Na tela, uma barra fixa (que não sai na impressão, `print:hidden`) com o seletor de período e os botões
  "Imprimir / Salvar PDF" (`window.print()`) e "Voltar ao painel".
- O título do documento (`<title>`/`document.title`) é "Relatório UniScore - {universidade} - {data}", que vira o
  nome sugerido do PDF.

## Requisitos de código

Textos em pt-BR e en-US, gerados no idioma ativo. Se já existir um padrão de impressão em
`src/app/admin/relatorio/page.js`, siga-o.
