# Atualização dos cartões e filtros — Gestão de Projetos

## Como interpretar os cartões

- **Pendentes:** saldo de atividades ainda não migradas no projeto. Inclui atividades sem atendimento, em andamento e todas as modalidades de quebra. É um saldo **até a data** selecionada; no modo Total geral, representa o saldo atual.
- **Migradas:** no modo Hoje/Outro dia, atividades com movimentação de migração naquela data; no modo Total geral, atividades atualmente migradas.
- **Quebradas:** no modo Hoje/Outro dia, atividades que tiveram uma quebra naquela data (inclusive se migraram depois); no modo Total geral, atividades que estão quebradas atualmente.
- **Em andamento:** quantidade de atividades em andamento no dia selecionado, ou atualmente no modo Total geral.

**Importante:** Pendentes inclui Quebradas (e Em andamento). Por isso, não some os quatro cartões para obter o total de atividades. Por exemplo, se houver 820 pendentes sem quebra e 16 quebras, o cartão Pendentes exibirá **836**.

## Prioridade e combinação de filtros

1. **Hoje / Outro dia / Total geral:** definem o período de referência; ao trocar de período, a seleção personalizada e o cartão de status anteriormente selecionado são limpos.
2. **Filtragem customizada:** ao iniciar um filtro de analista e/ou status, abandona o período anterior e volta a **Total geral**. O cartão Pendentes continua indicando o saldo **do projeto inteiro**; os outros cartões passam a respeitar o analista selecionado.
3. **Clique em um cartão de status:** refina a lista de atividades **junto** com o período ou filtro customizado que já está selecionado. Não limpa o filtro anterior. Clique novamente no mesmo cartão para retirar apenas essa restrição.
4. **Busca por ID:** continua procurando entre todas as atividades, independentemente dos filtros de data e status, como já acontecia.

## Quebras históricas

Quando você escolhe, por exemplo, **24/10/2026 → Quebradas**, o sistema consulta as movimentações/histórico daquele dia. Uma atividade quebrada em 24/10 e migrada em 30/10 ainda aparece na consulta histórica com o **motivo da quebra** e a **data correspondente**, sem alterar o status atual salvo no Supabase.

Registros antigos que não possuírem data de movimentação não podem ser reconstruídos com precisão. Para completar o histórico, é recomendável reimportar a planilha em **Atualizar atividades**, aproveitando o tratamento de movimentações repetidas por ID VGR.

## Implantação

Publique os arquivos atualizados do ZIP em seu GitHub Pages. **Não substitua o `supabase-config.js` atual**: o ZIP não inclui esse arquivo. Esta atualização de cartões e filtros não exige executar um novo script SQL. A migração `06_reabrir_atividades_quebradas.sql` da versão anterior continua necessária se a adoção de quebras por outros usuários ainda não foi habilitada.
