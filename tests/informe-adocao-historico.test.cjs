const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
const sql=fs.readFileSync(path.join(dir,'supabase/06_reabrir_atividades_quebradas.sql'),'utf8');
const snippet=[
 app.slice(app.indexOf('function normStatus('),app.indexOf('function getName(')),
 app.slice(app.indexOf('function analystNameKey('),app.indexOf('function usableAnalystName(')),
 app.slice(app.indexOf('function importedDateDay('),app.indexOf('function importedTime(')),
 app.slice(app.indexOf('function localDay('),app.indexOf('// Ordenação única para a lista geral')),
 app.slice(app.indexOf('function filteredHomeActivities('),app.indexOf('function calculateMxIp('))
].join('\n');
const reportHelper=app.slice(app.indexOf('// A opção "Usar filtro da tela"'),app.indexOf('// O SheetJS da aplicação'));
const summary=app.slice(app.indexOf('function informeSummary('),app.indexOf('function informePanelHtml('));
const mock=Array.from({length:1191},(_,i)=>({id:String(i),data:{status:i<822?'Pendente':i<1177?'Migrada':'Quebra Delfia',row:{'ID VGR':String(i)}}}));
const context={
 filterOwner:'none',filterStatus:'Todos',customAnalyst:'',customStatus:'Todos',dateFilter:'all',
 dateActivities:a=>a,newestActivities:a=>a,activityName:a=>a.id,canonicalAnalystName:s=>s||'',
 document:{querySelector:s=>s==='#searchActivity'?{value:''}:null},getName:p=>p.data.name,
};
vm.createContext(context);
vm.runInContext(snippet+'\n'+reportHelper+'\n'+summary,context,{filename:'app.js'});
const selection=context.reportVisibleActivities(mock);
assert.equal(selection.length,1191,'Total geral não pode ser limitado aos primeiros 200 elementos do DOM');
assert.equal(context.calculateHomeStatusCounts(mock).Pendente,836,'o saldo de pendentes inclui as 14 quebras');
const result=context.informeSummary({p:{data:{name:'Copasa'}},rows:selection});
assert.equal(result.total,1191);
const counts=Object.fromEntries(result.statuses);
assert.equal(counts.Pendente,836,'Pendentes no informe inclui as 14 atividades quebradas');
assert.equal(counts.Migrada,355);assert.equal(counts.Quebra,14);
context.filterOwner='status';context.filterStatus='Quebra';
assert.equal(context.reportVisibleActivities(mock).length,14,'filtro Quebradas engloba todos os motivos');
context.filterStatus='Pendente';
assert.equal(context.reportVisibleActivities(mock).length,836,'cartão Pendentes seleciona também as quebras');
const historyCode=app.slice(app.indexOf('function activityHistoryEntries('),app.indexOf('function renderHome('));
const historyContext={Date,Array,console,importedDateDay:()=>'',normStatus:context.normStatus};
vm.createContext(historyContext);vm.runInContext(historyCode,historyContext);
const activity={data:{status:'Quebra Delfia',observations:'Sem técnico',analystName:'CESAR SOARES',endAt:'2026-10-31T10:00:00Z',history:[],importHistoryEvents:[{id:'a',status:'Quebra Delfia',at:'2026-10-31',notes:'Sem técnico',analyst:'CESAR SOARES',source:'planilha'}]}};
let events=historyContext.activityHistoryEntries(activity);
assert.equal(events.length,1,'observação importada não deve aparecer duplicada');
assert.equal(events[0].notes,'Sem técnico');
assert.equal(events[0].analyst,'CESAR SOARES');
const older={data:{status:'Quebra Cliente',observations:'Sem acesso ao local',analystName:'ANDREW DOS SANTOS',endAt:'2026-10-15T10:00:00Z',history:[]}};
historyContext.preserveLegacyObservation(older);
assert.equal(older.data.history[0].status,'Quebra Cliente');
assert.equal(historyContext.activityHistoryEntries(older).length,1);
assert.match(app,/data-history="\$\{i\}"/,'histórico possui linhas clicáveis, sem texto aberto');
assert.match(app,/const h=activityHistoryEntries\(a\)\[Number\(btn\.dataset\.history\)\]/);
assert.match(app,/id="saveNewObservation"/);
assert.match(app,/normStatus\(d\.status\)==='Quebra'\|\|!d\.analystName/);
assert.match(sql,/drop policy if exists gi_records_update/);
assert.match(sql,/old\.data->>'status' in \('Quebra'/);
assert.match(sql,/new\.data->>'status'='Contatando técnico'/);
assert.match(sql,/new\.owner_id=actor/);
assert.match(sql,/is not distinct from/,'a adoção não pode modificar outros campos');
assert.match(css,/\.ranking-modal-close\{display:grid!important;place-items:center!important;padding:0!important/);
console.log('PASSOU: informe 1191/355/14, histórico de observações, adoção protegida no servidor e X centralizado');
