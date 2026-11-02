# Atualização do Diário de Bordo — 355 migradas

## O que foi corrigido

- A aba **Diario de Bordo_Copasa_16.10.26** possui 752 linhas e **500 IDs VGR únicos**. O sistema agora consolida todas as movimentações de um ID antes de aplicar a atualização.
- Foram identificados **355 IDs com status Migrado** na planilha. Duas ocorrências (`2264093` e `2268708`) tinham também uma linha posterior **Sem Acionamento**. Essas linhas não apagam a migração já registrada. Uma **Quebra** posterior continua prevalecendo como movimentação relevante.
- Se um ID da planilha ainda não existir no projeto, o botão **Confirmar atualização** irá **cadastrar a atividade** e preencher todos os campos disponíveis, incluindo `Parceiro`, `Ticket NOC` → `Reparo`, horários, analista e status. A reimportação não gera uma duplicata do mesmo ID.
- A prévia agora separa **IDs para atualizar** e **IDs ausentes que serão cadastrados**; a confirmação informa quantos foram atualizados e criados.

## Passo 1 — Atualizar o Supabase (apenas uma vez)

1. Abra seu projeto **Gestao_Implantação** no Supabase.
2. Acesse **SQL Editor → New query**.
3. Copie e execute todo o arquivo `supabase/03_vinculo_analistas.sql` deste pacote.
4. Aguarde `Success. No rows returned`.

Esta migração não altera a URL nem a chave do projeto. Ela implementa **no banco**, e não no navegador, a associação de atividades importadas aos usuários do sistema.

## Passo 2 — Atualizar o GitHub Pages sem perder a configuração

1. Extraia este ZIP e copie os arquivos atualizados para a **raiz do repositório** `Sistema-Implanta-o`, substituindo somente arquivos com mesmo nome.
2. **Não exclua nem recrie o repositório ou sua pasta antes de copiar**.
3. **Este ZIP não inclui `supabase-config.js`**. Preserve o arquivo já configurado no GitHub. Não é necessário informar a URL ou a chave do Supabase novamente.
4. Publique as mudanças no branch configurado para GitHub Pages e aguarde a implantação.
5. Abra `https://jadsnet.github.io/Sistema-Implanta-o/`, atualize com `Ctrl+F5` e entre como administrador.

## Passo 3 — Reimportar e conferir

1. Abra o projeto COPASA → **Editar atividade** → **Atualizar atividades**.
2. Importe o arquivo `DIARIO DE BORDO_COPASA_16.10.26.xlsx` que você já possui.
3. Confira a prévia: **500 IDs VGR únicos e 355 migradas**, além da quantidade de IDs que ainda precisarão ser criados.
4. Confirme a atualização. Aguarde **Salvo automaticamente** e verifique se não surgiu mensagem de erro do Supabase; se surgir, não feche a aba e investigue a gravação.
5. No painel principal, clique em **Total geral** para conferir as migradas sem restrição de data. O número esperado é **355**, desde que o projeto não possua outras atividades migradas fora dessa planilha.

## Passo 4 — Associar os analistas aos usuários

1. Em **Administração → Usuários**, convide cada analista utilizando e-mail `@telefonica.com` e **nome completo igual ao que consta na planilha**.
2. O vínculo é feito pelo nome completo, desconsiderando diferenças de **maiúsculas, minúsculas, acentos e espaços extras**, sem fazer associações aproximadas que poderiam atribuir uma atividade à pessoa errada.
3. Após convidar os usuários, a aplicação tenta associar automaticamente as atividades. Também é possível clicar **Vincular analistas importados** na tela de usuários.
4. **Nomes duplicados ou ambíguos não são vinculados automaticamente.** Neste caso o administrador precisa esclarecer qual usuário é o responsável.
5. A permissão para editar continua sendo conferida no **Supabase**, por `owner_id` e pelo perfil autenticado. A comparação de nomes no navegador só apresenta os botões; não concede acesso ao banco.

## Testes que acompanham a correção

Na pasta raiz, com Node.js instalado:

```bash
node tests/activity-import-matching.test.cjs
node tests/cloud-client.test.cjs
node tests/security-regressions.test.cjs
```

O teste opcional da planilha real aceita `GI_TEST_WORKBOOK` apontando para uma cópia local do arquivo Excel. Não precisa enviar a planilha ao Supabase para executar esses testes.
