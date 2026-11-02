const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/05_status_quebras.sql'),'utf8');
const helpers=[
 app.slice(app.indexOf('const statuses='),app.indexOf('let dateFilter=')),
 app.slice(app.indexOf('function analystNameKey('),app.indexOf('function renderUserPicker(')),
 app.slice(app.indexOf('function importColumnKey('),app.indexOf('function importVgrKey(')),
 app.slice(app.indexOf('function importedStatus('),app.indexOf('function importedDate(')),
 app.slice(app.indexOf('function normStatus('),app.indexOf('function getName(')),
].join('\n');
const context={};vm.createContext(context);vm.runInContext(helpers,context,{filename:'app.js'});
const types=['Quebra Cliente','Quebra Delfia','Quebra Duplicidade','Quebra link','Quebra Vivo Redes'];
for(const type of types){
 assert.equal(context.importedStatus(type.toUpperCase()),type);
 assert.equal(context.normStatus(type),'Quebra','todo motivo deve entrar no cartão Quebradas');
 assert.match(migration,new RegExp(`'${type}'`));
}
assert.equal(context.importedStatus('Duplicidade'),'Quebra Duplicidade');
assert.equal(context.importedStatus('Quebra Link'),'Quebra link');
const p={data:{extraFields:[{name:'Parceiro',section:'Outras informações'}],fieldSectionOverrides:{reparo:'Link',network:'Outras informações'}}};
assert.equal(context.defaultProjectFieldSection('REPARO'),'Equipamento');
assert.equal(context.projectFieldSection(p,'REPARO'),'Link');
assert.equal(context.projectFieldSection(p,'NETWORK'),'Outras informações');
assert.equal(context.projectFieldSection(p,'Parceiro'),'Outras informações');
assert.equal(context.projectFieldSection(p,'IP LINK'),'Link');
assert.equal(context.projectFieldSection(p,'NOME DO TÉCNICO'),'Outras informações');
assert.match(app,/fieldSectionNotice\.textContent=.*Atenção, modificação de campo padrão para outra sessão/);
assert.match(app,/fieldSection\.addEventListener\('change'/);
assert.match(app,/const group=k=>projectFieldSection\(p,k\)/);
assert.match(app,/const groups=sections\.map\(name=>\[name,keys\.filter\(k=>projectFieldSection/);
assert.match(migration,/create or replace function private\.gi_guard_record/);
assert.match(migration,/new\.owner_id=coalesce\(old\.owner_id,private\.gi_imported_owner/);
assert.match(css,/\.field-section-warning/);
console.log('PASSOU: motivos de quebra, validação no servidor, remapeamento de campos padrão e aviso visual');
