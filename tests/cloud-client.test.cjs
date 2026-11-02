/* Testes de contrato sem senhas reais nem chamadas ao Supabase. Rodar: node tests/cloud-client.test.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../supabase-client.js'),'utf8');
const user={id:'00000000-0000-4000-8000-000000000001',email:'analista@telefonica.com'};
const profile={id:user.id,email:user.email,full_name:'Ana Silva',role:'analista',active:true,must_change_password:false};
let records=[
 {kind:'projects',id:'copasa',version:1,data:{name:'COPASA'}},
 {kind:'activities',id:'imp_1',version:1,data:{projectId:'copasa',row:{'ID VGR':'123'},status:'Pendente'}}
];
const calls=[];
const query=(table)=>{
 const props={
  async single(){return {data:profile,error:null}},
  select(){return props},eq(){return props},
  async range(start,end){return {data:(table==='gi_records'?records:[]).slice(start,end+1),error:null}},
  order(){return props},limit(){return props},
  then(resolve){resolve({data:[],error:null})}
 };return props;
};
const client={
 auth:{
  onAuthStateChange(){},async getUser(){return {data:{user},error:null}},
  async signInWithPassword(){return {error:null}},
  async updateUser(){return {error:null}},
  async signOut(){return {error:null}},
 },
 from:query,
 async rpc(name,{p_changes}){
  assert.equal(name,'gi_sync_batch');calls.push(p_changes);
  return {data:p_changes.map(change=>{
   const old=records.find(r=>r.kind===change.kind&&r.id===change.id);
   if(change.op==='insert'){records.push({kind:change.kind,id:change.id,version:1,data:change.data});return {...change,version:1};}
   if(change.op==='delete'){records=records.filter(r=>r!==old);return {...change,deleted:true};}
   assert.equal(change.version,old.version);
   old.data=change.data;old.version++;return {...change,version:old.version};
  }),error:null};
 },
 functions:{async invoke(){return {data:{ok:true},error:null}}},
 storage:{from(){return {async upload(){return {error:null}},async download(){return {data:null,error:{statusCode:'404'}}}}}}
};
const ctx={
 GI_SUPABASE_CONFIG:{url:'https://example.supabase.co',publishableKey:'sb_publishable_test'},
 supabase:{createClient(){return client}},
 console,setTimeout,clearTimeout,TextDecoder,TextEncoder,Uint8Array,Blob,
 location:{origin:'https://jadsnet.github.io',pathname:'/Sistema-Implanta-o/'},
 addEventListener(){},toast(){},
};
ctx.window=ctx;
vm.runInNewContext(source,ctx,{filename:'supabase-client.js'});

(async()=>{
 const cloud=ctx.GICloud;
 assert.equal(cloud.configured(),true);
 await cloud.initialize();await cloud.getProfile();
 assert.equal(cloud.role(),'analista');
 assert.equal(cloud.displayName(),'Ana Silva');
 assert.throws(()=>cloud.assertEmail('atacante@externo.com'),/@telefonica.com/);
 const db=await cloud.loadAll();
 assert.equal(db.projects.length,1);assert.equal(db.activities.length,1);
 assert.equal(cloud.userOwnsActivity({data:{analystName:'ÁNA  SILVA'}}),true,
   'normalizar acentos, caixa e espaços ao exibir atividades importadas');
 assert.equal(cloud.userOwnsActivity({data:{analystName:'Outra Analista'}}),false);
 assert.equal(cloud.userOwnsActivity({ownerId:'00000000-0000-4000-8000-000000000002',data:{analystName:'Ana Silva'}}),false,
   'owner_id determinado pelo servidor prevalece sobre igualdade do nome');
 assert.equal(cloud.userOwnsActivity({ownerId:user.id,data:{analystName:'Nome Antigo'}}),true);
 profile.full_name='Adriana Silva Alves dos Santos';
 assert.equal(cloud.userOwnsActivity({data:{analystName:'ADRIANA SILVA ALVES DOS SANTO'}}),true);
 profile.full_name='Cesar Soares';
 assert.equal(cloud.userOwnsActivity({data:{analystName:'CESAR SOARES - EMERGENCIAL'}}),true);
 profile.full_name='Ana Silva';
 db.activities[0].data.row.HOSTNAME='Matriz';
 cloud.queueSave(db);await cloud.flush();
 assert.equal(calls.length,1);assert.equal(calls[0][0].op,'update');
 assert.equal(calls[0][0].version,1);assert.equal(records[1].version,2);
 db.activities.push({id:'manual_2',data:{projectId:'copasa',row:{'ID VGR':'456'},status:'Pendente'}});
 cloud.queueSave(db);await cloud.flush();
 assert.equal(records.length,3);assert.equal(records[2].version,1);
 db.activities.splice(1,1);cloud.queueSave(db);await cloud.flush();
 assert.equal(records.length,2);
 console.log('PASSOU: sessão, domínio, snapshot, edição, controle de versão, inclusão, exclusão');
})().catch(error=>{console.error(error);process.exitCode=1});
