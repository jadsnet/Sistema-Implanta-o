-- Execute uma vez, DEPOIS de 03_vinculo_analistas.sql.
-- Unifica variações confirmadas, sem confundir pessoas com apenas o primeiro nome igual.
begin;

create or replace function private.gi_name_key(value text) returns text
language sql immutable set search_path = '' as $$
  with folded as (
    select btrim(regexp_replace(
      translate(lower(coalesce(value,'')),
        'áàâãäéèêëíìîïóòôõöúùûüçñ',
        'aaaaaeeeeiiiiooooouuuucn'),
      '[^a-z0-9]+',' ','g')) as name
  )
  select case
    when name='adriana silva alves dos santo' then 'adriana silva alves dos santos'
    when array_length(regexp_split_to_array(name,' '),1)>=3 and name ~ ' emergencial$'
      then regexp_replace(name,' emergencial$','')
    else name
  end
  from folded;
$$;

-- Nome para persistência e exibição. O nome completo é preservado;
-- apenas maiúsculas, espaços, um sufixo de escala e o alias conhecido mudam.
create or replace function private.gi_canonical_analyst_name(value text) returns text
language sql immutable set search_path = '' as $$
  with cleaned as (
    select btrim(regexp_replace(upper(coalesce(value,'')), '[[:space:]]+', ' ', 'g')) as name
  )
  select case
    when private.gi_name_key(name)='adriana silva alves dos santos'
      then 'ADRIANA SILVA ALVES DOS SANTOS'
    when array_length(regexp_split_to_array(private.gi_name_key(name),' '),1)>=2
      and name ~ '[[:space:]]+(-[[:space:]]*)?EMERGENCIAL$'
      then btrim(regexp_replace(name,'[[:space:]]+(-[[:space:]]*)?EMERGENCIAL$',''))
    else name
  end
  from cleaned;
$$;

-- O banco também normaliza diretamente os registros recebidos via REST/RPC,
-- independentemente de como o cliente enviou analystName.
create or replace function private.gi_normalize_analyst_record() returns trigger
language plpgsql security definer set search_path = '' as $$
declare original_name text; canonical_name text;
begin
  if new.kind='activities' then
    original_name=new.data->>'analystName';
    if nullif(btrim(original_name),'') is not null then
      canonical_name=private.gi_canonical_analyst_name(original_name);
      if canonical_name is distinct from original_name then
        new.data=jsonb_set(new.data,'{analystName}',to_jsonb(canonical_name));
        if new.data->>'analystId'=original_name then
          new.data=jsonb_set(new.data,'{analystId}',to_jsonb(canonical_name));
        end if;
      end if;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists gi_analyst_canonical on public.gi_records;
create trigger gi_analyst_canonical before insert or update on public.gi_records
for each row execute function private.gi_normalize_analyst_record();

revoke all on function private.gi_name_key(text) from public,anon,authenticated;
revoke all on function private.gi_canonical_analyst_name(text) from public,anon,authenticated;
revoke all on function private.gi_normalize_analyst_record() from public,anon,authenticated;

commit;

-- Admin: após criar os usuários, em Administração > Usuários, clique
-- "Vincular analistas importados" para ligar os registros ainda sem dono.
-- As atividades antigas também aparecem agrupadas na interface sem reimportar.
