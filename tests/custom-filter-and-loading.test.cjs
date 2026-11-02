const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');

const filterSource=app.slice(app.indexOf('function applyCustomFilterSelection(){'),app.indexOf('// Ordenação única para a lista geral'));
let renders=0,indicators=0,lists=0,focused=false,caret=0;
const removed=[];
const analystInput={id:'customAnalyst',value:'ADRIANA SILVA',focus(){focused=true},setSelectionRange(start){caret=start}};
const searchInput={value:'pesquisa antiga'};
const context={
 customAnalyst:'ADRIANA SILVA',customStatus:'Todos',filterOwner:'none',filterStatus:'Migrada',
 dateFilter:'other',projectId:'copasa',document:{activeElement:analystInput},
 localStorage:{removeItem:k=>removed.push(k)},
 $:selector=>({'#customAnalyst':analystInput,'#searchActivity':searchInput})[selector],
 render(){renders++},updateFilterIndicators(){indicators++},renderActivityList(){lists++},
};
vm.createContext(context);
vm.runInContext(filterSource,context,{filename:'app.js'});
context.applyCustomFilterSelection();
assert.equal(context.dateFilter,'all','filtro customizado cancela filtro Outro dia');
assert.equal(context.filterOwner,'custom');
assert.equal(context.filterStatus,'Todos');
assert.equal(searchInput.value,'','a filtragem customizada não deve competir com busca antiga');
assert.deepEqual(removed,['gi_search_copasa']);
assert.equal(renders,1,'primeira ativação atualiza cartões e botões de data');
assert.equal(focused,true,'digitação do analista mantém foco');
assert.equal(caret,analystInput.value.length);

context.customStatus='Migrada';context.customAnalyst='';context.document.activeElement={id:'customStatus'};
context.applyCustomFilterSelection();
assert.equal(context.dateFilter,'all');
assert.equal(renders,1,'trocar o status não recria a página desnecessariamente');
assert.equal(indicators,1);assert.equal(lists,1);

context.customStatus='Todos';context.applyCustomFilterSelection();
assert.equal(context.filterOwner,'none');assert.equal(context.dateFilter,'all');
assert.match(app,/customOn\?`Resultados da filtragem customizada: \$\{acts\.length\} atividade\(s\)`/,
 'o título da lista informa o total filtrado');
assert.match(app,/\$\{dateFilter==='other'\?funnelIcon:''\}/,
 'o ícone de Outro dia depende exclusivamente do filtro de data');

const loadingSource=app.slice(app.indexOf('const importSheetIcon='),app.indexOf('function openNewActivityDialog('));
const notes=[];const button={disabled:false,classList:{add(v){button.loadingClass=v}},setAttribute(k,v){button[k]=v}};
const discard={disabled:false};
const container={querySelector(){return discard},appendChild(n){notes.push(n)}};
const loadingContext={
 document:{createElement(){return {setAttribute(k,v){this[k]=v}}}},
 requestAnimationFrame(callback){callback()},setTimeout(callback){callback()},
};
vm.createContext(loadingContext);
vm.runInContext(loadingSource,loadingContext,{filename:'app.js'});
(async()=>{
 await loadingContext.beginImportLoading(button,container);
 assert.equal(button.disabled,true);assert.equal(discard.disabled,true);
 assert.equal(button.loadingClass,'is-loading');assert.equal(button['aria-busy'],'true');
 assert.match(button.innerHTML,/gi-import-dots/);
 assert.equal((button.innerHTML.match(/<i style=/g)||[]).length,8);
 assert.match(notes[0].textContent,/Supabase/);
 assert.match(css,/@keyframes gi-orbit-dots/);
 assert.match(css,/\.gi-import-dots\{[^}]*animation:/);
 assert.match(app,/await GICloud\.waitForSaves\(\)/,'o indicador aguarda a persistência remota');
 console.log('PASSOU: contador da filtragem, exclusividade Total geral/Outro dia, foco do analista e bolinha animada durante o salvamento');
})().catch(err=>{console.error(err);process.exitCode=1});
