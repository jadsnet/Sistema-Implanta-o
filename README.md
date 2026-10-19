# Gestão de Implantação

Reconstrução inicial da aplicação a partir dos dados exportados do Cloud e das telas fornecidas.

## Publicar no GitHub Pages
1. Crie um repositório GitHub.
2. Envie `index.html` e `data.json` para a raiz do repositório.
3. Em Settings → Pages, escolha Deploy from a branch, selecione `main` e `/ (root)`.
4. Abra a URL publicada.

Também é possível testar localmente usando um servidor estático, por exemplo `python -m http.server 8000`, e acessar `http://localhost:8000`.

## Funcionalidades
- Tela de seleção de projeto e painel de atividades.
- Pesquisa de atividades, visualização dos dados e alteração de status.
- Atribuição de analista, início, conclusão e motivo de quebra.
- Runbook com etapas e observações por atividade.
- Histórico de ações e exportação CSV.
- Cadastro de projetos e usuários.
- Importação de atividades CSV, exportação CSV e importação de modelo de runbook JSON.
- Dados iniciais extraídos do arquivo exportado; alterações ficam no `localStorage` do navegador.

## Limitações importantes
Esta versão é um front-end estático: não possui autenticação segura nem banco de dados compartilhado entre analistas. O `localStorage` é específico de cada navegador/dispositivo. Para uso real por uma equipe, conecte a aplicação a uma API e banco compartilhado (por exemplo Supabase) e implemente autenticação e permissões. Não publique dados pessoais ou operacionais sensíveis em repositório público.
