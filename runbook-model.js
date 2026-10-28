/* Modelo de Runbook por projeto. A estrutura é lida das abas, linhas e células
   do arquivo importado, sem fixar títulos/quantidade de evidências do COPASA. */
(function(){
  'use strict';
  const text=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const evidence=/evidenc|captura|print|screenshot|registro.*(meraki|rede|atividade)/;
  const photos=/foto|fotograf|imagem|registro fotografico|rack/;
  const arrow=/(?:--?>|→|⇒|\bacesse\b|\bmenu\b|\bteste\b|https?:\/\/|\blog\b)/i;
  const header=/^(?:evid[eê]ncias?|prints?|capturas?|imagens?|fotos?)\s*(?:[-–—:]\s*)?(?:n[º°.]\s*)?\d+/i;
  const titleRow=/^(?:registro de evid[eê]ncias|fotografia|relat[oó]rio fotogr[aá]fico|evid[eê]ncias do local|fotos do local)/i;
  function cellsOf(sheet){
    const rows=new Map();
    Object.keys(sheet||{}).forEach(ref=>{
      if(ref[0]==='!'||!/^[A-Z]+\d+$/.test(ref))return;
      const cell=sheet[ref],value=text(cell?.w??cell?.v);
      if(!value||value[0]==='=' && value.length>120)return;
      const pos=XLSX.utils.decode_cell(ref);
      if(!rows.has(pos.r))rows.set(pos.r,[]);
      rows.get(pos.r).push({text:value,row:pos.r+1,col:pos.c,ref});
    });
    return [...rows].sort((a,b)=>a[0]-b[0]).map(([index,cells])=>({index:index+1,cells:cells.sort((a,b)=>a.col-b.col)}));
  }
  function sheetKind(name,rows){
    const key=norm(name),top=norm(rows.slice(0,3).flatMap(r=>r.cells.map(c=>c.text)).join(' '));
    if(photos.test(key)&&!evidence.test(key))return 'photos';
    if(evidence.test(key)||evidence.test(top))return 'evidence';
    if(photos.test(top))return 'photos';
    const labels=rows.filter(r=>r.cells.length===1).map(r=>r.cells[0].text);
    if(labels.length>=2&&labels.length<=35 && labels.some(v=>header.test(v)))return 'evidence';
    return null;
  }
  function parseSection(name,sheet){
    const rows=cellsOf(sheet);
    if(!rows.length)return null;
    const kind=sheetKind(name,rows);if(!kind)return null;
    let heading=rows[0].cells[0]?.text||name;
    const skipTop=titleRow.test(heading)||norm(heading)===norm(name);
    const candidates=[];
    for(let k=skipTop?1:0;k<rows.length;k++){
      const r=rows[k],cell=r.cells[0];if(!cell)continue;
      const value=cell.text;
      if(!value||titleRow.test(value))continue;
      if(kind==='evidence'){
        // Uma linha de título é seguida pela descrição (normalmente em itálico).
        const nxt=rows[k+1];const note=nxt&&nxt.index===r.index+1&&nxt.cells.length<=2&&!header.test(nxt.cells[0]?.text||'')?nxt.cells[0]?.text:'';
        if(header.test(value)||(!arrow.test(value)&&!/^https?:/i.test(value) && ((note&&arrow.test(note))||r.cells.length===1&&rows[k-1]?.index<r.index-1))){
          candidates.push({title:value,description:note||'',row:r.index,descriptionRow:note?nxt.index:null,col:cell.col});
          if(note)k++;
        }
      }else if(r.cells.length<=2){
        candidates.push({title:value,description:'',row:r.index,col:cell.col});
      }
    }
    if(!candidates.length&&kind==='evidence'){
      // Modelo alternativo: cada linha simples contém a legenda do print.
      rows.slice(skipTop?1:0).filter(r=>r.cells.length===1).forEach(r=>candidates.push({title:r.cells[0].text,description:'',row:r.index,col:r.cells[0].col}));
    }
    const items=candidates.slice(0,80).map((item,i)=>{
      const next=candidates[i+1];
      return {id:`${name}:${item.row}:${item.col}:${item.title}`,title:item.title,description:item.description, sheetName:name,row:item.row,descriptionRow:item.descriptionRow,col:item.col,
        imageRow:Math.max(item.row+1,(item.descriptionRow||0)+1),nextRow:next?.row||null,
        imageHeight:(()=>{const from=Math.max(item.row+1,(item.descriptionRow||0)+1),to=next?.row||from+1;let height=0;for(let r=from;r<to;r++){const row=sheet['!rows']?.[r-1];height+=row?.hpx||((row?.hpt||0)*4/3)||0;}return height?Math.round(height):kind==='photos'?320:475})()};
    });
    if(!items.length)return null;
    return {id:`sheet:${name}`,title:skipTop?heading:name,kind,items};
  }
  function buildModel(workbook){
    let sections=[];
    for(const name of workbook.SheetNames){let section=parseSection(name,workbook.Sheets[name]);if(section)sections.push(section)}
    // Quando há uma aba de evidências e outra de fotos, exibir ambas na ordem da planilha.
    return {version:2,sections,total:sections.reduce((n,s)=>n+s.items.length,0),sheetNames:[...workbook.SheetNames]};
  }
  function toBase64(buffer){
    const bytes=new Uint8Array(buffer);let result='';const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)result+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    return btoa(result);
  }
  async function read(file){
    if(!file)throw Error('Escolha uma planilha de Runbook.');
    if(!window.XLSX)throw Error('A biblioteca de leitura de planilhas não foi carregada.');
    let input=await file.arrayBuffer();
    let wb=XLSX.read(input,{type:'array',cellStyles:true,cellText:true});
    let model=buildModel(wb);
    if(!model.total)throw Error('Não encontrei áreas de evidências ou fotografias. Confira se a planilha contém abas com títulos de evidências, fotos ou impressões.');
    // Arquivos XLS/ODS são convertidos para XLSX somente para permitir adicionar imagens.
    const originalExt=(file.name.split('.').pop()||'').toLowerCase();
    if(!['xlsx','xlsm'].includes(originalExt))input=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    return {model,workbookBase64:toBase64(input),filename:file.name,converted:!['xlsx','xlsm'].includes(originalExt)};
  }
  window.RunbookModel={read,buildModel};
})();
