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
 app.slice(app.indexOf('function filteredHomeActivities('),app.indexOf('function calculateMxIp('))
].join('\n');

const context={
 filterOwner:'none',filterStatus:'Todos',customAnalyst:'',customStatus:'Todos',
 dateFilter:'other',selectedDate:'2026-10-24',newestActivities:items=>items,
 activityName:a=>a.id
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'app.js'});

const activity=(id,status,analystName='',endAt=null,history=[])=>({
 id,data:{status,analystName,endAt,row:{'ID VGR':id},importHistoryEvents:history}
});
const events=(status,at)=>({status,at,analyst:'',notes:'',source:'planilha'});
const records=[
 activity('A','Migrada','ADRIANA SILVA ALVES DOS SANTO','2026-10-24T15:00:00-03:00',[
  events('Migrada','2026-10-24')]),
 activity('B','Quebra Delfia','ADRIANA SILVA ALVES DOS SANTOS','2026-10-24T16:00:00-03:00',[
  events('Quebra Delfia','2026-10-24')]),
 activity('C','Migrada','BRUNO NEVES','2026-10-30T12:00:00-03:00'),
 // Quebrada em 24/10 e migrada em 01/11: não pode desaparecer da contagem histórica de quebras.
 activity('D','Migrada','CESAR SOARES','2026-11-01T10:00:00-03:00',[
  events('Quebra link','2026-10-24'),events('Migrada','2026-11-01')]),
 activity('E','Migrada','IGOR SANTOS OLIVEIRA','2026-11-01T12:00:00-03:00',[
  events('Migrada','2026-11-01')]),
 activity('F','Pendente')
];
records[4].data.startAt='2026-10-23T08:00:00-03:00';

let counts=context.calculateHomeStatusCounts(records);
assert.equal(counts.Pendente,5,'em 24/10 cinco atividades ainda não tinham sido migradas');
assert.equal(counts.Migrada,1,'contagem de migrações é por movimentação ocorrida em 24/10');
assert.equal(counts.Quebra,2,'contagem de quebras inclui uma atividade migrada posteriormente');
assert.equal(counts['Em andamento'],1,'em andamento considera o estado da atividade na data');
assert.deepEqual(Array.from(context.filteredHomeActivities(records).map(a=>a.id)),['A','B','D','E']);

context.filterStatus='Quebra';
assert.deepEqual(Array.from(context.filteredHomeActivities(records).map(a=>a.id)),['B','D'],
 'cartão Quebradas combina com Outro dia');
assert.equal(context.listDisplayStatus(records[3]),'Quebra link',
 'a linha de uma quebra histórica preserva o motivo, mesmo após migração posterior');
assert.equal(context.listCompletionLabel(records[3],'Quebra link'),'Quebrada em 24/10/2026');
context.filterStatus='Pendente';
assert.deepEqual(Array.from(context.filteredHomeActivities(records).map(a=>a.id)),['B','C','D','E','F'],
 'cartão Pendentes é o saldo acumulado até a data, incluindo as quebras');
assert.equal(context.listDisplayStatus(records[2]),'Pendente',
 'a listagem do saldo deve mostrar o status histórico, não a migração futura');
assert.equal(context.listCompletionLabel(records[2],'Pendente'),'');

context.filterStatus='Todos';context.dateFilter='all';
counts=context.calculateHomeStatusCounts(records);
assert.equal(counts.Pendente,2,'no total geral, pendentes são os atuais não migrados');
assert.equal(counts.Migrada,4);
assert.equal(counts.Quebra,1);

context.filterOwner='custom';context.customAnalyst='Adriana Silva Alves dos Santos';
counts=context.calculateHomeStatusCounts(records);
assert.equal(counts.Pendente,2,'saldo de pendentes é do projeto, sem restringir pelo analista');
assert.equal(counts.Migrada,1,'migrações agora pertencem somente à analista escolhida');
assert.equal(counts.Quebra,1,'quebras agora pertencem somente à analista escolhida');
context.filterStatus='Pendente';
assert.deepEqual(Array.from(context.filteredHomeActivities(records).map(a=>a.id)),['B'],
 'cartão Pendentes aplica-se em conjunto com filtro customizado de analista');
context.customStatus='Migrada';
assert.equal(context.filteredHomeActivities(records).length,0,
 'status customizado e cartão incompatíveis devem resultar em lista vazia, sem limpar filtros');
context.filterStatus='Todos';
assert.deepEqual(Array.from(context.filteredHomeActivities(records).map(a=>a.id)),['A']);
assert.equal(context.calculateHomeStatusCounts(records).Pendente,2,
 'status customizado não apaga os totais informativos dos cartões');

const migrationWithLaterPendingRow=activity('G','Migrada','JANAINA DA SILVA BENEDITO',null,[
 events('Migrada','2026-10-21'),events('Pendente','2026-10-22')
]);
migrationWithLaterPendingRow.data.row['DATA SDWAN']='22/10/2026';
context.filterOwner='none';context.filterStatus='Todos';context.customStatus='Todos';context.customAnalyst='';
context.dateFilter='other';context.selectedDate='2026-10-22';
assert.equal(context.calculateHomeStatusCounts([migrationWithLaterPendingRow]).Migrada,0,
 'uma linha pendente posterior não pode criar outra data de migração');
context.selectedDate='2026-10-21';
assert.equal(context.calculateHomeStatusCounts([migrationWithLaterPendingRow]).Migrada,1);

assert.match(app,/filterStatus=filterStatus===b\.dataset\.statusfilter\?'Todos':b\.dataset\.statusfilter/,
 'clique em cartão de status não pode limpar o filtro customizado nem o de data');
assert.match(app,/function updateDashboardCounts\(/,
 'contadores devem ser atualizados durante a interação com filtro customizado');
console.log('PASSOU: saldo pendente histórico, quebra por data, analista e combinação de filtros');
