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

O modelo importado é armazenado **somente no navegador** associado ao projeto. Planilhas ou imagens muito grandes podem ultrapassar o limite de armazenamento local; nesse caso o sistema avisa e não aplica o modelo. Sem servidor ou banco de dados, o arquivo-modelo e os prints não são compartilhados automaticamente entre computadores.
