# Atualização: Ranking, motivos de quebra e seções dos campos

## Antes de publicar no GitHub Pages

1. No Supabase do projeto **Gestao_Implantação**, abra **SQL Editor**.
2. Abra `supabase/05_status_quebras.sql` deste pacote, copie todo o conteúdo e execute no SQL Editor. Ele atualiza a validação de status no banco sem remover as regras de autorização existentes.
3. Confira que o resultado do SQL termina sem erro. **Faça isso antes de colocar o novo frontend no GitHub Pages**, pois o servidor precisa reconhecer os novos motivos de quebra.
4. Atualize os arquivos públicos do repositório `Sistema-Implanta-o` com os arquivos do ZIP. O arquivo **`supabase-config.js` está intencionalmente ausente**; mantenha o já existente no GitHub, com a URL e a chave publicável do seu projeto.
5. Aguarde a atualização do GitHub Pages e recarregue a página usando `Ctrl+F5`.

## Atualizar o diário de bordo sem perder atividades

1. Entre com perfil de administrador ou gestor.
2. Abra **Painel do administrador → Editar atividade → Atualizar atividades** e selecione o diário de bordo.
3. Confira a prévia e confirme a importação. Os mesmos IDs VGR são atualizados, os ausentes são cadastrados e as células vazias não apagam os valores existentes.
4. A importação passa a registrar `importBreakEvents` por ID VGR: motivo da quebra, data e analista da **linha da ocorrência**. Isso permite contar quebras anteriores mesmo quando a atividade foi migrada depois.
5. No painel inicial, clique **Ranking**. Uma janela estreita aparece sobre a página, com o fundo desfocado. Feche pelo **X**, **Esc** ou clique fora.

## Como a contagem funciona

- Cartão **Quebradas**: soma as atividades cujo **status final** é `Quebra` ou um dos motivos específicos.
- Coluna **Migradas** do ranking: quantidade de IDs VGR migrados, por analista responsável pela atividade concluída.
- Coluna **Quebradas** do ranking: ocorrências distintas de quebra identificadas na planilha ou no histórico manual, inclusive quando o ID VGR teve migração posterior.
- Somente os eventos com **analista identificado** entram na contagem individual. Uma célula vazia ou uma descrição livre no campo de analista não é atribuída a uma pessoa por suposição.
- A planilha COPASA conferida contém **355 IDs migrados** e **35 ocorrências tratadas como quebra**: 33 com o texto `Quebra ...` e duas linhas `Duplicidade`, mapeadas para `Quebra Duplicidade`. Essas ocorrências pertencem a 32 IDs VGR distintos.
- A conferência encontrou **2 quebras da Janaina** e **3 do Cesar**, diretamente identificadas nas linhas de quebra. Outras **24 ocorrências** não possuem identificação confiável na coluna de analista.

## Motivos reconhecidos

- `Quebra Cliente`
- `Quebra Delfia`
- `Quebra Duplicidade` (também reconhece `Duplicidade` na planilha)
- `Quebra link` (também reconhece `Quebra Link`)
- `Quebra Vivo Redes`

Todos aparecem individualmente na linha da atividade e entram no mesmo cartão Quebradas.

## Mover campos padrão entre seções

Abra **Painel do administrador → Cadastrar campos no projeto**. Digite/selecione o nome de um campo existente, inclusive padrão (`REPARO`, `QTD`, `NETWORK` etc.), e escolha outra seção. A alteração é salva no projeto e aplicada nas telas de atividades e cadastro. Quando um campo padrão estiver em uma seção diferente da original, aparece o aviso:

> Atenção, modificação de campo padrão para outra sessão

Mover um campo **não renomeia a chave, não exclui dados e não altera a correspondência da planilha**.
