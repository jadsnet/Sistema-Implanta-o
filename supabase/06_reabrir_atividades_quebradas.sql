-- Executar após 05_status_quebras.sql no SQL Editor do Supabase.
-- Autoriza QUALQUER analista ativo a assumir uma atividade quebrada, sem acesso aos dados de terceiros antes da adoção.
-- O trigger aceita somente a transição segura Quebra -> Contatando técnico e valida os campos imutáveis.
-- Reexecutável; não concede privilégios a usuários anônimos.
begin;

create or replace function private.gi_guard_record() returns trigger language plpgsql security definer
set search_path = '' as $$
declare
  actor uuid := auth.uid();
  privileged boolean := private.gi_manager();
  caller_name text;
  referenced public.gi_records%rowtype;
  imported_name text;
  imported_owner uuid;
  allowed_status text[] := array['Pendente','Em andamento','Contatando técnico','Iniciando configuração',
       'Finalizando configuração','Aguardando cliente config Fortinet','Organização de Rack e equipamentos',
       'Migrada','Quebra','Quebra Cliente','Quebra Delfia','Quebra Duplicidade',
       'Quebra link','Quebra Vivo Redes','Abandonada'];
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
      -- Não confia em owner_id vindo do cliente.
      new.owner_id=private.gi_imported_owner(new.data->>'analystName');
    else
      if new.project_id is distinct from old.project_id then raise exception 'Não é permitido mover atividade de projeto'; end if;
      if not privileged then
        if (new.data->'row'->>'ID VGR') is distinct from (old.data->'row'->>'ID VGR')
          or (new.data->'row'->>'ID_VGR') is distinct from (old.data->'row'->>'ID_VGR') then
          raise exception 'ID VGR não pode ser alterado pelo analista';
        end if;
        if new.data->>'status'='Pendente' and nullif(new.data->>'analystName','') is not null
           and (old.data->>'status' is distinct from 'Pendente'
             or private.gi_name_key(old.data->>'analystName') is distinct from private.gi_name_key(new.data->>'analystName')) then
          raise exception 'Para abandonar, é necessário liberar a atividade';
        end if;
        if new.data->>'status' in ('Migrada','Quebra','Quebra Cliente','Quebra Delfia',
             'Quebra Duplicidade','Quebra link','Quebra Vivo Redes') and nullif(new.data->>'endAt','') is null then
          raise exception 'Conclusão exige data de término';
        end if;
        select coalesce(nullif(p.full_name,''),p.email) into caller_name
        from public.gi_profiles p where p.id=actor;
        if old.data->>'status' in ('Quebra','Quebra Cliente','Quebra Delfia','Quebra Duplicidade','Quebra link','Quebra Vivo Redes')
           and new.data->>'status'='Contatando técnico'
           and nullif(new.data->>'endAt','') is null and nullif(new.data->>'startAt','') is not null
           and private.gi_name_key(new.data->>'analystName')=private.gi_name_key(caller_name)
           and private.gi_name_key(new.data->>'analystId')=private.gi_name_key(caller_name)
           and (new.data - 'analystName' - 'analystId' - 'status' - 'startAt' - 'endAt' - 'updatedAt')
               is not distinct from
               (old.data - 'analystName' - 'analystId' - 'status' - 'startAt' - 'endAt' - 'updatedAt') then
          -- A quebra encerrou a tentativa anterior. A nova adoção transfere só o responsável e reinicia o relógio.
          new.owner_id=actor;
        else
          if old.owner_id is null then
          imported_name=nullif(btrim(old.data->>'analystName'),'');
          imported_owner=private.gi_imported_owner(imported_name);
          if imported_name is not null then
            -- Um nome importado reserva a atividade; outro analista não pode
            -- adotá-la só porque owner_id ainda está nulo.
            if imported_owner is distinct from actor then
              raise exception 'Atividade reservada a outro analista ou nome ambíguo';
            end if;
          else
            -- Adoção manual de atividades verdadeiramente sem responsável.
            if (new.data - 'analystName' - 'analystId' - 'status' - 'startAt' - 'endAt' - 'updatedAt')
               is distinct from
               (old.data - 'analystName' - 'analystId' - 'status' - 'startAt' - 'endAt' - 'updatedAt')
               or new.data->>'status' not in ('Contatando técnico','Em andamento') then
              raise exception 'Adote a atividade antes de alterar os campos';
            end if;
          end if;
          new.owner_id=actor;
        elsif old.owner_id is distinct from actor then
          raise exception 'Atividade pertence a outro analista';
          end if;
        end if;
        if new.data->>'status'='Pendente' and nullif(new.data->>'analystName','') is null then
          new.owner_id=null;
        else
          new.data=jsonb_set(jsonb_set(new.data,'{analystName}',to_jsonb(caller_name)),
                                   '{analystId}',to_jsonb(caller_name));
        end if;
      else
        -- Gestores também podem assumir pessoalmente uma quebra. A mudança
        -- deve ser exatamente a mesma transição restrita usada pelos analistas.
        select coalesce(nullif(p.full_name,''),p.email) into caller_name
        from public.gi_profiles p where p.id=actor;
        if old.data->>'status' in ('Quebra','Quebra Cliente','Quebra Delfia','Quebra Duplicidade','Quebra link','Quebra Vivo Redes')
           and new.data->>'status'='Contatando técnico'
           and nullif(new.data->>'endAt','') is null and nullif(new.data->>'startAt','') is not null
           and private.gi_name_key(new.data->>'analystName')=private.gi_name_key(caller_name)
           and private.gi_name_key(new.data->>'analystId')=private.gi_name_key(caller_name)
           and (new.data - 'analystName' - 'analystId' - 'status' - 'startAt' - 'endAt' - 'updatedAt')
               is not distinct from
               (old.data - 'analystName' - 'analystId' - 'status' - 'startAt' - 'endAt' - 'updatedAt') then
          new.owner_id=actor;
        else
          -- O gestor não pode forjar owner_id em edições comuns.
          new.owner_id=coalesce(old.owner_id,private.gi_imported_owner(new.data->>'analystName'));
        end if;
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

-- A política permite iniciar a transferência sobre uma quebra já atribuída.
-- Todas as mutações continuam sujeitas à validação do trigger acima.
drop policy if exists gi_records_update on public.gi_records;
create policy gi_records_update on public.gi_records for update to authenticated
  using (private.gi_manager() or (private.gi_active() and kind='activities'
        and (owner_id=(select auth.uid()) or owner_id is null
             or data->>'status' in ('Quebra','Quebra Cliente','Quebra Delfia','Quebra Duplicidade','Quebra link','Quebra Vivo Redes')))
        or (private.gi_active() and kind='runbooks' and owner_id=(select auth.uid())))
  with check (private.gi_manager() or (private.gi_active() and kind in ('activities','runbooks')));

commit;
