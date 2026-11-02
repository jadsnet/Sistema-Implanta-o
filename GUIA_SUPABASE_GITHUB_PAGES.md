# Gestão de Projetos — Supabase + GitHub Pages

Este pacote substitui o login local `admin/admin` por **Supabase Auth**, guarda projetos/atividades/runbooks no PostgreSQL com **Row Level Security**, armazena os arquivos do runbook em **Storage privado** e utiliza **Edge Functions** para gerenciar usuários e validar uploads no servidor.

**Administrador inicial confirmado:** `jadson.souza@telefonica.com`. A conta precisa existir no Supabase Auth antes da atribuição do perfil. O script exige uma correspondência exata para evitar conceder permissões ao usuário errado.

## 1. Configurar banco e permissões no Supabase

1. Abra [Supabase Dashboard](https://supabase.com/dashboard) e selecione o projeto **Gestao_Implantação**.
2. Entre em **SQL Editor → New query**.
3. Abra `supabase/01_schema.sql` deste ZIP, cole todo o conteúdo e execute **Run**. O script cria `gi_profiles`, `gi_records`, `gi_audit`, políticas RLS, funções de validação e bucket privado `gi-runbooks`.
4. Em **Database → Tables** confirme que as três tabelas apareceram. Em **Authentication → Policies** confirme que RLS está habilitado para todas elas. Em **Storage**, confirme que `gi-runbooks` é **Private**.
5. **Não remova as políticas RLS** e não conceda acesso anônimo para contornar erros de permissão.

## 2. Configurar autenticação por e-mail

1. Acesse **Authentication → Providers → Email**: habilite Email, mantenha confirmação de e-mail habilitada para novas contas. Desabilite cadastro público (*Allow new users to sign up*, em Authentication → Settings) se seu projeto for exclusivo a funcionários. Novos colaboradores serão convidados pela tela **Usuários**.
2. Em **Authentication → URL Configuration**, configure:
   - **Site URL:** `https://jadsnet.github.io/Sistema-Implanta-o/`
   - **Redirect URLs:** `https://jadsnet.github.io/Sistema-Implanta-o/`
   - Para teste local, opcionalmente: `http://localhost:8765/**`
3. Configure **Authentication → SMTP Settings** com um provedor de envio corporativo para convites e recuperações de senha em produção. O serviço de e-mail de testes do Supabase possui limites e não substitui SMTP de produção.
4. Em **Authentication → Users**, crie manualmente a **sua conta real** usando o e-mail confirmado terminado em `@telefonica.com`, com senha provisória forte. Confirme o e-mail se solicitado.
5. No **SQL Editor**, execute o arquivo **`supabase/02_admin_inicial.sql`** após criar a conta de `jadson.souza@telefonica.com`. Ele confere a existência de exatamente uma conta correspondente e então atribui o perfil administrador:

```sql
update public.gi_profiles
set role = 'administrador', active = true
where email = 'jadson.souza@telefonica.com';
```

6. Confira que somente sua conta virou administradora:

```sql
select email, role, active, must_change_password
from public.gi_profiles
order by email;
```

Se a conta ainda não existir em **Authentication → Users**, o script `02_admin_inicial.sql` interromperá a execução com uma mensagem. A coluna `email` é única e o script não cria contas automaticamente.

## 3. Publicar a função de usuários (segredo somente no servidor)

1. Instale [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) no computador (via instalador suportado ou pacote local).
2. Extraia o ZIP e abra um terminal na pasta que contém `index.html` e a subpasta `supabase`.
3. Execute:

```bash
supabase login
supabase link --project-ref SEU-PROJECT-REF
supabase functions deploy gi-users
supabase functions deploy gi-files
```

O `project-ref` é a parte entre `https://` e `.supabase.co` da **Project URL** mostrada no Dashboard. **Não cole senha do banco nem `service_role` em GitHub**. Ao publicar via CLI, a função utiliza os segredos próprios do projeto (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) no ambiente de execução. Nunca use `--no-verify-jwt` nesta função.

4. No Dashboard → Edge Functions, confirme que **gi-users** e **gi-files** aparecem e estão configuradas para **Verify JWT**. Uma chamada sem token deve ser recusada com `401`.

## 4. Configurar a aplicação estática (GitHub Pages)

1. No Supabase Dashboard → **Project Settings → Data API / API Keys**, copie **Project URL** e a chave **publishable** (`sb_publishable_…`, ou a anon legada se seu projeto não tiver a nova). Essas duas informações são públicas e podem ficar no navegador, **desde que RLS esteja ativado**.
2. Edite `supabase-config.js`:

```javascript
window.GI_SUPABASE_CONFIG = Object.freeze({
  url: 'https://SEU-PROJECT-REF.supabase.co',
  publishableKey: 'COLE_AQUI_SUA_PUBLISHABLE_KEY'
});
```

3. Envie os arquivos do ZIP para o repositório `jadsnet/Sistema-Implanta-o` usando a mesma raiz onde está o `index.html` atual. A pasta `supabase/` pode permanecer versionada; **não deve conter segredos**.
4. Em **GitHub → Settings → Pages**, confira se a publicação usa a branch e a pasta corretas (por exemplo, `main / root`). Após publicar, acesse **https://jadsnet.github.io/Sistema-Implanta-o/** e faça login com a conta administradora.
5. Se for o primeiro login, a tela pedirá uma **nova senha forte**; a senha é trocada pelo Supabase Auth e o banco libera acesso depois que o provedor confirma a alteração.

Não há necessidade de conectar o Supabase ao GitHub: **GitHub Pages hospeda apenas o frontend estático; PostgreSQL, RLS, Auth, Storage e Edge Functions estão no Supabase.**

## 5. Gerenciar colaboradores

1. Entre como **Administrador** e abra um projeto → **Painel do administrador → Usuários**.
2. Informe nome completo, e-mail `@telefonica.com`, matrícula e perfil inicial:
   - **Administrador:** configura projetos, gerencia colaboradores e atividades.
   - **Gestor:** configura projetos e gerencia atividades, **não altera perfis de usuários**.
   - **Analista:** consulta os projetos, adota atividades disponíveis e edita suas próprias atividades/runbooks. Atividades de terceiros são somente leitura.
3. Clique **Enviar convite**. O servidor valida o administrador, cria a conta e solicita ao Supabase um e-mail de convite.
4. Na lista, o administrador pode mudar perfil, ativar/bloquear contas e enviar link para redefinir senha. A própria conta administradora não pode se desativar/retirar o próprio perfil nessa tela.

## 6. Conferir segurança e integração

- Abra uma aba anônima: não pode ver dados, projetos, relatórios nem imagens sem login.
- Tente login com e-mail fora de `@telefonica.com`: deve ser recusado.
- Entre como **Analista A**, adote uma atividade e edite-a. Entre como **Analista B** e tente modificar a mesma atividade, inclusive por chamada REST/RPC no DevTools: o PostgreSQL deve rejeitar.
- Entre como Gestor, abra Usuários: a aba não deve existir. Tente chamar `gi-users` com esse token: recebe `403`.
- Faça uma alteração, clique em **Atualizar dados** e confira que a alteração persistiu em outro navegador.
- Teste concorrência: duas sessões editam o mesmo registro. A segunda atualização com versão antiga deve ser rejeitada, evitando sobrescrita silenciosa.
- Tente CSV iniciado com `=`, `+`, `-` ou `@`; a exportação neutraliza fórmulas. Envie arquivos falsos `.xlsx` ou SVG renomeado para `.png`: devem ser rejeitados no navegador e em **gi-files**. A tentativa de fazer upload diretamente pelo REST Storage com a chave pública também deve ser recusada pelas políticas RLS.
- Verifique no Dashboard que o bucket é privado e que o log `gi_audit` registra mudanças.

## 7. Dados antigos do navegador

A versão anterior gravava dados em `localStorage` e arquivos em `IndexedDB`. Este pacote **não apaga esses dados locais**. Caso eles existam **no mesmo navegador e origem (mesmo endereço web)**, o administrador verá no Painel do administrador → Projetos o botão **Importar meus dados locais para o Supabase**. Revise os registros antes de confirmar; IDs e VGR repetidos são ignorados, usuários e senhas antigas nunca são importados. Os arquivos originais também são copiados, sem apagar os anteriores. Faça backup antes da migração e confira os totais após concluir. Se a origem mudou (por exemplo `localhost` para GitHub Pages), os dados não estarão acessíveis automaticamente devido ao isolamento de armazenamento do navegador.

## 8. Limites importantes

- A integração e as políticas foram implementadas no código entregue, **mas não foram aplicadas em sua instância** porque esta sessão não tem acesso administrativo ao seu Supabase/GitHub. Só após executar SQL, publicar a função, configurar a chave publishable e testar é possível considerar o ambiente ativo.
- O aplicativo preserva o processamento local para **apresentação, filtros e geração de arquivos XLSX**. A decisão final sobre permissões, vínculo de projetos, dono e versões é do PostgreSQL; não confie na interface para impor segurança.
- O informe por e-mail atualmente monta e baixa um rascunho `.eml` com planilha anexa. Ele não envia diretamente de uma conta corporativa sem uma integração Microsoft Graph autorizada. O fluxo do Teams também continua dependendo da configuração corporativa.
- Não publique dados reais até concluir os testes de autorização e revisar as políticas com a equipe de segurança da sua organização.

Fontes oficiais: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Auth Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Auth Passwords](https://supabase.com/docs/guides/auth/passwords), [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control), [Edge Function Auth](https://supabase.com/docs/guides/functions/auth).
