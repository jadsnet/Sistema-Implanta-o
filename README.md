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
