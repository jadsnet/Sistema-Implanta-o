const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const helpers=source.slice(source.indexOf('// Importações por ID VGR:'),source.indexOf('const importSheetIcon='));
const reader=source.slice(source.indexOf('async function readTabularFile('),source.indexOf('function downloadCSV('));

const project={id:'copasa',data:{name:'COPASA',activityTemplate:['ID VGR','NETWORK','REPARO'],extraFields:[{name:'Parceiro',section:'Outras informações'}]}};
const activities=[
 {id:'1',data:{projectId:'copasa',row:{'ID VGR':'2262813',NETWORK:'antiga','REPARO':'ticket existente'},status:'Pendente',history:[{status:'Pendente',at:'2026-10-01T14:00:00.000Z'}]}},
 {id:'2',data:{projectId:'copasa',row:{'ID VGR':'2264035'},status:'Pendente'}},
];
const db={activities};let saves=0;
const context={console,Date,Math,Set,Map,JSON,DB:db,
 activeStatuses:['Contatando técnico','Iniciando configuração','Finalizando configuração','Aguardando cliente config Fortinet','Organização de Rack e equipamentos'],
 arr:key=>db[key]||[],projectActivities:()=>activities,getName:p=>p.data.name,
 allProjectFieldNames:p=>['ID VGR','NETWORK','REPARO','EQUIPAMENTO','SERIAL MX','VELOCIDADE DO LINK','ENDEREÇO COMPLETO','ID DEDICADO',...p.data.extraFields.map(x=>x.name)],
 save(){saves++},log(){},sessionStorage:{setItem(){}},window:{},validateUpload:async()=> 'xlsx'};
context.window=context;
vm.createContext(context);
vm.runInContext(helpers+reader,context,{filename:'app.js'});

const realHeaders=['','Endereço de Instalação (base prévendas)','Município','Velocidade','MODELO EQUIPAMENTO','NETWORK','HOSTNAME','NET WORK PARA CLONAR','IP DEDICADO','ID VGR','STATUS SDWAN','DATA SDWAN','PARCEIRO','OPERADORA','HORARIO INICIO','HORÁRIO FIM','TEMPO DE DURAÇÃO','TKT NOC','STATUS NOC','OBS NOC','REDE LAN MERAKI','IP LAN MERAKI','SERIAL NUMBER','ANALISTA TÉCNICO','OBSERVAÇÃO'];
const record=(id,status,day,partner,init,end,ticket,analyst,network='')=>{
 const cells=Array(realHeaders.length).fill('');
 for(const [key,value] of Object.entries({'ID VGR':id,'STATUS SDWAN':status,'DATA SDWAN':day,'PARCEIRO':partner,'HORARIO INICIO':init,'HORÁRIO FIM':end,'TKT NOC':ticket,'ANALISTA TÉCNICO':analyst,'NETWORK':network}))cells[realHeaders.indexOf(key)]=value;
 return cells;
};
const workbook={SheetNames:['Resumo','Diario de Bordo_Copasa_16.10.26','Analistas'],Sheets:{
 Resumo:{'!ref':'A1:J7',_rows:[['DATA SDWAN','Migrado'],['Resumo dos status']]},
 'Diario de Bordo_Copasa_16.10.26':{'!ref':'A1:XFC753',_rows:[realHeaders,
  record('2262813','Sem acionamento','14/10/26','Vivo Redes','','','','MAURICIO','rede original'),
  record('2264035','Sem Acionamento','14/10/26','Vivo Redes','','','','',''),
  record('2262813','Quebra Cliente','15/10/26','','17:40:00','18:11:00','','MAURICIO',''),
  record('2262813','Migrado','16/10/26','DELFIA','10:11:00','11:35:00','1696060','JANAINA','rede nova'),
  record('2264035','Migrado','20/10/26','','11:06:00','11:56:00','1696410','JANAINA','')
 ]},
 Analistas:{'!ref':'A1:Z679',_rows:[['Analistas','Atuação']]}
}};
context.XLSX={read(){return workbook},utils:{
 decode_range(ref){return {s:{r:0,c:0},e:{r:ref.includes('XFC')?752:ref.includes('679')?678:6,c:ref.includes('XFC')?16357:25}}},
 encode_range(range){assert.ok(range.e.c<200,'não deve ler milhares de colunas vazias');return range},
 sheet_to_json(sheet){return sheet._rows},
}};

(async()=>{
 const file={name:'diario.xlsx',arrayBuffer:async()=>new ArrayBuffer(0)};
 const data=await context.readTabularFile(file);
 assert.equal(data.rows.length,5);
 assert.equal(data.headers[9],'ID VGR');
 const prepared=context.prepareActivitySpreadsheet(data,project,'update');
 assert.equal(prepared.unique,2);assert.equal(prepared.repeated,3);
 assert.equal(prepared.entries.length,2);
 const result=context.commitUpdatedActivitySpreadsheet(project,prepared);
 assert.equal(result.updated,2);assert.equal(saves,1);
 assert.equal(activities[0].data.status,'Migrada','status mais recente, e não a primeira linha');
 assert.equal(activities[0].data.row.Parceiro,'DELFIA');
 assert.equal(activities[0].data.ed.Parceiro,'DELFIA','deve preencher o campo personalizado');
 assert.equal(activities[0].data.row.REPARO,'1696060','TKT NOC deve ir para Reparo');
 assert.equal(activities[0].data.analystName,'JANAINA');
 assert.equal(activities[0].data.startAt,new Date(2026,9,16,10,11).toISOString());
 assert.equal(activities[0].data.endAt,new Date(2026,9,16,11,35).toISOString());
 assert.equal(activities[0].data.row.NETWORK,'rede nova');
 assert.equal(activities[0].data.history.length,1,'não deve sobrescrever o histórico');
 assert.equal(activities[1].data.status,'Migrada');
 assert.equal(activities[1].data.row.Parceiro,'Vivo Redes','mantém o valor não vazio de linhas anteriores');
 assert.equal(activities[1].data.startAt,new Date(2026,9,20,11,6).toISOString());
 const empty=context.prepareActivitySpreadsheet({headers:['ID VGR','TKT NOC'],rows:[{'ID VGR':'2262813','TKT NOC':''}]},project,'update');
 assert.equal(context.commitUpdatedActivitySpreadsheet(project,empty).updated,0,'célula vazia não deve apagar dados');
 assert.equal(activities[0].data.row.REPARO,'1696060');
 if(process.env.GI_TEST_WORKBOOK){
  const script=`import json,sys,openpyxl,datetime\nw=openpyxl.load_workbook(sys.argv[1],read_only=True,data_only=True)\nr=[]\nfor sh in w.worksheets:\n rows=[]\n for row in sh.iter_rows(max_col=min(sh.max_column,200),values_only=True):\n  rows.append([v.isoformat(sep=' ') if isinstance(v,datetime.datetime) else v.isoformat() if isinstance(v,(datetime.date,datetime.time)) else str(v) if v is not None else '' for v in row])\n r.append({'name':sh.title,'rows':rows})\nprint(json.dumps(r,ensure_ascii=False))`;
  const output=spawnSync('python3',['-c',script,process.env.GI_TEST_WORKBOOK],{encoding:'utf8',maxBuffer:8*1024*1024});
  if(output.status!==0)throw Error('Leitura do diário real falhou: '+output.stderr);
  const actualSheets=JSON.parse(output.stdout);
  const actualBook={SheetNames:actualSheets.map(s=>s.name),Sheets:{}};
  for(const sheet of actualSheets)actualBook.Sheets[sheet.name]={'!ref':sheet.name.startsWith('Diario')?'A1:XFC753':'A1:Z679',_rows:sheet.rows};
  context.XLSX.read=()=>actualBook;
  const realData=await context.readTabularFile(file);
  const realPrepared=context.prepareActivitySpreadsheet(realData,project,'update');
  assert.equal(realData.rows.length,752,'linhas da planilha enviada');
  assert.equal(realPrepared.unique,500,'IDs distintos da planilha enviada');
  assert.equal(realPrepared.repeated,252,'movimentações repetidas consolidadas');
  const realEntry=realPrepared.entries.find(entry=>entry.key==='2262813');
  assert.ok(realEntry,'ID que aparece várias vezes deve ser encontrado');
  assert.equal(context.importedStatus(realEntry.row['STATUS SDWAN']),'Migrada');
  console.log('PASSOU: diário de bordo real com 752 linhas, 500 IDs VGR e 252 movimentações repetidas');
 }
 console.log('PASSOU: seleção da aba com ID VGR, duplicatas por data, campos personalizados, aliases, datas, preservação de vazios e histórico');
})().catch(error=>{console.error(error);process.exitCode=1});
