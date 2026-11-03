const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');

const source=[
 app.slice(app.indexOf('function normStatus('),app.indexOf('function getName(')),
 app.slice(app.indexOf('function analystNameKey('),app.indexOf('function usableAnalystName(')),
 app.slice(app.indexOf('function importedDateDay('),app.indexOf('function importedTime(')),
 app.slice(app.indexOf('function localDay('),app.indexOf('// Ordenação única para a lista geral')),
 app.slice(app.indexOf('function filteredHomeActivities('),app.indexOf('function calculateMxIp(')),
 app.slice(app.indexOf('function reportDateMatches('),app.indexOf('// O SheetJS da aplicação')),
 app.slice(app.indexOf('function informeSummary('),app.indexOf('function informeEditorContent('))
].join('\n');

const context={
 Date,filterOwner:'none',filterStatus:'Todos',customAnalyst:'',customStatus:'Todos',
 dateFilter:'other',selectedDate:'2026-10-24',newestActivities:a=>a,activityName:a=>a.id,
 document:{querySelector:s=>s==='#searchActivity'?{value:''}:null},
 getName:p=>p.data.name,esc:s=>String(s??'')
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'app.js'});

const record=(id,status,at,events=[],history=[])=>({
 id,data:{status,row:{'ID VGR':id},endAt:at,importHistoryEvents:events,history}
});
const event=(status,at)=>({status,at,analyst:'',notes:'',source:'planilha'});

// Reproduz exatamente a divergência do print de 24/10:
// 16 registros selecionados = 1 pendente, 11 atualmente migrados, 4 atualmente quebrados;
// os cartões da data, porém, devem ser 943/1/6/9.
const records=Array.from({length:933},(_,i)=>record('pendente-'+i,'Pendente',null));
for(let i=0;i<4;i++)records.push(record('quebra-'+i,'Quebra Delfia','2026-10-24T15:00:00-03:00',[
 event('Quebra Delfia','2026-10-24')]));
for(let i=0;i<5;i++)records.push(record('recuperada-'+i,'Migrada','2026-10-30T11:00:00-03:00',[
 event('Quebra link','2026-10-24'),event('Migrada','2026-10-30')]));
for(let i=0;i<6;i++)records.push(record('migrada-'+i,'Migrada','2026-10-24T17:00:00-03:00',[
 event('Migrada','2026-10-24')]));
records.push(record('ativa-depois-pendente','Pendente',null,[],[
 {status:'Contatando técnico',at:'2026-10-23T09:00:00-03:00'},
 {status:'Abandonada',at:'2026-10-30T18:00:00-03:00'}
]));

const rows=context.reportVisibleActivities(records);
assert.equal(rows.length,16,'a lista e o anexo do dia possuem 16 atividades');
const current=rows.reduce((acc,a)=>(acc[context.normStatus(a.data.status)]=(acc[context.normStatus(a.data.status)]||0)+1,acc),{});
assert.equal(current.Pendente,1);assert.equal(current.Migrada,11);assert.equal(current.Quebra,4);
const statusCounts=context.calculateHomeStatusCounts(records);
assert.equal(statusCounts.Pendente,943);
assert.equal(statusCounts['Em andamento'],1);
assert.equal(statusCounts.Migrada,6);
assert.equal(statusCounts.Quebra,9);

const summary=context.informeSummary({
 p:{data:{name:'Copasa'}},rows,period:'screen',summaryCounts:statusCounts,
 periodLabel:context.reportPeriodLabel('screen','2026-10-24')
});
assert.equal(summary.total,16,'total de linhas do anexo permanece 16');
assert.deepEqual(Object.fromEntries(summary.statuses),Object.fromEntries([
 ['Pendente',943],['Em andamento',1],['Migrada',6],['Quebra',9]
]));
const html=context.informePanelHtml(summary);
for(const expected of ['Pendentes (saldo)','943','Em andamento','Migradas','Quebradas','24/10/2026','No anexo','16'])
 assert.ok(html.includes(expected),'O informe deve mostrar '+expected);
assert.equal(context.displayStatusAtDate(records[937],'2026-10-24','Quebra'),'Quebra link',
 'o Excel precisa registrar o motivo da quebra histórica, e não a migração posterior');
assert.match(app,/period==='screen'\?listDisplayStatus\(a\)/,
 'a coluna Status do Excel respeita a mesma data que a listagem');
assert.match(app,/overlay\.querySelector\('#reportPeriod'\)\.value='screen'/,
 'ao abrir a janela de relatório, sempre iniciar com o filtro ativo na tela');

console.log('PASSOU: informe de 24/10 reflete 943 pendentes, 1 em andamento, 6 migradas, 9 quebras; anexo permanece com 16 linhas');
