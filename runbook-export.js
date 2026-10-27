/* Exporta o modelo COPASA original, preservando estilos, fórmulas, abas e desenhos.
   Apenas substitui células solicitadas e incorpora os prints fornecidos. */
async function exportCopasaRunbook(activity, evidenceImages) {
  if (!window.JSZip || !window.COPASA_RUNBOOK_TEMPLATE_BASE64) throw Error('Biblioteca ZIP ou modelo COPASA indisponível. Verifique a conexão.');
  const raw = atob(window.COPASA_RUNBOOK_TEMPLATE_BASE64);
  const data = Uint8Array.from(raw, c => c.charCodeAt(0));
  const zip = await JSZip.loadAsync(data);
  const ed = activity.data.ed || {}, row = activity.data.row || {};
  const lookup = (...keys) => {for (const key of keys) {let v=ed[key] ?? row[key]; if(v!==undefined && v!==null && String(v).trim()) return String(v).trim();}return '';};
  const technician = lookup('NOME DO TÉCNICO','NOME DO TECNICO');
  const phone = lookup('TELEFONE DO TÉCNICO','TELEFONE DO TECNICO');
  const localName = lookup('NOME DO RESPONSÁVEL NO LOCAL','NOME DO RESPONSAVEL NO LOCAL');
  const localPhone = lookup('TELEFONE DO RESPONSÁVEL','TELEFONE DO RESPONSAVEL');
  const id = lookup('ID VGR') || String(activity.id || 'SEM_ID');
  const xmlNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const parse = text => {const doc = new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('XML inválido no modelo');return doc;};
  const serialize = doc => new XMLSerializer().serializeToString(doc);
  async function updateCells(sheetNum, changes) {
    const name=`xl/worksheets/sheet${sheetNum}.xml`;
    const doc=parse(await zip.file(name).async('string'));
    const sheetData=doc.getElementsByTagNameNS(xmlNs,'sheetData')[0];
    for (const [addr,value] of Object.entries(changes)) {
      if(value===undefined || value===null || String(value).trim()==='')continue;
      const number=Number(addr.match(/\d+$/)[0]);
      let rows=[...sheetData.getElementsByTagNameNS(xmlNs,'row')];
      let r=rows.find(el=>Number(el.getAttribute('r'))===number);
      if(!r){r=doc.createElementNS(xmlNs,'row');r.setAttribute('r',number);let after=rows.find(el=>Number(el.getAttribute('r'))>number);sheetData.insertBefore(r,after||null);}
      let cell=[...r.getElementsByTagNameNS(xmlNs,'c')].find(el=>el.getAttribute('r')===addr);
      if(!cell){cell=doc.createElementNS(xmlNs,'c');cell.setAttribute('r',addr);r.appendChild(cell);}
      cell.setAttribute('t','inlineStr');
      for(const child of [...cell.childNodes])if(['v','is','f'].includes(child.localName))cell.removeChild(child);
      const is=doc.createElementNS(xmlNs,'is'), t=doc.createElementNS(xmlNs,'t');t.setAttribute('xml:space','preserve');t.textContent=String(value);is.appendChild(t);cell.appendChild(is);
    }
    zip.file(name,serialize(doc));
  }
  await updateCells(1, {
    B19:activity.data.analystName || '',
    B20:[technician,phone].filter(Boolean).join(' · '),
    B22:[localName,localPhone].filter(Boolean).join(' · ')
  });
  const ipLink=lookup('IP LINK','IP WAN','IP WAN1');
  const cidr=ipLink.match(/\/(\d{1,2})$/);
  const maskFromPrefix=p=>{let n=Number(p);if(n<0||n>32)return '';return [0,8,16,24].map(x=>{let bits=Math.max(0,Math.min(8,n-x));return bits===0?0:256-Math.pow(2,8-bits)}).join('.')};
  const mask=lookup('MASK','MÁSCARA','MASCARA') || (cidr?maskFromPrefix(cidr[1]):'');
  const ip=ipLink.replace(/\/\d{1,2}$/,'');
  const wan={B1:lookup('EQUIPAMENTO','MODELO DO EQUIPAMENTO','MODELO'),B2:lookup('SERIAL MX','SERIAL NUMBER','SERIAL','NÚMERO DE SÉRIE'),B3:lookup('ID DEDICADO','ID LINK 1 (WAN1)','ID INTERNET'),B4:lookup('LP'),B5:lookup('VELOCIDADE DO LINK','VELOCIDADE'),B6:lookup('TECNOLOGIA','MEIOS','PRODUTO'),B7:ip,B8:lookup('GTW','GATEWAY','GW WAN1'),B9:mask};
  await updateCells(3,wan);
  // Inserir imagens sem reconstruir o arquivo: mantém as demais abas e a formatação Excel.
  const drawingNS='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
  const relNS='http://schemas.openxmlformats.org/package/2006/relationships';
  // oneCellAnchor preserva a proporção original; a imagem cabe na área reservada.
  const pictureAnchor=(rid,picId,fromRow,toRow,fromCol=0,toCol=1,dimensions={width:1000,height:700})=>{
    const maxW=toCol-fromCol===1?7150000:3500000;
    const maxH=Math.max(1,toRow-fromRow)*380000;
    const ratio=dimensions.width/dimensions.height;
    const w=Math.round(Math.min(maxW,maxH*ratio)),h=Math.round(w/ratio);
    const xOff=Math.max(0,Math.round((maxW-w)/2));
    return `<xdr:oneCellAnchor><xdr:from><xdr:col>${fromCol}</xdr:col><xdr:colOff>${xOff}</xdr:colOff><xdr:row>${fromRow}</xdr:row><xdr:rowOff>20000</xdr:rowOff></xdr:from><xdr:ext cx="${w}" cy="${h}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${picId}" name="Evidência ${picId}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
  };
  async function pngData(src) {
    if(!src || !src.startsWith('data:image/'))return null;
    const image=new Image();image.src=src;
    await new Promise((resolve,reject)=>{if(image.complete && image.naturalWidth)return resolve();image.onload=resolve;image.onerror=reject;});
    const scale=Math.min(1,1300/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    return {encoded:canvas.toDataURL('image/png').split(',')[1],width:canvas.width,height:canvas.height};
  }
  const contentName='[Content_Types].xml';
  let content=await zip.file(contentName).async('string');
  if(!/Extension="png"/.test(content))content=content.replace('</Types>','<Default Extension="png" ContentType="image/png"/></Types>');
  if(!content.includes('/xl/drawings/drawing4.xml'))content=content.replace('</Types>','<Override PartName="/xl/drawings/drawing4.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>');
  zip.file(contentName,content);
  // A aba Registro de Evidências já usa drawing2.xml; a aba Fotos recebe drawing4.xml.
  const plans=[{drawing:2,first:0,last:6,positions:[[2,4],[5,7],[8,10],[11,13],[14,16],[17,19]]},{drawing:4,first:6,last:8,positions:[[2,3],[5,6]]}];
  for(const plan of plans){
    const drawingPath=`xl/drawings/drawing${plan.drawing}.xml`;
    const relPath=`xl/drawings/_rels/drawing${plan.drawing}.xml.rels`;
    let drawing=zip.file(drawingPath)?await zip.file(drawingPath).async('string'):'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="'+drawingNS+'" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"></xdr:wsDr>';
    let rels=zip.file(relPath)?await zip.file(relPath).async('string'):'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="'+relNS+'"></Relationships>';
    let anchorXml='';
    for(let i=plan.first;i<plan.last;i++){
      const picture=await pngData(evidenceImages[i]);if(!picture)continue;
      const rid=`rIdRunbook${i+1}`, media=`runbook_evidence_${i+1}.png`;
      zip.file(`xl/media/${media}`,picture.encoded,{base64:true});
      rels=rels.replace('</Relationships>',`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${media}"/></Relationships>`);
      const [from,to]=plan.positions[i-plan.first];anchorXml+=pictureAnchor(rid,500+i,from,to,0,1,picture);
    }
    if(plan.drawing===4 || anchorXml){
      if(!drawing.includes('xmlns:r='))drawing=drawing.replace('<xdr:wsDr ', '<xdr:wsDr xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
      drawing=drawing.replace('</xdr:wsDr>',anchorXml+'</xdr:wsDr>');
      zip.file(drawingPath,drawing);zip.file(relPath,rels);
    }
  }
  // Vincular drawing4 à aba Fotos, preservando os relacionamentos de outras abas.
  const sheet8='xl/worksheets/sheet8.xml';let sheet=await zip.file(sheet8).async('string');
  if(!sheet.includes('<drawing ')){
    sheet=sheet.replace('</worksheet>','<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdRunbookFotos"/></worksheet>');
    zip.file(sheet8,sheet);
  }
  zip.file('xl/worksheets/_rels/sheet8.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="'+relNS+'"><Relationship Id="rIdRunbookFotos" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing4.xml"/></Relationships>');
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6},mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download=`Runbook_COPASA_VGR_${id.replace(/[^\w-]/g,'_')}.xlsx`;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
