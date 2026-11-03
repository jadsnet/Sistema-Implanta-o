# Correção do Enviar informe — filtros e indicadores

## Problema identificado

Ao selecionar **Outro dia → 24/10/2026**, o painel exibiu **943 Pendentes**, **1 Em andamento**, **6 Migradas** e **9 Quebradas**. O relatório encontrou **16 atividades** relacionadas à data, mas seu informe recontou os **status atuais** dessas 16 atividades, chegando a 1 Pendente, 11 Migradas e 4 Quebras. Isso não representa a mesma referência histórica do painel.

## Correções

1. Ao abrir **Extrair relatório**, a opção **Usar filtro da tela** agora é a seleção inicial, mesmo se outra opção tiver sido usada no relatório anterior.
2. **Enviar informe** recebe os mesmos quatro indicadores do painel, respeitando a data ou o analista em uso. O cabeçalho do informe mostra a data de referência selecionada.
3. O número **No anexo** é a quantidade de atividades realmente exportadas; no exemplo, **16**. O cartão **Pendentes (saldo)** inclui também as atividades quebradas e em andamento que ainda não foram migradas até a data. Por isso, **não some os cartões** e não espere que Pendentes seja igual ao total de linhas do Excel.
4. A coluna **Status** do Excel, ao usar o filtro da tela, mostra a situação histórica consultada. Uma atividade quebrada em 24/10 e migrada posteriormente aparece com o motivo da quebra no relatório histórico, sem modificar o registro atual no Supabase.
5. Se o usuário escolher manualmente **Data específica**, a apuração respeita o dia escolhido no formulário do relatório, inclusive movimentações de quebra e migração preservadas no histórico.

## Conferência

1. Selecione **Outro dia** e a data **24/10/2026** no painel.
2. Confira os quatro cartões.
3. Abra **Extrair relatório** e confirme **Usar filtro da tela**.
4. Clique em **Enviar informe**. Os quatro cartões precisam mostrar os mesmos indicadores que aparecem no painel; **No anexo** indica separadamente a quantidade de atividades exportadas.
5. Se desejar, baixe a planilha e confira a coluna **Status** das atividades com movimentações históricas.

Esta correção não requer migração SQL. O ZIP **não inclui nem altera `supabase-config.js`**; preserve o arquivo já configurado no GitHub.
