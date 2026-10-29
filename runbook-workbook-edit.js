/* Aplica edições do editor visual à cópia exportada do arquivo Excel.
 * O modelo original no IndexedDB permanece intacto.
 * Preserva estilos das células já existentes e adiciona abas somente quando necessário. */
(function(){
'use strict';
const main='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relDoc='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rels='http://schemas.openxmlformats.org/package/2006/relationships';
const contentNs='http://schemas.openxmlformats.org/package/2006/content-types';
function letters(col){let s='';for(let n=col+1;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s}
function colIndex(ref){let n=0;for(const c of String(ref||'').match(/^[A-Z]+/)?.[0]||'')n=n*26+c.charCodeAt(0)-64;return n-1}
function node(parent,local){return [...parent.childNodes].find(x=>x.nodeType===1&&x.localName===local)}
function sheetData(doc){let data=node(doc.documentElement,'sheetData');if(!data){data=doc.createElementNS(main,'sheetData');doc.documentElement.appendChild(data)}return data}
function getRow(doc,n){const data=sheetData(doc);let found=[...data.children].find(r=>r.localName==='row'&&+r.getAttribute('r')===n);if(found)return found;found=doc.createElementNS(main,'row');found.setAttribute('r',String(n));const next=[...data.children].find(r=>r.localName==='row'&&+r.getAttribute('r')>n);data.insertBefore(found,next||null);return found}
function setCell(doc,rowNo,col,text){if(!rowNo||rowNo<1||col<0)return;const row=getRow(doc,rowNo),ref=letters(col)+rowNo;let cell=[...row.children].find(x=>x.localName==='c'&&x.getAttribute('r')===ref);if(!cell){cell=doc.createElementNS(main,'c');cell.setAttribute('r',ref);const next=[...row.children].find(x=>x.localName==='c'&&colIndex(x.getAttribute('r'))>col);row.insertBefore(cell,next||null)}
 // Excel admite inline strings, mesmo quando a célula antes utilizava SharedStrings.
 cell.setAttribute('t','inlineStr');for(const child of [...cell.children])if(['v','is','f'].includes(child.localName))cell.removeChild(child);
 const inline=doc.createElementNS(main,'is'),t=doc.createElementNS(main,'t');t.setAttribute('xml:space','preserve');t.textContent=String(text??'');inline.appendChild(t);cell.appendChild(inline);
}
function lastRow(doc){return Math.max(0,...[...sheetData(doc).children].filter(n=>n.localName==='row').map(n=>Number(n.getAttribute('r'))||0))}
function uniqueRelId(doc){const ids=new Set([...doc.getElementsByTagNameNS(rels,'Relationship')].map(r=>r.getAttribute('Id')));let n=100;while(ids.has('rIdRunbook'+n))n++;return 'rIdRunbook'+n}
function chooseName(label,names){const safe=String(label||'Nova seção').replace(/[\\\/?*\[\]:]/g,' ').trim().slice(0,31)||'Runbook';let name=safe,i=2;while(names.has(name.toLowerCase()))name=safe.slice(0,30-String(i).length)+'_'+i++;names.add(name.toLowerCase());return name}
async function prepare({zip,model,workbookDoc,wbRelsDoc,contentsDoc,sheetMap,parse,serialize}){
 const sheets=workbookDoc.getElementsByTagNameNS(main,'sheets')[0];if(!sheets)return;
 const docs=new Map();
 async function readSheet(name){if(docs.has(name))return docs.get(name);const path=sheetMap.get(name);if(!path||!zip.file(path))return null;const doc=parse(await zip.file(path).async('string'));docs.set(name,doc);return doc}
 // Remover abas que pertencem exclusivamente a seções excluídas.
 const removed=model.removedSections||[];
 for(const removedSection of removed){const sheetName=removedSection.sheetName;if(!sheetName||!sheetMap.has(sheetName))continue;
  if(model.sections.some(section=>section.sheetName===sheetName||section.items.some(item=>item.sheetName===sheetName)))continue;
  if(sheetMap.size<=1)continue;
  const elem=[...sheets.children].find(s=>s.localName==='sheet'&&s.getAttribute('name')===sheetName);if(!elem)continue;
  const id=elem.getAttributeNS(relDoc,'id')||elem.getAttribute('r:id');const relationship=[...wbRelsDoc.getElementsByTagNameNS(rels,'Relationship')].find(r=>r.getAttribute('Id')===id);
  const path=sheetMap.get(sheetName);if(relationship)relationship.parentNode.removeChild(relationship);elem.parentNode.removeChild(elem);
  zip.remove(path);zip.remove('xl/worksheets/_rels/'+path.split('/').pop()+'.rels');
  for(const ov of [...contentsDoc.getElementsByTagNameNS(contentNs,'Override')])if(ov.getAttribute('PartName')==='/'+path)ov.parentNode.removeChild(ov);
  sheetMap.delete(sheetName);
 }
 // Limpar os títulos e instruções removidos de abas que permanecem no arquivo.
 for(const item of model.removedItems||[]){const doc=await readSheet(item.sheetName);if(!doc)continue;setCell(doc,Number(item.row),Number(item.col)||0,'');if(item.descriptionRow)setCell(doc,Number(item.descriptionRow),Number(item.col)||0,'')}
 const taken=new Set([...sheetMap.keys()].map(n=>n.toLowerCase()));
 for(const section of model.sections){
  let sheetName=section.sheetName||section.items.find(item=>item.sheetName)?.sheetName||(section.id?.startsWith('sheet:')?section.id.slice(6):'');
  if(section.createdByEditor || !sheetName || !sheetMap.has(sheetName)){
   // Seção adicionada: nova aba com seus títulos e células para as imagens.
   sheetName=chooseName(section.title,taken);
   let number=1;while(zip.file(`xl/worksheets/sheet${number}.xml`))number++;
   const path=`xl/worksheets/sheet${number}.xml`,sheetId=1+Math.max(0,...[...sheets.children].map(x=>Number(x.getAttribute('sheetId'))||0));
   const rid=uniqueRelId(wbRelsDoc);
   const sheet=workbookDoc.createElementNS(main,'sheet');sheet.setAttribute('name',sheetName);sheet.setAttribute('sheetId',String(sheetId));sheet.setAttributeNS(relDoc,'r:id',rid);sheets.appendChild(sheet);
   const relation=wbRelsDoc.createElementNS(rels,'Relationship');relation.setAttribute('Id',rid);relation.setAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet');relation.setAttribute('Target','worksheets/sheet'+number+'.xml');wbRelsDoc.documentElement.appendChild(relation);
   const over=contentsDoc.createElementNS(contentNs,'Override');over.setAttribute('PartName','/'+path);over.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml');contentsDoc.documentElement.appendChild(over);
   const doc=parse(`<worksheet xmlns="${main}"><cols><col min="1" max="1" width="94" customWidth="1"/></cols><sheetData/></worksheet>`);sheetMap.set(sheetName,path);docs.set(sheetName,doc);
   section.sheetName=sheetName;section.titleRow=1;section.titleCol=0;
  }
  const doc=await readSheet(sheetName);if(!doc)continue;
  // Título da seção: atualizar o cabeçalho existente, se havia um antes da primeira evidência.
  const minItemRow=Math.min(Infinity,...section.items.filter(it=>!it.createdByEditor).map(it=>Number(it.row)||Infinity));
  if(section.headingRow||section.titleRow || (section.id?.startsWith('sheet:')&&minItemRow>1)){
   const rowNo=Number(section.headingRow||section.titleRow)||1;
   const existingRow=[...sheetData(doc).children].find(r=>r.localName==='row'&&+r.getAttribute('r')===rowNo);
   const firstCell=[...existingRow?.children||[]].find(x=>x.localName==='c');
   const column=(section.headingCol??section.titleCol??(firstCell?colIndex(firstCell.getAttribute('r')):0));
   setCell(doc,rowNo,Number(column)||0,section.title);
  }
  for(const item of section.items){
   if(item.createdByEditor||!item.row){const row=Math.max(3,lastRow(doc)+3);item.row=row;item.col=0;item.descriptionRow=row+1;item.imageRow=row+2;item.imageWidth=645;item.imageHeight=420;item.nextRow=row+3;item.sheetName=sheetName;const imageRow=getRow(doc,item.imageRow);imageRow.setAttribute('ht','315');imageRow.setAttribute('customHeight','1')}
   if(!item.sheetName)item.sheetName=sheetName;
   setCell(doc,Number(item.row),Number(item.col)||0,item.title);
   if(item.descriptionRow || item.description){const descRow=Number(item.descriptionRow)||Number(item.row)+1;item.descriptionRow=descRow;setCell(doc,descRow,Number(item.col)||0,item.description||'');if(item.imageRow<=descRow)item.imageRow=descRow+1}
  }
 }
 for(const [name,doc] of docs){const path=sheetMap.get(name);if(path)zip.file(path,serialize(doc))}
}
window.RunbookWorkbookEdit={prepare};
})();
