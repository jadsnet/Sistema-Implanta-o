/* Editor visual do modelo de Runbook. Não altera o arquivo original no IndexedDB:
   salva apenas metadados do projeto, que também são aplicados na exportação. */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let sequence=0;
const uid=prefix=>`${prefix}_${Date.now().toString(36)}_${(++sequence).toString(36)}`;
function open(project,onSave){
 const original=project?.data?.runbookModel;
 if(!original?.sections?.length){alert('Importe e aplique uma planilha de Runbook antes de editar.');return;}
 const model=JSON.parse(JSON.stringify(original));
 model.removedItems=Array.isArray(model.removedItems)?model.removedItems:[];
 model.removedSections=Array.isArray(model.removedSections)?model.removedSections:[];
 const layer=document.createElement('div');layer.className='runbook-editor-overlay';
 layer.innerHTML=`<div class="runbook-editor-window" role="dialog" aria-modal="true" aria-labelledby="runbookEditTitle">
 <div class="runbook-editor-header"><div><h2 id="runbookEditTitle">Editar runbook</h2><p>Edite diretamente os títulos e descrições. O sistema salva as alterações automaticamente ao sair dos campos.</p></div>
 <button type="button" class="runbook-editor-close" aria-label="Fechar editor" title="Fechar editor"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
 <div class="runbook-editor-body"><div class="runbook-editor-toolbar"><label>Nome da nova seção<input id="rbNewSection" placeholder="Ex.: Caderno de testes" maxlength="110"></label><label>Tipo<select id="rbSectionKind"><option value="evidence">Evidências / testes</option><option value="photos">Fotografias</option></select></label><button id="rbAddSection" type="button">+ Criar seção</button></div><p class="runbook-editor-help">Clique no nome de uma seção ou de uma evidência para editar. A descrição é exibida em <i>itálico</i> no Runbook.</p><div id="rbEditorSections"></div></div>
 <div class="runbook-editor-footer"><span id="rbEditorCount" class="small muted"></span><div><button type="button" id="rbEditorCancel" class="secondary">Fechar</button><button type="button" id="rbEditorSave">Salvar alterações</button></div></div></div>`;
 document.body.appendChild(layer);
 const get=s=>layer.querySelector(s);
 const closed=()=>{layer.remove();document.removeEventListener('keydown',escapeHandler)};
 const autoSave=()=>{model.total=model.sections.reduce((n,sec)=>n+sec.items.length,0);try{onSave(JSON.parse(JSON.stringify(model)));if(typeof window.toast==='function')window.toast('Salvo automaticamente',3000)}catch(err){console.error('Falha ao salvar Runbook',err)}};
 const close=()=>closed();
 const escapeHandler=e=>{if(e.key==='Escape'){e.preventDefault();close()}};
 document.addEventListener('keydown',escapeHandler);
 get('.runbook-editor-close').onclick=close;get('#rbEditorCancel').onclick=close;
 function renderSections(focus){
  const container=get('#rbEditorSections');
  container.innerHTML=model.sections.map((sec,s)=>`<section class="runbook-editor-section" data-rb-sec="${s}"><div class="runbook-editor-section-top"><div class="runbook-editor-section-name"><label class="sr-only" for="rb-section-name-${s}">Nome da seção</label><input id="rb-section-name-${s}" type="text" maxlength="110" data-section-name="${s}" value="${esc(sec.title)}" title="Clique para alterar o nome da seção"></div><button class="runbook-editor-trash" type="button" data-remove-section="${s}" title="Excluir seção e seus quadros" aria-label="Excluir seção ${esc(sec.title)}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m5 4v7m4-7v7"/></svg></button></div><div class="runbook-editor-items">${sec.items.map((item,i)=>`<article class="runbook-editor-item" data-rb-item="${i}"><div class="runbook-editor-item-title"><label class="sr-only" for="rb-item-${s}-${i}">Título da evidência</label><input id="rb-item-${s}-${i}" data-item-title="${s}:${i}" type="text" maxlength="190" value="${esc(item.title)}" placeholder="Título da evidência ou fotografia"><button class="runbook-editor-trash" type="button" data-remove-item="${s}:${i}" title="Excluir este quadro" aria-label="Excluir quadro ${esc(item.title)}"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m5 4v7m4-7v7"/></svg></button></div><label class="runbook-editor-caption">Descrição / instruções (itálico)<textarea data-item-desc="${s}:${i}" rows="2" placeholder="Digite instruções, caminhos ou observações...">${esc(item.description||'')}</textarea></label><div class="runbook-editor-image-sample"><span>▧</span><small>Área da imagem no Runbook</small></div></article>`).join('')}</div><button type="button" class="runbook-editor-add-item" data-add-item="${s}">+ Adicionar quadro de ${sec.kind==='photos'?'fotografia':'evidência / teste'}</button></section>`).join('')||'<p class="runbook-editor-empty">Nenhuma seção. Crie uma seção acima para começar.</p>';
  get('#rbEditorCount').textContent=`${model.sections.length} seção(ões) · ${model.sections.reduce((n,sec)=>n+sec.items.length,0)} quadro(s)`;
  container.querySelectorAll('[data-section-name]').forEach(el=>el.oninput=()=>{model.sections[+el.dataset.sectionName].title=el.value});
  // Títulos e descrições ficam efetivamente persistidos ao sair do campo.
  // Mudanças de estrutura (adicionar/excluir) continuam exigindo Salvar alterações.
  container.querySelectorAll('[data-section-name],[data-item-title],[data-item-desc]').forEach(el=>{
    el.addEventListener('focus',()=>{el.dataset.rbPrevious=el.value});
    el.addEventListener('blur',()=>{
      if(el.dataset.rbPrevious===el.value)return;
      autoSave()
    });
  });
  container.querySelectorAll('[data-item-title]').forEach(el=>el.oninput=()=>{const [s,i]=el.dataset.itemTitle.split(':').map(Number);model.sections[s].items[i].title=el.value});
  container.querySelectorAll('[data-item-desc]').forEach(el=>el.oninput=()=>{const [s,i]=el.dataset.itemDesc.split(':').map(Number);model.sections[s].items[i].description=el.value});
  container.querySelectorAll('[data-remove-section]').forEach(el=>el.onclick=()=>{const s=+el.dataset.removeSection,sec=model.sections[s];if(model.sections.length===1)return alert('O Runbook precisa ter ao menos uma seção.');if(!confirm(`Excluir a seção "${sec.title}" e seus ${sec.items.length} quadro(s) deste Runbook?`))return;
   if(!sec.createdByEditor){model.removedSections.push({id:sec.id,sheetName:sec.items[0]?.sheetName||sec.sheetName||'',title:sec.title});sec.items.filter(item=>!item.createdByEditor).forEach(item=>model.removedItems.push({...item}));}
   model.sections.splice(s,1);renderSections();autoSave()});
  container.querySelectorAll('[data-remove-item]').forEach(el=>el.onclick=()=>{const [s,i]=el.dataset.removeItem.split(':').map(Number),it=model.sections[s].items[i];if(!confirm(`Remover o quadro "${it.title}" desta seção?`))return;if(!it.createdByEditor)model.removedItems.push({...it});model.sections[s].items.splice(i,1);renderSections();autoSave()});
  container.querySelectorAll('[data-add-item]').forEach(el=>el.onclick=()=>{const s=+el.dataset.addItem,sec=model.sections[s],item={id:uid('rb_item'),title:'Nova '+(sec.kind==='photos'?'fotografia':'evidência'),description:'',createdByEditor:true,sheetName:sec.sheetName||sec.items.find(x=>x.sheetName)?.sheetName||''};sec.items.push(item);renderSections();autoSave();const field=get(`[data-item-title="${s}:${sec.items.length-1}"]`);field?.focus();field?.select()});
  if(focus)get(focus)?.focus();
 }
 get('#rbAddSection').onclick=()=>{const name=get('#rbNewSection').value.trim(),kind=get('#rbSectionKind').value;if(!name)return get('#rbNewSection').focus();if(model.sections.some(sec=>sec.title.trim().toLowerCase()===name.toLowerCase()))return alert('Já existe uma seção com esse nome.');const s=model.sections.length;model.sections.push({id:uid('rb_sec'),title:name,kind,createdByEditor:true,items:[]});get('#rbNewSection').value='';renderSections(`[data-add-item="${s}"]`);autoSave()};
 get('#rbNewSection').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();get('#rbAddSection').click()}});
 get('#rbEditorSave').onclick=()=>{if(!model.sections.length)return alert('Crie ao menos uma seção para salvar o Runbook.');for(const sec of model.sections){sec.title=sec.title.trim();if(!sec.title)return alert('Preencha o nome de todas as seções.');for(const it of sec.items){it.title=it.title.trim();it.description=(it.description||'').trim();if(!it.title)return alert(`Preencha o título de todos os quadros de "${sec.title}".`)}}model.total=model.sections.reduce((n,sec)=>n+sec.items.length,0);try{onSave(model);closed()}catch(err){alert('Não foi possível salvar o Runbook: '+err.message)}};
 renderSections();
 get('#rbNewSection').focus();
}
window.RunbookEditor={open};
})();
