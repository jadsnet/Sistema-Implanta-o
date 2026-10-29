# Gestão de Implantação

Aplicação web estática com os arquivos separados:
- `index.html`: estrutura da interface.
- `style.css`: tema, cartões, linhas de atividade e layout responsivo.
- `app.js`: navegação, filtros de data, busca, adoção e runbook.
- `data.json`: dados importados originais.

## Executar
Sirva a pasta por um servidor HTTP local ou publique no GitHub Pages. Por exemplo, com Python instalado, execute `python -m http.server` dentro da pasta e acesse `http://localhost:8000`.

## Comportamentos incluídos
- Filtros Hoje, Outro dia (com seletor de data) e Total geral.
- Busca inicialmente vazia; resultados aparecem após digitar ID de link ou ID VGR.
- O botão **Adotar** atribui a atividade ao usuário selecionado e inicia o cronômetro; a lista mostra o primeiro nome do responsável e o tempo decorrido.
- O seletor de usuário no topo permite alternar entre Administrador e usuários cadastrados (sessão local no navegador; não é autenticação com senha/servidor).
- Os cartões de status são clicáveis e filtram as atividades.
- A tela de runbook permite anexar evidência visual por arquivo, Ctrl+V ou arrastar e soltar, além do checklist.
- Adoção permite preencher modelo/serial, dados de rede e dados do técnico e salva os dados no navegador.
- Indicador usa o nome **Migradas** em lugar de Concluídas.


## Organização do pacote
O ZIP contém uma única cópia de cada arquivo na raiz: `index.html`, `style.css`, `app.js`, `data.json` e `README.md`. Os cartões de indicadores usam etiquetas coloridas sobrepostas à lateral superior esquerda, com emojis centralizados e sombra suave.

## Runbook por projeto (modelo de planilha)

Em **Painel do administrador → Configurar projeto → Modelo de planilha de runbook**, importe o arquivo XLSX/XLSM do Runbook. Confira a prévia das áreas detectadas e clique em **Aplicar este modelo ao projeto**. A tela **Runbook** passa a montar os quadros de evidências e fotos a partir dos títulos e instruções encontrados nas abas da planilha desse projeto. Os projetos que ainda não importaram um modelo continuam com as oito posições tradicionais do COPASA.

A imagem fica vinculada ao título e à posição original do campo. Em **Gerar Runbook (Excel)**, o sistema exporta o próprio arquivo-modelo importado, preservando as demais abas e adicionando imagens nas áreas correspondentes. XLS e ODS são convertidos para XLSX na importação (a formatação deve ser conferida). A leitura automática utiliza convenções de títulos de evidências/fotos e não substitui a revisão da prévia para modelos com formatação não convencional.

O arquivo original do Runbook é guardado em **IndexedDB** (armazenamento local do navegador, sem Base64); apenas os títulos e a estrutura do modelo permanecem no banco de dados leve do projeto. Assim, o limite pequeno de **localStorage** não é consumido pela planilha original. Projetos antigos com Runbooks salvos em Base64 são migrados quando possível, preservando a versão anterior em caso de erro. O armazenamento continua sujeito à capacidade/configuração de cada navegador.

Os botões **X** nas importações permitem cancelar uma seleção sem apagar atividades. Na área de Runbook, quando não há nova seleção pendente e existe um modelo aplicado, o X permite removê-lo depois de uma confirmação. A planilha não é compartilhada com outros computadores e não há sincronização em nuvem.

Para melhor funcionamento do armazenamento local, abra o sistema num endereço `http://localhost` (por exemplo: `python -m http.server 8000`) e continue utilizando o mesmo endereço e navegador. A abertura por `file://` pode ter limitações diferentes dependendo do navegador.


## Atualização — listagem geral e edição administrativa

- **Total geral**: mostra atividades de todos os status e todas as datas, com cartões contando o total por status. A lista fica em ordem decrescente da última movimentação e oferece **Mostrar mais atividades**.
- **Painel do administrador → Configurar projeto → Editar atividade**: abre uma janela de busca em todas as atividades do projeto, com status, analista, tempo e data de conclusão, sem botões de adoção. É possível abrir o formulário da atividade, editar campos e status, e excluir após confirmação digitando o ID VGR. Runbooks vinculados são removidos junto com a atividade. A exclusão é registrada no Log.
- Os dados continuam locais no navegador. Faça cópia/exportação dos dados antes de excluir atividades; a exclusão não pode ser desfeita.

## Editor visual do Runbook (nova funcionalidade)

Em Painel do administrador > Configurar projeto > Modelo de planilha de runbook,
importe/aplique um modelo e clique em **Editar runbook**. O editor abre sobre a
página e permite:
- Clicar no título de uma seção ou evidência para renomear.
- Alterar a descrição/instrução (apresentada em itálico no Runbook).
- Criar novas seções, escolhendo Evidências/testes ou Fotografias.
- Adicionar e excluir quadros de imagens por seção e excluir seções inteiras
  mediante confirmação.
- Salvar ou descartar alterações. As alterações são por projeto e ficam no
  armazenamento local do navegador.

O arquivo de planilha original é mantido no IndexedDB; as alterações são
aplicadas a uma cópia na exportação Excel. Quadros novos usam linhas adicionais
e seções novas geram novas abas. Seções removidas deixam de aparecer na tela e
suas abas são removidas da cópia exportada quando a remoção não deixaria a
planilha sem abas. Como fórmulas e referências de modelos externos podem usar
essas abas, confira o Excel gerado antes de distribuí-lo.

No tema claro, os quadros internos de evidência têm um contraste levemente
maior. O botão Limpar da Filtragem customizada está elevado alguns pixels para
ficar centralizado no cartão, sem alterar seu tamanho.

## Atualização: edição automática e Runbook com múltiplas colunas

- O botão **Projetos** fica ao lado do título do projeto, com ícone de saída.
- O editor visual do Runbook usa lixeiras discretas e salva as alterações de
  títulos e descrições ao sair dos campos (mensagem de 3 segundos no rodapé).
- A leitura de modelos agora reconhece evidências simultâneas em colunas
  diferentes, instruções complementares com área de print e pares de fotos
  antes/depois. O parser ignora tabelas que não são áreas de imagens.
- Cada imagem é ajustada proporcionalmente à largura da coluna e à altura
  disponível até a próxima evidência; não é esticada para preencher a célula.
- Prints salvos pelo Runbook são persistidos localmente no IndexedDB, evitando
  esgotar o limite pequeno de localStorage ao trabalhar com muitos prints.

**Projetos com modelos importados em versões anteriores:** reimporte a planilha
no painel do administrador e confirme a prévia para reconstruir áreas que não
eram detectadas. As imagens são associadas aos IDs dos campos quando disponíveis,
mas confira os links e os prints após mudar a estrutura do modelo.

**Testes:** com `Runbook_Rest_Arcos_MIGRA_TEMP_v1.1.xlsx` a leitura identificou
18 áreas em `Log_Before`, 19 em `Log_After` e 15 em `Relatorio Fotografico`.
Testes de exportação incluíram imagens em colunas paralelas e uma aba criada
no editor; os arquivos gerados foram reabertos como planilhas Excel.
