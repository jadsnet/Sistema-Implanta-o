/* Leitor estrutural de modelos XLSX: detecta colunas paralelas, títulos, instruções
   e áreas reais para imagens usando as medidas das linhas e das colunas. */
(function(){
'use strict';
const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const headingRE=/^(?:evid[eê]ncias?|capturas?|prints?|registros? de imagens?)\b/i;
const photoRE=/foto|fotograf|relat[oó]rio fotogr[aá]fico/i;
const instructionRE=/(?:--?>|→|⇒|\bshow\s+(?:ver|arp|run|int)|\bacesse\b|\bcopie\b|\blog\b|\bprint\b)/i;
const nonImageRE=/^(?:#\w+!?|N\/A|N\.D\.|n[aã]o se aplica|\d+)$/i;
function listCells(sheet){
 const rows=new Map();
 for(const ref of Object.keys(sheet||{})){
  if(!/^[A-Z]+\d+$/.test(ref))continue;
  const cell=sheet[ref],value=text(cell?.w??cell?.v);
  if(!value||cell?.t==='e'||nonImageRE.test(value)||value.startsWith('#VALUE!'))continue;
  const pos=XLSX.utils.decode_cell(ref),r=pos.r+1;
  if(!rows.has(r))rows.set(r,[]);
  rows.get(r).push({row:r,col:pos.c,title:value,ref});
 }
 return [...rows].sort((a,b)=>a[0]-b[0]).map(([row,cells])=>({row,cells:cells.sort((a,b)=>a.col-b.col)}));
}
function rowPixels(sheet,row){const o=sheet['!rows']?.[row-1];return Math.max(5,Number(o?.hpx)||Number(o?.hpt)*96/72||20)}
function columnPixels(sheet,col){const o=sheet['!cols']?.[col];return Math.max(30,Number(o?.wpx)||Number(o?.wch)*7+5||Number(o?.width)*7+5||76)}
function areaHeight(sheet,from,to){let total=0;for(let r=from;r<to&&r<from+70;r++)total+=rowPixels(sheet,r);return Math.round(total)}
function sheetKind(name,rows){
 const key=norm(name),entries=rows.flatMap(r=>r.cells),titles=entries.filter(c=>headingRE.test(c.title));
 if(photoRE.test(key)||entries.some(c=>/^fotografia\s+(antes|depois)$/i.test(c.title)))return 'photos';
 if(titles.length>=2)return 'evidence';
 if(/log.?before|log.?after|evidenc|print|capture/.test(key)&&titles.length)return 'evidence';
 return null;
}
function parseSection(name,sheet){
 const rows=listCells(sheet);if(!rows.length)return null;
 const kind=sheetKind(name,rows);if(!kind)return null;
 const all=rows.flatMap(r=>r.cells),rowByNumber=new Map(rows.map(r=>[r.row,r.cells]));
 let sectionHeader=rows[0].cells[0]?.title||name;
 if(kind==='evidence'&&!/^regist|^evid|^foto/i.test(sectionHeader))sectionHeader=name;
 const groups=kind==='photos'?rows[0].cells.filter(c=>/^fotografia\s+(antes|depois)$/i.test(c.title)) : [];
 const candidates=[];
 if(kind==='evidence'){
  const consumed=new Set();
  const titles=all.filter(c=>headingRE.test(c.title));
  for(const cell of titles){
   const next=(rowByNumber.get(cell.row+1)||[]).find(c=>c.col===cell.col);
   const note=next&&!headingRE.test(next.title)&&instructionRE.test(next.title)?next:null;
   if(note)consumed.add(note.ref);
   candidates.push({title:cell.title,description:note?.title||'',row:cell.row,col:cell.col,descriptionRow:note?.row||null});
  }
  // Além das evidências numeradas, o modelo pode ter prints de ARP/CDP, etc.,
  // identificados por uma instrução acima de uma linha alta sem título próprio.
  for(const cell of all){
   if(consumed.has(cell.ref)||headingRE.test(cell.title)||!instructionRE.test(cell.title))continue;
   if(cell.row===1||rowPixels(sheet,cell.row+1)<85)continue;
   if(titles.some(t=>t.col===cell.col&&t.row===cell.row-1))continue;
   const hint=/arp/i.test(cell.title)?'ARP':/cdp|lldp/i.test(cell.title)?'CDP / LLDP':'Print complementar';
   candidates.push({title:`Evidência complementar — ${hint}`,description:cell.title,row:cell.row,col:cell.col,descriptionRow:cell.row,imageRow:cell.row+1,auxiliary:true});
  }
 }else{
  const headerRow=groups.length?rows[0].row:0;
  const cols=groups.length?groups.map(c=>c.col):[...new Set(all.filter(c=>c.row<=4).map(c=>c.col))].slice(0,2);
  for(const cell of all){
   if(cell.row===headerRow||!cols.includes(cell.col))continue;
   if(nonImageRE.test(cell.title)||/^fotografia\s+/i.test(cell.title))continue;
   // A faixa com texto é imediatamente seguida pela área vertical da fotografia.
   if(rowPixels(sheet,cell.row+1)<75)continue;
   const group=groups.find(c=>c.col===cell.col)?.title||'';
   candidates.push({title:cell.title,description:'',row:cell.row,col:cell.col,group});
  }
 }
 candidates.sort((a,b)=>a.row-b.row||a.col-b.col);
 if(!candidates.length)return null;
 const maxRow=XLSX.utils.decode_range(sheet['!ref']||'A1').e.r+1;
 const items=candidates.slice(0,200).map(c=>{
  // O limite é a próxima evidência NA MESMA COLUNA, e não na coluna ao lado.
  const next=candidates.find(other=>other.col===c.col&&other.row>c.row);
  const start=Math.max(c.row+1,(c.descriptionRow||0)+1,c.imageRow||0);
  const following=candidates.find(other=>other.row>c.row);
  const end=next?.row||following?.row||Math.max(maxRow+1,start+1);
  const pixW=Math.round(columnPixels(sheet,c.col));
  const pixH=Math.max(60,areaHeight(sheet,start,end));
  return {id:`${name}:${c.row}:${c.col}:${c.title}`,title:c.title,description:c.description,sheetName:name,
   row:c.row,col:c.col,descriptionRow:c.descriptionRow||null,imageRow:start,nextRow:end,
   imageWidth:pixW,imageHeight:pixH,group:c.group||'',auxiliary:!!c.auxiliary};
 });
 return {id:`sheet:${name}`,title:kind==='photos'?name:sectionHeader,kind,items,
  sheetName:name,headingRow:kind==='evidence'&&rows[0].row===1&&rows[0].cells.length===1?1:null,
  headingCol:0};
}
function buildModel(workbook){const sections=[];for(const name of workbook.SheetNames){
 const section=parseSection(name,workbook.Sheets[name]);if(section)sections.push(section)}
 return {version:3,sections,total:sections.reduce((n,s)=>n+s.items.length,0),sheetNames:[...workbook.SheetNames]};
}
async function read(file){
 if(!file)throw Error('Escolha uma planilha de Runbook.');
 if(!window.XLSX)throw Error('A biblioteca de leitura de planilhas não foi carregada.');
 let input=await file.arrayBuffer();const wb=XLSX.read(input,{type:'array',cellStyles:true,cellText:true});
 const model=buildModel(wb);
 if(!model.total)throw Error('Não encontrei regiões destinadas a evidências/fotografias na planilha.');
 const ext=(file.name.split('.').pop()||'').toLowerCase();
 if(!['xlsx','xlsm'].includes(ext))input=XLSX.write(wb,{bookType:'xlsx',type:'array'});
 return {model,workbookBuffer:input,filename:file.name,converted:!['xlsx','xlsm'].includes(ext)};
}
window.RunbookModel={read,buildModel};
})();
