# Atualização — Informe, Histórico e Adoção de atividades quebradas

## Instalação (Supabase + GitHub Pages)

1. **Mantenha seu `supabase-config.js` atual.** O ZIP desta versão não contém esse arquivo. Não sobrescreva nem apague o arquivo já configurado no repositório.
2. No **Supabase → SQL Editor**, confira se as migrações anteriores (incluindo `05_status_quebras.sql`) já foram executadas.
3. Execute **`supabase/06_reabrir_atividades_quebradas.sql`** no SQL Editor. Essa migração é necessária para permitir a adoção segura de atividades quebradas por outro usuário (inclusive administrador). Ela preserva a proteção contra edições indevidas antes da adoção.
4. Publique os arquivos atualizados do ZIP no repositório do site, conservando o `supabase-config.js` existente.
5. Atualize a página. Se quiser reconstruir o Histórico de todas as movimentações e observações da planilha antiga, importe novamente o Diário de Bordo em **Atualizar atividades**. O reprocessamento identifica os mesmos IDs VGR e não deve criar duplicatas.

## O que mudou

- **Ranking:** o X de fechar foi substituído por ícone SVG centralizado no botão.
- **Enviar informe / Extrair relatório:** “Usar filtro da tela” agora consulta todas as atividades do projeto que correspondem aos filtros, não apenas as primeiras 200 linhas carregadas para visualização. No exemplo relatado com “Total geral”, são **1.191** registros: **822 pendentes**, **355 migradas** e **14 quebras**.
- **Quebras:** qualquer usuário **ativo e autenticado** pode adotar uma atividade com status “Quebra” ou um dos motivos de quebra. A adoção muda o responsável, reabre a atividade em “Contatando técnico” e reinicia a contagem de tempo. O histórico da quebra original permanece.
- **Histórico:** registros de observações aparecem como linhas com data, analista e status. O conteúdo da observação fica oculto na lista e aparece somente ao clicar na linha. Novas observações têm o botão “Registrar no histórico”. A importação registra as observações e as movimentações de conclusão da planilha.

## Conferência recomendada

1. Selecione **Total geral → Extrair relatório → Enviar informe** e confirme que os números refletem o projeto inteiro, não 200 registros.
2. Entre como outro usuário ativo, abra uma atividade com “Quebra Delfia” e clique em **Adotar atividade**. Confirme que o responsável mudou e a atividade voltou para “Contatando técnico”.
3. Abra uma atividade com observação importada. A lista **Histórico** deve exibir data, analista e status; o texto deve aparecer apenas no modal após clicar.
4. Confira o alinhamento do X no modal de Ranking.

**Observação:** a migração SQL precisa ser executada manualmente no Supabase. Publicar apenas os arquivos do ZIP não altera as políticas do banco.
