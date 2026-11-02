-- Execute após 01_schema.sql e após criar a conta em Authentication > Users.
-- E-mail confirmado pelo titular: jadson.souza@telefonica.com.
-- O script não cria a conta e não redefine sua senha.
do $$
declare account_count integer;
begin
  select count(*) into account_count
  from public.gi_profiles
  where email='jadson.souza@telefonica.com';

  if account_count <> 1 then
    raise exception 'Administrador não ativado: crie primeiro jadson.souza@telefonica.com no Supabase Auth (encontrados: %)',account_count;
  end if;

  update public.gi_profiles
     set role='administrador',active=true
   where email='jadson.souza@telefonica.com';
end $$;

-- Conferência (deve retornar exatamente uma linha):
select email,role,active,must_change_password
from public.gi_profiles
where email='jadson.souza@telefonica.com';
