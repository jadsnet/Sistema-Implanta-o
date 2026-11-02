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

## Importar novas atividades e atualizar atividades existentes

- Em **Configurar projeto → Cadastrar nova atividade → Importar planilha**, selecione CSV, TSV, XLS, XLSX, XLSM ou ODS. A prévia informa quantas linhas possuem ID VGR válido, quantas atividades são novas, quantas já existem no sistema e quantos IDs se repetem dentro da própria planilha. Clique no botão **Confirmar importação** (ícone de visto) para cadastrar somente as novas.
- Ao confirmar a importação, abre-se automaticamente **Editar atividade**. As atividades do último lote importado recebem uma etiqueta discreta **Nova**. A etiqueta vale para a sessão atual do navegador e é substituída no próximo lote.
- Em **Configurar projeto → Editar atividade → Atualizar atividades**, selecione outra planilha. A atualização encontra atividades existentes pelo **ID VGR**, independentemente da posição das colunas, e permite conferir a quantidade encontrada antes de confirmar. Após confirmar, a quantidade efetivamente alterada é exibida.
- A atualização é não destrutiva: colunas ausentes, valores em branco, eventos de histórico e dados de runbook já salvos são preservados. Campos presentes e preenchidos na planilha têm prioridade, inclusive sobre alterações anteriores da mesma coluna. IDs VGR não encontrados não geram novas atividades nesse segundo fluxo.
- O **ID VGR** é obrigatório para importar ou atualizar em lote; os cabeçalhos aceitam diferenças de maiúsculas/minúsculas, acentos e pontuação. O sistema reconhece colunas como Status, Analista, Observações, Horário de início, Horário de término e os campos do projeto. Dados permanecem apenas no armazenamento local do navegador.
- A importação do **Modelo de planilha do projeto** também verifica IDs VGR para evitar cadastro duplicado.

### Apresentação compacta das importações

- **Cadastrar nova atividade:** o botão Importar planilha fica fora do cartão do título; a prévia aparece somente no canto direito, em um cartão menor.
- **Editar atividade → Atualizar atividades:** título e instruções permanecem à esquerda, sem cartão externo; o botão e a prévia ficam alinhados ao canto direito.
- Quando uma planilha está selecionada, aparecem dois botões quadrados com ícones: **visto** para confirmar e **lixeira** para cancelar a seleção. A lixeira não apaga atividades nem desfaz importações já concluídas.
- No modo claro, as prévias usam um roxo de maior contraste para facilitar a leitura.

### Refinamento de alinhamento e temas

- Em **Editar atividade**, o título **Atualizar atividades**, a explicação, o botão e a prévia ficam juntos na coluna da direita.
- No modo claro, o cabeçalho **Editar atividade** tem roxo mais intenso e os textos auxiliares da edição são quase brancos, para melhorar a leitura.
- No modo escuro, o cartão do título **Cadastrar nova atividade** ficou levemente mais claro, com sombra discreta.

## Enviar informe (editor no estilo Outlook)

Na página de atividades, abra **Extrair relatório**, configure o período/filtro e os campos e clique em **Enviar informe**, à direita da opção de período. A nova tela é aberta sobre o relatório, na mesma aba.

- **E-mail:** os campos **Para**, **Cc** e **Assunto** ficam em linhas, como no Outlook. O botão com aviãozinho fica à esquerda. O remetente é sugerido quando o usuário logado contém um e-mail válido; para logins com apenas nome, há o campo **De** opcional.
- **Aparência:** as três linhas têm espaçamento próprio, cantos arredondados e sombra inferior/direita, sem bordas divisórias. A prévia do anexo fica num cartão compacto alinhado à esquerda.
- **Corpo da mensagem:** editor HTML com opções de negrito, itálico, sublinhado, tachado, listas, título e cor do texto. O próprio corpo contém o painel de status e os totais, sem um cartão de prévia separado.
- **Anexo automático no rascunho local:** ao abrir a composição, o sistema prepara um **XLSX** com o mesmo filtro e colunas do relatório, mostra nome/tamanho e permite baixar. O exportador de XLSX também funciona offline utilizando a biblioteca JSZip distribuída com o sistema.
- **Preparar e-mail:** baixa um arquivo **.eml** contendo destinatários, CC, assunto, corpo HTML com painel e a planilha XLSX incorporada como anexo MIME. Abra o arquivo no Outlook ou em outro cliente compatível. A maneira de abrir/editar um .eml pode variar conforme a versão do cliente.
- **Fluxo de trabalho Teams:** informe equipe, canal e nome do fluxo; abra o Teams e copie o conteúdo da mensagem, baixando o anexo XLSX para incluí-lo manualmente.
- **Dados:** os totais dos cartões e as atividades da planilha são obtidos da mesma seleção de **Extrair relatório**. “Usar filtro da tela” respeita a listagem visível, a ordem e a pesquisa; os demais períodos usam os status e analistas marcados.

**Limitação importante:** o sistema ainda não possui autenticação Microsoft 365 nem envia mensagens diretamente. O arquivo .eml é um rascunho com anexo, não uma mensagem enviada. Se a versão do Outlook não permitir abrir .eml para edição, baixe o XLSX pelo botão **Baixar anexo** e anexe-o manualmente em uma nova mensagem. O envio direto e a publicação automática em fluxo dependerão da futura integração com Microsoft 365/Teams.
