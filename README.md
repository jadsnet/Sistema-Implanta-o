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
- Clicar na linha apenas visualiza os detalhes; o botão **Adotar** abre a tela de adoção na mesma aba.
- Adoção permite preencher modelo/serial, dados de rede e dados do técnico e salva os dados no navegador.
- Indicador usa o nome **Migradas** em lugar de Concluídas.
