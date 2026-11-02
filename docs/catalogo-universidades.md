# Contrato: catálogo de universidades no Firestore

Problema: o catálogo de universidades é um arquivo fixo (`public/universidades.json`, com 2 entradas). Uma
universidade cadastrada e aprovada não aparece na busca nem pode ser avaliada pelo usuário comum. Os números da
home ("12.8k+ avaliações", "67 universidades", "28k+ usuários") são inventados.

## Dados: `catalogoUniversidades/{id}` (perfil público)

| campo | tipo |
|---|---|
| `nome` | string, de 1 a 200 caracteres |
| `sigla` | string com até 20 caracteres, ou null |
| `descricao` | string com até 1000 caracteres |
| `imagem` | url (string com até 2048 caracteres) ou null |
| `contaUid` | uid da conta em `universidades/{uid}`, ou null para as entradas legadas |
| `ativo` | bool (false = oculta da busca, por exemplo ao revogar a aprovação) |
| `criadoEm` | timestamp == `request.time` na criação e imutável depois |
| `atualizadoEm` | timestamp == `request.time` |

- **id:** as entradas legadas mantêm os ids do JSON ("1", "2"), porque avaliações e eventos antigos apontam para
  eles. As novas usam o uid da conta da universidade (`catalogoUniversidades/{uid}`).
- **Leitura:** pública.
- **Criar e apagar:** só o moderador.
- **Atualizar:**
  - o moderador altera tudo;
  - a universidade aprovada dona da entrada (`contaUid == auth.uid`) altera só `descricao`, `imagem`, `sigla` e
    `atualizadoEm`.
- `keys().hasOnly([...])` com os campos acima.

## Aprovação (`src/app/admin/AbaUniversidades.js`)

Ao aprovar uma conta, o moderador escolhe uma destas opções:
- **vincular** a uma entrada que já existe no catálogo (como hoje);
- **criar uma entrada nova no catálogo.** Esse é o padrão quando não há sugestão pelo nome. Grava num único batch:
  - `catalogoUniversidades/{uid}` com `nome` = `nomeUniversidade` da conta, `contaUid` = uid e `ativo` = true;
  - `universidades/{uid}` com `status: 'aprovado'` e `universidadeId: uid`.

Contas já aprovadas e sem vínculo, como a "Universidade Teste", ganham o botão "Publicar no catálogo", que faz a
mesma gravação.

Ao revogar a aprovação, a entrada criada para a conta fica com `ativo: false`.

## Leitura: `src/lib/universidades.js`

```js
listarUniversidades()      // [{ id, nome, sigla, descricao, imagem, contaUid, legado }]
                           // = catalogoUniversidades (ativo != false) ∪ entradas do JSON cujo id não está no Firestore
buscarUniversidade(id)     // um item no mesmo formato, ou null
```

- Use `listarUniversidades`/`buscarUniversidade` em todos os lugares que hoje fazem `fetch("/universidades.json")`:
  - `src/app/page.js` (busca da home)
  - `src/app/eventos/page.js`
  - `src/app/universidade/[id]/page.js`
  - `src/app/avaliar/page.js`
  - `src/app/admin/AbaUniversidades.js`
  - `src/app/dashboard-universidade/eventos/FormularioEvento.js`
  - `src/app/cadastro-universidades/page.js`
  - `src/lib/usuarios.js`
  - `src/lib/eventos.js`
  - `buscarUniversidadeId`
- O JSON continua existindo como fonte das entradas legadas.

**Exceção:** `src/app/dashboard-universidade/page.js` é de outro agente; não mexa nele.

Corrigir no JSON:
- a sigla do Mackenzie para "UPM";
- a imagem `/usp.png`, que não existe: usar `null` e um avatar com as iniciais nas telas.

## Números da home (`src/app/page.js`, nas duas faixas de estatísticas)

Trocar os números fixos por números reais, contados com `getCountFromServer`:
- avaliações;
- universidades do catálogo;
- eventos (Firestore + legados), no lugar de "usuários", que as regras não permitem contar.

Enquanto carrega, mostrar "—". Formatação: `toLocaleString` do idioma ativo.
