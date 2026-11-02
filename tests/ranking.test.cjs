const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const snippet=[
 app.slice(app.indexOf('function normStatus('),app.indexOf('function getName(')),
 app.slice(app.indexOf('function analystNameKey('),app.indexOf('function renderUserPicker(')),
 app.slice(app.indexOf('// Ranking informativo por atividade concluída.'),app.indexOf('const funnelIcon='))
].join('\n');
const item=(id,status,analystName,vgr=id)=>({id,data:{projectId:'copasa',status,analystName,row:{'ID VGR':vgr}}});
const activities=[
 item('01','Migrada','Jadson Rodrigues de Souza','100'),
 item('02','Quebra','JADSON RODRIGUES DE SOUZA','101'),
 item('03','Migrada','CESAR SOARES - EMERGENCIAL','102'),
 item('04','Migrada','Cesar Soares','103'),
 item('05','Migrada','BRUNO COSTA SILVERIO','104'),
 item('06','Quebra','BRUNO NEVES','105'),
 item('07','Migrada','BRUNO COSTA SILVERIO','104'), // ID repetido não soma duas vezes.
 item('08','Pendente','Cesar Soares','106'),
 item('09','Migrada',null,'107'),
 {...item('10','Migrada','JANAINA DA SILVA BENEDITO','108'),data:{projectId:'copasa',row:{'ID VGR':'108'},status:'Migrada',analystName:'JANAINA DA SILVA BENEDITO',importBreakEvents:[{id:'2026-10-15|Quebra Cliente|JANAINA DA SILVA BENEDITO',status:'Quebra Cliente',analyst:'JANAINA DA SILVA BENEDITO'},{id:'2026-10-16|Quebra Link|JANAINA DA SILVA BENEDITO',status:'Quebra link',analyst:'JANAINA DA SILVA BENEDITO'}]}},
];
const host={hidden:false,innerHTML:''};
const context={
 newestActivities:a=>a,
 activityVgrKey:a=>a.data.row['ID VGR']||'',
 projectActivities:()=>activities,
 $:sel=>sel==='#activityRanking'?host:null,
 esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
};
vm.createContext(context);
vm.runInContext(snippet,context,{filename:'app.js'});
const ranking=context.calculateActivityRanking(activities);
assert.equal(ranking.length,5,'agrupar aliases e ignorar pendentes/sem analista');
assert.equal(ranking[0].fullName,'CESAR SOARES');
assert.equal(ranking[0].migradas,2);assert.equal(ranking[0].quebradas,0);
assert.equal(ranking[1].label,'BRUNO COSTA','nome e sobrenome distinguem os Brunos');
assert.equal(ranking[1].migradas,1);assert.equal(ranking[1].quebradas,0);
assert.equal(ranking[2].label,'JADSON RODRIGUES');
assert.equal(ranking[2].migradas,1);assert.equal(ranking[2].quebradas,1);
const brunoNeves=ranking.find(r=>r.fullName==='BRUNO NEVES');
assert.equal(brunoNeves.label,'BRUNO NEVES');
assert.equal(brunoNeves.migradas,0);assert.equal(brunoNeves.quebradas,1);
const janaina=ranking.find(r=>r.fullName==='JANAINA DA SILVA BENEDITO');
assert.equal(janaina.migradas,1);assert.equal(janaina.quebradas,2,'duas quebras anteriores devem contar mesmo após migrar');
context.renderActivityRanking();
assert.match(app,/id="rankingDialogTitle">Ranking dos analistas/);
assert.match(host.innerHTML,/Migradas/);assert.match(host.innerHTML,/Quebradas/);
assert.equal((host.innerHTML.match(/🥇/g)||[]).length,1,'medalha só no primeiro lugar');
assert.match(app,/id="toggleActivityRanking"/);
assert.match(app,/id="activityRanking"/);
assert.match(app,/className='ranking-overlay'/);
assert.match(css,/backdrop-filter:blur/);
assert.match(css,/\.ranking-grid\{display:grid/);
console.log('PASSOU: Ranking em modal com fundo desfocado, eventos de quebra, ordenação, aliases e medalha do líder');
