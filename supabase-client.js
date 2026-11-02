/* Adaptador persistente; a autoridade sobre perfis, proprietários e transições é do PostgreSQL. */
(function(){
 'use strict';
 const kinds=['projects','activities','runbooks'];
 const empty=()=>({projects:[],activities:[],runbooks:[],users:[],analysts:[],log:[]});
 const byKey=(kind,id)=>kind+'\u0000'+id;
 let client=null,profile=null,session=null,baseline=new Map(),timer=null,working=null,dirty=false,blocked=false;
 let getDb=()=>empty();
 const config=window.GI_SUPABASE_CONFIG||{};
 const configured=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url||'')
     && /^(sb_publishable_|eyJ)/.test(config.publishableKey||'');
 function assertClient(){if(!client)throw new Error('Supabase não configurado.');return client;}
 function assertEmail(email){if(!/^[a-zA-Z0-9._%+\-]+@telefonica\.com$/i.test(String(email||'').trim()))
   throw new Error('É obrigatório usar um e-mail @telefonica.com.');return email.trim().toLowerCase();}
 function displayName(){return profile?.full_name?.trim()||profile?.email||'Usuário';}
 const nameKey=value=>{
   let normalized=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
   if(normalized.split(' ').length>=3)normalized=normalized.replace(/ emergencial$/,'');
   if(normalized==='adriana silva alves dos santo')normalized='adriana silva alves dos santos';
   return normalized;
 };
 function userOwnsActivity(activity){
   if(!profile?.active||profile.must_change_password||!session?.id||!activity)return false;
   if(activity.ownerId)return activity.ownerId===session.id;
   // Apenas para apresentar o botão de edição. A vinculação e a autorização
   // efetivas são feitas por funções do PostgreSQL, inclusive em caso de homônimos.
   const imported=nameKey(activity.data?.analystName);
   return !!imported&&imported===nameKey(profile.full_name);
 }
 function role(){return profile?.active&&!profile?.must_change_password?profile.role:null;}
 async function initialize(){
   if(!configured())throw Error('Falta configurar a URL e a chave publishable do Supabase em supabase-config.js.');
   if(!window.supabase?.createClient)throw Error('Biblioteca Supabase indisponível.');
   client=window.supabase.createClient(config.url,config.publishableKey,{auth:{
     persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'
   }});
   client.auth.onAuthStateChange((event)=>{
     if(event==='PASSWORD_RECOVERY')setTimeout(()=>window.giOpenPasswordRecovery?.(),10);
     if(event==='SIGNED_OUT'){profile=null;session=null;baseline.clear();}
   });
   return client;
 }
 async function getProfile(){
   const {data:{user},error:authError}=await assertClient().auth.getUser();
   if(authError||!user){profile=null;session=null;return null;}
   if(!user.email?.toLowerCase().endsWith('@telefonica.com')){
     await client.auth.signOut();throw Error('Domínio de usuário não permitido.');
   }
   const {data,error}=await client.from('gi_profiles').select('*').eq('id',user.id).single();
   if(error)throw Error('Perfil não disponível: '+error.message);
   profile=data;session=user;return profile;
 }
 async function signIn(email,password){
   email=assertEmail(email);
   const {error}=await assertClient().auth.signInWithPassword({email,password});
   if(error)throw Error('Credenciais inválidas ou acesso não autorizado.');
   return getProfile();
 }
 async function resetPassword(email){
   email=assertEmail(email);
   const {error}=await assertClient().auth.resetPasswordForEmail(email,{
     redirectTo:location.origin+location.pathname
   });
   if(error)throw error;
 }
 async function changePassword(password){
   if(typeof password!=='string'||password.length<12||password.length>128||
       !/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))
     throw Error('Use no mínimo 12 caracteres, com letras maiúsculas, minúsculas e números.');
   const {error}=await assertClient().auth.updateUser({password});
   if(error)throw error;
   await getProfile();
 }
 async function signOut(){
   await waitForSaves().catch(()=>{});
   await assertClient().auth.signOut();
   profile=null;session=null;baseline.clear();dirty=false;blocked=false;
 }
 async function queryAll(table,columns='*'){
   const rows=[];let from=0;
   while(true){
     const {data,error}=await client.from(table).select(columns).range(from,from+499);
     if(error)throw new Error('Falha ao ler '+table+': '+error.message);
     rows.push(...data);if(data.length<500)break;from+=500;
     if(from>50000)throw Error('Limite de consulta excedido; solicite paginação no servidor.');
   }
   return rows;
 }
 async function loadAll(){
   if(!role())throw Error('Sua conta precisa ser habilitada por um administrador e concluir a troca de senha.');
   const records=await queryAll('gi_records','kind,id,data,version,owner_id');
   const next=empty(),nextBase=new Map();
   for(const r of records){if(!kinds.includes(r.kind))continue;
     const entity={id:r.id,data:r.data||{},ownerId:r.owner_id||null};next[r.kind].push(entity);
     nextBase.set(byKey(r.kind,r.id),{version:r.version,json:JSON.stringify(entity.data)});
   }
   const audit=await client.from('gi_audit').select('*').order('happened_at',{ascending:false}).limit(500);
   if(audit.error)throw audit.error;
   next.log=(audit.data||[]).map(a=>({id:String(a.id),data:{ts:a.happened_at,
     user:a.actor_email,act:a.action+' '+a.kind,detail:a.record_id,actId:a.record_id}}));
   if(role()==='administrador'){
     const profiles=await queryAll('gi_profiles','id,email,full_name,registration,role,active,must_change_password');
     next.users=profiles.map(p=>({id:p.id,data:{email:p.email,nome:p.full_name,sobrenome:'',
       re:p.registration,role:p.role,active:p.active,mustChangePassword:p.must_change_password}}));
   }
   baseline=nextBase;blocked=false;dirty=false;
   return next;
 }
 function changesFor(db){
   const pending=[],present=new Set();
   for(const kind of kinds)for(const record of db[kind]||[]){
     if(!record?.id||typeof record.data!=='object')continue;
     const key=byKey(kind,record.id),previous=baseline.get(key),json=JSON.stringify(record.data);
     present.add(key);
     if(!previous)pending.push({op:'insert',kind,id:record.id,version:0,data:record.data});
     else if(previous.json!==json)pending.push({op:'update',kind,id:record.id,version:previous.version,data:record.data});
   }
   for(const [key,entry] of baseline){if(!present.has(key)){
     const [kind,id]=key.split('\u0000');pending.push({op:'delete',kind,id,version:entry.version});
   }}
   const priority=c=>c.op==='delete'?({runbooks:0,activities:1,projects:2})[c.kind]+6:
                  ({projects:0,activities:1,runbooks:2})[c.kind]+(c.op==='insert'?0:3);
   return pending.sort((a,b)=>priority(a)-priority(b));
 }
 function queueSave(db){
   if(db)getDb=()=>db;
   if(!role()||blocked)return;
   dirty=true;clearTimeout(timer);timer=setTimeout(()=>void flush().catch(()=>{}),300);
 }
 async function flush(){
   clearTimeout(timer);timer=null;
   if(working){await working;if(dirty)return flush();return;}
   if(!dirty||blocked||!role())return;
   working=(async()=>{
     dirty=false;
     try{
       const deltas=changesFor(getDb());
       if(!deltas.length)return;
       for(let i=0;i<deltas.length;i+=50){
         const chunk=deltas.slice(i,i+50);
         const {data,error}=await client.rpc('gi_sync_batch',{p_changes:chunk});
         if(error)throw Error(error.message);
         for(const result of data||[]){
           const key=byKey(result.kind,result.id);
           if(result.deleted){baseline.delete(key);continue;}
           const raw=JSON.stringify(result.data);
           baseline.set(key,{version:result.version,json:raw});
           const rec=(getDb()?.[result.kind]||[]).find(x=>x.id===result.id);
           if(rec&&JSON.stringify(rec.data)===JSON.stringify(chunk.find(x=>x.id===result.id&&x.kind===result.kind)?.data))
             rec.data=result.data;
         }
       }
       window.toast?.('Salvo automaticamente',3000);
     }catch(error){
       blocked=true;console.error('Supabase: gravação recusada',error);
       window.toast?.('Não foi possível salvar: '+error.message+' — recarregue os dados.',9000);
       throw error;
     }
   })();
   try{await working;}finally{working=null;}
   if(dirty&&!blocked)return flush();
 }
 async function waitForSaves(){if(dirty||working)await flush();}
 async function adminUsers(action,payload={}){
   if(role()!=='administrador')throw Error('Somente administrador gerencia usuários.');
   const {data,error}=await client.functions.invoke('gi-users',{body:{action,...payload}});
   if(error)throw new Error(error.message||'Falha no serviço de usuários');
   if(data?.error)throw Error(data.error);
   if(action==='invite'){
     const {data:linked,error:linkError}=await client.rpc('gi_reconcile_imported_analysts');
     if(linkError)return {...data,warning:'Convite enviado; execute supabase/03_vinculo_analistas.sql para vincular os nomes automaticamente.'};
     return {...data,linked};
   }
   return data;
 }
 async function reconcileImportedAnalysts(){
   if(role()!=='administrador')throw Error('Somente administrador vincula analistas.');
   const {data,error}=await assertClient().rpc('gi_reconcile_imported_analysts');
   if(error)throw Error('Aplique supabase/03_vinculo_analistas.sql. '+error.message);
   return Number(data||0);
 }
 function storagePath(key){
   const stringKey=String(key||'');
   const project=stringKey.startsWith('runbook-imagens:')?stringKey.split(':')[1]:stringKey;
   if(!/^[a-zA-Z0-9_-]{1,150}$/.test(project))throw Error('Identificador de projeto inválido');
   return project+'/'+encodeURIComponent(stringKey);
 }
 async function filePut(key,value){
   const encoded=Array.isArray(value)?JSON.stringify(value):value;
   const mime=Array.isArray(value)?'application/json':'application/octet-stream';
   const blob=encoded instanceof Blob?encoded:new Blob([encoded],{type:mime});
   if(blob.size>8*1024*1024)throw Error('O arquivo do runbook excede 8 MB.');
   const bytes=new Uint8Array(await blob.arrayBuffer());
   let raw='';for(let i=0;i<bytes.length;i+=16384)raw+=String.fromCharCode(...bytes.subarray(i,i+16384));
   const {data,error}=await assertClient().functions.invoke('gi-files',{
     body:{action:'put',key:String(key),contentBase64:btoa(raw)}
   });
   if(error||!data?.ok)throw Error(data?.error||error?.message||'Upload recusado pelo servidor');
 }
 async function fileGet(key){
   const {data,error}=await assertClient().storage.from('gi-runbooks').download(storagePath(key));
   if(error){if(error.message?.includes('not found')||error.statusCode==='404')return null;throw error;}
   if(data.type==='application/json')return JSON.parse(await data.text());
   const buf=await data.arrayBuffer();
   // Snapshots antigos de runbook são arrays JSON; novos modelos são XLSX binário.
   if(new Uint8Array(buf)[0]===91)return JSON.parse(new TextDecoder().decode(buf));
   return buf;
 }
 async function fileRemove(key){
   const {data,error}=await assertClient().functions.invoke('gi-files',{body:{action:'delete',key:String(key)}});
   if(error||!data?.ok)throw Error(data?.error||error?.message||'Exclusão recusada pelo servidor');
 }
 window.GICloud={configured,initialize,getProfile,signIn,signOut,resetPassword,changePassword,
   loadAll,queueSave,flush,waitForSaves,adminUsers,reconcileImportedAnalysts,userOwnsActivity,assertEmail,displayName,role,
   filePut,fileGet,fileRemove,client:()=>client,profile:()=>profile};
 window.addEventListener('beforeunload',event=>{if(dirty||working){event.preventDefault();event.returnValue='';}});
})();
