const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/04_analistas_aliases.sql'),'utf8');
const snippets=[
 app.slice(app.indexOf('function normStatus('),app.indexOf('function getName(')),
 app.slice(app.indexOf('function analystNameKey('),app.indexOf('function renderUserPicker(')),
 app.slice(app.indexOf('function importedDateDay('),app.indexOf('function importedTime(')),
 app.slice(app.indexOf('function completionLabel('),app.indexOf('const funnelIcon=')),
];
const context={Date,console,elapsed:()=> '01:23:45'};
vm.createContext(context);
vm.runInContext(snippets.join('\n'),context,{filename:'app.js'});
const activity=(status,startAt='2026-10-24T12:00:00Z',endAt=null,row={})=>({data:{status,startAt,endAt,row}});
for(const status of ['Pendente','Migrada','Quebra','Abandonada']){
 assert.equal(context.runningActivityTime(activity(status)),'',`${status} não pode contar tempo`);
}
for(const status of ['Em andamento','Contatando técnico','Iniciando configuração','Finalizando configuração']){
 assert.equal(context.runningActivityTime(activity(status)),'01:23:45',`${status} deve contar tempo`);
}
assert.equal(context.completionLabel(activity('Migrada','2026-10-24T10:00:00Z','2026-10-24T12:00:00Z')),'Migrada em 24/10/2026');
assert.equal(context.completionLabel(activity('Quebra',undefined,null,{'DATA SDWAN':'21/10/26'})),'Quebrada em 21/10/2026');
assert.equal(context.completionLabel(activity('Pendente')), '');

const duplicates=['ADRIANA SILVA ALVES DOS SANTO','ADRIANA SILVA ALVES DOS SANTOS',
 'CESAR SOARES','CESAR SOARES - EMERGENCIAL','JADSON RODRIGUES DE SOUZA','Jadson Rodrigues de Souza',
 'Danilo Alves Celestino','DANILO ALVES CELESTINO','Luigi Marcello','LUIGI MARCELLO',
 'BRUNO COSTA SILVERIO','BRUNO NEVES'];
const unique=new Set(duplicates.map(context.canonicalAnalystName));
assert.equal(unique.size,7,'variantes equivalentes deixam de duplicar o filtro de analistas');
assert.equal(context.analystListName('BRUNO COSTA SILVERIO'),'BRUNO COSTA');
assert.equal(context.analystListName('BRUNO NEVES'),'BRUNO NEVES');
assert.match(app,/projectActivities\(\)\.map\(a=>canonicalAnalystName\(a\.data\.analystName\)\)/);
assert.match(app,/function matchesAnalystFilter\(a\)/);
assert.match(app,/canonicalAnalystName\(a\.data\?\.analystName\)\.toLocaleLowerCase/);
assert.match(app,/listRunningTime\(a,st\)\?`<span class="elapsed" data-start=/);
assert.match(sql,/create or replace function private\.gi_name_key/);
assert.match(sql,/gi_analyst_canonical before insert or update/);
assert.match(sql,/adriana silva alves dos santo/);
assert.match(sql,/emergencial/);
assert.doesNotMatch(sql,/levenshtein|similarity\(/i,'não agrupar nomes diferentes por aproximação arriscada');
console.log('PASSOU: migradas/quebradas sem contador, datas de conclusão, sete analistas distintos e aliases validados no servidor');
