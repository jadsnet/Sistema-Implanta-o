/* Exporta as evidências no arquivo de Runbook importado para o projeto.
   Mantém as demais abas/células/estilos; cria apenas desenhos de imagens. */
(function(){
'use strict';
const mainNs='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const docRelNs='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageRelNs='http://schemas.openxmlformats.org/package/2006/relationships';
const drawingNs='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const drawingML='http://schemas.openxmlformats.org/drawingml/2006/main';
const serialize=d=>new XMLSerializer().serializeToString(d);
function parse(s){const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('XML inválido no Runbook importado.');return d}
function toName(target,base='xl'){const raw=String(target||'');const pieces=(raw.startsWith('/')?raw.slice(1):base+'/'+raw).split('/');const result=[];for(const part of pieces){if(!part||part==='.')continue;if(part==='..')result.pop();else result.push(part)}return result.join('/')}
function newDoc(xml){return parse('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+xml)}
function createRel(d,id,type,target){const r=d.createElementNS(packageRelNs,'Relationship');r.setAttribute('Id',id);r.setAttribute('Type',type);r.setAttribute('Target',target);d.documentElement.appendChild(r)}
function uniqueId(doc,prefix){let n=1;const taken=new Set([...doc.getElementsByTagNameNS(packageRelNs,'Relationship')].map(x=>x.getAttribute('Id')));while(taken.has(prefix+n))n++;return prefix+n}
function escapeXml(v){return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
async function png(src){if(!src||!/^data:image\//.test(src))return null;let image=new Image();image.src=src;await new Promise((ok,no)=>{if(image.complete&&image.naturalWidth)return ok();image.onload=ok;image.onerror=no});const scale=Math.min(1,1400/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return {width:canvas.width,height:canvas.height,base64:canvas.toDataURL('image/png').split(',')[1]}}
function pictureMarkup(pic,imageRid,section,item){
 const EMU=9525;
 const availableW=section.kind==='photos'?440:780;
 // Evita ultrapassar a faixa da próxima evidência.
 const next=item.nextRow||item.imageRow+12,rows=Math.max(1,next-item.imageRow);
 const availableH=Math.max(180,Math.min(section.kind==='photos'?440:540,item.imageHeight||rows*150));
 const factor=Math.min(availableW/pic.width,availableH/pic.height);
 const w=Math.round(factor*pic.width*EMU),h=Math.round(factor*pic.height*EMU);
 const leftCol=Math.max(0,Number(item.col)||0),row=Math.max(0,Number(item.imageRow||item.row+1)-1);
 const label=escapeXml(item.title).slice(0,100);
 return `<xdr:oneCellAnchor><xdr:from><xdr:col>${leftCol}</xdr:col><xdr:colOff>${8*EMU}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${5*EMU}</xdr:rowOff></xdr:from><xdr:ext cx="${w}" cy="${h}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${pic.id}" name="${label}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${imageRid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
}
async function exportRunbookImported(activity, images, projectData){
 if(!window.JSZip||!projectData?.runbookWorkbookBase64||!projectData?.runbookModel?.sections?.length)throw Error('Modelo de Runbook não disponível para este projeto.');
 const data=Uint8Array.from(atob(projectData.runbookWorkbookBase64),c=>c.charCodeAt(0));
 const zip=await JSZip.loadAsync(data);
 const model=projectData.runbookModel,book=parse(await zip.file('xl/workbook.xml').async('string'));
 const wbRels=parse(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
 const relMap=new Map([...wbRels.getElementsByTagNameNS(packageRelNs,'Relationship')].map(x=>[x.getAttribute('Id'),toName(x.getAttribute('Target'))]));
 const sheetMap=new Map([...book.getElementsByTagNameNS(mainNs,'sheet')].map(x=>[x.getAttribute('name'),relMap.get(x.getAttributeNS(docRelNs,'id')||x.getAttribute('r:id'))]));
 const tasks=[];let index=0;
 for(const section of model.sections)for(const item of section.items){if(images[index])tasks.push({item,section,index,source:images[index]});index++}
 const grouped=new Map();for(const task of tasks){const path=sheetMap.get(task.item.sheetName);if(!path)continue;if(!grouped.has(path))grouped.set(path,[]);grouped.get(path).push(task)}
 const contentPath='[Content_Types].xml';let contents=parse(await zip.file(contentPath).async('string'));
 const ctNS='http://schemas.openxmlformats.org/package/2006/content-types';
 if(![...contents.getElementsByTagNameNS(ctNS,'Default')].some(x=>x.getAttribute('Extension')==='png')){let d=contents.createElementNS(ctNS,'Default');d.setAttribute('Extension','png');d.setAttribute('ContentType','image/png');contents.documentElement.appendChild(d)}
 let nextDrawing=1;while(zip.file(`xl/drawings/drawing${nextDrawing}.xml`))nextDrawing++;
 let pictureId=1000;
 for(const [sheetPath,list] of grouped){
   const sheet=parse(await zip.file(sheetPath).async('string'));
   const sheetFile=sheetPath.split('/').pop();const relsPath=`xl/worksheets/_rels/${sheetFile}.rels`;
   const sheetRels=zip.file(relsPath)?parse(await zip.file(relsPath).async('string')):newDoc(`<Relationships xmlns="${packageRelNs}"/>`);
   let drawingTag=[...sheet.getElementsByTagNameNS(mainNs,'drawing')][0],drawingPath,drawRelsPath;
   if(drawingTag){const rid=drawingTag.getAttributeNS(docRelNs,'id')||drawingTag.getAttribute('r:id');const rel=[...sheetRels.getElementsByTagNameNS(packageRelNs,'Relationship')].find(x=>x.getAttribute('Id')===rid);if(rel)drawingPath=toName(rel.getAttribute('Target'),'xl/worksheets')}
   if(!drawingPath){drawingPath=`xl/drawings/drawing${nextDrawing++}.xml`;const newRID=uniqueId(sheetRels,'rIdRunbookDraw');createRel(sheetRels,newRID,'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing',`../drawings/${drawingPath.split('/').pop()}`);drawingTag=sheet.createElementNS(mainNs,'drawing');drawingTag.setAttributeNS(docRelNs,'r:id',newRID);const extList=[...sheet.documentElement.childNodes].find(n=>n.localName==='extLst');sheet.documentElement.insertBefore(drawingTag,extList||null);zip.file(sheetPath,serialize(sheet));zip.file(relsPath,serialize(sheetRels));const over=contents.createElementNS(ctNS,'Override');over.setAttribute('PartName','/'+drawingPath);over.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.drawing+xml');contents.documentElement.appendChild(over)}
   const drawing=zip.file(drawingPath)?parse(await zip.file(drawingPath).async('string')):newDoc(`<xdr:wsDr xmlns:xdr="${drawingNs}" xmlns:a="${drawingML}" xmlns:r="${docRelNs}"/>`);
   const drawingFile=drawingPath.split('/').pop();drawRelsPath=`xl/drawings/_rels/${drawingFile}.rels`;
   const drRels=zip.file(drawRelsPath)?parse(await zip.file(drawRelsPath).async('string')):newDoc(`<Relationships xmlns="${packageRelNs}"/>`);
   for(const task of list){
     const picture=await png(task.source);if(!picture)continue;
     const media=`runbook_projeto_${Date.now()}_${task.index}.png`,rid=uniqueId(drRels,'rIdRunbookImg');
     zip.file('xl/media/'+media,picture.base64,{base64:true});createRel(drRels,rid,'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image','../media/'+media);
     const xml=pictureMarkup({...picture,id:pictureId++},rid,task.section,task.item);
     const pictureNode=parse(`<xdr:wsDr xmlns:xdr="${drawingNs}" xmlns:a="${drawingML}" xmlns:r="${docRelNs}">${xml}</xdr:wsDr>`).documentElement.firstChild;
     drawing.documentElement.appendChild(drawing.importNode(pictureNode,true));
   }
   zip.file(drawingPath,serialize(drawing));zip.file(drawRelsPath,serialize(drRels));
 }
 zip.file(contentPath,serialize(contents));
 const original=projectData.runbookFilename||'Runbook.xlsx';const ext=/\.xlsm$/i.test(original)?'xlsm':'xlsx';
 const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Runbook_${String(activity.data.row?.['ID VGR']||activity.id).replace(/[^\w-]/g,'_')}.${ext}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
window.exportRunbookImported=exportRunbookImported;
})();
