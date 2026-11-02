-- Gestão de Implantação — executar uma única vez no SQL Editor do Supabase.
-- A chave publishable/anon é pública; NUNCA colocar secret/service_role no GitHub.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.gi_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  registration text not null default '',
  role text not null default 'analista' check (role in ('administrador','gestor','analista')),
  active boolean not null default false,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

-- Novas contas só podem ser criadas com endereço corporativo; sem privilégios por padrão.
create or replace function private.gi_auth_created() returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  if lower(split_part(new.email,'@',2)) <> 'telefonica.com' then
    raise exception 'Somente e-mails @telefonica.com são permitidos';
  end if;
  insert into public.gi_profiles(id,email,full_name)
  values (new.id,lower(new.email),coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end; $$;
drop trigger if exists gi_auth_created on auth.users;
create trigger gi_auth_created after insert on auth.users
for each row execute function private.gi_auth_created();

create or replace function private.gi_password_changed() returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password then
    update public.gi_profiles set must_change_password=false where id=new.id;
  end if;
  return new;
end; $$;
drop trigger if exists gi_password_changed on auth.users;
create trigger gi_password_changed after update of encrypted_password on auth.users
for each row execute function private.gi_password_changed();

create or replace function private.gi_role() returns text language sql stable security definer
set search_path = '' as $$
  select p.role from public.gi_profiles p where p.id=(select auth.uid())
    and p.active and not p.must_change_password
    and p.email like '%@telefonica.com' limit 1;
$$;
create or replace function private.gi_active() returns boolean language sql stable security definer
set search_path = '' as $$ select private.gi_role() is not null; $$;
create or replace function private.gi_manager() returns boolean language sql stable security definer
set search_path = '' as $$ select private.gi_role() in ('administrador','gestor'); $$;
create or replace function private.gi_admin() returns boolean language sql stable security definer
set search_path = '' as $$ select private.gi_role() = 'administrador'; $$;

create table if not exists public.gi_records (
  kind text not null check (kind in ('projects','activities','runbooks')),
  id text not null check (length(id) between 1 and 180 and id ~ '^[a-zA-Z0-9_:\-.]+$'),
  project_id text,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data)='object'),
  owner_id uuid references auth.users(id),
  version integer not null default 1 check (version>=1),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key(kind,id)
);
create index if not exists gi_records_project on public.gi_records(kind,project_id);
create index if not exists gi_records_owner on public.gi_records(owner_id);
-- O VGR só pode existir uma vez por projeto. Ignora os registros manuais sem VGR.
create unique index if not exists gi_unique_project_vgr on public.gi_records
 (project_id,lower(btrim(coalesce(nullif(data->'row'->>'ID VGR',''),nullif(data->'row'->>'ID_VGR','')))))
 where kind='activities' and nullif(btrim(coalesce(nullif(data->'row'->>'ID VGR',''),data->'row'->>'ID_VGR','')),'') is not null;

create table if not exists public.gi_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  actor_email text not null,
  action text not null check(action in ('INSERT','UPDATE','DELETE')),
  kind text not null,
  record_id text not null,
  project_id text,
  happened_at timestamptz not null default now()
);
create index if not exists gi_audit_when on public.gi_audit(happened_at desc);

-- A regra decisória está no banco. Mesmo chamadas REST/RPC adulteradas passam por ela.
create or replace function private.gi_guard_record() returns trigger language plpgsql security definer
set search_path = '' as $$
declare
  actor uuid := auth.uid();
  privileged boolean := private.gi_manager();
  caller_name text;
  referenced public.gi_records%rowtype;
  allowed_status text[] := array['Pendente','Em andamento','Contatando técnico','Iniciando configuração',
       'Finalizando configuração','Aguardando cliente config Fortinet','Organização de Rack e equipamentos',
       'Migrada','Quebra','Abandonada'];
begin
  if actor is null or not private.gi_active() then raise exception 'Conta sem autorização'; end if;
  if tg_op='DELETE' then
    if old.kind='projects' and not privileged then raise exception 'Perfil não pode excluir projeto'; end if;
    if old.kind='activities' and not privileged then raise exception 'Somente gestor pode excluir atividade'; end if;
    if old.kind='runbooks' and not privileged and old.owner_id is distinct from actor then
      raise exception 'Runbook de outro analista';
    end if;
    return old;
  end if;
  if octet_length(new.data::text)>12000000 then raise exception 'Registro excede 12 MB'; end if;
  if new.kind='projects' then
    if not privileged then raise exception 'Perfil não pode configurar projeto'; end if;
    if new.project_id is distinct from new.id then raise exception 'Projeto inconsistente'; end if;
    new.owner_id=null;
  elsif new.kind='activities' then
    if not exists(select 1 from public.gi_records where kind='projects' and id=new.project_id) then
      raise exception 'Projeto não encontrado';
    end if;
    if new.data->>'projectId' is distinct from new.project_id then raise exception 'Projeto da atividade inválido'; end if;
    if coalesce(new.data->>'status','Pendente') <> all(allowed_status) then
      raise exception 'Status inválido';
    end if;
    if tg_op='INSERT' then
      if not privileged then raise exception 'Somente gestor cadastra ou importa atividades'; end if;
      new.owner_id=null;
    else
      if new.project_id is distinct from old.project_id then raise exception 'Não é permitido mover atividade de projeto'; end if;
      if not privileged then
        if (new.data->'row'->>'ID VGR') is distinct from (old.data->'row'->>'ID VGR')
          or (new.data->'row'->>'ID_VGR') is distinct from (old.data->'row'->>'ID_VGR') then
          raise exception 'ID VGR não pode ser alterado pelo analista';
        end if;
        if new.data->>'status'='Pendente' and nullif(new.data->>'analystName','') is not null then
          raise exception 'Para abandonar, é necessário liberar a atividade';
        end if;
        if new.data->>'status' in ('Migrada','Quebra') and nullif(new.data->>'endAt','') is null then
          raise exception 'Conclusão exige data de término';
        end if;
        select coalesce(nullif(p.full_name,''),p.email) into caller_name
        from public.gi_profiles p where p.id=actor;
        if old.owner_id is null then
          -- Adoção somente: não editar dados, trocar ID, forçar conclusão ou atribuir a terceiros.
          if (new.data - 'analystName' - 'analystId' - 'status' - 'startAt' - 'endAt' - 'updatedAt')
             is distinct from
             (old.data - 'analystName' - 'analystId' - 'status' - 'startAt' - 'endAt' - 'updatedAt')
             or new.data->>'status' not in ('Contatando técnico','Em andamento') then
            raise exception 'Adote a atividade antes de alterar os campos';
          end if;
          new.owner_id=actor;
        elsif old.owner_id is distinct from actor then
          raise exception 'Atividade pertence a outro analista';
        end if;
        if new.data->>'status'='Pendente' and nullif(new.data->>'analystName','') is null then
          new.owner_id=null;
        else
          new.data=jsonb_set(jsonb_set(new.data,'{analystName}',to_jsonb(caller_name)),
                                   '{analystId}',to_jsonb(caller_name));
        end if;
      else
        -- Gestor pode editar, mas não usurpar o ID do dono via JSON.
        new.owner_id=old.owner_id;
      end if;
    end if;
  else -- runbooks
    select * into referenced from public.gi_records
      where kind='activities' and id=new.data->>'activityId';
    if not found then raise exception 'Atividade do runbook não encontrada'; end if;
    if new.project_id is distinct from referenced.project_id then raise exception 'Projeto do runbook inválido'; end if;
    if tg_op='INSERT' then
      if not privileged and referenced.owner_id is distinct from actor then
        raise exception 'Adote a atividade antes de realizar runbook';
      end if;
      new.owner_id=coalesce(referenced.owner_id,actor);
    else
      if new.project_id is distinct from old.project_id then raise exception 'Projeto imutável'; end if;
      if not privileged and old.owner_id is distinct from actor then raise exception 'Runbook de outro analista'; end if;
      new.owner_id=old.owner_id;
    end if;
  end if;
  new.updated_at=now();new.updated_by=actor;
  new.version=case when tg_op='INSERT' then 1 else old.version+1 end;
  return new;
end; $$;
drop trigger if exists gi_guard_record on public.gi_records;
create trigger gi_guard_record before insert or update or delete on public.gi_records
for each row execute function private.gi_guard_record();

create or replace function private.gi_audit_record() returns trigger language plpgsql security definer
set search_path = '' as $$
declare r public.gi_records%rowtype;
begin
  if tg_op='DELETE' then r=old; else r=new; end if;
  insert into public.gi_audit(actor_id,actor_email,action,kind,record_id,project_id)
    values (auth.uid(),coalesce(auth.jwt()->>'email',''),tg_op,r.kind,r.id,r.project_id);
  return coalesce(new,old);
end; $$;
drop trigger if exists gi_audit_record on public.gi_records;
create trigger gi_audit_record after insert or update or delete on public.gi_records
for each row execute function private.gi_audit_record();

alter table public.gi_profiles enable row level security;
alter table public.gi_records enable row level security;
alter table public.gi_audit enable row level security;
drop policy if exists gi_profiles_read on public.gi_profiles;
create policy gi_profiles_read on public.gi_profiles for select to authenticated
  using (id=(select auth.uid()) or private.gi_admin());
drop policy if exists gi_records_read on public.gi_records;
create policy gi_records_read on public.gi_records for select to authenticated using (private.gi_active());
drop policy if exists gi_records_insert on public.gi_records;
create policy gi_records_insert on public.gi_records for insert to authenticated
  with check (private.gi_manager() or (kind='runbooks' and private.gi_active()));
drop policy if exists gi_records_update on public.gi_records;
create policy gi_records_update on public.gi_records for update to authenticated
  using (private.gi_manager() or (private.gi_active() and kind='activities'
        and (owner_id=(select auth.uid()) or owner_id is null))
        or (private.gi_active() and kind='runbooks' and owner_id=(select auth.uid())))
  with check (private.gi_manager() or (private.gi_active() and kind in ('activities','runbooks')));
drop policy if exists gi_records_delete on public.gi_records;
create policy gi_records_delete on public.gi_records for delete to authenticated
  using (private.gi_manager() or (private.gi_active() and kind='runbooks' and owner_id=(select auth.uid())));
drop policy if exists gi_audit_read on public.gi_audit;
create policy gi_audit_read on public.gi_audit for select to authenticated using (private.gi_active());

revoke all on public.gi_profiles,public.gi_records,public.gi_audit from anon,authenticated;
grant select on public.gi_profiles to authenticated;
grant select,insert,update,delete on public.gi_records to authenticated;
grant select on public.gi_audit to authenticated;

-- Aplica todas as edições de um lote em UMA transação e rejeita versões antigas (concorrência).
create or replace function public.gi_sync_batch(p_changes jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; k text; rid text; op text; val jsonb; pid text;
  expected_version integer; saved public.gi_records%rowtype; response jsonb:='[]'::jsonb;
begin
  if not private.gi_active() then raise exception 'Conta não habilitada'; end if;
  if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes)>50 then
    raise exception 'Lote inválido: máximo 50 registros'; end if;
  for item in select value from jsonb_array_elements(p_changes) loop
    k=item->>'kind';rid=item->>'id';op=item->>'op';val=item->'data';
    if k not in ('projects','activities','runbooks') or rid is null
       or length(rid)>180 or op not in ('insert','update','delete') then
      raise exception 'Operação inválida'; end if;
    expected_version=coalesce((item->>'version')::integer,0);
    if op='delete' then
      delete from public.gi_records where kind=k and id=rid and version=expected_version
        returning * into saved;
      if not found then raise exception 'CONFLITO: exclusão %/%',k,rid; end if;
      response=response||jsonb_build_array(jsonb_build_object('kind',k,'id',rid,'deleted',true));
    elsif op='insert' then
      pid=case when k='projects' then rid else val->>'projectId' end;
      if k='runbooks' then
        select project_id into pid from public.gi_records
          where kind='activities' and id=val->>'activityId';
      end if;
      insert into public.gi_records(kind,id,project_id,data)
      values(k,rid,pid,val) returning * into saved;
      response=response||jsonb_build_array(jsonb_build_object('kind',k,'id',rid,
                              'version',saved.version,'data',saved.data));
    else
      update public.gi_records set data=val where kind=k and id=rid and version=expected_version
      returning * into saved;
      if not found then raise exception 'CONFLITO: atualização %/%',k,rid; end if;
      response=response||jsonb_build_array(jsonb_build_object('kind',k,'id',rid,
                              'version',saved.version,'data',saved.data));
    end if;
  end loop;
  return response;
end; $$;
revoke all on function public.gi_sync_batch(jsonb) from public,anon;
grant execute on function public.gi_sync_batch(jsonb) to authenticated;

-- Arquivos de runbook ficam privados; todo acesso exige sessão ativa e RLS.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('gi-runbooks','gi-runbooks',false,8388608,array['application/octet-stream','application/json'])
on conflict (id) do nothing;
drop policy if exists gi_storage_read on storage.objects;
create policy gi_storage_read on storage.objects for select to authenticated
using (bucket_id='gi-runbooks' and private.gi_active()
       and exists(select 1 from public.gi_records p where p.kind='projects'
                  and p.id=(storage.foldername(name))[1]));
drop policy if exists gi_storage_create on storage.objects;
drop policy if exists gi_storage_update on storage.objects;
drop policy if exists gi_storage_delete on storage.objects;
-- Não há políticas INSERT/UPDATE/DELETE para usuários: todo upload e exclusão
-- passa por gi-files (verifica sessão, dono, MIME, assinatura e tamanho no servidor).

commit;

-- ADMIN INICIAL: execute supabase/02_admin_inicial.sql SOMENTE depois de criar
-- jadson.souza@telefonica.com em Authentication > Users.
