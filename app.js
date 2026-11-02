
const $=s=>document.querySelector(s);let DB={},page='home',projectId=null,selectedActivity=null,adminTab='Projetos',filterStatus='Todos',customAnalyst='',customStatus='Todos',filterOwner='none';
const statuses=['Pendente','Em andamento','Migrada','Quebra'];
const activeStatuses=['Contatando técnico','Iniciando configuração','Finalizando configuração','Aguardando cliente config Fortinet','Organização de Rack e equipamentos'];
let dateFilter='today', selectedDate=new Date().toLocaleDateString('en-CA'), detailMode='view',homeListLimit=200,rankingOpen=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=k=>DB[k]||[];const project=()=>arr('projects').find(x=>x.id===projectId);
let toastTimer;
function toast(s, duration=5000){
 const t=$('#toast');if(!t)return;
 clearTimeout(toastTimer);
 const saved=s==='Alterações salvas ✅'||s==='Alterações salvas';
 t.textContent=saved?'Alterações salvas':s;
 t.classList.toggle('toast-with-icon',saved);
 if(saved){
  // Ícone vetorial equivalente ao enviado; o traço herda a cor do texto.
  t.insertAdjacentHTML('beforeend','<svg class="toast-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="2.7"/><path d="m6.8 12.2 4.2 3.8 6.5-8"/></svg>');
 }
 t.style.display=saved?'flex':'block';t.classList.add('toast-visible');
 toastTimer=setTimeout(()=>{t.classList.remove('toast-visible','toast-with-icon');t.style.display='none'},duration);
}
function save(){if(!window.GICloud?.role())throw Error('Sem sessão Supabase autorizada');window.GICloud.queueSave(DB)}
// Notificação discreta depois que o usuário abandona um campo editado.
// Campos de pesquisa, filtros e formulários não enviados não são salvos antecipadamente.
document.addEventListener('focusin',event=>{
 const el=event.target;
 if(el?.matches?.('input:not([type=file]),textarea,select,[contenteditable="true"]'))
  el.dataset.valueOnFocus=el.isContentEditable?el.textContent:el.value;
},true);
document.addEventListener('focusout',event=>{
 const el=event.target;
 if(!el?.matches?.('input:not([type=file]),textarea,select,[contenteditable="true"]'))return;
 const before=el.dataset.valueOnFocus,after=el.isContentEditable?el.textContent:el.value;
 if(before===undefined||before===after)return;
 if(el.closest('.login-overlay,.new-activity-overlay,.new-activity-modal,.report-modal,.runbook-editor-toolbar'))return;
 if(/^(?:search|rbSearch|customAnalyst|customStatus|otherDate|logSearch|login)/i.test(el.id||''))return;
 const activeContext=el.closest('.runbook-editor-window,.activity-detail-screen,.admin-config-section,.runbook-detail,.activity-modal,.admin-activity-editor');
 if(!activeContext)return;
 // O aviso de sucesso é exibido APENAS depois que o banco confirma a gravação.
},true);

function log(action,detail='',actId=''){DB.log.unshift({id:'log_'+Date.now(),data:{act:action,action,detail,actId,ts:new Date().toISOString(),user:localStorage.getItem('gi_user')||'Administrador'}});save()}
function normStatus(s){if(!s)return'Pendente';let v=String(s).toLowerCase();if(v.includes('contatando')||v.includes('iniciando')||v.includes('finalizando')||v.includes('aguardando cliente')||v.includes('organização de rack')||v.includes('andamento'))return'Em andamento';if(v.includes('migrad')||v.includes('conclu'))return'Migrada';if(v.includes('quebra'))return'Quebra';return'Pendente'}
function getName(p){return p?.data?.name||p?.id||'Projeto'}
function activityName(a){let r=a.data.row||{};return r['ID VGR']||r['ID']||a.id}
function projectActivities(){let p=project();return arr('activities').filter(a=>{let r=a.data.row||{};return !p||!p.data.name||String(r.EMPRESA||'').toLowerCase()===String(p.data.name).toLowerCase()||a.data.projectId===p.id})}
function render(){document.querySelectorAll('.nav').forEach(a=>{const u=new URL(location.href);u.searchParams.set('page',a.dataset.page);if(projectId)u.searchParams.set('project',projectId);else u.searchParams.delete('project');a.href=u.toString()});if(page==='admin'&&!isAdmin())page='home';document.querySelector('.nav[data-page="admin"]').style.display=isAdmin()?'':'none';renderProjectAvatar();document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('#sectionEyebrow').textContent=page==='home'?'PROJETOS':page==='runbook'?'RUNBOOK':page==='logs'?'AUDITORIA':'ADMINISTRAÇÃO';$('#watermark').textContent=project()?('PROJETO '+getName(project()).toUpperCase()):'';$('#pageTitle').textContent=page==='home'?(project()?'Projeto '+getName(project()):'Selecione um projeto'):page==='runbook'?'Realizar runbook':page==='logs'?'Log de atividades':'Painel do administrador';renderUserPicker();const back=$('#topBackProjects');if(back){back.hidden=!(page==='home'&&!!project()&&!selectedActivity);back.onclick=()=>{projectId=null;selectedActivity=null;filterStatus='Todos';filterOwner='none';render()}}if(page==='home')renderHome();if(page==='runbook')renderRunbook();if(page==='logs')renderLogs();if(page==='admin')renderAdmin()}
function renderProjectAvatar(){let host=$('#projectSidebarProfile');if(!host)return;let p=project();host.hidden=!p;if(!p){host.innerHTML='';return}let photo=p.data?.profilePhoto;host.innerHTML=`<div class="project-profile-image">${photo?`<img src="${esc(photo)}" alt="Foto do projeto">`:`<span>${esc(getName(p).slice(0,1).toUpperCase())}</span>`}</div><div class="project-profile-name" title="Projeto ${esc(getName(p))}"><strong>Projeto ${esc(getName(p))}</strong><small>Gestão de Projetos</small></div>`}
function currentUser(){return window.GICloud?.displayName()||'Usuário'}
function isAdmin(){return ['administrador','gestor'].includes(window.GICloud?.role())}
function isRootAdmin(){return window.GICloud?.role()==='administrador'}
function firstName(name){return String(name||'').trim().split(/\s+/)[0]||'Usuário'}
function analystNameKey(name){return String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleUpperCase('pt-BR').replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function canonicalAnalystName(name){
 let value=String(name||'').trim().replace(/\s+/g,' ').toLocaleUpperCase('pt-BR');
 if(!value)return '';
 // Um sufixo de escala não transforma o mesmo analista em outra pessoa.
 if(analystNameKey(value).split(' ').length>=3)value=value.replace(/\s*[-–—]\s*EMERGENCIAL$/u,'').trim();
 // Correção de alias confirmado pelo administrador: falta do S final.
 if(analystNameKey(value)==='ADRIANA SILVA ALVES DOS SANTO')return 'ADRIANA SILVA ALVES DOS SANTOS';
 return value;
}
function analystListName(name){
 const parts=canonicalAnalystName(name).split(/\s+/).filter(Boolean);
 const surname=parts.slice(1).find(part=>!['DA','DE','DO','DAS','DOS','E'].includes(part));
 return surname?`${parts[0]} ${surname}`:(parts[0]||'—');
}
function renderUserPicker(){let host=$('#currentUser');if(!host)return;host.innerHTML=`<span class="signed-user">${esc(currentUser())}</span><button class="secondary gi-refresh-button" id="refreshCloudData" title="Atualizar dados do Supabase">↻ Atualizar dados</button><button class="secondary logout-button" id="logoutButton">Sair</button>`;
 $('#refreshCloudData').onclick=async()=>{const button=$('#refreshCloudData');button.disabled=true;
  try{await GICloud.waitForSaves();DB=await GICloud.loadAll();render();toast('Dados atualizados do Supabase')}
  catch(e){toast('Não foi possível atualizar: '+e.message,8000)}finally{button.disabled=false}
 };
 $('#logoutButton').onclick=async()=>{try{await GICloud.signOut();DB={projects:[],activities:[],runbooks:[],users:[],analysts:[],log:[]};showLogin()}catch(e){toast('Falha ao sair: '+e.message)}};
}
async function giEnterApp(){
 const p=await GICloud.getProfile();
 if(!p){showLogin();return}
 if(!p.active)throw Error('Sua conta ainda não foi ativada pelo administrador.');
 if(p.must_change_password){giOpenPasswordRecovery(true);return}
 DB=await GICloud.loadAll();
 // Nunca sobrescrever nem apagar dados locais anteriores sem migração autorizada.
 const requestedProject=new URLSearchParams(location.search).get('project');
 if(requestedProject&&arr('projects').some(p=>p.id===requestedProject))projectId=requestedProject;
 document.querySelector('.login-overlay')?.remove();
 document.querySelector('.app').style.display='flex';
 if(!isAdmin()&&page==='admin')page='home';
 render();
}
function giOpenPasswordRecovery(required=false){
 document.querySelector('.app').style.display='none';document.querySelector('.login-overlay')?.remove();
 const layer=document.createElement('div');layer.className='login-overlay';
 layer.innerHTML=`<form class="login-card" id="changePasswordForm"><div class="login-brand"><span class="login-brand-icon"></span><span><b>Gestão de Projetos</b></span></div><h1>${required?'Primeiro acesso':'Redefinir senha'}</h1><p>Crie uma senha com pelo menos 12 caracteres, maiúscula, minúscula e número.</p><label for="newAccountPassword">Nova senha</label><input id="newAccountPassword" type="password" autocomplete="new-password" minlength="12" required><label for="repeatAccountPassword">Confirmar senha</label><input id="repeatAccountPassword" type="password" autocomplete="new-password" minlength="12" required><div class="login-error" id="changeError" role="alert"></div><button type="submit" class="login-submit">Salvar nova senha</button>${required?'':'<button type="button" class="secondary" id="cancelReset">Voltar</button>'}</form>`;
 document.body.appendChild(layer);
 layer.querySelector('#cancelReset')?.addEventListener('click',()=>showLogin());
 layer.querySelector('form').onsubmit=async event=>{event.preventDefault();const a=$('#newAccountPassword').value,b=$('#repeatAccountPassword').value;
   if(a!==b){$('#changeError').textContent='As senhas são diferentes.';return}
   try{await GICloud.changePassword(a);await giEnterApp()}catch(e){$('#changeError').textContent=e.message}
 };
}
window.giOpenPasswordRecovery=giOpenPasswordRecovery;
function showLogin(message=''){
 document.querySelector('.app').style.display='none';document.querySelector('.login-overlay')?.remove();
 const layer=document.createElement('div');layer.className='login-overlay';
 layer.innerHTML=`<form class="login-card" id="loginForm"><div class="login-brand"><span class="login-brand-icon" aria-hidden="true"></span><span><b>Gestão de Projetos</b></span></div><h1>Entrar</h1><p>Use seu e-mail corporativo @telefonica.com.</p><label for="loginEmail">E-mail corporativo</label><input id="loginEmail" type="email" autocomplete="username" required placeholder="nome@telefonica.com"><label for="loginPassword">Senha</label><input id="loginPassword" type="password" autocomplete="current-password" required placeholder="Digite sua senha"><div class="login-error" id="loginError" role="alert">${esc(message)}</div><button type="submit" class="login-submit">Entrar</button><button type="button" id="forgotPassword" class="secondary">Esqueci minha senha</button><div class="login-footer"><button type="button" class="login-theme-switch" aria-label="Alternar tema claro e escuro" title="Alternar tema">☀ <span>☾</span></button><small>V.1.0</small></div></form>`;
 document.body.appendChild(layer);
 layer.querySelector('.login-theme-switch').onclick=()=>{const mode=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=mode;localStorage.setItem('gi_theme',mode)};
 layer.querySelector('#forgotPassword').onclick=async()=>{const email=$('#loginEmail').value;try{await GICloud.resetPassword(email);$('#loginError').textContent='Se a conta existir, enviaremos um link de redefinição para o e-mail.'}catch(e){$('#loginError').textContent=e.message}};
 layer.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=layer.querySelector('.login-submit');button.disabled=true;$('#loginError').textContent='';
   try{await GICloud.signIn($('#loginEmail').value,$('#loginPassword').value);await giEnterApp()}
   catch(e){$('#loginError').textContent=e.message}
   finally{button.disabled=false}
 };
}

function localDay(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value).slice(0,10);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function activityDate(a){const d=a.data||{},r=d.row||{};return localDay(d.startAt||d.endAt||r.DATA||r.Data||r.DATA_ATIVIDADE||r['DATA DA ATIVIDADE']||r['DATA DE ABERTURA']||r['DATA CRIAÇÃO']||'')}
function dateActivities(acts){if(dateFilter==='all')return acts;const day=dateFilter==='other'?selectedDate:localDay(new Date());return acts.filter(a=>{const d=a.data||{};return [d.startAt,d.endAt,...(d.history||[]).map(h=>h.at)].some(v=>localDay(v)===day)||activityDate(a)===day})}
function applyCustomFilterSelection(){
 const enabled=!!customAnalyst||customStatus!=='Todos';
 filterStatus='Todos';
 filterOwner=enabled?'custom':'none';
 if(enabled){
  const search=$('#searchActivity');if(search)search.value='';
  localStorage.removeItem('gi_search_'+(projectId||''));
 }
 if(enabled&&dateFilter!=='all'){
  const restoreAnalystFocus=document.activeElement?.id==='customAnalyst';
  dateFilter='all';
  // Recria os totais e os botões de data sem o filtro de "Outro dia".
  render();
  if(restoreAnalystFocus){
   const field=$('#customAnalyst');if(field){field.focus();try{field.setSelectionRange(field.value.length,field.value.length)}catch{}}
  }
 }else{
  updateFilterIndicators();
  renderActivityList();
 }
}
// Ordenação única para a lista geral e para a pesquisa administrativa.
// Prioriza a última movimentação real, seguida da data de criação/importação.
function activityLastMovement(a){
 const d=a.data||{},r=d.row||{};
 const dates=[d.endAt,d.updatedAt,d.startAt,d.createdAt,d.at,
  ...(Array.isArray(d.history)?d.history.map(h=>h.at):[]),
  r.DATA,r.Data,r.DATA_ATIVIDADE,r['DATA DA ATIVIDADE'],r['DATA DE ABERTURA'],r['DATA CRIAÇÃO']];
 const millis=dates.map(v=>{
  if(!v)return 0;
  if(typeof v==='number')return v>1e11?v:v>1e9?v*1000:0;
  const str=String(v).trim();
  const br=str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[, ]+(\d{1,2}):(\d{2}))?/);
  if(br)return new Date(Number(br[3]),Number(br[2])-1,Number(br[1]),Number(br[4]||0),Number(br[5]||0)).getTime()||0;
  const ts=new Date(str).getTime();return Number.isFinite(ts)?ts:0;
 }).filter(Number.isFinite);
 // Atividades manuais sem registro de data usam o horário codificado no ID.
 const manual=String(a.id||'').match(/^manual_(\d{12,})/);
 if(manual)millis.push(Number(manual[1]));
 return Math.max(0,...millis);
}
function newestActivities(activities){return activities.map((a,i)=>({a,i,t:activityLastMovement(a)})).sort((x,y)=>y.t-x.t||x.i-y.i).map(x=>x.a)}
function activitySearchMatches(a,query){if(!query)return true;const d=a.data||{},r=d.row||{};
 return [a.id,activityName(a),d.status,d.analystName,d.observations,...Object.values(r),...Object.values(d.ed||{})]
  .some(v=>String(v??'').toLocaleLowerCase('pt-BR').includes(query));}
function completionLabel(a){
 const d=a.data||{},st=normStatus(d.status);if(!['Migrada','Quebra'].includes(st))return '';
 const label=st==='Migrada'?'Migrada':'Quebrada';
 const raw=d.endAt||d.row?.['DATA SDWAN']||d.row?.['DATA DA ATIVIDADE'];
 if(!raw)return label;
 const day=importedDateDay(raw),when=day?new Date(`${day}T12:00:00`):new Date(raw);
 return Number.isNaN(when.getTime())?label:`${label} em ${when.toLocaleDateString('pt-BR')}`;
}
function runningActivityTime(a){return normStatus(a.data?.status)==='Em andamento'&&a.data?.startAt?elapsed(a.data.startAt):''}
// Ranking informativo por atividade concluída. Usa o projeto inteiro,
// independentemente da data, pesquisa ou cartão de status selecionado.
function calculateActivityRanking(activities){
 const analysts=new Map(),seen=new Set();
 for(const a of newestActivities(activities)){
  const d=a.data||{},status=normStatus(d.status);
  if(!['Migrada','Quebra'].includes(status))continue;
  const fullName=canonicalAnalystName(d.analystName);
  if(!fullName)continue;
  const vgr=activityVgrKey(a);
  const key=(d.projectId||'')+'|'+(vgr||a.id);
  if(seen.has(key))continue;
  seen.add(key);
  const row=analysts.get(fullName)||{fullName,migradas:0,quebradas:0};
  if(status==='Migrada')row.migradas++;
  else row.quebradas++;
  analysts.set(fullName,row);
 }
 const ranked=[...analysts.values()].sort((a,b)=>
  b.migradas-a.migradas||a.quebradas-b.quebradas||a.fullName.localeCompare(b.fullName,'pt-BR'));
 const labels=new Map();
 for(const item of ranked){const shortened=analystListName(item.fullName);labels.set(shortened,(labels.get(shortened)||0)+1)}
 return ranked.map(item=>({...item,label:labels.get(analystListName(item.fullName))>1?item.fullName:analystListName(item.fullName)}));
}
function renderActivityRanking(){
 const host=$('#activityRanking');if(!host||host.hidden)return;
 const rows=calculateActivityRanking(projectActivities());
 host.innerHTML=`<div class="ranking-title"><h4>Ranking dos analistas</h4><span>Todo o projeto · ordem por migrações, com menos quebras no desempate</span></div>
 <div class="ranking-grid ranking-labels"><span class="ranking-name-heading">Analista</span><span>Migradas</span><span>Quebradas</span><span></span></div>
 ${rows.length?rows.map((item,index)=>`<div class="ranking-grid ranking-line"><span class="ranking-person" title="${esc(item.fullName)}">${esc(item.label)}</span><span class="ranking-dotted" aria-hidden="true"></span><strong class="ranking-count">${item.migradas}</strong><strong class="ranking-count">${item.quebradas}</strong><span class="ranking-medal" ${index===0?'role="img" aria-label="Medalha de primeiro lugar" title="1º lugar"':''}>${index===0?'🥇':''}</span></div>`).join(''):'<p class="small muted">Nenhuma atividade migrada ou quebrada com analista informado.</p>'}`;
}
const funnelIcon='<svg class="date-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5z"/></svg>';
function recordActivityHistory(a,status,notes){if(!a||!['Migrada','Quebra','Abandonada'].includes(status))return;const d=a.data;d.history=d.history||[];d.history.push({at:new Date().toISOString(),analyst:currentUser(),status:status||d.status||'Pendente',notes:String(notes||'')});save()}
function renderHome(){let c=$('#appContent');if(!project()){c.innerHTML=`<div class="panel project-selection-panel"><h3>Selecione um projeto</h3><div class="grid project-selection-grid">${arr('projects').map(p=>`<div class="project" data-project="${esc(p.id)}"><div class="letter">${p.data?.profilePhoto?`<img src="${esc(p.data.profilePhoto)}" alt="Foto de ${esc(getName(p))}">`:esc(getName(p).slice(0,1))}</div><div class="project-selection-info"><b>${esc(getName(p))}</b><div class="sub small">${arr('activities').filter(a=>String((a.data.row||{}).EMPRESA||'').toLowerCase()===getName(p).toLowerCase()).length} atividades</div></div></div>`).join('')}</div></div>`;c.querySelectorAll('[data-project]').forEach(el=>el.onclick=()=>{projectId=el.dataset.project;selectedActivity=null;render()});return}if(selectedActivity){c.innerHTML=activityDetail(selectedActivity,detailMode);wireDetail();return}let acts=dateActivities(projectActivities());let counts=Object.fromEntries(statuses.map(s=>[s,acts.filter(a=>normStatus(a.data.status)===s).length]));c.innerHTML=`<div class="home-filters"><div class="date-buttons"><button class="${dateFilter==='today'?'active':''}" data-datefilter="today">Hoje</button><button class="${dateFilter==='other'?'active':''}" data-datefilter="other">Outro dia</button><button class="${dateFilter==='all'?'active':''}" data-datefilter="all">Total geral</button>${dateFilter==='other'?funnelIcon:''}<input type="date" id="otherDate" value="${esc(selectedDate)}" class="${dateFilter==='other'?'':'hidden'}" aria-label="Escolher data"></div></div><div class="stats">${statuses.map(s=>`<button type="button" class="stat stat-clickable ${filterOwner==='status'&&filterStatus===s?'selected':''}" data-statusfilter="${esc(s)}" aria-pressed="${filterOwner==='status'&&filterStatus===s}">${filterOwner==='status'&&filterStatus===s?`<svg class="stat-filter-watermark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5z"/></svg>`:""}<div class="stat-emoji">${({'Pendente':'⏳','Em andamento':'📋','Migrada':'✅','Quebra':'⚠️'})[s] ? (()=>{const ic=({'Pendente':'⏳','Em andamento':'📋','Migrada':'✅','Quebra':'⚠️'})[s];return `<span class="e s" aria-hidden="true">${ic}</span><span class="e h" aria-hidden="true">${ic}</span><span class="fc" aria-hidden="true"><span class="e f">${ic}</span></span><span class="e d" aria-hidden="true">${ic}</span><span class="gl" aria-hidden="true"></span>`})() : ''}</div><span>${s==='Migrada'?'Migradas':s==='Pendente'?'Pendentes (projeto)':s==='Quebra'?'Quebradas':s}</span><b>${counts[s]}</b></button>`).join('')}<section class="custom-filter-card ${filterOwner==='custom' ? 'selected' : ''}"><h3>🔎 Filtragem customizada ${filterOwner==='custom'?`<svg class="custom-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5z"/></svg>`:""}</h3><div class="custom-filter-fields"><label>Analista<input id="customAnalyst" list="customAnalystNames" placeholder="Todos os analistas" value="${esc(customAnalyst)}"><datalist id="customAnalystNames">${[...new Set(projectActivities().map(a=>canonicalAnalystName(a.data.analystName)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist></label><label>Status<select id="customStatus">${[['Todos','Todos os status'],['Pendente','Pendente'],['Em andamento','Em andamento'],['Contatando técnico','Contatando técnico'],['Iniciando configuração','Iniciando configuração'],['Finalizando configuração','Finalizando configuração'],['Aguardando cliente config Fortinet','Aguardando cliente config Fortinet'],['Organização de Rack e equipamentos','Organização de Rack e equipamentos'],['Migrada','Migradas'],['Quebra','Quebradas']].map(([v,t])=>`<option value="${esc(v)}" ${customStatus===v?'selected':''}>${t}</option>`).join('')}</select></label><button id="clearCustomFilter" class="secondary" type="button">Limpar</button></div><div class="small muted" id="customFilterCount"></div></section></div><div class="substats"><span>Contatando técnico: <b>${acts.filter(a=>a.data.status==='Contatando técnico').length}</b></span><span>Iniciando configuração: <b>${acts.filter(a=>a.data.status==='Iniciando configuração').length}</b></span><span>Finalizando configuração: <b>${acts.filter(a=>a.data.status==='Finalizando configuração').length}</b></span></div><section class="search-section"><div class="report-search-heading"><h3>Buscar atividade</h3><div class="report-heading-actions"><button type="button" class="report-trigger ranking-trigger ${rankingOpen?'active':''}" id="toggleActivityRanking" aria-controls="activityRanking" aria-expanded="${rankingOpen}" title="Mostrar ranking de analistas"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8v6a4 4 0 0 1-8 0V3Z"/><path d="M8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v4m-4 4h8m-4-4v4"/></svg><span>Ranking</span></button><button type="button" class="report-trigger" id="openActivityReport" title="Escolher colunas e exportar relatório"><svg class="report-sheet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 2.5h10l4 4V21H5z"/><path d="M15 2.5V7h4M8 11h8M8 15h8M11 9v10"/></svg><span>Extrair relatório</span></button></div></div><section id="activityRanking" class="activity-ranking" aria-label="Ranking dos analistas" ${rankingOpen?'':'hidden'}></section><input id="searchActivity" value="${esc(localStorage.getItem('gi_search_'+(projectId||''))||'')}" placeholder="Buscar por ID, ID do link ou ID do VGR" style="width:100%;margin-bottom:12px"><div class="small muted" id="activityHint" aria-live="polite">Minhas atividades em andamento:</div><div id="activityList"></div></section>`;c.querySelectorAll('[data-datefilter]').forEach(b=>b.onclick=()=>{dateFilter=b.dataset.datefilter;filterOwner='none';filterStatus='Todos';customAnalyst='';customStatus='Todos';localStorage.removeItem('gi_search_'+(projectId||''));render()});$('#otherDate').onchange=e=>{selectedDate=e.target.value||new Date().toISOString().slice(0,10);dateFilter='other';filterOwner='none';filterStatus='Todos';customAnalyst='';customStatus='Todos';localStorage.removeItem('gi_search_'+(projectId||''));render()};c.querySelectorAll('[data-statusfilter]').forEach(b=>b.onclick=()=>{filterStatus=filterOwner==='status'&&filterStatus===b.dataset.statusfilter?'Todos':b.dataset.statusfilter;filterOwner=filterStatus==='Todos'?'none':'status';customAnalyst='';customStatus='Todos';localStorage.removeItem('gi_search_'+(projectId||''));render()});$('#customAnalyst').oninput=()=>{customAnalyst=$('#customAnalyst').value.trim();applyCustomFilterSelection()};$('#customStatus').onchange=()=>{customStatus=$('#customStatus').value;applyCustomFilterSelection()};$('#clearCustomFilter').onclick=()=>{customAnalyst='';customStatus='Todos';$('#customAnalyst').value='';$('#customStatus').value='Todos';filterOwner='none';updateFilterIndicators();renderActivityList()};$('#openActivityReport').onclick=openActivityReport;$('#toggleActivityRanking').onclick=()=>{rankingOpen=!rankingOpen;const button=$('#toggleActivityRanking'),panel=$('#activityRanking');button.classList.toggle('active',rankingOpen);button.setAttribute('aria-expanded',String(rankingOpen));panel.hidden=!rankingOpen;if(rankingOpen)renderActivityRanking()};$('#searchActivity').oninput=()=>{localStorage.setItem('gi_search_'+(projectId||''),$('#searchActivity').value);renderActivityList()};renderActivityList();if(rankingOpen)renderActivityRanking()}function elapsed(start){if(!start)return '';let sec=Math.max(0,Math.floor((Date.now()-new Date(start).getTime())/1000));if(!Number.isFinite(sec))return '';let h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),ss=sec%60;const time=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;return h>=24?`${new Date(start).toLocaleDateString('pt-BR')} · ${time}`:time}
function adoptActivity(id){let a=arr('activities').find(x=>x.id===id);if(!a)return;let d=a.data;if(d.analystName&&!GICloud.userOwnsActivity(a)){toast('Atividade já atribuída a '+firstName(d.analystName));return}d.analystName=currentUser();d.analystId=currentUser();d.status='Contatando técnico';d.startAt=d.startAt||new Date().toISOString();d.endAt=null;recordActivityHistory(a,d.status,'Atividade adotada');log('Atividade adotada',activityName(a),a.id);save();toast('Atividade adotada por '+firstName(currentUser()));selectedActivity=id;detailMode='view';render()}
function abandonActivity(id){
 const a=arr('activities').find(x=>x.id===id);
 if(!a||!GICloud.userOwnsActivity(a))return;
 const existing=document.querySelector('#activityObservations');
 const previous=existing?existing.value:(a.data.observations||'');
 const overlay=document.createElement('div');overlay.className='activity-modal-overlay';
 overlay.innerHTML=`<div class="activity-modal" role="dialog" aria-modal="true" aria-labelledby="abandonTitle"><h3 id="abandonTitle">Abandonar atividade</h3><p class="muted">Registre as observações sobre o abandono. O histórico será preservado.</p><label for="abandonNotes">Observações</label><textarea id="abandonNotes" rows="7" placeholder="Descreva o motivo e os detalhes do abandono..."></textarea><div class="stamp-actions"><button class="secondary" id="cancelAbandon">Cancelar</button><button class="danger" id="confirmAbandon">Confirmar abandono</button></div></div>`;
 document.body.appendChild(overlay);
 overlay.querySelector('#abandonNotes').value=previous;
 overlay.querySelector('#abandonNotes').focus();
 overlay.querySelector('#cancelAbandon').onclick=()=>overlay.remove();
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
 overlay.querySelector('#confirmAbandon').onclick=()=>{
  a.data.observations=overlay.querySelector('#abandonNotes').value;
  a.data.abandonNotes=a.data.observations;
  recordActivityHistory(a,'Abandonada',a.data.abandonNotes);a.data.status='Pendente';a.data.analystName=null;a.data.analystId=null;a.data.startAt=null;a.data.endAt=null;
  log('Atividade abandonada',activityName(a)+(a.data.abandonNotes?' · Observações: '+a.data.abandonNotes:''),a.id);
  save();overlay.remove();selectedActivity=null;detailMode='view';toast('Atividade abandonada');render();
 };
}
function stampValue(a,keys){
 const row=a.data.row||{},ed=a.data.ed||{};
 const all={...row,...ed};
 for(const key of keys){const normalized=String(key).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const found=Object.keys(all).find(k=>k.toUpperCase().replace(/[^A-Z0-9]/g,'')===normalized);
  if(found&&String(all[found]??'').trim())return String(all[found]).trim();
 }
 return '—';
}
function makeActivityStamp(a,type){
 const v=(...keys)=>stampValue(a,keys), id=activityName(a), operator=v('OPERADORA'), product=v('PRODUTO'),
 dedicated=v('ID DEDICADO','ID INTERNET','ID LINK'), lp=v('LP'), speed=v('VELOCIDADE DO LINK','VELOCIDADE'),
 net=v('NETWORK','REDE'), serial=v('SERIAL MX','SERIAL NUMBER','SERIAL','NUMERO DE SERIE','NÚMERO DE SÉRIE'),
 ip=calculateMxIp(v('IP LINK'))||v('IP LAN MERAKI','IP MX'), service=v('TIPO DE ATENDIMENTO'), repair=v('REPARO');
 const link=`ID VGR - ${id}\nLink 1: ${operator}\nTIPO: ${product}\nID: ${dedicated}\nLP: ${lp}\nVEL: ${speed}${/\b(MB|GB|KB)\b|MBPS|GBPS/i.test(speed)?'':' MB'}`;
 if(type==='meraki')return `${link}\nReparo : ${repair}`;
 return `Segue para validação,\n\nObs. A solução foi entregue com licença Trial, a licença definitiva será ativa em breve, a informação foi passada ao time do NOC, Sr. Eduardo Vital Barbosa está ciente do tema.\n\nTrata-se de solução Cisco Meraki: SITE SPOKE\n\nCliente: ${getName(project())==='COPASA'?'COPASA - Companhia de Saneamento de Minas Gerais':getName(project())}\n\nORGANIZAÇÃO MERAKI: SDWAN - ${getName(project()).toUpperCase()}\nNETWORK: ${net}\nSerial number: ${serial}\n\nINFORMAÇÕES DO LINK:\n${link}\nTIPO DE ATENDIMENTO: ${service}\nIP MX: ${ip}`;
}
async function copyActivityStamp(a,type){
 if(!GICloud.userOwnsActivity(a))return toast('Apenas o responsável pode gerar carimbos');
 // Inclui alterações ainda em edição antes de montar o carimbo.
 document.querySelectorAll('[data-edit]').forEach(el=>{a.data.ed=a.data.ed||{};a.data.ed[el.dataset.edit]=el.value});
 const txt=makeActivityStamp(a,type);
 try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(txt)}else{const el=document.createElement('textarea');el.value=txt;el.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(el);el.select();if(!document.execCommand('copy'))throw Error('Cópia indisponível');el.remove()}
 save();toast('Carimbo '+(type==='sae'?'SAE':'Meraki')+' copiado!');
 }catch(e){const modal=document.createElement('div');modal.className='activity-modal-overlay';modal.innerHTML='<div class="activity-modal"><h3>Carimbo gerado</h3><p>Selecione o texto e copie com Ctrl+C.</p><textarea id="stampFallback" rows="14" readonly></textarea><div class="stamp-actions"><button id="stampClose">Fechar</button></div></div>';document.body.appendChild(modal);modal.querySelector('#stampFallback').value=txt;modal.querySelector('#stampFallback').select();modal.querySelector('#stampClose').onclick=()=>modal.remove()}
}
function updateFilterIndicators(){document.querySelectorAll('[data-statusfilter]').forEach(b=>{let active=filterOwner==='status'&&filterStatus===b.dataset.statusfilter;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));let icon=b.querySelector('.stat-filter-watermark');if(icon)icon.remove();if(active)b.insertAdjacentHTML('afterbegin',`<svg class="stat-filter-watermark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5z"/></svg>`)});{const card=document.querySelector('.custom-filter-card');if(card){const active=filterOwner==='custom';card.classList.toggle('selected',active);card.querySelector('.custom-filter-icon')?.remove();if(active)card.querySelector('h3')?.insertAdjacentHTML('beforeend',`<svg class="custom-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5z"/></svg>`);}}}function renderActivityList(){let input=$('#searchActivity');if(!input)return;let q=input.value.trim().toLowerCase();localStorage.setItem('gi_search_'+(projectId||''),input.value);let list=$('#activityList');let projectActs=projectActivities(),all=dateActivities(projectActs);let mine=projectActs.filter(a=>GICloud.userOwnsActivity(a)&&!a.data.endAt&&!['Migrada','Quebra'].includes(normStatus(a.data.status)));let found=q?projectActs.filter(a=>{let r=a.data.row||{};return Object.values(r).some(v=>String(v||'').toLowerCase().includes(q))||activityName(a).toLowerCase().includes(q)}):[];let customOn=filterOwner==='custom'&&(!!customAnalyst||customStatus!=='Todos');let acts=q?found:(customOn?projectActs:(filterOwner==='status'&&filterStatus!=='Todos'?all.filter(a=>normStatus(a.data.status)===filterStatus):dateFilter==='all'?all:all.filter(a=>normStatus(a.data.status)!=='Pendente')));if(customOn&&!q){acts=acts.filter(a=>(!customAnalyst||canonicalAnalystName(a.data.analystName).toLocaleLowerCase('pt-BR').includes(canonicalAnalystName(customAnalyst).toLocaleLowerCase('pt-BR')))&&(customStatus==='Todos'||(customStatus==='Em andamento'?normStatus(a.data.status)==='Em andamento':customStatus===a.data.status||normStatus(a.data.status)===customStatus)));}acts=newestActivities(acts);$('#customFilterCount').textContent=customOn?`${acts.length} atividade(s) encontrada(s) na filtragem customizada.`:'';$('#activityHint').textContent=q?'Resultados da busca (todas as datas e status):':customOn?`Resultados da filtragem customizada: ${acts.length} atividade(s)`:(filterOwner==='status'&&filterStatus!=='Todos'?'Atividades filtradas por status:':dateFilter==='all'?'Todas as atividades do projeto (mais recentes primeiro):':'Atividades da data selecionada:');list.innerHTML=acts.slice(0,homeListLimit).map(a=>{let r=a.data.row||{},d=a.data,st=d.status||'Pendente',adopted=!!d.analystName;return `<div class="activity-line" data-view="${esc(a.id)}" tabindex="0" role="button"><div class="activity-main"><b>${esc(activityName(a))}</b><div class="small muted">${esc(r['ENDEREÇO COMPLETO']||r.HOSTNAME||r.EMPRESA||'Atividade')}</div></div><div class="activity-meta"><span class="activity-completion-date">${esc(completionLabel(a))}</span>${adopted?`${runningActivityTime(a)?`<span class="elapsed" data-start="${esc(d.startAt)}">◴ ${runningActivityTime(a)}</span>`:'<span class="elapsed"></span>'}<span class="owner" title="${esc(canonicalAnalystName(d.analystName))}">${esc(analystListName(d.analystName))}</span>`:`<span class="elapsed"></span><span class="owner" title="${esc(d.analystName||'')}">${esc(d.analystName||'')}</span>`}</div><span class="status ${esc(normStatus(st))}">${esc(st)}</span>${adopted&&!GICloud.userOwnsActivity(a)?'<button class="secondary" disabled>Adotada</button>':`<button data-adopt="${esc(a.id)}">${adopted?'Abrir atividade':'Adotar'}</button>`}</div>`}).join('')+(acts.length>homeListLimit?`<div class="activity-show-more"><span>${homeListLimit} de ${acts.length} atividades</span><button type="button" id="loadMoreActivities" class="secondary">Mostrar mais atividades</button></div>`:'')||'<div class="empty">Nenhuma atividade encontrada.</div>';list.querySelector('#loadMoreActivities')?.addEventListener('click',()=>{homeListLimit+=200;renderActivityList()});list.querySelectorAll('[data-view]').forEach(el=>{el.onclick=e=>{if(e.target.closest('button'))return;selectedActivity=el.dataset.view;detailMode='view';render()};el.onkeydown=e=>{if(e.key==='Enter'){selectedActivity=el.dataset.view;detailMode='view';render()}}});list.querySelectorAll('[data-adopt]').forEach(b=>b.onclick=e=>{e.stopPropagation();let a=arr('activities').find(x=>x.id===b.dataset.adopt);if(a&&GICloud.userOwnsActivity(a)){selectedActivity=a.id;detailMode='view';render()}else adoptActivity(b.dataset.adopt)})}
function calculateMxIp(value){
 const match=String(value||'').trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(31|30)$/);
 if(!match)return '';
 const octets=match.slice(1,5).map(Number);if(octets.some(x=>x>255))return '';
 const ip=octets.reduce((n,x)=>((n<<8)>>>0)|x,0)>>>0;
 // /31: alterna o último bit para obter o outro endereço válido do par.
 // /30: segue a regra operacional solicitada: IP Link + 1.
 const next=match[5]==='31'?(ip^1)>>>0:(ip+1)>>>0;
 return [24,16,8,0].map(shift=>(next>>>shift)&255).join('.');
}
function activityDetail(id,mode='view',adminMode=false){
 let a=arr('activities').find(x=>x.id===id);if(!a)return'';
 let d=a.data,r=d.row||{},ed=d.ed||{};
 const extraDefinitions=(project()?.data?.extraFields||[]).map(x=>typeof x==='string'?{name:x,section:'Outras informações'}:x).filter(x=>x&&x.name);
 const extraNames=new Map(extraDefinitions.map(f=>[importColumnKey(f.name),f.name]));
 const removedFields=new Set((project()?.data?.removedProjectFields||[]).map(x=>importColumnKey(x)));const keys=[...new Set([...Object.keys(r),...extraDefinitions.map(x=>x.name),'MUNICIPIO','LP','IP LINK','SERIAL MX','TIPO DE ATENDIMENTO','REPARO','NOME DO TÉCNICO','TELEFONE DO TÉCNICO','NOME DO RESPONSÁVEL NO LOCAL','TELEFONE DO RESPONSÁVEL'].map(k=>extraNames.get(importColumnKey(k))||k))].filter(k=>String(k).trim()&&!/^(_status|_analista|_motivo)$/i.test(k)&&!removedFields.has(importColumnKey(k)));
 const val=k=>{if(ed[k]!==undefined)return ed[k];if(r[k]!==undefined)return r[k];const original=Object.keys({...r,...ed}).find(name=>importColumnKey(name)===importColumnKey(k));return original?(ed[original]??r[original]??''):''};
 const canEdit=adminMode||GICloud.userOwnsActivity(a);
 const field=k=>`<div class="field"><label>${esc(k==='REPARO'?'REPARO (TIKET NOC - SAE)':k)}</label><input data-edit="${esc(k)}" value="${esc(val(k))}" ${k==='IP LINK'?'inputmode="decimal" placeholder="0.0.0.0/0" pattern="[0-9./]*"':''} ${canEdit?'':'readonly'}></div>`;
 const groups=[
 ['Equipamento',keys.filter(k=>k==='REPARO'||(k!=='IP LINK'&& !/velocidade/i.test(k)&&k!=='TIPO DE ATENDIMENTO'&&/equip|modelo|serial|qtd|quantidade|lote|host|network|rede|ip/i.test(k)))],
 ['Link',keys.filter(k=>k==='TIPO DE ATENDIMENTO'||(k!=='ID VGR'&&/dedicado|internet|\blp\b|velocidade|produto|meio|operadora|link/i.test(k)))],
 ['Localização',keys.filter(k=>/endere|munic|cidade|coord|uf|cep/i.test(k)&&!/velocidade/i.test(k))],
 ['Outras informações',keys.filter(k=>k!=='ID VGR'&&!/equip|modelo|serial|qtd|quantidade|lote|host|network|rede|ip|dedicado|internet|\blp\b|velocidade|produto|meio|operadora|link|endere|munic|cidade|coord|uf|cep|^(TIPO DE ATENDIMENTO|REPARO)$/i.test(k))]
 ];
 // Unidade e rede de clonagem pertencem à seção Equipamento, ao lado de NETWORK.
 const equipmentMove=['UNIDADE','NET WORK PARA CLONAR','NETWORK PARA CLONAR'];
 for(const g of groups)g[1]=g[1].filter(k=>!equipmentMove.includes(k.toUpperCase().trim()));
 const networkPosition=groups[0][1].findIndex(k=>k.toUpperCase().trim()==='NETWORK');
 const moved=keys.filter(k=>equipmentMove.includes(k.toUpperCase().trim()));
 groups[0][1].splice(networkPosition<0?groups[0][1].length:networkPosition+1,0,...moved);
 for(const x of extraDefinitions){for(const g of groups)g[1]=g[1].filter(k=>k!==x.name);let dest=groups.find(g=>g[0]===x.section)||groups[3];if(/velocidade do link/i.test(x.name))dest=groups[1];dest[1].push(x.name)}
 for(const g of groups)g[1]=g[1].filter(k=>!equipmentMove.includes(k.toUpperCase().trim()));groups[0][1].splice(groups[0][1].findIndex(k=>k.toUpperCase().trim()==='NETWORK')+1,0,...moved);
 const assignedFields=new Set();for(const g of [groups[1],groups[0],groups[2],groups[3]])g[1]=g[1].filter(k=>{if(assignedFields.has(k))return false;assignedFields.add(k);return true});
 // Apresentação unificada sem alterar as chaves de dados nem o cadastro de campos.
 groups[2][0]='Localização / Unidade';
 groups[2][1].push(...groups[3][1]);
 // Os quatro contatos ficam juntos na última linha da grade.
 const contactFields=['NOME DO TÉCNICO','TELEFONE DO TÉCNICO','NOME DO RESPONSÁVEL NO LOCAL','TELEFONE DO RESPONSÁVEL'];
 groups[2][1]=[...groups[2][1].filter(k=>!contactFields.includes(k)),...contactFields.filter(k=>groups[2][1].includes(k))];
 groups.splice(3,1);
 for(const section of (project()?.data?.extraSections||[])){if(!groups.some(g=>g[0]===section))groups.push([section,extraDefinitions.filter(f=>f.section===section).map(f=>f.name)])}
 const visibleGroups=groups.filter(g=>g[1].length&&!(project()?.data?.removedDefaultSections||[]).includes(g[0]));
 const finalStatus=['Migrada','Quebra'].includes(d.status);
 const activityStatusOptions=[...(d.status==='Pendente'?['Pendente']:[]),'Contatando técnico','Iniciando configuração','Finalizando configuração','Aguardando cliente config Fortinet','Organização de Rack e equipamentos','Migrada','Quebra'];
 if(d.status&&!activityStatusOptions.includes(d.status))activityStatusOptions.unshift(d.status);
 return `<div class="activity-detail-screen"><div class="detailhead detail-toolbar"><button class="secondary" id="closeDetail">← ${adminMode?'Voltar à lista':'Voltar à busca'}</button><div class="admin-detail-toolbar-right"><span class="status ${esc(normStatus(d.status))}">${esc(d.status||'Pendente')}</span>${adminMode?`<button type="button" class="danger-project admin-delete-activity" id="adminDeleteActivity">Excluir atividade</button>`:''}</div></div>
 <section class="activity-summary"><div class="eyebrow">ID VGR</div><h2>${esc(activityName(a))}</h2><p class="muted">Analista: ${esc(canonicalAnalystName(d.analystName)||'—')}${normStatus(d.status)==='Em andamento'?` · Data: ${esc(d.startAt?new Date(d.startAt).toLocaleDateString('pt-BR'):'—')} · Início: ${esc(d.startAt?new Date(d.startAt).toLocaleTimeString('pt-BR'):'—')} · Tempo: ${esc(runningActivityTime(a)||'—')}`:completionLabel(a)?` · ${esc(completionLabel(a))}`:''}</p>
 <div class="activity-summary-layout"><div class="activity-summary-controls"><div class="field"><label>Status da atividade</label><select id="activityStatus" ${canEdit?'':'disabled'}>${activityStatusOptions.map(st=>`<option ${d.status===st?'selected':''} ${st==='Pendente'?'disabled':''}>${st}</option>`).join('')}</select></div>
 <div class="field activity-observations ${finalStatus?'':'hidden'}" id="activityObservationsWrap"><label for="activityObservations">Observações da atividade</label><textarea id="activityObservations" rows="3" placeholder="Registre observações, detalhes da migração ou motivo da quebra..." ${canEdit?'':'readonly'}>${esc(d.observations||'')}</textarea><span class="small muted">Campo para textos longos. Salvamento automático.</span></div>
 <div class="filters">${adminMode?'':(!d.analystName?`<button id="adoptActivity">Adotar atividade</button>`:canEdit&&!d.endAt?`<button class="danger" id="abandonActivity">Abandonar atividade</button>`:"")}</div></div>
 <div class="activity-history"><h3>Histórico</h3><div class="activity-history-list">${(d.history||[]).map((h,i)=>({...h,originalIndex:i})).filter(h=>['Migrada','Quebra','Abandonada'].includes(h.status)).map(h=>`<button type="button" class="history-link" data-history="${h.originalIndex}">${esc(new Date(h.at).toLocaleString('pt-BR'))} · ${esc(h.analyst||'—')} · ${esc(h.status||'—')}</button>`).join('')||'<span class="small muted">Nenhuma conclusão registrada nesta atividade.</span>'}</div></div>
 ${canEdit&&!adminMode?`<div class="stamp-panel"><div class="stamp-panel-heading"><span>Carimbos</span></div><div class="stamp-actions"><button class="stamp-logo-btn" id="generateSaeStamp" title="Gerar carimbo SAE" aria-label="Gerar carimbo SAE"><img src="sae-button.png" alt="SAE"></button><button class="stamp-logo-btn" id="generateMerakiStamp" title="Gerar carimbo Meraki" aria-label="Gerar carimbo Meraki"><img src="meraki-button.png" alt="Cisco Meraki"></button></div></div>`:adminMode?'':'<p class="small muted">Somente o analista responsável pode editar esta atividade.</p>'}</div>

 <p class="small muted">${adminMode?'Alterações administrativas são salvas automaticamente e registradas no log.':'Alterações são salvas automaticamente neste navegador. Os carimbos são copiados para a área de transferência.'}</p></section>
 ${visibleGroups.map(g=>`<section class="info-section"><h3 class="floating-title">${esc(g[0])}</h3><div class="info-grid">${g[0]==='Localização / Unidade'?`<div class="location-main-fields">${g[1].filter(k=>!contactFields.includes(k)).map(field).join('')}</div><div class="location-contact-fields">${contactFields.filter(k=>g[1].includes(k)).map(field).join('')}</div>`:g[1].map(field).join('')}</div></section>`).join('')}</div>`;
}
function wireDetail(){
 if(!$('.activity-detail-screen'))return;
 $('#closeDetail').onclick=()=>{selectedActivity=null;detailMode='view';render()};
 if($('#adoptActivity'))$('#adoptActivity').onclick=()=>adoptActivity(selectedActivity);
 if($('#abandonActivity'))$('#abandonActivity').onclick=()=>abandonActivity(selectedActivity);
 const a=arr('activities').find(x=>x.id===selectedActivity);if(!a)return;
 const persist=()=>{
  if(!GICloud.userOwnsActivity(a))return;
  if(!a.data.ed)a.data.ed={};
  document.querySelectorAll('[data-edit]').forEach(el=>a.data.ed[el.dataset.edit]=el.value);
  const notes=$('#activityObservations');if(notes){a.data.observations=notes.value;const history=a.data.history||[];const last=history[history.length-1];if(last&&['Migrada','Quebra'].includes(last.status)&&last.status===a.data.status&&last.analyst===currentUser())last.notes=notes.value;}
  save();
 };
 document.querySelectorAll('[data-edit]').forEach(el=>{
  if(el.dataset.edit==='IP LINK')el.addEventListener('input',()=>{el.value=el.value.replace(/[^0-9./]/g,'')});
  el.addEventListener('change',persist);
 });
 $('#activityObservations')?.addEventListener('input',persist);
 $('#activityStatus')?.addEventListener('change',()=>{
  if(!GICloud.userOwnsActivity(a))return;
  persist();const next=$('#activityStatus').value,prev=a.data.status;
  a.data.status=next;
  if(['Migrada','Quebra'].includes(next)&&!a.data.endAt)a.data.endAt=new Date().toISOString();
  if(!['Migrada','Quebra'].includes(next)&&['Migrada','Quebra'].includes(prev))a.data.endAt=null;
  recordActivityHistory(a,next,a.data.observations||'');save();log('Status atualizado',next,a.id);toast('Status salvo automaticamente');render();
 });
 document.querySelectorAll('[data-history]').forEach(btn=>btn.addEventListener('click',()=>{const h=(a.data.history||[])[Number(btn.dataset.history)];if(!h)return;const overlay=document.createElement('div');overlay.className='history-overlay';overlay.innerHTML=`<div class="history-dialog" role="dialog" aria-modal="true"><h2>Histórico da atividade</h2><p>${esc(new Date(h.at).toLocaleString('pt-BR'))} · ${esc(h.analyst)} · ${esc(h.status)}</p><label>Observações registradas</label><div class="history-notes">${esc(h.notes||'Nenhuma observação registrada nesta movimentação.')}</div><button type="button" class="secondary" id="closeHistory">Fechar</button></div>`;document.body.appendChild(overlay);overlay.querySelector('#closeHistory').onclick=()=>overlay.remove();overlay.onclick=e=>{if(e.target===overlay)overlay.remove()}}));
 $('#generateSaeStamp')?.addEventListener('click',()=>copyActivityStamp(a,'sae'));
 $('#generateMerakiStamp')?.addEventListener('click',()=>copyActivityStamp(a,'meraki'));
}
function renderRunbook(){let acts=projectActivities();$('#appContent').innerHTML=`<section class="runbook-search"><h3>Buscar atividade</h3><input id="rbSearch" placeholder="Buscar por ID, ID do link ou ID do VGR" style="width:100%"></section><div id="rbList"></div>`;function list(){let query=$('#rbSearch').value.trim().toLowerCase();let found=query?acts.filter(a=>{let r=a.data.row||{};return [r['ID'],r['ID VGR'],r['ID DEDICADO'],r['ID INTERNET'],r.HOSTNAME,r['ENDEREÇO COMPLETO']].some(v=>String(v||'').toLowerCase().includes(query))}):[];$('#rbList').innerHTML=found.slice(0,100).map(a=>{let r=a.data.row||{},d=a.data;return `<div class="runbook-line" data-rb-row="${esc(a.id)}" tabindex="0" role="button"><div><b>${esc(activityName(a))}</b><span>${esc(r['ENDEREÇO COMPLETO']||r.HOSTNAME||'')}</span></div><div class="runbook-actions">${d.analystName?`<span class="status ${esc(normStatus(d.status))}">${esc(analystListName(d.analystName))}${runningActivityTime(a)?` · ${runningActivityTime(a)}`:completionLabel(a)?` · ${esc(completionLabel(a))}`:''}</span>`:`<span class="status Pendente">Pendente</span>`}${GICloud.userOwnsActivity(a)?`<button data-rb="${esc(a.id)}">Realizar runbook</button>`:''}</div></div>`}).join('')||'<div class="empty">Nenhuma atividade encontrada.</div>';$('#rbList').querySelectorAll('[data-rb-row]').forEach(row=>{row.onclick=e=>{if(e.target.closest('[data-rb]'))return;openRunbook(row.dataset.rbRow)};row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openRunbook(row.dataset.rbRow)}}});$('#rbList').querySelectorAll('[data-rb]').forEach(b=>b.onclick=()=>{let a=arr('activities').find(x=>x.id===b.dataset.rb);if(a&&!a.data.analystName&&!arr('runbooks').some(r=>r.data.activityId===a.id&&r.data.by&&String(r.data.by).toLocaleLowerCase('pt-BR')!==String(currentUser()).toLocaleLowerCase('pt-BR'))){a.data.analystName=currentUser();a.data.analystId=currentUser();a.data.status='Contatando técnico';a.data.startAt=new Date().toISOString();a.data.endAt=null;log('Atividade adotada',activityName(a),a.id);save()}openRunbook(b.dataset.rb)})}$('#rbSearch').oninput=list;list()}async function openRunbook(id){
 let a=arr('activities').find(x=>x.id===id);if(!a)return;
 let r=a.data.row||{},existing=arr('runbooks').find(x=>x.data.activityId===id),slots=existing?.data.slots||[];
 const readOnly=!GICloud.userOwnsActivity(a)&&(!isAdmin()||!!a.data.analystName);
 const configuredRunbook=project()?.data.runbookModel;
 const sections=configuredRunbook?.sections?.length?configuredRunbook.sections:[
  {id:'copasa-evidence',title:'Registro de evidências pós atividade (Meraki)',kind:'evidence',items:[
   {title:'Evidência 01 – Network',description:'Em → Network-Wide → Clients (Logs de conexão dos Clients Ativos)'},
   {title:'Evidência 02 – Firewall Meraki MX',description:'Em → Security & SD-WAN → Appliance Status → Summary (Log de status do appliance / conexão de uplink)'},
   {title:'Evidência 03 – Firewall Meraki MX',description:'Em → Security & SD-WAN → VPN Status (VPNs / conectividade)'},
   {title:'Evidência 04 – Firewall Meraki MX',description:'Em → Security & SD-WAN → Appliance Status → Tools (Teste de ping / conectividade)'},
   {title:'Evidência 05 – Ping 8.8.8.8',description:'Em → Security & SD-WAN → Appliance Status → Tools (Teste de ping 8.8.8.8)'},
   {title:'Evidência 06 – Speedtest',description:'Teste de download / upload em https://www.speedtest.net/'}]},
  {id:'copasa-photos',title:'Evidências do local',kind:'photos',items:[{title:'Rack',description:''},{title:'Meraki',description:''}]}
 ];
 const flattened=sections.flatMap(section=>section.items.map(item=>({item,section})));
 const items=flattened.map(({item})=>[item.title,item.description||'']);
 let images=Array.isArray(existing?.data.images)?[...existing.data.images]:[];
 const imageStorageKey=existing?.data?.imageStorageKey||`runbook-imagens:${projectId||'projeto'}:${id}`;
 if(existing?.data?.imageStorageKey&&window.RunbookStorage){
  try{const fromDisk=await RunbookStorage.get(imageStorageKey);if(Array.isArray(fromDisk))images=fromDisk}
  catch(err){console.warn('Imagens do Runbook indisponíveis no IndexedDB',err)}
 }

 // Compatibilidade com runbooks antigos: Rack e Meraki eram os slots 4 e 5.
 if(!configuredRunbook && images.length<=6 && (images[4]||images[5]) && !images[6] && !images[7]){images[6]=images[4]||'';images[7]=images[5]||'';images[4]='';images[5]='';}
 if(!images.length&&existing?.data.evidence)images[0]=existing.data.evidence;
 // Associar imagens ao identificador de cada campo, mesmo se a planilha for reordenada.
 const slotKeys=flattened.map(({item})=>item.id||item.title);
 if(configuredRunbook && Array.isArray(existing?.data.slotKeys)){
   const previous=new Map(existing.data.slotKeys.map((key,i)=>[key,images[i]]));
   images=slotKeys.map(key=>previous.get(key)||'');
 }

 let imageWriteQueue=Promise.resolve();
 function persistRunbookImages(silent=false){
  const snapshot=[...images];
  imageWriteQueue=imageWriteQueue.catch(()=>{}).then(async()=>{
   if(!window.RunbookStorage)throw new Error('O armazenamento local de imagens não está disponível.');
   await RunbookStorage.put(imageStorageKey,snapshot);
   let run=arr('runbooks').find(x=>x.data.activityId===id);
   if(!run){run={id:'rb_'+Date.now(),data:{activityId:id,slots:[],by:currentUser(),startedAt:new Date().toISOString()}};DB.runbooks.push(run)}
   run.data.images=[];run.data.imageStorageKey=imageStorageKey;
   run.data.slotKeys=slotKeys;run.data.updatedAt=new Date().toISOString();
   save();if(!silent)toast('Alterações salvas ✅',3000);
  });
  return imageWriteQueue;
 }
 // As imagens foram fornecidas por usuários; nenhum HTML/URL arbitrário entra em atributos.
 images=images.map(src=>typeof src==='string'&&/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(src)?src:'');
 const imageCard=(item,i)=>`<div class="evidence-card">${item[2]?`<span class="evidence-group-label">${esc(item[2])}</span>`:''}<b>${esc(item[0])}</b>${item[1]?`<p class="muted"><i>${esc(item[1])}</i></p>`:''}<div class="evidence-drop ${readOnly?'evidence-readonly':''}" data-evidence="${i}" ${readOnly?'':'tabindex="0" role="button"'} aria-label="${readOnly?'Visualizar':'Adicionar'} imagem: ${esc(item[0])}">${images[i]?`<img src="${images[i]}" alt="${esc(item[0])}">`:'<span class="evidence-placeholder">▧</span>'}${readOnly?'':`${images[i]?'<button type="button" class="evidence-remove" title="Remover imagem" aria-label="Remover imagem">×</button>':''}<span class="evidence-hint"><strong>+ ${images[i]?'Trocar':'Adicionar'} print</strong> ou cole com Ctrl+V / arraste aqui</span><input type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden>`}</div></div>`;
 $('#appContent').innerHTML=`<div class="runbook-detail"><button class="secondary" id="rbBack">← Voltar</button><div class="runbook-detail-heading"><div class="eyebrow">RUNBOOK · ID VGR</div><h2>${esc(activityName(a))}</h2><p>${esc(r['ENDEREÇO COMPLETO']||r.HOSTNAME||'')}</p><p class="muted">Iniciado por ${esc(firstName(a.data.analystName||currentUser()))} em ${esc(a.data.startAt?new Date(a.data.startAt).toLocaleString('pt-BR'):'—')}</p></div>${sections.map((section)=>`<section class="evidence-section" data-runbook-sheet="${esc(section.id)}"><h3 class="floating-title">${esc(section.title)}</h3><div class="evidence-stack evidence-grid-two">${section.items.map(item=>{const i=flattened.findIndex(x=>x.item===item);return imageCard([item.title,item.description||'',item.group||''],i)}).join('')}</div></section>`).join('')}${readOnly?'<p class="runbook-viewonly">Somente visualização — runbook pertencente a outro analista.</p>':'<div class="runbook-save-actions"><button id="saveRunbook">Salvar runbook</button><button id="generateRunbook">Gerar Runbook (Excel)</button></div>'}</div>`;
 document.onpaste=null;$('#rbBack').onclick=()=>{document.onpaste=null;render()};
 async function setImage(i,file){
  if(!file)return;
  try{
   await validateUpload(file,'image');
   const bitmap=await createImageBitmap(file);const pixels=bitmap.width*bitmap.height;bitmap.close();
   if(pixels>16000000)throw Error('Imagem excede 16 milhões de pixels.');
  }catch(err){toast('Imagem recusada: '+err.message);return}
  const reader=new FileReader();reader.onload=()=>{images[i]=reader.result;let drop=document.querySelector(`[data-evidence="${i}"]`);if(drop){let old=drop.querySelector('img');if(!old){old=document.createElement('img');drop.querySelector('.evidence-placeholder')?.remove();drop.prepend(old)}old.src=images[i];old.alt=items[i][0];if(!drop.querySelector('.evidence-remove'))old.insertAdjacentHTML('afterend','<button type="button" class="evidence-remove" title="Remover imagem" aria-label="Remover imagem">×</button>');drop.querySelector('.evidence-remove').onclick=e=>{e.stopPropagation();images[i]='';old.remove();drop.querySelector('.evidence-remove')?.remove();drop.insertAdjacentHTML('afterbegin','<span class="evidence-placeholder">▧</span>');drop.querySelector('.evidence-hint strong').textContent='+ Adicionar print';persistRunbookImages().catch(err=>toast('Falha ao salvar: '+err.message))};drop.querySelector('.evidence-hint strong').textContent='+ Trocar print'};persistRunbookImages().catch(err=>toast('Falha ao salvar imagem: '+err.message))};reader.readAsDataURL(file);
 }
 if(!readOnly)document.querySelectorAll('[data-evidence]').forEach(drop=>{let i=Number(drop.dataset.evidence),input=drop.querySelector('input');drop.addEventListener('click',e=>{if(e.target.closest('.evidence-remove'))return;drop.focus()});drop.addEventListener('dblclick',e=>{if(e.target.closest('.evidence-remove'))return;input.click()});drop.querySelector('.evidence-remove')?.addEventListener('click',e=>{e.stopPropagation();images[i]='';drop.querySelector('img')?.remove();drop.querySelector('.evidence-remove')?.remove();if(!drop.querySelector('.evidence-placeholder'))drop.insertAdjacentHTML('afterbegin','<span class="evidence-placeholder">▧</span>');drop.querySelector('.evidence-hint strong').textContent='+ Adicionar print';persistRunbookImages().catch(err=>toast('Falha ao salvar: '+err.message));});drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});input.onchange=()=>setImage(i,input.files[0]);drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragover')};drop.ondragleave=()=>drop.classList.remove('dragover');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragover');setImage(i,e.dataTransfer.files[0])}});
 if(!readOnly)document.onpaste=e=>{let item=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith('image/'));if(item){let active=document.activeElement?.closest?.('[data-evidence]');setImage(active?Number(active.dataset.evidence):0,item.getAsFile())}};
 if(!readOnly)$('#generateRunbook').onclick=async()=>{try{let run=arr('runbooks').find(x=>x.data.activityId===id);if(!run){run={id:'rb_'+Date.now(),data:{activityId:id,slots:[],by:currentUser(),startedAt:new Date().toISOString()}};DB.runbooks.push(run)}await persistRunbookImages(true);run.data.slotKeys=slotKeys;run.data.updatedAt=new Date().toISOString();save();if(configuredRunbook && (project()?.data.runbookStorageKey||project()?.data.runbookWorkbookBase64))await exportRunbookImported(a,images,project().data);else await exportCopasaRunbook(a,images);toast('Runbook Excel gerado com sucesso')}catch(err){console.error(err);toast('Falha ao gerar Excel: '+err.message)}};
 if(!readOnly)$('#saveRunbook').onclick=async()=>{try{let run=arr('runbooks').find(x=>x.data.activityId===id);if(!run){run={id:'rb_'+Date.now(),data:{activityId:id,slots:[],by:currentUser(),startedAt:new Date().toISOString()}};DB.runbooks.push(run)}await persistRunbookImages(true);run.data.slotKeys=slotKeys;run.data.evidence='';run.data.updatedAt=new Date().toISOString();log('Runbook salvo',activityName(a),id);save();toast('Runbook salvo')}catch(err){console.error(err);toast('Falha ao salvar Runbook: '+err.message)}};
}
// Catálogo único dos campos exibidos no projeto, inclusive campos padrão sem valores.
function allProjectFieldNames(p){
 const defaults=['MUNICIPIO','NETWORK','UNIDADE','NET WORK PARA CLONAR','HOSTNAME','QTD','EQUIPAMENTO','REDE LAN MERAKI','IP LAN MERAKI','LOTE','SERIAL MX','REPARO','ID VGR','ID DEDICADO','ID INTERNET','VELOCIDADE DO LINK','PRODUTO','MEIOS','OPERADORA','LP','IP LINK','TIPO DE ATENDIMENTO','ENDEREÇO COMPLETO','COORDENADAS GEOGRÁFICAS','ID','EMPRESA','UNIDADES COM FORTINET','NOME DO TÉCNICO','TELEFONE DO TÉCNICO','NOME DO RESPONSÁVEL NO LOCAL','TELEFONE DO RESPONSÁVEL'];
 const entries=[...defaults,...(p.data.activityTemplate||[]),...(p.data.extraFields||[]).map(x=>typeof x==='string'?x:x.name),...arr('activities').filter(a=>a.data.projectId===p.id).flatMap(a=>[...Object.keys(a.data.row||{}),...Object.keys(a.data.ed||{})])];
 const removed=new Set((p.data.removedProjectFields||[]).map(x=>String(x).trim().toLocaleLowerCase('pt-BR')));
 const seen=new Set();return entries.filter(x=>{if(typeof x!=='string'||!x.trim()||x.startsWith('_'))return false;const key=x.trim().toLocaleLowerCase('pt-BR');if(removed.has(key)||seen.has(key))return false;seen.add(key);return true});
}
// Importações por ID VGR: os nomes das colunas podem variar na ordem,
// acentuação, espaços e pontuação sem afetar a correspondência dos campos.
function importColumnKey(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g,'')}
function importVgrKey(value){return String(value??'').trim().replace(/\s+/g,'').replace(/^(\d+)\.0+$/,'$1').toLocaleLowerCase('pt-BR')}
function importVgrHeader(headers){return headers.find(h=>['idvgr','vgr','codigovgr','numerovgr','nrovgr'].includes(importColumnKey(h)))}
function activityVgrKey(a){const values=[a.data?.ed||{},a.data?.row||{}];for(const object of values){const key=Object.keys(object).find(k=>['idvgr','vgr','codigovgr','numerovgr','nrovgr'].includes(importColumnKey(k))&&importVgrKey(object[k]));if(key)return importVgrKey(object[key])}return ''}
// Nomes equivalentes do diário de bordo e dos formulários cadastrados no projeto.
// Campos personalizados (como Parceiro) têm prioridade sobre o nome original da coluna.
const importFieldAliases={
 tktnoc:'reparo',ticketnoc:'reparo',ticketdonoc:'reparo',tikietnoc:'reparo',
 serialnumber:'serialmx',serialnumberequipamento:'serialmx',
 modeloequipamento:'equipamento',velocidade:'velocidadedolink',velocidadelink:'velocidadedolink',
 ipdedicado:'iddedicado',enderecodeinstalacaobaseprevendas:'enderecocompleto',
 unidadesfortinet:'unidadescomfortinet','56unidadesfortinet':'unidadescomfortinet',
};
function importedCell(value){
 if(value instanceof Date&&!Number.isNaN(value.getTime())){
  const pad=n=>String(n).padStart(2,'0'),time=`${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`;
  if(value.getUTCFullYear()<1901)return time; // Horas Excel sem uma data associada.
  const day=`${value.getUTCFullYear()}-${pad(value.getUTCMonth()+1)}-${pad(value.getUTCDate())}`;
  return time==='00:00:00'?day:`${day} ${time}`;
 }
 return String(value??'').trim();
}
function importedDateDay(value){
 const text=String(value??'').trim();let match;
 if((match=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]|$)/)))return `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
 if((match=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s|$)/))){const year=+match[3]<100?2000+(+match[3]):+match[3];return `${year}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`}
 return '';
}
function importedTime(value){
 const text=String(value??'').trim();const match=text.match(/(?:^|[T\s])(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
 if(!match)return '';
 let hour=+match[1];const minute=+match[2],second=+(match[3]||0),period=match[4]?.toUpperCase();
 if(minute>59||second>59||hour>(period?12:23)||period&&hour<1)return '';
 if(period)hour=hour%12+(period==='PM'?12:0);
 return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`;
}
function importedMovementDate(row){
 const key=Object.keys(row).find(k=>['datasdwan','datadaatividade','dataatividade','data'].includes(importColumnKey(k)));
 return key?importedDateDay(row[key]):'';
}
function importedMovementOrder(row,index){
 const day=importedMovementDate(row);return day?Date.parse(`${day}T00:00:00`):index;
}
function prepareActivitySpreadsheet(data,p,mode){
 const idHeader=importVgrHeader(data.headers||[]);
 if(!idHeader)throw Error('A planilha deve conter a coluna ID VGR para identificar cada atividade.');
 const existing=new Map((mode==='new'?arr('activities'):projectActivities()).filter(a=>mode==='new'||a.data.projectId===p.id||String(a.data.row?.EMPRESA||'').toLocaleLowerCase('pt-BR')===getName(p).toLocaleLowerCase('pt-BR')).map(a=>[activityVgrKey(a),a]).filter(([key])=>key));
 const groups=new Map(),entries=[];let missing=0,repeated=0,already=0,notFound=0;
 for(const [index,row] of data.rows.entries()){
  const key=importVgrKey(row[idHeader]);if(!key){missing++;continue}
  if(groups.has(key))repeated++;
  else groups.set(key,[]);
  groups.get(key).push({row,index,order:importedMovementOrder(row,index)});
 }
 for(const [key,group] of groups){
  const match=existing.get(key);
  if(mode==='new'&&match){already++;continue}
  if(mode==='update'&&!match)notFound++;
  // O mesmo ID pode ter várias movimentações; usa a mais recente para status,
  // mantendo os campos preenchidos em movimentações anteriores.
  const row={};group.sort((a,b)=>a.order-b.order||a.index-b.index);
  for(const item of group)for(const [header,value] of Object.entries(item.row))if(String(value??'').trim()){
   row[header]=value;
   const field=importColumnKey(header);
   if(['horarioinicio','horariodeinicio','datadeinicio','inicioem','inicioatividade','datahorainicio'].includes(field))row.__importStartDate=importedMovementDate(item.row);
   if(['horariofim','horariofinal','horariotermino','horariodetermino','datadetermino','terminoem','fimatividade','datahorafim','datahoratermino'].includes(field))row.__importEndDate=importedMovementDate(item.row);
  }
  // Uma migração concluída não volta a "Pendente" por causa de uma linha
  // duplicada "Sem Acionamento"/"Agendado" do mesmo ID. Quebras posteriores
  // continuam prevalecendo, pois representam nova movimentação real.
  const statusHeader=Object.keys(row).find(h=>['statussdwan','status','statusdaatividade'].includes(importColumnKey(h)));
  if(statusHeader&&importedStatus(row[statusHeader])==='Pendente'){
   const migrated=group.filter(item=>importedStatus(item.row[statusHeader])==='Migrada');
   if(migrated.length)row[statusHeader]=migrated[migrated.length-1].row[statusHeader];
  }
  entries.push({key,row,activity:match||null});
 }
 const migrated=entries.filter(({row})=>Object.entries(row).some(([k,v])=>['statussdwan','status','statusdaatividade'].includes(importColumnKey(k))&&importedStatus(v)==='Migrada')).length;
 return {idHeader,entries,unique:groups.size,missing,repeated,already,notFound,migrated,total:data.rows.length};
}
function importedStatus(value){
 const key=importColumnKey(value);
 const exact=[...activeStatuses,'Pendente','Migrada','Quebra','Abandonada'].find(s=>importColumnKey(s)===key);
 if(exact)return exact;
 if(['migrado','migrados','migradas','concluida','concluido','concluidas','concluidos'].includes(key))return 'Migrada';
 if(['quebrada','quebradas','quebrado','quebrados','quebra'].includes(key)||key.startsWith('quebra'))return 'Quebra';
 if(['semacionamento','agendado','agendada','naoiniciado','naoiniciada'].includes(key))return 'Pendente';
 if(['emandamento','andamento'].includes(key))return 'Em andamento';
 if(['abandonaratividade','abandonado'].includes(key))return 'Abandonada';
 return null;
}
function importedDate(value,dayFallback=''){
 const str=String(value??'').trim(),day=importedDateDay(str)||dayFallback,time=importedTime(str);
 if(!str||!day)return null;
 const parts=day.split('-').map(Number),hours=(time||'00:00:00').split(':').map(Number);
 const date=new Date(parts[0],parts[1]-1,parts[2],...hours);
 if(Number.isNaN(date.getTime())||date.getFullYear()!==parts[0]||date.getMonth()!==parts[1]-1||date.getDate()!==parts[2])return null;
 return date.toISOString();
}
function mergeImportedActivityFields(a,row,p,idHeader){
 const data=a.data,existing=data.row||(data.row={}),editable=data.ed||(data.ed={});
 const known=new Map(allProjectFieldNames(p).map(k=>[importColumnKey(k),k]));
 for(const key of Object.keys(existing))if(!known.has(importColumnKey(key)))known.set(importColumnKey(key),key);
 const extras=new Map((p.data.extraFields||[]).map(f=>typeof f==='string'?[importColumnKey(f),f]:[importColumnKey(f.name),f.name]));
 for(const [key,name] of extras)known.set(key,name);
 const dateContext=importedMovementDate(row);
 let changed=false;
 const assign=(target,key,value)=>{if(target[key]!==value){target[key]=value;changed=true}};
 for(const [header,raw] of Object.entries(row)){
  if(header.startsWith('__import'))continue;
  const value=String(raw??'').trim();if(!value||header===idHeader)continue; // vazios não apagam dados atuais
  const normalized=importColumnKey(header);
  if(['status','statussdwan','statusdaatividade','situacao','situacaodaatividade'].includes(normalized)){
   const next=importedStatus(value);if(next)assign(data,'status',next);continue;
  }
  if(['analista','analistatecnico','analistadaatividade','nomedoanalista','nomedoanalistadaatividade','responsavelpelaatividade','analistaresponsavel'].includes(normalized)){
   const unifiedName=canonicalAnalystName(value);
   assign(data,'analystName',unifiedName);assign(data,'analystId',unifiedName);continue;
  }
  if(['observacao','observacoes','observacoesdaatividade','motivo'].includes(normalized)){
   assign(data,'observations',value);continue;
  }
  if(['horarioinicio','horariodeinicio','datadeinicio','inicioem','inicioatividade','datahorainicio'].includes(normalized)){
   const date=importedDate(value,row.__importStartDate||dateContext);if(date)assign(data,'startAt',date);continue;
  }
  if(['horariofim','horariofinal','horariotermino','horariodetermino','datadetermino','terminoem','fimatividade','datahorafim','datahoratermino'].includes(normalized)){
   const date=importedDate(value,row.__importEndDate||dateContext);if(date)assign(data,'endAt',date);continue;
  }
  if(['historico'].includes(normalized))continue; // log de eventos existente permanece intacto
  const canonical=importFieldAliases[normalized]||normalized;
  const target=known.get(canonical)||known.get(normalized)||header.trim();
  assign(existing,target,value);
  for(const edKey of Object.keys(editable))if(importColumnKey(edKey)===canonical||importColumnKey(edKey)===normalized)assign(editable,edKey,value);
  if(extras.has(canonical))assign(editable,target,value);
  if(!known.has(canonical)){
   known.set(canonical,target);p.data.activityTemplate=p.data.activityTemplate||[];
   if(!p.data.activityTemplate.some(name=>importColumnKey(name)===canonical))p.data.activityTemplate.push(target);
  }
 }
 return changed;
}
function commitNewActivitySpreadsheet(p,data,prepared){
 const batch='batch_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),created=[];
 const templateBefore=[...(p.data.activityTemplate||[])];
 for(const {row} of prepared.entries){
  const fields={};for(const [header,value] of Object.entries(row))fields[header]=String(value??'').trim();
  fields['ID VGR']=String(row[prepared.idHeader]).trim();
  const activity={id:'imp_'+Date.now()+'_'+created.length+'_'+Math.random().toString(36).slice(2,7),data:{projectId:p.id,row:{'ID VGR':fields['ID VGR']},status:'Pendente',analystName:null,analystId:null,startAt:null,endAt:null,importBatch:batch,createdAt:new Date().toISOString()}};
  mergeImportedActivityFields(activity,fields,p,prepared.idHeader);
  created.push(activity);
 }
 DB.activities.push(...created);
 try{save()}catch(err){DB.activities.splice(DB.activities.length-created.length,created.length);p.data.activityTemplate=templateBefore;throw err}
 sessionStorage.setItem('gi_latest_import_'+p.id,batch);
 log('Atividades importadas',`${getName(p)}: ${created.length} novas · ${prepared.already} já existentes · ${prepared.repeated} repetidas`);
 return created.length;
}
function commitUpdatedActivitySpreadsheet(p,prepared){
 const backups=prepared.entries.filter(({activity})=>activity).map(({activity})=>({activity,data:JSON.parse(JSON.stringify(activity.data))}));
 const templateBefore=[...(p.data.activityTemplate||[])];let updated=0,unchanged=0,created=0;
 const added=[];
 for(const {activity:existingActivity,row,key} of prepared.entries){
  const activity=existingActivity||{id:'imp_'+Date.now()+'_'+created+'_'+Math.random().toString(36).slice(2,8),data:{projectId:p.id,row:{'ID VGR':key},status:'Pendente',analystName:null,analystId:null,startAt:null,endAt:null,createdAt:new Date().toISOString()}};
  if(!existingActivity){DB.activities.push(activity);added.push(activity);created++}
  if(mergeImportedActivityFields(activity,row,p,prepared.idHeader)){
   activity.data.updatedAt=new Date().toISOString();if(existingActivity)updated++;
  }else if(existingActivity)unchanged++;
 }
 try{save()}catch(err){for(const {activity,data} of backups)activity.data=data;DB.activities=DB.activities.filter(a=>!added.includes(a));p.data.activityTemplate=templateBefore;throw err}
 log('Atividades atualizadas por planilha',`${getName(p)}: ${updated} alteradas · ${created} cadastradas · ${unchanged} sem mudanças`);
 return {updated,created,unchanged};
}
const importSheetIcon='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h10l4 4v14H5zM15 3v5h4M8 12h8M8 16h8"/></svg>';
const importCheckIcon='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>';
const importTrashIcon='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14M10 10v7M14 10v7"/></svg>';
const importLoadingIcon=`<span class="gi-import-dots" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i style="--angle:${i*45}deg;--dot-opacity:${(0.35+i*0.08).toFixed(2)}"></i>`).join('')}</span>`;
async function beginImportLoading(button,container,message='Importando e salvando atividades no Supabase…'){
 button.disabled=true;
 const discard=container.querySelector('.import-discard');if(discard)discard.disabled=true;
 button.classList.add('is-loading');
 button.setAttribute('aria-label','Processando importação');
 button.setAttribute('aria-busy','true');
 button.innerHTML=importLoadingIcon;
 const note=document.createElement('p');note.className='gi-import-loading-note';note.setAttribute('role','status');note.textContent=message;
 container.appendChild(note);
 // Deixa o navegador pintar o indicador antes da consolidação e do salvamento.
 await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
}
function openNewActivityDialog(p){
 const template=p.data.activityTemplate||[];
 const extras=(p.data.extraFields||[]).map(f=>typeof f==='string'?{name:f,section:'Outras informações'}:f);
 const sample=projectActivities().find(a=>a.data.projectId===p.id)||projectActivities()[0];
 const names=allProjectFieldNames(p);
 const sections=['Equipamento','Link','Localização / Unidade','Outras informações',...(p.data.extraSections||[])].filter(x=>!(p.data.removedDefaultSections||[]).includes(x));
 const group=k=>{const e=extras.find(f=>f.name===k);if(e)return e.section==='Localização'?'Localização / Unidade':e.section;const n=k.toUpperCase();if(/TÉCNICO|RESPONSÁVEL/.test(n))return 'Outras informações';if(/ENDEREÇO|COORDENADAS|EMPRESA|FORTINET|MUNICIPIO|MUNICÍPIO/.test(n))return 'Localização / Unidade';if(/UNIDADE|CLONAR/.test(n))return 'Equipamento';if(/LINK|DEDICADO|INTERNET|VELOCIDADE|OPERADORA|PRODUTO|MEIOS|^LP$|ATENDIMENTO/.test(n))return 'Link';return 'Equipamento'};
 const overlay=document.createElement('div');overlay.className='history-overlay new-activity-overlay';
 overlay.innerHTML=`<div class="history-dialog new-activity-dialog" role="dialog" aria-modal="true" aria-label="Cadastrar nova atividade"><div class="new-activity-head"><h2>Cadastrar nova atividade</h2><button type="button" class="new-activity-close" id="cancelNewActivity" aria-label="Fechar formulário" title="Fechar"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6L18 18M18 6L6 18"/></svg></button></div><div class="new-activity-import-area"><label class="activity-import-file">${importSheetIcon} Importar planilha<input type="file" id="newActivitySpreadsheet" accept=".csv,.tsv,.txt,.xls,.xlsx,.xlsm,.ods"></label><div class="activity-import-preview" id="newActivityImportPreview" aria-live="polite"></div></div><form id="newActivityForm">${sections.map(section=>{const keys=names.filter(k=>group(k)===section);if(!keys.length)return '';return `<section class="new-activity-section"><h3 class="new-activity-section-title">${esc(section)}</h3><div class="new-activity-grid">${keys.map(k=>`<label class="field"><span>${esc(k)}</span><input data-newfield="${esc(k)}" placeholder=""></label>`).join('')}</div></section>`}).join('')}<div class="new-activity-footer"><button type="submit">Cadastrar atividade</button></div></form></div>`;
 document.body.appendChild(overlay);overlay.querySelector('#cancelNewActivity').onclick=()=>overlay.remove();overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
 const preview=overlay.querySelector('#newActivityImportPreview');
 overlay.querySelector('#newActivitySpreadsheet').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;preview.innerHTML='<p>Conferindo IDs VGR da planilha…</p>';
  try{
   const data=await readTabularFile(file),prepared=prepareActivitySpreadsheet(data,p,'new');
   preview.innerHTML=`<div class="import-summary"><b>${esc(file.name)}</b><span>${prepared.total} linha(s) lidas · ${prepared.unique} ID(s) VGR único(s)</span><strong>${prepared.entries.length} nova(s) atividade(s) para importar</strong><span>${prepared.already} já cadastrada(s) · ${prepared.repeated} repetida(s) na planilha · ${prepared.missing} sem ID VGR</span></div><div class="import-preview-actions"><button type="button" class="import-confirm import-icon-button" id="confirmNewActivities" title="Confirmar importação" aria-label="Confirmar importação" ${prepared.entries.length?'':'disabled'}>${importCheckIcon}</button><button type="button" class="import-discard import-icon-button" id="discardNewActivities" title="Remover planilha selecionada" aria-label="Remover planilha selecionada">${importTrashIcon}</button></div>`;
   preview.querySelector('#discardNewActivities').onclick=()=>{overlay.querySelector('#newActivitySpreadsheet').value='';preview.innerHTML='';toast('Seleção da planilha cancelada. Nenhuma atividade foi alterada.')};
   preview.querySelector('#confirmNewActivities').onclick=async e=>{
    const button=e.currentTarget;
    try{
     await beginImportLoading(button,preview);
     const checked=prepareActivitySpreadsheet(data,p,'new');
     if(!checked.entries.length)throw Error('Nenhuma atividade nova para importar');
     const count=commitNewActivitySpreadsheet(p,data,checked);
     await GICloud.waitForSaves();
     overlay.remove();toast(`${count} atividade(s) importada(s). ${checked.already} já existia(m).`);openAdminActivityEditor();
    }catch(err){
     preview.querySelector('.gi-import-loading-note')?.remove();
     button.classList.remove('is-loading');button.innerHTML=importCheckIcon;button.disabled=true;button.removeAttribute('aria-busy');
     preview.insertAdjacentHTML('beforeend',`<p class="activity-import-error">Falha ao importar: ${esc(err.message)}. Recarregue a página antes de tentar novamente.</p>`);
    }
   };
  }catch(err){preview.innerHTML=`<p class="activity-import-error">Não foi possível preparar a importação: ${esc(err.message)}</p>`}
 };
 overlay.querySelector('#newActivityForm').onsubmit=e=>{e.preventDefault();const row={};overlay.querySelectorAll('[data-newfield]').forEach(el=>row[el.dataset.newfield]=el.value.trim());if(!Object.values(row).some(Boolean))return toast('Preencha ao menos um campo');const key=importVgrKey(row[Object.keys(row).find(k=>importColumnKey(k)==='idvgr')]);if(!key)return toast('Informe o ID VGR da atividade');if(arr('activities').some(a=>activityVgrKey(a)===key))return toast('Já existe uma atividade cadastrada com esse ID VGR');DB.activities.push({id:'manual_'+Date.now(),data:{projectId:p.id,row,status:'Pendente',analystName:null,analystId:null,startAt:null,endAt:null}});log('Atividade cadastrada manualmente',getName(p));save();overlay.remove();toast('Atividade cadastrada');renderAdmin()};
}
// Pesquisa/edição administrativa em uma sobreposição. Não altera o usuário responsável
// nem adota atividades; a exclusão só ocorre após confirmação explícita do ID VGR.
function openAdminActivityEditor(){
 if(!isAdmin()||!project())return toast('Acesso exclusivo do administrador');
 const editingProject=projectId;
 let selectedId=null,query='',limit=200,stagedUpdate=null,updateMessage='';
 const layer=document.createElement('div');layer.className='admin-activity-overlay';
 layer.innerHTML=`<div class="admin-activity-dialog" role="dialog" aria-modal="true" aria-labelledby="adminActivityDialogTitle"><header class="admin-activity-header"><div><h2 id="adminActivityDialogTitle">Editar atividade</h2><p>Pesquise e consulte todas as atividades deste projeto.</p></div><button type="button" class="admin-activity-close" title="Fechar" aria-label="Fechar janela de edição"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="admin-activity-content"></div></div>`;
 document.body.appendChild(layer);
 const body=layer.querySelector('.admin-activity-content');
 const close=()=>layer.remove();
 layer.querySelector('.admin-activity-close').onclick=close;
 layer.addEventListener('click',e=>{if(e.target===layer)close()});
 layer.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('.admin-activity-confirm')){e.preventDefault();close()}});
 function inProject(){return projectId===editingProject&&isAdmin()}
 function renderList(){
  if(!inProject())return close();
  selectedId=null;
  const all=newestActivities(projectActivities());
  const matching=all.filter(a=>activitySearchMatches(a,query.trim().toLocaleLowerCase('pt-BR')));
  body.innerHTML=`<section class="admin-update-activities"><div class="admin-update-heading"><div><h3>Atualizar atividades</h3><p class="small muted">Atualize atividades pelo ID VGR e cadastre automaticamente IDs ausentes. Colunas ausentes ou células vazias preservam os dados atuais.</p></div><label class="activity-import-file">${importSheetIcon} Importar planilha<input type="file" id="updateActivitiesSpreadsheet" accept=".csv,.tsv,.txt,.xls,.xlsx,.xlsm,.ods"></label></div><div id="updateActivitiesPreview" class="activity-import-preview" aria-live="polite">${updateMessage?`<p class="import-updated-message">${esc(updateMessage)}</p>`:''}</div></section><div class="admin-search-heading"><h3>Buscar atividade</h3><span class="small muted">${matching.length} de ${all.length} atividade(s)</span></div><input class="admin-activity-search" type="search" placeholder="Buscar por ID, ID do link, ID VGR, analista, status ou endereço" value="${esc(query)}" aria-label="Buscar atividade"/><p class="small muted">Todas as datas e todos os status · mais recentes primeiro</p><div class="admin-activity-results">${matching.slice(0,limit).map(a=>{
   const d=a.data||{},r=d.row||{},status=d.status||'Pendente',done=completionLabel(a);
   const recent=d.importBatch&&d.importBatch===sessionStorage.getItem('gi_latest_import_'+editingProject);
   return `<div class="activity-line admin-edit-activity-line" data-admin-view="${esc(a.id)}" tabindex="0" role="button" aria-label="Abrir atividade ${esc(activityName(a))}"><div class="activity-main"><b>${esc(activityName(a))}</b>${recent?'<span class="activity-new-tag">Nova</span>':''}<div class="small muted">${esc(r['ENDEREÇO COMPLETO']||r.HOSTNAME||r.EMPRESA||'Atividade')}</div></div><div class="activity-meta"><span class="activity-completion-date">${esc(done)}</span><span class="elapsed">${esc(runningActivityTime(a))}</span><span class="owner" title="${esc(canonicalAnalystName(d.analystName))}">${esc(analystListName(d.analystName))}</span></div><span class="status ${esc(normStatus(status))}">${esc(status)}</span><button type="button" data-admin-open="${esc(a.id)}">Abrir atividade</button></div>`}).join('')||'<div class="empty">Nenhuma atividade encontrada.</div>'}</div>${matching.length>limit?`<div class="admin-activity-load"><button type="button" class="secondary" id="adminActivityMore">Mostrar mais (${Math.min(matching.length-limit,200)})</button></div>`:''}`;
  const updatePreview=body.querySelector('#updateActivitiesPreview');
  const bindUpdateActions=()=>{
   updatePreview.querySelector('#confirmUpdatedActivities')?.addEventListener('click',async e=>{
    if(!stagedUpdate||!inProject())return;
    const button=e.currentTarget;
    try{
     await beginImportLoading(button,updatePreview);
     const checked=prepareActivitySpreadsheet(stagedUpdate.data,project(),'update');
     const result=commitUpdatedActivitySpreadsheet(project(),checked);
     await GICloud.waitForSaves();
     updateMessage=`Atualização concluída: ${result.updated} atividade(s) atualizada(s); ${result.created} cadastrada(s); ${result.unchanged} sem alteração. ${checked.migrated} ID(s) migrado(s) na planilha.`;
     stagedUpdate=null;renderList();toast(`${result.updated} atualizada(s) e ${result.created} cadastrada(s) com sucesso`);
    }catch(err){
     updatePreview.querySelector('.gi-import-loading-note')?.remove();
     button.classList.remove('is-loading');button.innerHTML=importCheckIcon;button.disabled=true;button.removeAttribute('aria-busy');
     updatePreview.insertAdjacentHTML('beforeend',`<p class="activity-import-error">Falha ao atualizar: ${esc(err.message)}. Recarregue a página para conferir o que foi persistido.</p>`);
    }
   });
   updatePreview.querySelector('#discardUpdatedActivities')?.addEventListener('click',()=>{
    stagedUpdate=null;updateMessage='';body.querySelector('#updateActivitiesSpreadsheet').value='';updatePreview.innerHTML='';toast('Seleção da planilha cancelada. Atividades existentes preservadas.');
   });
  };
  if(stagedUpdate){updatePreview.innerHTML=stagedUpdate.preview;bindUpdateActions()}
  body.querySelector('#updateActivitiesSpreadsheet').onchange=async e=>{
   const file=e.target.files?.[0];if(!file)return;stagedUpdate=null;updatePreview.innerHTML='<p>Lendo planilha e conferindo atividades…</p>';
   try{const data=await readTabularFile(file),prepared=prepareActivitySpreadsheet(data,project(),'update');const preview=`<div class="import-summary"><b>${esc(file.name)}</b>${data.sheetName?`<span>Aba identificada: ${esc(data.sheetName)}</span>`:''}<span>${prepared.total} linha(s) · ${prepared.unique} ID(s) VGR único(s) · ${prepared.migrated} migrada(s)</span><strong>${prepared.entries.length-prepared.notFound} para atualizar · ${prepared.notFound} ID(s) ausente(s) serão cadastrados</strong><span>${prepared.repeated} movimentação(ões) repetida(s) consolidadas · ${prepared.missing} sem ID VGR</span></div><div class="import-preview-actions"><button type="button" id="confirmUpdatedActivities" class="import-confirm import-icon-button" title="Confirmar atualização" aria-label="Confirmar atualização" ${prepared.entries.length?'':'disabled'}>${importCheckIcon}</button><button type="button" id="discardUpdatedActivities" class="import-discard import-icon-button" title="Remover planilha selecionada" aria-label="Remover planilha selecionada">${importTrashIcon}</button></div>`;stagedUpdate={data,preview};updatePreview.innerHTML=preview;bindUpdateActions();
   }catch(err){updatePreview.innerHTML=`<p class="activity-import-error">Não foi possível preparar a atualização: ${esc(err.message)}</p>`}
  };
  const search=body.querySelector('.admin-activity-search');
  search.oninput=()=>{const caret=search.selectionStart;query=search.value;limit=200;renderList();const replacement=body.querySelector('.admin-activity-search');replacement.focus();try{replacement.setSelectionRange(caret,caret)}catch(e){}};
  const go=id=>{selectedId=id;renderDetail()};
  body.querySelectorAll('[data-admin-view]').forEach(row=>{row.onclick=e=>{if(e.target.closest('button'))return;go(row.dataset.adminView)};row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go(row.dataset.adminView)}}});
  body.querySelectorAll('[data-admin-open]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();go(btn.dataset.adminOpen)});
  body.querySelector('#adminActivityMore')?.addEventListener('click',()=>{limit+=200;renderList()});
  layer.querySelector('.admin-activity-dialog').scrollTop=0;
 }
 function renderDetail(){
  if(!inProject())return close();
  const a=projectActivities().find(x=>x.id===selectedId);if(!a)return renderList();
  body.innerHTML=activityDetail(selectedId,'view',true);
  const $modal=sel=>body.querySelector(sel);
  $modal('#closeDetail').onclick=renderList;
  const persist=()=>{
   if(!inProject()||!projectActivities().some(x=>x.id===a.id))return;
   a.data.ed=a.data.ed||{};
   body.querySelectorAll('[data-edit]').forEach(el=>a.data.ed[el.dataset.edit]=el.value);
   const notes=$modal('#activityObservations');
   if(notes){a.data.observations=notes.value;const last=(a.data.history||[]).at(-1);if(last&&['Migrada','Quebra'].includes(last.status)&&last.status===a.data.status)last.notes=notes.value;}
   a.data.updatedAt=new Date().toISOString();save();
  };
  body.querySelectorAll('[data-edit]').forEach(el=>{
   if(el.dataset.edit==='IP LINK')el.addEventListener('input',()=>{el.value=el.value.replace(/[^0-9./]/g,'')});
   el.addEventListener('change',()=>{persist();log('Atividade editada pelo administrador',activityName(a)+' · '+el.dataset.edit,a.id)});
  });
  $modal('#activityObservations')?.addEventListener('input',persist);
  $modal('#activityStatus')?.addEventListener('change',()=>{
   persist();const next=$modal('#activityStatus').value,prev=a.data.status;
   if(next===prev)return;
   a.data.status=next;
   if(['Migrada','Quebra'].includes(next))a.data.endAt=new Date().toISOString();
   else if(['Migrada','Quebra'].includes(prev))a.data.endAt=null;
   recordActivityHistory(a,next,a.data.observations||'');
   log('Status alterado pelo administrador',activityName(a)+' · '+prev+' → '+next,a.id);
   save();toast('Status atualizado');renderDetail();
  });
  body.querySelectorAll('[data-history]').forEach(btn=>btn.addEventListener('click',()=>{
   const h=(a.data.history||[])[Number(btn.dataset.history)];if(!h)return;
   const pop=document.createElement('div');pop.className='history-overlay';
   pop.innerHTML=`<div class="history-dialog" role="dialog" aria-modal="true"><h2>Histórico da atividade</h2><p>${esc(new Date(h.at).toLocaleString('pt-BR'))} · ${esc(h.analyst||'—')} · ${esc(h.status||'—')}</p><label>Observações registradas</label><div class="history-notes">${esc(h.notes||'Nenhuma observação registrada.')}</div><button type="button" class="secondary" id="closeHistory">Fechar</button></div>`;
   document.body.appendChild(pop);pop.querySelector('#closeHistory').onclick=()=>pop.remove();pop.onclick=e=>{if(e.target===pop)pop.remove()};
  }));
  $modal('#adminDeleteActivity').onclick=()=>confirmDelete(a);
  layer.querySelector('.admin-activity-dialog').scrollTop=0;
 }
 function confirmDelete(a){
  if(!inProject())return;
  const label=String(activityName(a)),related=arr('runbooks').filter(r=>r.data?.activityId===a.id||r.data?.actId===a.id);
  const confirmLayer=document.createElement('div');confirmLayer.className='admin-activity-confirm project-delete-overlay';
  confirmLayer.innerHTML=`<div class="project-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="adminDeleteTitle"><h3 id="adminDeleteTitle">Excluir atividade definitivamente?</h3><p>A atividade <strong>${esc(label)}</strong> e ${related.length} runbook(s) vinculado(s) serão excluídos deste navegador. Esta ação não pode ser desfeita.</p><p class="small muted">Para confirmar, digite o ID VGR <strong>${esc(label)}</strong>:</p><input id="confirmActivityId" autocomplete="off" placeholder="${esc(label)}" aria-label="Digite o ID VGR"><div class="project-delete-actions"><button type="button" class="secondary" id="cancelAdminDelete">Cancelar</button><button type="button" class="danger-project" id="confirmAdminDelete" disabled>Excluir definitivamente</button></div></div>`;
  document.body.appendChild(confirmLayer);
  const cancel=()=>confirmLayer.remove();
  confirmLayer.querySelector('#cancelAdminDelete').onclick=cancel;
  confirmLayer.onclick=e=>{if(e.target===confirmLayer)cancel()};
  confirmLayer.querySelector('#confirmActivityId').oninput=e=>{confirmLayer.querySelector('#confirmAdminDelete').disabled=e.target.value.trim()!==label};
  confirmLayer.querySelector('#confirmAdminDelete').onclick=()=>{
   if(!isAdmin()||confirmLayer.querySelector('#confirmActivityId').value.trim()!==label)return;
   const exists=projectActivities().some(x=>x.id===a.id);if(!exists)return cancel();
   DB.activities=arr('activities').filter(x=>x.id!==a.id);
   DB.runbooks=arr('runbooks').filter(x=>x.data?.activityId!==a.id&&x.data?.actId!==a.id);
   log('Atividade excluída pelo administrador',label+' · Projeto: '+getName(project()),a.id);
   save();cancel();query='';limit=200;renderList();toast('Atividade '+label+' excluída');
  };
  confirmLayer.querySelector('#confirmActivityId').focus();
 }
 renderList();
 layer.querySelector('.admin-activity-search')?.focus();
}
function logVgr(entry){const d=entry.data||{};const a=arr('activities').find(x=>x.id===d.actId||String(activityName(x))===String(d.actId));if(a)return String(activityName(a));const v=String(d.detail||'');const match=v.match(/\b\d{6,9}\b/);return match?match[0]:'—'}
function formatLogDate(ts){if(!ts)return '—';const d=new Date(ts);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})}
function renderLogs(){let logs=arr('log');$('#appContent').innerHTML=`<div class="panel"><h3>Histórico de ações</h3><div class="filters"><input id="logSearch" placeholder="Buscar por data, ação, usuário, ID VGR ou detalhe" style="flex:1"><button id="exportLogs">Exportar CSV</button></div><div class="tablewrap"><table><thead><tr><th>Data</th><th>ID VGR</th><th>Ação</th><th>Usuário</th><th>Detalhe</th></tr></thead><tbody id="logsBody"></tbody></table></div></div>`;function draw(){let q=$('#logSearch').value.toLowerCase();$('#logsBody').innerHTML=logs.filter(x=>(JSON.stringify(x.data)+' '+logVgr(x)+' '+formatLogDate(x.data.ts)).toLowerCase().includes(q)).slice(0,500).map(x=>`<tr><td>${esc(formatLogDate(x.data.ts))}</td><td>${esc(logVgr(x))}</td><td>${esc(x.data.act||x.data.action||'')}</td><td>${esc(x.data.user||'')}</td><td>${esc(x.data.detail||x.data.actId||'')}</td></tr>`).join('')}$('#logSearch').oninput=draw;$('#exportLogs').onclick=()=>downloadCSV('logs.csv',logs.map(x=>({...x.data,dataFormatada:formatLogDate(x.data.ts),idVgr:logVgr(x)})));draw()}
function renderAdmin(){
if(!isAdmin()){page='home';render();return}
let tabs=projectId?['← Voltar',...(isRootAdmin()?['Usuários']:[]),'Configurar projeto']:[];
if(!projectId)adminTab='Projetos';else if(!tabs.includes(adminTab))adminTab='Configurar projeto';
$('#appContent').innerHTML=`<div class="tabs">${tabs.map(t=>`<button class="${adminTab===t?'active':''}" data-atab="${esc(t)}">${esc(t)}</button>`).join('')}</div><div id="adminBody"></div>`;
document.querySelectorAll('[data-atab]').forEach(b=>b.onclick=()=>{if(b.dataset.atab==='← Voltar'){projectId=null;selectedActivity=null;adminTab='Projetos';render();return}adminTab=b.dataset.atab;renderAdmin()});
let b=$('#adminBody');
if(adminTab==='Projetos'){
 b.innerHTML=`<div class="panel"><h3>Projetos cadastrados</h3><p class="muted">Selecione um projeto para abrir suas configurações.</p><div class="project-list admin-project-grid">${arr('projects').map(p=>`<div class="detailhead panel project-row" data-selectp="${esc(p.id)}" role="button" tabindex="0"><div><b>${esc(getName(p))}</b><div class="small muted">${arr('activities').filter(a=>a.data.projectId===p.id||String((a.data.row||{}).EMPRESA||'').toLowerCase()===getName(p).toLowerCase()).length} atividades</div></div><button class="secondary" data-selectp="${esc(p.id)}">Selecionar</button></div>`).join('')}</div><h3>Cadastrar novo projeto</h3><div class="filters"><input id="newProject" placeholder="Nome do projeto"><button id="createProject">Criar projeto</button></div></div>`;
 $('#createProject').onclick=()=>{let name=$('#newProject').value.trim();if(!name)return toast('Informe o nome do projeto');let id=name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-');if(arr('projects').some(p=>p.id===id))return toast('Projeto já existe');DB.projects.push({id,data:{name,createdAt:new Date().toISOString(),setupOpen:true,activityTemplate:[]}});log('Projeto criado',name);save();renderAdmin()};
 if(isRootAdmin()&&localStorage.getItem('gestaoImplantacaoDB')){
  const holder=document.createElement('div');holder.className='gi-legacy-import';
  holder.innerHTML='<h3>Migrar dados do navegador antigo</h3><p class="muted">Importação opcional de projetos, atividades, runbooks e arquivos armazenados neste computador. Não importa usuários nem senhas locais.</p><button class="secondary" type="button" id="migrateBrowserData">Importar meus dados locais para o Supabase</button>';
  b.querySelector('.panel')?.appendChild(holder);
  holder.querySelector('button').onclick=migrateLegacyBrowserData;
 }
 b.querySelectorAll('.project-row[data-selectp]').forEach(x=>{const open=()=>{projectId=x.dataset.selectp;adminTab='Configurar projeto';renderAdmin()};x.onclick=open;x.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});
}
if(adminTab==='Usuários'){
 if(!isRootAdmin()){b.textContent='Acesso restrito ao administrador.';return}
 const roles=[['analista','Analista'],['gestor','Gestor'],['administrador','Administrador']];
 b.innerHTML=`<div class="panel"><h3>Convidar usuário</h3><p class="muted">O usuário recebe por e-mail um convite do Supabase Auth. Somente endereços @telefonica.com são permitidos. Senhas não são exibidas nem armazenadas pelo sistema.</p><div class="row"><div class="field"><label>Nome completo</label><input id="uName" maxlength="120"></div><div class="field"><label>E-mail corporativo</label><input id="uEmail" type="email" placeholder="nome@telefonica.com"></div><div class="field"><label>RE / matrícula</label><input id="uRe" maxlength="60"></div><div class="field"><label>Perfil inicial</label><select id="uRole">${roles.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div></div><button id="createUser" style="margin-top:12px">Enviar convite</button></div><div class="panel"><h3>Usuários cadastrados</h3>${arr('users').map(u=>`<div class="panel user-admin-row"><div><b>${esc(u.data.nome||u.data.email||'')}</b><div class="small muted">${esc(u.data.email||'')} · ${esc(u.data.re||'')} · ${u.data.active?'Ativo':'Bloqueado'}</div></div><div class="gi-user-actions"><select data-user-role="${esc(u.id)}" aria-label="Perfil de ${esc(u.data.email)}" ${u.data.email===GICloud.profile()?.email?'disabled':''}>${roles.map(([v,t])=>`<option value="${v}" ${u.data.role===v?'selected':''}>${t}</option>`).join('')}</select><button class="secondary" data-active-user="${esc(u.id)}" ${u.data.email===GICloud.profile()?.email?'disabled':''}>${u.data.active?'Bloquear':'Ativar'}</button><button class="secondary" data-reset-user="${esc(u.id)}">Redefinir senha</button></div></div>`).join('')||'<div class="empty">Nenhum usuário.</div>'}</div>`;
 b.insertAdjacentHTML('beforeend','<div class="panel"><h3>Vincular analistas importados</h3><p class="muted">Relaciona atividades aos usuários que possuam o mesmo nome completo, desconsiderando diferenças de acentuação e maiúsculas. Havendo dois usuários homônimos, o vínculo não é automático.</p><button id="reconcileImportedAnalysts" type="button" class="secondary">Vincular analistas</button></div>');
 b.querySelector('#reconcileImportedAnalysts').onclick=async()=>{const button=b.querySelector('#reconcileImportedAnalysts');button.disabled=true;try{const count=await GICloud.reconcileImportedAnalysts();await reloadUsers();toast(`${count} atividade(s) vinculada(s) ao usuário correspondente`)}catch(err){toast('Falha ao vincular analistas: '+err.message,8500)}finally{button.disabled=false}};
 const reloadUsers=async()=>{await GICloud.waitForSaves();DB=await GICloud.loadAll();renderAdmin()};
 $('#createUser').onclick=async()=>{const button=$('#createUser');button.disabled=true;
  try{const result=await GICloud.adminUsers('invite',{name:$('#uName').value.trim(),email:$('#uEmail').value.trim(),registration:$('#uRe').value.trim(),role:$('#uRole').value});await reloadUsers();toast(result.warning||result.message||'Convite enviado por e-mail')}
  catch(err){toast('Erro ao convidar: '+err.message,8000)}finally{button.disabled=false}
 };
 b.querySelectorAll('[data-user-role]').forEach(sel=>sel.onchange=async()=>{
  try{await GICloud.adminUsers('setRole',{userId:sel.dataset.userRole,role:sel.value});await reloadUsers();toast('Perfil atualizado no servidor')}
  catch(err){toast('Não foi possível alterar perfil: '+err.message);renderAdmin()}
 });
 b.querySelectorAll('[data-active-user]').forEach(btn=>btn.onclick=async()=>{
  const user=arr('users').find(x=>x.id===btn.dataset.activeUser);if(!user)return;
  try{await GICloud.adminUsers('setActive',{userId:user.id,active:!user.data.active});await reloadUsers();toast('Acesso atualizado')}
  catch(err){toast('Não foi possível atualizar acesso: '+err.message)}
 });
 b.querySelectorAll('[data-reset-user]').forEach(btn=>btn.onclick=async()=>{
  const user=arr('users').find(x=>x.id===btn.dataset.resetUser);if(!user||!confirm('Enviar um link de redefinição de senha para '+user.data.email+'?'))return;
  try{await GICloud.adminUsers('reset',{email:user.data.email});toast('Link de redefinição enviado')}
  catch(err){toast('Não foi possível enviar redefinição: '+err.message)}
 });
}
if(adminTab==='Configurar projeto'){
 let p=project();if(!p){b.innerHTML='<div class="panel">Selecione um projeto na tela anterior.</div>';return}p.data=p.data||{};let template=p.data.activityTemplate||[];
 b.innerHTML=`<div class="panel admin-config"><div class="detailhead admin-config-head"><div><h3>Configurações do projeto: ${esc(getName(p))}</h3><p class="muted">Importe a planilha de atividades e o modelo de runbook. O sistema identifica os cabeçalhos/colunas e só exibe os campos presentes no modelo deste projeto.</p></div><div class="project-admin-actions"><button class="secondary" id="openProject">Abrir projeto</button><button class="danger-project" id="deleteProject">Remover projeto</button></div></div>
 <section class="admin-config-section"><h3>Foto de perfil do projeto</h3><p class="muted">Selecione uma imagem para aparecer no menu lateral quando este projeto estiver ativo.</p><div class="profile-config"><div class="profile-config-preview" id="profilePreview">${p.data.profilePhoto?`<img src="${esc(p.data.profilePhoto)}" alt="Foto atual do projeto">`:esc(getName(p).slice(0,1).toUpperCase())}</div><div class="profile-config-actions"><div class="profile-config-buttons"><label class="filelabel">Escolher foto<input type="file" id="projectProfilePhoto" accept="image/png,image/jpeg,image/webp,image/gif"></label><button class="project-photo-remove" id="removeProjectPhoto" ${p.data.profilePhoto?'':'disabled'} type="button" title="Remover foto" aria-label="Remover foto"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><p class="small muted">PNG, JPG, WEBP ou GIF · até 1 MB</p></div></div><div class="project-rename"><label for="projectNameEdit">Nome do projeto</label><div class="project-rename-controls"><input id="projectNameEdit" maxlength="100" value="${esc(getName(p))}" placeholder="Nome do projeto"><button type="button" id="saveProjectName">Salvar nome</button></div></div><div id="cropEditor" class="crop-editor hidden"><p class="muted">Arraste a foto para enquadrar e use o controle para aproximar ou afastar.</p><canvas id="cropCanvas" width="280" height="280" aria-label="Prévia do recorte"></canvas><div class="crop-actions"><label>Zoom <input type="range" id="cropZoom" min="1" max="3" step="0.01" value="1"></label><button id="cropSave" type="button">Salvar enquadramento</button><button class="secondary" id="cropCancel" type="button">Cancelar</button></div></div></section>
 <section class="admin-config-section"><h3>Modelo de planilha do projeto</h3><p class="muted">Aceita CSV, XLS, XLSX, XLSM, ODS, TSV e DOCX. Após selecionar, confira os campos e clique em OK para aplicar.</p><div class="import-controls"><label class="filelabel">Importar planilha do projeto<input type="file" id="projectCsv" accept=".csv,.txt,.tsv,.xls,.xlsx,.xlsm,.ods,.docx,.doc"></label><button type="button" class="import-clear-button" id="clearProjectImport" title="Limpar arquivo selecionado" aria-label="Limpar planilha do projeto" hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div id="projectPreview" class="import-preview"></div><div class="small muted" id="currentFields">Campos atuais: ${template.length?template.map(esc).join(' · '):'ainda não definido'}</div>
 </section><section class="admin-config-section"><h3>Modelo de planilha de runbook</h3><p class="muted">O sistema identifica títulos, instruções, evidências e fotos nas abas da planilha, preservando a estrutura para exportação. Prévia antes de aplicar.</p><div class="import-controls"><label class="filelabel">Importar planilha do runbook<input type="file" id="projectRunbook" accept=".csv,.txt,.tsv,.xls,.xlsx,.xlsm,.ods"></label><button type="button" class="import-clear-button" id="clearRunbookImport" title="Remover arquivo selecionado ou modelo aplicado" aria-label="Limpar planilha do Runbook" ${p.data.runbookModel?'':'hidden'}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button><button type="button" class="runbook-edit-trigger" id="editRunbookLayout" ${p.data.runbookModel?'':'disabled'}><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4z"/></svg> Editar runbook</button></div><div id="runbookPreview" class="import-preview">${p.data.runbookModel?`<p class="small muted">Modelo atual: ${esc(p.data.runbookFilename||'Planilha de Runbook')} · ${p.data.runbookModel.sections.length} seções · ${p.data.runbookModel.total} imagens</p>`:''}</div>
 </section><section class="admin-config-section config-builder"><div class="config-builder-col"><h3>Cadastrar seções no projeto</h3><p class="muted">Crie novas seções para organizar os campos das atividades.</p><div class="filters section-editor"><input id="extraSectionName" list="existingProjectSections" autocomplete="off" placeholder="Digite ou selecione uma seção" aria-label="Nome da seção"><datalist id="existingProjectSections">${['Equipamento','Link','Localização / Unidade','Outras informações',...(p.data.extraSections||[])].filter(name=>!(p.data.removedDefaultSections||[]).includes(name)).map(name=>`<option value="${esc(name)}"></option>`).join('')}</datalist><button id="addExtraSection" class="section-editor-action" type="button" title="Cadastrar seção" aria-label="Cadastrar seção"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></button><button id="deleteSelectedSection" class="section-editor-action" type="button" title="Excluir seção selecionada" aria-label="Excluir seção selecionada"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14M10 10v7M14 10v7"/></svg></button></div><div class="admin-edit-action"><button type="button" id="openAdminActivityEditor" class="admin-edit-trigger"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8.5 17.5 4 19l1.5-4.5z"/></svg> Editar atividade</button></div></div><div class="config-builder-col"><h3>Cadastrar campos no projeto</h3><p class="muted">Os campos adicionados aparecem em todas as atividades deste projeto, na seção escolhida.</p><div class="filters field-editor"><div class="field-name-picker"><input id="extraFieldName" list="existingProjectFields" autocomplete="off" placeholder="Nome do novo campo" aria-label="Digite ou selecione um campo"><datalist id="existingProjectFields">${allProjectFieldNames(p).map(name=>`<option value="${esc(name)}"></option>`).join('')}</datalist></div><select id="extraFieldSection" aria-label="Seção do campo">${['Equipamento','Link','Localização / Unidade','Outras informações',...(p.data.extraSections||[])].filter(x=>!(p.data.removedDefaultSections||[]).includes(x)).map(x=>`<option>${esc(x)}</option>`).join('')}</select><button id="addExtraField" class="secondary field-editor-action" type="button" title="Cadastrar campo" aria-label="Cadastrar campo"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></button><button id="deleteSelectedField" class="extra-field-delete field-editor-action" type="button" title="Excluir campo selecionado" aria-label="Excluir campo selecionado"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14M10 10v7M14 10v7"/></svg></button></div><div class="manual-activity"><button type="button" id="openNewActivity">Cadastrar nova atividade</button></div></div></section></div>`;
 $('#openProject').onclick=()=>{page='home';selectedActivity=null;render()};
 $('#saveProjectName').onclick=()=>{
  const name=$('#projectNameEdit').value.trim(),oldName=getName(p);
  if(!name)return toast('Informe o nome do projeto');
  if(arr('projects').some(other=>other.id!==p.id&&getName(other).toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')))return toast('Já existe um projeto com esse nome');
  if(name===oldName)return toast('O nome não foi alterado');
  p.data.name=name;
  arr('activities').forEach(a=>{if(a.data?.projectId===p.id&&a.data.row&&String(a.data.row.EMPRESA||'').trim().toLocaleLowerCase('pt-BR')===oldName.toLocaleLowerCase('pt-BR'))a.data.row.EMPRESA=name});
  log('Nome do projeto alterado',oldName+' → '+name);
  save();render();toast('Nome do projeto atualizado');
 };
 $('#deleteProject').onclick=()=>{
  const name=getName(p);
  const overlay=document.createElement('div');overlay.className='project-delete-overlay';
  overlay.innerHTML=`<div class="project-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="deleteProjectTitle"><h3 id="deleteProjectTitle">Remover projeto?</h3><p>Você está prestes a excluir <strong>${esc(name)}</strong> e seus dados vinculados (atividades e runbooks). Esta ação não pode ser desfeita.</p><p class="muted small">Para confirmar, digite o nome exato do projeto:</p><input id="deleteProjectConfirmation" autocomplete="off" placeholder="${esc(name)}"><div class="project-delete-actions"><button type="button" class="secondary" id="cancelDeleteProject">Cancelar</button><button type="button" class="danger-project" id="confirmDeleteProject" disabled>Excluir definitivamente</button></div></div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('#cancelDeleteProject').onclick=close;
  overlay.onclick=e=>{if(e.target===overlay)close()};
  overlay.querySelector('#deleteProjectConfirmation').oninput=e=>{overlay.querySelector('#confirmDeleteProject').disabled=e.target.value.trim()!==name};
  overlay.querySelector('#confirmDeleteProject').onclick=()=>{
   if(overlay.querySelector('#deleteProjectConfirmation').value.trim()!==name)return;
   const ids=new Set(arr('activities').filter(a=>a.data?.projectId===p.id).map(a=>a.id));
   DB.activities=arr('activities').filter(a=>!ids.has(a.id));
   DB.runbooks=arr('runbooks').filter(r=>r.data?.projectId!==p.id&&!ids.has(r.data?.activityId)&&!ids.has(r.data?.actId));
   DB.projects=arr('projects').filter(x=>x.id!==p.id);
   localStorage.removeItem('gi_search_'+p.id);
   projectId=null;selectedActivity=null;adminTab='Projetos';filterStatus='Todos';
   log('Projeto removido',name+' ('+ids.size+' atividades excluídas)');
   save();RunbookStorage.remove(p.id).catch(err=>console.warn('Arquivo antigo do projeto:',err));close();render();toast('Projeto removido');
  };
  overlay.querySelector('#deleteProjectConfirmation').focus();
 };
 let cropImage=null,cropScale=1,cropX=0,cropY=0;
 const canvas=$('#cropCanvas'),ctx=canvas.getContext('2d');
 function drawCrop(){if(!cropImage)return;let side=canvas.width,base=Math.max(side/cropImage.width,side/cropImage.height),w=cropImage.width*base*cropScale,h=cropImage.height*base*cropScale;cropX=Math.min(0,Math.max(side-w,cropX));cropY=Math.min(0,Math.max(side-h,cropY));ctx.clearRect(0,0,side,side);ctx.drawImage(cropImage,cropX,cropY,w,h)}
  const profilePreview=$('#profilePreview');
  profilePreview.tabIndex=0;profilePreview.setAttribute('role','button');profilePreview.setAttribute('aria-label','Clicar para ajustar tamanho e posição da foto');
  const openExistingCrop=()=>{const photo=p.data.profilePhoto;if(!photo){$('#projectProfilePhoto').click();return}const im=new Image();im.onload=()=>{cropImage=im;cropScale=1;cropX=0;cropY=0;$('#cropZoom').value='1';$('#cropEditor').classList.remove('hidden');drawCrop();$('#cropEditor').scrollIntoView({block:'nearest',behavior:'smooth'})};im.onerror=()=>toast('Não foi possível abrir a foto');im.src=photo};
  profilePreview.onclick=openExistingCrop;profilePreview.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openExistingCrop()}};
  $('#projectProfilePhoto').onchange=e=>{let file=e.target.files?.[0];if(!file)return;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>1024*1024){toast('Use PNG, JPG, WEBP ou GIF de até 1 MB');e.target.value='';return}let reader=new FileReader();reader.onload=()=>{let im=new Image();im.onload=()=>{cropImage=im;cropScale=1;cropX=0;cropY=0;$('#cropZoom').value='1';$('#cropEditor').classList.remove('hidden');drawCrop()};im.onerror=()=>toast('Imagem inválida');im.src=reader.result};reader.readAsDataURL(file)};
 $('#cropZoom').oninput=e=>{if(!cropImage)return;let old=cropScale;cropScale=Number(e.target.value);cropX=canvas.width/2-(canvas.width/2-cropX)*cropScale/old;cropY=canvas.height/2-(canvas.height/2-cropY)*cropScale/old;drawCrop()};
 let dragging=false,lastX=0,lastY=0;canvas.onpointerdown=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)};canvas.onpointermove=e=>{if(!dragging)return;let r=canvas.getBoundingClientRect(),f=canvas.width/r.width;cropX+=(e.clientX-lastX)*f;cropY+=(e.clientY-lastY)*f;lastX=e.clientX;lastY=e.clientY;drawCrop()};canvas.onpointerup=canvas.onpointercancel=()=>dragging=false;
 $('#cropSave').onclick=()=>{if(!cropImage)return;let previous=p.data.profilePhoto;let out=document.createElement('canvas');out.width=256;out.height=256;out.getContext('2d').drawImage(canvas,0,0,256,256);p.data.profilePhoto=out.toDataURL('image/jpeg',0.86);try{save();renderProjectAvatar();renderAdmin();toast('Foto enquadrada e salva')}catch(err){p.data.profilePhoto=previous;toast('Não foi possível salvar a foto')}};
 $('#cropCancel').onclick=()=>{$('#cropEditor').classList.add('hidden');cropImage=null;$('#projectProfilePhoto').value=''};
 $('#removeProjectPhoto').onclick=()=>{delete p.data.profilePhoto;save();renderProjectAvatar();renderAdmin();toast('Foto removida')};
 let stagedActivity=null,stagedRunbook=null;
 $('#editRunbookLayout').onclick=()=>window.RunbookEditor.open(p,updated=>{const before=p.data.runbookModel;p.data.runbookModel=updated;try{save()}catch(e){p.data.runbookModel=before;throw e}toast('Alterações do Runbook salvas.');renderAdmin()});
 const runbookModelMessage=()=>p.data.runbookModel?`<p class="small muted">Modelo atual: ${esc(p.data.runbookFilename||'Planilha de Runbook')} · ${p.data.runbookModel.sections.length} seções · ${p.data.runbookModel.total} imagens</p>`:'';
 $('#clearProjectImport').onclick=()=>{
   // Não exclui atividades que já foram efetivamente importadas.
   stagedActivity=null;$('#projectCsv').value='';$('#projectPreview').textContent='';$('#clearProjectImport').hidden=true;
   toast('Seleção da planilha do projeto cancelada. Atividades existentes preservadas.');
 };
 $('#clearRunbookImport').onclick=async()=>{
   if(stagedRunbook || $('#projectRunbook').value){
     stagedRunbook=null;$('#projectRunbook').value='';$('#runbookPreview').innerHTML=runbookModelMessage();
     $('#clearRunbookImport').hidden=!p.data.runbookModel;
     toast('Seleção cancelada. Modelo já aplicado permanece no projeto.');return;
   }
   if(!p.data.runbookModel)return;
   if(!confirm('Remover o modelo de Runbook aplicado a este projeto? Os dados das atividades não serão apagados.'))return;
   const previous={runbookModel:p.data.runbookModel,runbookStorageKey:p.data.runbookStorageKey,runbookWorkbookBase64:p.data.runbookWorkbookBase64,runbookFilename:p.data.runbookFilename};
   delete p.data.runbookModel;delete p.data.runbookStorageKey;delete p.data.runbookWorkbookBase64;delete p.data.runbookFilename;
   try{save()}catch(error){Object.assign(p.data,previous);toast('Não foi possível atualizar os dados do projeto.');return}
   try{await RunbookStorage.remove(p.id)}catch(error){console.warn('Não foi possível apagar o arquivo antigo:',error)}
   $('#runbookPreview').textContent='';$('#clearRunbookImport').hidden=true;toast('Modelo de Runbook removido deste projeto.');
 };
 $('#projectCsv').onchange=async e=>{
   const file=e.target.files[0];if(!file)return;
   $('#clearProjectImport').hidden=false;
   try{
     stagedActivity=await readTabularFile(file);
     if(!stagedActivity.headers.length)throw Error('Não encontrei cabeçalhos.');
     const checked=prepareActivitySpreadsheet(stagedActivity,p,'new');
     $('#projectPreview').innerHTML=`<p><b>Prévia detectada:</b> ${stagedActivity.rows.length} linhas · ${stagedActivity.headers.length} campos · <strong>${checked.entries.length} atividades novas</strong> · ${checked.already} já cadastradas · ${checked.repeated} repetidas.</p><div class="small">${stagedActivity.headers.map(esc).join(' · ')}</div><button id="confirmProjectImport">OK — aplicar modelo e importar atividades</button>`;
     $('#confirmProjectImport').onclick=()=>{const data=stagedActivity;if(!data)return;try{const current=prepareActivitySpreadsheet(data,p,'new');const old=p.data.activityTemplate;p.data.activityTemplate=[...data.headers];p.data.extraFields=p.data.extraFields||[];try{const added=commitNewActivitySpreadsheet(p,data,current);log('Modelo de projeto importado',`${getName(p)}: ${added} atividades`);toast(`Modelo aplicado: ${data.headers.length} campos e ${added} atividades novas; ${current.already} duplicada(s) ignorada(s).`);renderAdmin()}catch(err){p.data.activityTemplate=old;throw err}}catch(err){$('#projectPreview').insertAdjacentHTML('beforeend',`<p class="activity-import-error">${esc(err.message)}</p>`)}};
   }catch(err){stagedActivity=null;$('#projectPreview').textContent='Não foi possível ler esse arquivo. Confira se é uma planilha válida e tente novamente. Detalhe: '+err.message}
 };
 $('#projectRunbook').onchange=async e=>{
   const file=e.target.files[0];if(!file)return;
   $('#clearRunbookImport').hidden=false;
   const preview=$('#runbookPreview');preview.textContent='Lendo abas, títulos e campos da planilha…';
   try{
     stagedRunbook=await RunbookModel.read(file);
     const {model}=stagedRunbook;
     preview.innerHTML=`<p><b>Modelo identificado:</b> ${model.sections.length} seções e ${model.total} espaços para evidências/fotografias.</p><div class="runbook-import-summary">${model.sections.map(sec=>`<div><b>${esc(sec.title)}</b> <span class="small muted">(${sec.items.length} campos)</span><ul>${sec.items.map(item=>`<li>${esc(item.title)}${item.description?`<small>${esc(item.description)}</small>`:''}</li>`).join('')}</ul></div>`).join('')}</div>${stagedRunbook.converted?'<p class="small muted">O arquivo foi convertido para XLSX para permitir exportação com imagens; revise a formatação do resultado.</p>':''}<button id="confirmRunbookImport">Aplicar este modelo ao projeto</button>`;
     $('#confirmRunbookImport').onclick=async()=>{
       const current=stagedRunbook;if(!current)return;
       const btn=$('#confirmRunbookImport');btn.disabled=true;btn.textContent='Salvando modelo no navegador…';
       const previous={runbookModel:p.data.runbookModel,runbookStorageKey:p.data.runbookStorageKey,runbookWorkbookBase64:p.data.runbookWorkbookBase64,runbookFilename:p.data.runbookFilename};
       let oldBuffer=null;
       try{
         oldBuffer=await RunbookStorage.get(p.id);
         await RunbookStorage.put(p.id,current.workbookBuffer);
         p.data.runbookModel=current.model;
         p.data.runbookStorageKey=p.id;
         p.data.runbookFilename=current.filename;
         delete p.data.runbookWorkbookBase64;
         try{save()}
         catch(error){
           Object.assign(p.data,previous);
           if(previous.runbookStorageKey===undefined)delete p.data.runbookStorageKey;
           if(previous.runbookWorkbookBase64===undefined)delete p.data.runbookWorkbookBase64;
           if(oldBuffer)await RunbookStorage.put(p.id,oldBuffer);else await RunbookStorage.remove(p.id);
           throw new Error('O banco de atividades no armazenamento local está cheio. O arquivo do Runbook foi preservado, mas outros dados podem precisar de espaço.');
         }
         try{log('Modelo de Runbook importado',`${getName(p)}: ${current.model.sections.length} seções, ${current.model.total} imagens`)}catch(error){console.warn('Não foi possível acrescentar registro de auditoria:',error)}
         stagedRunbook=null;
         toast(`Runbook configurado: ${current.model.sections.length} seções e ${current.model.total} campos`);
         renderAdmin();
       }catch(err){console.error('Erro ao guardar Runbook:',err);preview.insertAdjacentHTML('beforeend',`<p class="small import-error">Não foi possível armazenar o Runbook: ${esc(err.message)}. Verifique se o armazenamento de sites está habilitado neste navegador.</p>`);btn.disabled=false;btn.textContent='Aplicar este modelo ao projeto'}
     };
   }catch(err){stagedRunbook=null;preview.textContent='Não foi possível interpretar o modelo. '+err.message}
 };
 const sectionInput=$('#extraSectionName'),addSectionButton=$('#addExtraSection'),deleteSectionButton=$('#deleteSelectedSection');
 const defaultSections=['Equipamento','Link','Localização / Unidade','Outras informações'];
 const matchingSection=()=>[...defaultSections,...(p.data.extraSections||[])].filter(x=>!(p.data.removedDefaultSections||[]).includes(x)).find(x=>x.toLocaleLowerCase('pt-BR')===sectionInput.value.trim().toLocaleLowerCase('pt-BR'));
 // Edição estrutural de campos padrão somente antes da importação/cadastro de atividades.
 const initialSetup=()=>p.data.setupOpen===true || (!arr('activities').some(a=>a.data.projectId===p.id || String(a.data.row?.EMPRESA||'').toLowerCase()===getName(p).toLowerCase()) && !(p.data.activityTemplate||[]).length);
 const syncSectionEditor=()=>{const name=sectionInput.value.trim(),match=matchingSection();addSectionButton.hidden=!name||!!match;deleteSectionButton.hidden=!match;const protectedSection=!!match&&defaultSections.includes(match)&&!initialSetup();deleteSectionButton.disabled=protectedSection;deleteSectionButton.title=protectedSection?'Seção padrão protegida após a configuração inicial':'Excluir seção selecionada';deleteSectionButton.setAttribute('aria-label',deleteSectionButton.title);};
 sectionInput.addEventListener('input',syncSectionEditor);sectionInput.addEventListener('change',syncSectionEditor);syncSectionEditor();
 addSectionButton.onclick=()=>{const name=sectionInput.value.trim();if(!name)return toast('Informe o nome da seção');if(matchingSection())return toast('Esta seção já existe');p.data.extraSections=p.data.extraSections||[];p.data.extraSections.push(name);save();renderAdmin();toast('Seção cadastrada')};
 deleteSectionButton.onclick=()=>{const name=matchingSection();if(!name)return toast('Selecione uma seção existente');const standard=defaultSections.includes(name);if(standard&&!initialSetup())return toast('Seções padrão só podem ser excluídas durante a criação inicial do projeto');
 const mappedSection=key=>{const extra=(p.data.extraFields||[]).find(x=>(typeof x==='string'?x:x.name)===key);if(extra)return typeof extra==='string'?'Outras informações':extra.section||'Outras informações';const n=key.toLocaleUpperCase('pt-BR');if(/TÉCNICO|TECNICO|RESPONSÁVEL|RESPONSAVEL/.test(n))return 'Outras informações';if(/ENDEREÇO|ENDERECO|COORDENADAS|EMPRESA|FORTINET|^ID$/.test(n))return 'Localização / Unidade';if(/UNIDADE|CLONAR|NETWORK|HOSTNAME|MUNIC[IÍ]PIO|EQUIPAMENTO|SERIAL|REPARO|MERAKI|^QTD$|^LOTE$|^ID VGR$/.test(n))return 'Equipamento';if(/LINK|DEDICADO|INTERNET|VELOCIDADE|OPERADORA|PRODUTO|MEIOS|^LP$|ATENDIMENTO/.test(n))return 'Link';return 'Outras informações'};
 const fields=[...new Set([...allProjectFieldNames(p),...(p.data.activityTemplate||[]),...(p.data.extraFields||[]).map(x=>typeof x==='string'?x:x.name),...arr('activities').filter(a=>a.data.projectId===p.id).flatMap(a=>Object.keys(a.data.row||{}))])].filter(x=>mappedSection(x)===name);
 const msg='Excluir a seção "'+name+'" e TODOS os '+fields.length+' campo(s) vinculados a ela? Os valores desses campos serão apagados permanentemente das atividades do projeto.';if(!confirm(msg))return;
 p.data.extraSections=(p.data.extraSections||[]).filter(x=>x!==name);p.data.removedDefaultSections=p.data.removedDefaultSections||[];if(standard&&!p.data.removedDefaultSections.includes(name))p.data.removedDefaultSections.push(name);
 p.data.removedProjectFields=[...new Set([...(p.data.removedProjectFields||[]),...fields])];p.data.extraFields=(p.data.extraFields||[]).filter(x=>!fields.includes(typeof x==='string'?x:x.name));p.data.activityTemplate=(p.data.activityTemplate||[]).filter(x=>!fields.includes(x));arr('activities').filter(a=>a.data.projectId===p.id).forEach(a=>fields.forEach(key=>{if(a.data.ed)delete a.data.ed[key];if(a.data.row)delete a.data.row[key]}));save();renderAdmin();toast('Seção e seus campos excluídos')};
 $('#openNewActivity').onclick=()=>openNewActivityDialog(p);$('#openAdminActivityEditor').onclick=openAdminActivityEditor;
 const fieldInput=$('#extraFieldName'),fieldSection=$('#extraFieldSection'),addFieldButton=$('#addExtraField'),deleteFieldButton=$('#deleteSelectedField');
 const projectFieldNames=()=>allProjectFieldNames(p);
 const matchingField=()=>projectFieldNames().find(n=>n.toLocaleLowerCase('pt-BR')===fieldInput.value.trim().toLocaleLowerCase('pt-BR'));
 const sectionForField=name=>{let extra=(p.data.extraFields||[]).find(x=>(typeof x==='string'?x:x.name)===name);if(extra)return typeof extra==='string'?'Outras informações':extra.section||'Outras informações';let n=name.toLocaleUpperCase('pt-BR');if(/TÉCNICO|TECNICO|RESPONSÁVEL|RESPONSAVEL/.test(n))return 'Localização / Unidade';if(/ENDEREÇO|ENDERECO|COORDENADAS|EMPRESA|FORTINET|^ID$/.test(n))return 'Localização / Unidade';if(/UNIDADE|CLONAR|NETWORK|HOSTNAME|MUNIC[IÍ]PIO|EQUIPAMENTO|SERIAL|REPARO|MERAKI|^QTD$|^LOTE$|^ID VGR$/.test(n))return 'Equipamento';if(/LINK|DEDICADO|INTERNET|VELOCIDADE|OPERADORA|PRODUTO|MEIOS|^LP$|ATENDIMENTO/.test(n))return 'Link';return 'Equipamento'};
 const syncFieldEditor=()=>{let match=matchingField(),hasName=!!fieldInput.value.trim();if(match){fieldSection.value=sectionForField(match);fieldSection.disabled=true}else fieldSection.disabled=false;addFieldButton.hidden=!hasName||!!match;deleteFieldButton.hidden=!match;deleteFieldButton.disabled=!!match&&!initialSetup()&&!(p.data.extraFields||[]).some(x=>(typeof x==='string'?x:x.name)===match);deleteFieldButton.title=deleteFieldButton.disabled?'Campo padrão protegido após configuração inicial':'Excluir campo selecionado';};
 fieldInput.addEventListener('input',syncFieldEditor);fieldInput.addEventListener('change',syncFieldEditor);syncFieldEditor();
 addFieldButton.onclick=()=>{let name=fieldInput.value.trim(),section=fieldSection.value;if(!name)return toast('Informe o nome do campo');if(matchingField())return toast('Esse campo já existe');p.data.extraFields=p.data.extraFields||[];p.data.extraFields.push({name,section});p.data.removedProjectFields=(p.data.removedProjectFields||[]).filter(x=>x.toLocaleLowerCase('pt-BR')!==name.toLocaleLowerCase('pt-BR'));save();renderAdmin();toast('Campo cadastrado em todas as atividades do projeto')};
 deleteFieldButton.onclick=()=>{let name=matchingField();if(!name)return;if(!initialSetup() && !(p.data.extraFields||[]).some(x=>(typeof x==='string'?x:x.name)===name))return toast('Campos padrão só podem ser excluídos na configuração inicial');if(!confirm('Excluir o campo "'+name+'" do projeto e de todas as atividades? Os valores preenchidos serão apagados.'))return;p.data.removedProjectFields=[...new Set([...(p.data.removedProjectFields||[]),name])];p.data.extraFields=(p.data.extraFields||[]).filter(x=>(typeof x==='string'?x:x.name)!==name);p.data.activityTemplate=(p.data.activityTemplate||[]).filter(x=>x!==name);arr('activities').filter(a=>a.data.projectId===p.id).forEach(a=>{if(a.data.ed)delete a.data.ed[name];if(a.data.row)delete a.data.row[name]});save();renderAdmin();toast('Campo excluído do projeto')};


}
}
async function validateUpload(file,category='spreadsheet'){
 if(!(file instanceof File)||file.size===0)throw Error('Arquivo inválido ou vazio.');
 const limits={spreadsheet:8*1024*1024,runbook:8*1024*1024,image:3*1024*1024};
 if(file.size>limits[category])throw Error('Arquivo excede o limite de '+(limits[category]/1048576)+' MB.');
 const ext=(file.name.split('.').pop()||'').toLowerCase();
 const allowed=category==='image'?['png','jpg','jpeg','webp','gif']:
   category==='runbook'?['xls','xlsx','xlsm','ods']:['xls','xlsx','xlsm','ods','docx','csv','txt','tsv'];
 if(!allowed.includes(ext))throw Error('Extensão de arquivo não permitida: '+esc(ext));
 const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const begins=(...signature)=>signature.every((b,i)=>bytes[i]===b);
 const zip=begins(0x50,0x4b,0x03,0x04),ole=begins(0xd0,0xcf,0x11,0xe0);
 if(['xlsx','xlsm','ods','docx'].includes(ext)&&!zip)throw Error('A assinatura interna do arquivo não corresponde à extensão.');
 if(ext==='xls'&&!ole)throw Error('Arquivo XLS inválido (assinatura OLE ausente).');
 if(category==='image'){
   const valid=ext==='png'?begins(0x89,0x50,0x4e,0x47):
     ['jpg','jpeg'].includes(ext)?begins(0xff,0xd8,0xff):
     ext==='gif'?begins(0x47,0x49,0x46,0x38):
     ext==='webp'?begins(0x52,0x49,0x46,0x46)&&String.fromCharCode(...bytes.slice(8,12))==='WEBP':false;
   if(!valid)throw Error('A imagem não corresponde ao formato declarado.');
   if(!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type))
     throw Error('Tipo MIME de imagem não permitido.');
 }
 return ext;
}
async function readTabularFile(file){
 const ext=await validateUpload(file),maxRows=5002,maxColumns=200;
 let matrix=[],sheetName='';
 if(['xls','xlsx','xlsm','ods'].includes(ext)){
   if(!window.XLSX)throw Error('Biblioteca de leitura de planilhas indisponível.');
   const wb=XLSX.read(await file.arrayBuffer(),{type:'array',sheetRows:maxRows,cellDates:true});
   const candidates=[];
   for(const sheetName of wb.SheetNames){
    const sheet=wb.Sheets[sheetName];if(!sheet?.['!ref'])continue;
    const bounds=XLSX.utils.decode_range(sheet['!ref']);
    // Alguns diários possuem formatação até a última coluna do Excel.
    // Limitar a leitura às 200 primeiras colunas evita falsas falhas de tamanho.
    const range=XLSX.utils.encode_range({s:{r:bounds.s.r,c:0},e:{r:Math.min(bounds.e.r,maxRows-1),c:Math.min(bounds.e.c,maxColumns-1)}});
    const values=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true,blankrows:false,range}).map(row=>row.map(importedCell));
    const index=values.slice(0,40).findIndex(row=>importVgrHeader(row)&&row.filter(v=>String(v).trim()).length>=2);
    if(index<0)continue;
    const nonempty=values.slice(index+1).filter(row=>row.some(v=>String(v??'').trim()));
    const idPosition=values[index].findIndex(h=>importVgrHeader([h]));
    const validIds=nonempty.filter(row=>importVgrKey(row[idPosition])).length;
    if(validIds)candidates.push({matrix:values.slice(index),validIds,sheetName});
   }
   if(!candidates.length)throw Error('Não foi encontrada uma aba com a coluna ID VGR e registros de atividades. Verifique as abas da planilha.');
   candidates.sort((a,b)=>b.validIds-a.validIds);
   matrix=candidates[0].matrix;sheetName=candidates[0].sheetName;
 }else if(ext==='docx'){
   if(!window.mammoth)throw Error('Biblioteca DOCX indisponível.');
   const result=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});
   const doc=new DOMParser().parseFromString(result.value,'text/html');
   const table=doc.querySelector('table');
   matrix=table?[...table.rows].map(tr=>[...tr.cells].map(td=>td.textContent.trim())):
     result.value.replace(/<[^>]+>/g,'\n').split(/\n+/).map(x=>[x.trim()]).filter(r=>r[0]);
 }else{
   const text=await file.text();if(text.includes('\u0000'))throw Error('Texto contém bytes inválidos.');
   matrix=parseCSV(text);
 }
 if(matrix.length>=maxRows)throw Error('Planilha acima de 5.000 linhas. Importe em lotes menores.');
 if(matrix.some(row=>row.length>maxColumns||row.some(v=>String(v??'').length>4000)))
   throw Error('Planilha com colunas ou campos excessivamente longos.');
 matrix=matrix.filter(r=>Array.isArray(r)&&r.some(v=>String(v??'').trim()));
 if(!matrix.length)throw Error('Arquivo vazio.');
 const headerRow=matrix.slice(0,40).findIndex(r=>!!importVgrHeader(r));
 if(headerRow>0)matrix=matrix.slice(headerRow);
 // Descarta colunas inteiramente vazias à direita, sem deslocar o ID VGR.
 const lastUsedColumn=matrix.reduce((max,row)=>Math.max(max,row.findLastIndex(v=>String(v??'').trim())),0);
 const headers=matrix[0].slice(0,lastUsedColumn+1).map((h,i)=>String(h??'').trim()||`Campo ${i+1}`);
 const rows=matrix.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'').trim()])));
 return {headers,rows,sheetName};
}
function parseCSV(t){let out=[],row=[],cell='',q=false;for(let i=0;i<t.length;i++){let c=t[i];if(c==='"'&&q&&t[i+1]==='"'){cell+='"';i++}else if(c==='"')q=!q;else if((c===','||c===';'||c==='\t')&&!q){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&t[i+1]==='\n')i++;row.push(cell);out.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);out.push(row)}return out}
function downloadCSV(name,rows){
 const keys=[...new Set(rows.flatMap(o=>Object.keys(o||{})))];
 const safe=value=>{
  let text=typeof value==='object'&&value!==null?JSON.stringify(value):String(value??'');
  if(/^[\t\r\n ]*[=+\-@]/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
 };
 const csv=[keys,...rows.map(obj=>keys.map(k=>safe(obj[k])))].map(row=>row.join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
// Reinicializacao unica dos dados de teste nesta versao publicada.
// Mantem apenas a preferencia visual; nao altera dados de outros dominios.
function resetTestDataOnce(){
  const marker='gi_clean_install_20261027_v1';
  if(localStorage.getItem(marker)==='done')return;
  for(let i=localStorage.length-1;i>=0;i--){
    const key=localStorage.key(i);
    if(key==='gestaoImplantacaoDB'||(key&&key.startsWith('gi_')&&key!=='gi_theme'))localStorage.removeItem(key);
  }
  localStorage.setItem(marker,'done');
}
async function migrateLegacyRunbookFiles(){
 // Conversão automática e segura de modelos antigos que ocupavam localStorage.
 for(const p of arr('projects')){
   const old=p?.data?.runbookWorkbookBase64;
   if(!old)continue;
   try{
     const bytes=Uint8Array.from(atob(old),c=>c.charCodeAt(0));
     await RunbookStorage.put(p.id,bytes.buffer);
     p.data.runbookStorageKey=p.id;delete p.data.runbookWorkbookBase64;
     try{save()}catch(err){p.data.runbookWorkbookBase64=old;delete p.data.runbookStorageKey;throw err}
   }catch(err){console.warn('Modelo antigo preservado no armazenamento anterior:',err)}
 }
}
async function migrateLegacyBrowserData(){
 if(!isRootAdmin())throw Error('Somente administrador pode migrar dados.');
 let old;
 try{old=JSON.parse(localStorage.getItem('gestaoImplantacaoDB')||'null')}
 catch(error){return toast('O banco local antigo está ilegível: '+error.message)}
 if(!old||!Array.isArray(old.projects)||!Array.isArray(old.activities))return toast('Não há dados locais válidos para migrar.');
 if(!confirm(`Revisar e importar até ${old.projects.length} projeto(s) e ${old.activities.length} atividade(s) deste computador? Os usuários/senhas locais NÃO serão copiados.`))return;
 let addedProjects=0,addedActs=0,addedRunbooks=0,skipped=0,files=0;
 const projectIds=new Set(arr('projects').map(p=>p.id));
 for(const p of old.projects){
  if(!p?.id||!p.data||projectIds.has(p.id))continue;
  if(!/^[\w:-]{1,150}$/.test(p.id)){skipped++;continue}
  DB.projects.push({id:p.id,data:p.data});projectIds.add(p.id);addedProjects++;
 }
 const activityIds=new Set(arr('activities').map(a=>a.id));
 const vgrSet=new Set(arr('activities').map(a=>a.data?.projectId+'|'+activityVgrKey(a)).filter(x=>!x.endsWith('|')));
 for(const a of old.activities){
  if(!a?.id||!a.data||activityIds.has(a.id)||!projectIds.has(a.data.projectId)){skipped++;continue}
  const vgr=activityVgrKey(a),composite=a.data.projectId+'|'+vgr;
  if(vgr&&vgrSet.has(composite)){skipped++;continue}
  DB.activities.push({id:a.id,data:a.data});activityIds.add(a.id);
  if(vgr)vgrSet.add(composite);addedActs++;
 }
 const runbookIds=new Set(arr('runbooks').map(r=>r.id));
 for(const r of old.runbooks||[]){
  if(!r?.id||!r.data||runbookIds.has(r.id)||!activityIds.has(r.data.activityId)){skipped++;continue}
  DB.runbooks.push({id:r.id,data:r.data});runbookIds.add(r.id);addedRunbooks++;
 }
 try{
  GICloud.queueSave(DB);await GICloud.flush();
  // Arquivos antigos permanecem no IndexedDB; copiamos sem apagá-los de lá.
  if('indexedDB' in window){
   const idb=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('gestaoImplantacaoArquivos',1);
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
   if(idb.objectStoreNames.contains('runbooks')){
    const entries=await new Promise((resolve,reject)=>{
     const tx=idb.transaction('runbooks','readonly'),store=tx.objectStore('runbooks');
     const result=[];store.openCursor().onsuccess=e=>{const c=e.target.result;if(c){result.push([c.key,c.value]);c.continue()}};
     tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);
    });
    for(const [key,value] of entries){
     const projectKey=String(key).startsWith('runbook-imagens:')?String(key).split(':')[1]:String(key);
     if(!projectIds.has(projectKey))continue;
     try{await RunbookStorage.put(key,value);files++}catch(error){console.warn('Arquivo local não migrado:',key,error)}
    }
   }
   idb.close();
  }
  await migrateLegacyRunbookFiles();await GICloud.waitForSaves();
  DB=await GICloud.loadAll();renderAdmin();
  toast(`Migração concluída: ${addedProjects} projeto(s), ${addedActs} atividade(s), ${addedRunbooks} runbook(s), ${files} arquivo(s); ${skipped} ignorado(s).`,9000);
 }catch(error){toast('Migração incompleta: '+error.message+' — mantenha os dados locais e confira o servidor.',10000)}
}
async function init(){
 const themeBtn=document.getElementById('themeToggle');
 const setTheme=(mode)=>{document.documentElement.dataset.theme=mode;localStorage.setItem('gi_theme',mode);themeBtn?.setAttribute('aria-label',mode==='light'?'Ativar tema escuro':'Ativar tema claro');themeBtn?.setAttribute('title',mode==='light'?'Ativar tema escuro':'Ativar tema claro')};
 setTheme(localStorage.getItem('gi_theme')==='light'?'light':'dark');
 if(themeBtn)themeBtn.onclick=()=>setTheme(document.documentElement.dataset.theme==='light'?'dark':'light');
 DB={activities:[],analysts:[],log:[],projects:[],runbooks:[],users:[]};
 document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',e=>{
  if(e.ctrlKey||e.metaKey||e.shiftKey||e.button!==0)return;
  if(b.dataset.page==='admin'&&!isAdmin()){e.preventDefault();return toast('Acesso exclusivo do gestor ou administrador')}
  e.preventDefault();page=b.dataset.page;selectedActivity=null;render();
 }));
 const requested=new URLSearchParams(location.search);
 if(['home','runbook','logs','admin'].includes(requested.get('page')))page=requested.get('page');
 try{
   await GICloud.initialize();
   const current=await GICloud.getProfile();
   if(current)await giEnterApp();else showLogin();
 }catch(error){console.error('Inicialização Supabase',error);showLogin(error.message)}
 setInterval(()=>document.querySelectorAll('.elapsed[data-start]').forEach(el=>el.textContent='◴ '+elapsed(el.dataset.start)),1000);
}
init();


// Relatório flexível por colunas, status, analistas e formato.
function formatReportDateTime(value){if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})}
function formatReportHistory(a){
 const history=Array.isArray(a.data?.history)?a.data.history:[];
 return history.map(entry=>{
  const date=new Date(entry.at||'');
  const when=Number.isNaN(date.getTime())?'Data não informada':date.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  return `${when} · ${String(entry.analyst||entry.user||'Sem analista')} · ${String(entry.status||'Sem status')}`;
 }).join('\n');
}
function reportDateMatches(a,day){const d=a.data||{};if(!day)return true;return [d.startAt,d.endAt,d.createdAt,d.updatedAt,...(d.history||[]).map(h=>h.at)].some(t=>localDay(t)===day)||activityDate(a)===day}
// A opção "Usar filtro da tela" respeita inclusive a pesquisa e os itens carregados.
function reportVisibleActivities(activities){
 const byId=new Map(activities.map(a=>[String(a.id),a]));
 return [...document.querySelectorAll('#activityList .activity-line[data-view]')]
  .map(line=>byId.get(line.dataset.view)).filter(Boolean);
}

// O SheetJS da aplicação grava os dados; o JSZip aplica o estilo no XML do Excel.
// Assim o relatório recebe cabeçalho roxo mesmo usando o SheetJS Community.
async function styleActivityReportWorkbook(bytes,historyColumn='',historyLines=[]){
 if(!window.JSZip)throw new Error('Biblioteca de formatação do Excel indisponível.');
 const zip=await JSZip.loadAsync(bytes);
 const sheet=zip.file('xl/worksheets/sheet1.xml');
 if(!sheet)throw new Error('Aba de atividades não encontrada no arquivo.');
 let xml=await sheet.async('string');
 const header=xml.match(/<(?:[\w-]+:)?row\b(?=[^>]*\br="1")[^>]*>[\s\S]*?<\/(?:[\w-]+:)?row>/);
 if(!header)throw new Error('Cabeçalho do relatório não encontrado.');
 const styledHeader=header[0]
  .replace(/^<((?:[\w-]+:)?row)\b([^>]*)>/,(tag,name,attrs)=>`<${name}${attrs.replace(/\s+(?:ht|customHeight)="[^"]*"/g,'')} ht="28" customHeight="1">`)
  .replace(/<((?:[\w-]+:)?c)\b([^>]*?)(\/?)>/g,(tag,name,attrs,slash)=>`<${name}${attrs.replace(/\s+s="[^"]*"/g,'')} s="1"${slash}>`);
 xml=xml.replace(header[0],styledHeader);
 if(historyColumn){
  xml=xml.replace(/<((?:[\w-]+:)?row)\b([^>]*)>([\s\S]*?)<\/\1>/g,(rowXml,rowTag,attrs,content)=>{
   const rowNumber=Number(attrs.match(/\br="(\d+)"/)?.[1]);
   const lines=historyLines[rowNumber-2]||0;
   if(rowNumber<2||!lines)return rowXml;
   const ref=historyColumn+rowNumber;
   const cellPattern=new RegExp(`<((?:[\\w-]+:)?c)\\b([^>]*\\br="${ref}"[^>]*)(\\/?)>`);
   const styled=content.replace(cellPattern,(cell,cellTag,cellAttrs,slash)=>`<${cellTag}${cellAttrs.replace(/\s+s="[^"]*"/g,'')} s="2"${slash}>`);
   if(styled===content)return rowXml;
   const height=Math.min(395,Math.max(28,lines*17+8));
   return `<${rowTag}${attrs.replace(/\s+(?:ht|customHeight)="[^"]*"/g,'')} ht="${height}" customHeight="1">${styled}</${rowTag}>`;
  });
 }
 zip.file('xl/worksheets/sheet1.xml',xml);
 const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  +'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  +'<fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts>'
  +'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF351C4F"/><bgColor indexed="64"/></patternFill></fill></fills>'
  +'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  +'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  +'<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  +'<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
  +'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs>'
  +'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/>'
  +'<tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/>'
  +'</styleSheet>';
 if(!zip.file('xl/styles.xml')){
  const contentFile=zip.file('[Content_Types].xml');
  const relFile=zip.file('xl/_rels/workbook.xml.rels');
  if(!contentFile||!relFile)throw new Error('Estrutura de estilos do Excel incompleta.');
  const content=await contentFile.async('string'),rels=await relFile.async('string');
  zip.file('[Content_Types].xml',content.replace('</Types>','<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'));
  zip.file('xl/_rels/workbook.xml.rels',rels.replace('</Relationships>','<Relationship Id="rIdReportStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'));
 }
 zip.file('xl/styles.xml',styles);
 return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
// Único gerador para o arquivo baixado e para o analítico do informe.
async function buildActivityReportFile(selection,format='xlsx'){
 const {p,rows,chosen}=selection;
 const matrix=[chosen.map(c=>c[0]),...rows.map(a=>chosen.map(c=>String(c[1](a)??'')))];
 const filename='Relatorio_'+String(getName(p)).replace(/[^a-zA-Z0-9_-]+/g,'_')+'_'+localDay(new Date())+'.'+format;
 if(format==='csv'){
  const safe=v=>{let x=String(v??'');if(/^[\s]*[=+@\-]/.test(x))x="'"+x;return '"'+x.replace(/"/g,'""')+'"'};
  return {filename,blob:new Blob(['\ufeff'+matrix.map(row=>row.map(safe).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'})};
 }
 // Exportador XLSX local, inclusive sem acesso ao CDN do SheetJS.
 if(format==='xlsx'&&!window.XLSX&&window.JSZip){
  const xmlEscape=value=>String(value??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
  const colAt=index=>{let out='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;return out};
  const widths=matrix[0].map((heading,i)=>{
   const longest=matrix.reduce((max,row)=>Math.max(max,...String(row[i]??'').split(/\r?\n/).map(line=>Math.min(line.length,70))),0);
   return heading==='Histórico'?Math.min(74,Math.max(62,longest+5)):Math.min(60,Math.max(/observ|descri|endere|localidade|coment|detalh/i.test(heading)?30:15,longest+3));
  });
  const rowsXml=matrix.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((value,j)=>
   '<c r="'+colAt(j)+(i+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xmlEscape(value)+'</t></is></c>').join('')+'</row>').join('');
  const sheetXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
   '<dimension ref="A1:'+colAt(chosen.length-1)+matrix.length+'"/><sheetViews><sheetView workbookViewId="0"/></sheetViews>'+
   '<sheetFormatPr defaultRowHeight="15"/><cols>'+widths.map((width,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+width+'" customWidth="1"/>').join('')+
   '</cols><sheetData>'+rowsXml+'</sheetData><autoFilter ref="A1:'+colAt(chosen.length-1)+matrix.length+'"/></worksheet>';
  const zip=new JSZip();
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Atividades" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
  zip.file('xl/worksheets/sheet1.xml',sheetXml);
  const historyIndex=chosen.findIndex(c=>c[0]==='Histórico');
  const historyLines=historyIndex<0?[]:matrix.slice(1).map(row=>String(row[historyIndex]||'').split('\n').length);
  const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
  const styled=await styleActivityReportWorkbook(bytes,historyIndex<0?'':colAt(historyIndex),historyLines);
  return {filename,blob:new Blob([styled],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})};
 }
 if(!window.XLSX)throw new Error('Biblioteca de planilhas indisponível. Verifique a conexão ou selecione CSV.');
 const wb=XLSX.utils.book_new(),sheet=XLSX.utils.aoa_to_sheet(matrix);
 sheet['!cols']=matrix[0].map((heading,i)=>{
  const longest=matrix.reduce((max,row)=>Math.max(max,...String(row[i]??'').split(/\r?\n/).map(line=>Math.min(line.length,70))),0);
  if(heading==='Histórico')return {wch:Math.min(74,Math.max(62,longest+5))};
  const longField=/observ|descri|endere|localidade|coment|detalh|hist[oó]r/i.test(heading);
  return {wch:Math.min(60,Math.max(longField?30:15,longest+3))};
 });
 sheet['!rows']=[{hpt:28}];
 sheet['!autofilter']={ref:'A1:'+XLSX.utils.encode_col(chosen.length-1)+matrix.length};
 XLSX.utils.book_append_sheet(wb,sheet,'Atividades');
 const bytes=XLSX.write(wb,{bookType:format==='xls'?'biff8':format==='xlsm'?'xlsm':'xlsx',type:'array',cellStyles:true});
 const historyIndex=chosen.findIndex(c=>c[0]==='Histórico');
 const historyColumn=historyIndex<0?'':XLSX.utils.encode_col(historyIndex);
 const historyLines=historyIndex<0?[]:matrix.slice(1).map(row=>{
  const value=row[historyIndex],charsPerLine=Math.max(25,Math.floor(sheet['!cols'][historyIndex].wch*.82));
  return value?value.split('\n').reduce((count,line)=>count+Math.max(1,Math.ceil(line.length/charsPerLine)),0):0;
 });
 const result=format==='xlsx'||format==='xlsm'?await styleActivityReportWorkbook(bytes,historyColumn,historyLines):bytes;
 return {filename,blob:new Blob([result],{type:'application/octet-stream'})};
}
function downloadReportFile(file){
 const url=URL.createObjectURL(file.blob),link=document.createElement('a');
 link.href=url;link.download=file.filename;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function informeSummary(selection){
 const counts=new Map();
 for(const a of selection.rows){
  const status=String(a.data?.status||'Pendente');
  counts.set(status,(counts.get(status)||0)+1);
 }
 const order=['Pendente','Em andamento','Migrada','Quebra','Abandonada'];
 const statuses=[...counts].sort((a,b)=>{
  const ai=order.indexOf(a[0]),bi=order.indexOf(b[0]);
  return (ai<0?99:ai)-(bi<0?99:bi)||a[0].localeCompare(b[0],'pt-BR');
 });
 return {statuses,total:selection.rows.length,projectName:getName(selection.p),date:new Date().toLocaleDateString('pt-BR')};
}
function informePanelHtml(summary){
 const counts=summary.statuses.map(([name,count])=>{
  const tone=normStatus(name)==='Migrada'?'#56cf90':normStatus(name)==='Quebra'?'#ffa875':normStatus(name)==='Em andamento'?'#b58bea':'#82b2f3';
  return '<td style="padding:5px;vertical-align:top"><div style="border-radius:9px;border-left:4px solid '+tone+';background:#614777;padding:11px 16px;min-width:110px;box-sizing:border-box">'+
   '<div style="color:#ffffff;font-size:12px;font-weight:bold">'+esc(name)+'</div><div style="color:#ffffff;font-size:24px;font-weight:bold;margin-top:6px">'+count+'</div></div></td>';
 }).join('');
 return '<section class="informe-body-panel" contenteditable="false" style="background:#39244f;color:#fff;border:0;box-shadow:4px 7px 17px rgba(20,6,31,.36);border-radius:13px;padding:17px 16px;margin:18px 0">'+
  '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">'+
  '<div><div style="font-size:10px;color:#d8abf2;letter-spacing:1px;font-weight:bold">PAINEL DE ATIVIDADES</div>'+
  '<div style="font-size:20px;font-weight:bold;margin:5px 0">'+esc(summary.projectName)+'</div>'+
  '<div style="font-size:12px;color:#e5d1ee">'+esc(summary.date)+' · conforme filtros do relatório</div></div>'+
  '<div style="background:#8629c3;color:white;text-align:center;border-radius:10px;min-width:70px;padding:8px 12px">'+
  '<div style="font-size:11px">Total</div><div style="font-size:27px;font-weight:bold">'+summary.total+'</div></div></div>'+
  '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:13px -5px 8px;max-width:100%;border-collapse:separate"><tr>'+counts+'</tr></table>'+
  '<p style="font-size:11px;color:#e3d1ec;margin:7px 0 0">O relatório analítico de '+summary.total+' atividade(s) está anexado a esta mensagem.</p>'+
  '</section>';
}
function informeEditorContent(editor){
 const cloned=editor.cloneNode(true);
 cloned.querySelectorAll('script,style,iframe,object,embed,form,svg,math,meta,link,base,video,audio').forEach(el=>el.remove());
 const allowed=new Set(['DIV','SPAN','P','BR','B','STRONG','EM','I','U','S','UL','OL','LI','TABLE','TR','TD','TH','TBODY','THEAD','H1','H2','H3','SECTION','A']);
 [...cloned.querySelectorAll('*')].reverse().forEach(el=>{
  if(!allowed.has(el.tagName))el.replaceWith(...el.childNodes);
 });
 cloned.querySelectorAll('*').forEach(el=>{
  el.removeAttribute('contenteditable');
  for(const attr of [...el.attributes]){
   if(!['style','href','role','cellpadding','cellspacing','colspan','rowspan'].includes(attr.name)){
    el.removeAttribute(attr.name);continue;
   }
   if(attr.name==='style'&&(/url\s*\(|expression\s*\(|@import|behavior\s*:/i.test(attr.value)||attr.value.length>1000))el.removeAttribute('style');
   if(attr.name==='href'&&!/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(attr.value))el.removeAttribute('href');
  }
 });
 cloned.removeAttribute('contenteditable');
 return {html:'<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#30213f">'+cloned.innerHTML+'</div>',
  plain:editor.innerText.trim()};
}
function mimeBase64(input){
 const bytes=typeof input==='string'?new TextEncoder().encode(input):input;
 let raw='';for(let i=0;i<bytes.length;i+=16384)raw+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return btoa(raw).match(/.{1,76}/g)?.join('\r\n')||'';
}
async function createInformeEmailDraft({to,cc,from,subject,body,file}){
 const cleanHeader=value=>String(value||'').replace(/[\r\n]/g,' ').trim();
 const boundary='informe_mixed_'+Date.now().toString(36),alternative='informe_alternative_'+Date.now().toString(36);
 const fileName=cleanHeader(file.filename).replace(/["\\]/g,'_');
 const parts=['X-Unsent: 1','MIME-Version: 1.0','Date: '+new Date().toUTCString()];
 if(from)parts.push('From: <'+cleanHeader(from)+'>');
 parts.push('To: '+cleanHeader(to.join(', ')));
 if(cc.length)parts.push('Cc: '+cleanHeader(cc.join(', ')));
 parts.push('Subject: =?UTF-8?B?'+btoa(String.fromCharCode(...new TextEncoder().encode(subject)))+'?=');
 parts.push('Content-Type: multipart/mixed; boundary="'+boundary+'"','','This is a multipart message in MIME format.',
  '--'+boundary,'Content-Type: multipart/alternative; boundary="'+alternative+'"','',
  '--'+alternative,'Content-Type: text/plain; charset="utf-8"','Content-Transfer-Encoding: base64','',mimeBase64(body.plain),
  '--'+alternative,'Content-Type: text/html; charset="utf-8"','Content-Transfer-Encoding: base64','',mimeBase64(body.html),
  '--'+alternative+'--','',
  '--'+boundary,'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="'+fileName+'"',
  'Content-Transfer-Encoding: base64','Content-Disposition: attachment; filename="'+fileName+'"','',mimeBase64(new Uint8Array(await file.blob.arrayBuffer())),
  '--'+boundary+'--','');
 return {filename:'Informe_'+new Date().toISOString().slice(0,10)+'.eml',blob:new Blob([parts.join('\r\n')],{type:'message/rfc822'})};
}
function openInformeComposer(selection){
 document.getElementById('informeComposeOverlay')?.remove();
 const summary=informeSummary(selection),logged=currentUser();
 const emailPattern=/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
 const sender=GICloud.profile()?.email||'';
 const overlay=document.createElement('div');overlay.id='informeComposeOverlay';overlay.className='report-overlay informe-overlay';
 const plane='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></svg>';
 const cross='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
 overlay.innerHTML=`<div class="report-dialog informe-dialog" role="dialog" aria-modal="true" aria-labelledby="informeTitle">
  <div class="report-dialog-head informe-dialog-head"><div><h3 id="informeTitle">Enviar informe</h3><p class="small muted">Informe de ${esc(summary.projectName)} · ${summary.total} atividades selecionadas</p></div><button type="button" class="report-close" id="closeInforme" aria-label="Fechar informe">${cross}</button></div>
  <div class="informe-switch" role="group" aria-label="Tipo de envio"><button type="button" class="informe-tab is-active" data-mode="email">E-mail</button><button type="button" class="informe-tab" data-mode="teams">Fluxo de trabalho Teams</button></div>
  <div class="informe-outlook-header">
   <button type="button" id="informeSend" class="informe-send-button informe-send-top" title="Preparar rascunho com anexo">${plane}<span>Preparar</span></button>
   <div class="informe-mail-fields">
    <div class="informe-form" id="informeEmailForm">
     <div class="informe-outlook-row"><label class="informe-outlook-label" for="informeTo">Para</label><input id="informeTo" type="text" placeholder="Destinatários; separe os e-mails por ponto e vírgula" autocomplete="off"></div>
     <div class="informe-outlook-row"><label class="informe-outlook-label" for="informeCc">Cc</label><input id="informeCc" type="text" placeholder="Com cópia (opcional)" autocomplete="off"></div>
     <div class="informe-outlook-row informe-subject-row"><label class="informe-outlook-label" for="informeSubject">Assunto</label><input id="informeSubject" type="text" value="${esc('Atualização de atividades — '+summary.projectName+' — '+summary.date)}"></div>
     <div class="informe-from-row"><label for="informeFrom">De</label><input id="informeFrom" type="email" value="${esc(sender)}" readonly><span id="informeSenderHint">Remetente associado à sessão autenticada.</span></div>
    </div>
    <div class="informe-form" id="informeTeamsForm" hidden><div class="informe-form-grid"><label>Equipe<input id="informeTeam" type="text" placeholder="Nome da equipe"></label><label>Canal<input id="informeChannel" type="text" placeholder="Canal do Teams"></label><label class="informe-wide">Fluxo de trabalho<input id="informeWorkflow" type="text" placeholder="Nome do fluxo de trabalho do Power Automate"></label></div><p class="informe-hint">A postagem automática no fluxo será disponibilizada com a futura integração do Microsoft 365.</p></div>
   </div>
  </div>
  <div class="informe-attachment" id="informeAttachment" role="status" aria-live="polite">
   <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m8 12.5 7.2-7.2a3.2 3.2 0 0 1 4.5 4.5L10.1 19.4a5 5 0 0 1-7.1-7.1l9-9"/></svg>
   <div class="informe-attachment-meta"><strong id="informeAttachmentName">Preparando planilha analítica...</strong><small id="informeAttachmentDetail">A planilha será adicionada ao rascunho do informe.</small></div>
   <button type="button" class="secondary" id="informeDownload" disabled>Baixar anexo</button>
  </div>
  <div class="informe-editor-shell">
   <div class="informe-editor-toolbar" role="toolbar" aria-label="Formatação da mensagem">
    <button type="button" data-format="bold" aria-label="Negrito" title="Negrito (Ctrl+B)"><b>B</b></button>
    <button type="button" data-format="italic" aria-label="Itálico" title="Itálico (Ctrl+I)"><i>I</i></button>
    <button type="button" data-format="underline" aria-label="Sublinhado" title="Sublinhado (Ctrl+U)"><u>U</u></button>
    <button type="button" data-format="strikeThrough" aria-label="Tachado" title="Tachado"><s>S</s></button>
    <span class="informe-toolbar-divider"></span>
    <button type="button" data-format="insertUnorderedList" aria-label="Lista com marcadores" title="Lista com marcadores">• Lista</button>
    <button type="button" data-format="insertOrderedList" aria-label="Lista numerada" title="Lista numerada">1. Lista</button>
    <button type="button" data-format="formatBlock" data-value="h3" aria-label="Título" title="Título">Título</button>
    <label class="informe-toolbar-color" title="Cor do texto">Cor <input id="informeFontColor" type="color" value="#ffffff" aria-label="Selecionar cor do texto"></label>
   </div>
   <div class="informe-rich-editor" id="informeEditor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Corpo do informe com painel de status"><p>Olá,</p><p>Segue o informe de atividades do projeto ${esc(summary.projectName)}.</p>${informePanelHtml(summary)}<p>Atenciosamente,<br>${esc(logged)}</p></div>
  </div>
  <div class="informe-send-actions"><button type="button" class="secondary" id="informeCopy">Copiar conteúdo formatado</button><span class="informe-edit-hint">O painel faz parte do corpo da mensagem e será incluído no rascunho.</span></div>
  <p class="informe-draft-note" id="informeDraftNote">Modo local: “Preparar” baixa um rascunho .eml com o painel formatado e a planilha XLSX anexada. Abra esse arquivo em um cliente de e-mail compatível, confira o remetente e envie. Nenhuma mensagem é enviada automaticamente.</p>
 </div>`;
 document.body.appendChild(overlay);
 let mode='email';
 overlay.querySelector('#closeInforme').onclick=()=>overlay.remove();
 overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
 overlay.querySelectorAll('.informe-tab').forEach(tab=>tab.onclick=()=>{
  mode=tab.dataset.mode;
  overlay.querySelectorAll('.informe-tab').forEach(x=>x.classList.toggle('is-active',x===tab));
  overlay.querySelector('#informeEmailForm').hidden=mode!=='email';
  overlay.querySelector('#informeTeamsForm').hidden=mode!=='teams';
  overlay.querySelector('#informeDraftNote').textContent=mode==='email'
   ?'Modo local: “Preparar” baixa um rascunho .eml com o painel formatado e a planilha XLSX anexada. Abra esse arquivo em um cliente de e-mail compatível, confira o remetente e envie. Nenhuma mensagem é enviada automaticamente.'
   :'Modo local: o Teams abrirá em outra aba. O informe será copiado e a planilha baixada para anexação manual. Nenhuma postagem automática é feita.';
  overlay.querySelector('#informeSend span').textContent=mode==='email'?'Preparar':'Abrir Teams';
 });
 const editor=overlay.querySelector('#informeEditor'),formatButtons=overlay.querySelectorAll('.informe-editor-toolbar button[data-format]');
 overlay.querySelector('.informe-editor-toolbar').addEventListener('mousedown',e=>{if(e.target.closest('button[data-format]'))e.preventDefault()});
 formatButtons.forEach(button=>button.onclick=()=>{
  editor.focus();
  document.execCommand(button.dataset.format,false,button.dataset.value||null);
 });
 let lastSelection=null;
 const rememberSelection=()=>{
  const active=window.getSelection(),node=active?.anchorNode;
  if(node&&editor.contains(node)&&active.rangeCount)lastSelection=active.getRangeAt(0).cloneRange();
 };
 editor.addEventListener('keyup',rememberSelection);editor.addEventListener('mouseup',rememberSelection);
 overlay.querySelector('#informeFontColor').onchange=e=>{
  editor.focus();
  if(lastSelection){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(lastSelection)}
  document.execCommand('foreColor',false,e.target.value);
 };
 editor.addEventListener('paste',e=>{
  e.preventDefault();
  document.execCommand('insertText',false,e.clipboardData?.getData('text/plain')||'');
 });
 editor.addEventListener('drop',e=>e.preventDefault());
 let attachmentFile=null,attachmentTask=null;
 const ensureAttachment=()=>{
  if(!attachmentTask)attachmentTask=buildActivityReportFile(selection,'xlsx').then(file=>{
   attachmentFile=file;
   overlay.querySelector('#informeAttachmentName').textContent=file.filename;
   overlay.querySelector('#informeAttachmentDetail').textContent='Planilha XLSX anexada ao rascunho · '+(file.blob.size/1024).toFixed(1)+' KB · '+summary.total+' atividade(s)';
   overlay.querySelector('#informeAttachment').classList.add('is-ready');
   overlay.querySelector('#informeDownload').disabled=false;
   return file;
  }).catch(err=>{
   attachmentTask=null;
   overlay.querySelector('#informeAttachmentName').textContent='Falha ao preparar o anexo';
   overlay.querySelector('#informeAttachmentDetail').textContent=err.message+' — clique em Preparar para tentar novamente.';
   console.error('Erro ao anexar relatório:',err);
   throw err;
  });
  return attachmentTask;
 };
 ensureAttachment().catch(()=>{});
 overlay.querySelector('#informeDownload').onclick=async()=>{
  const button=overlay.querySelector('#informeDownload');button.disabled=true;
  try{const file=await ensureAttachment();downloadReportFile(file);toast('Anexo baixado: '+file.filename)}
  catch(err){console.error(err);toast('Falha ao gerar a planilha: '+err.message)}
  finally{button.disabled=!attachmentFile}
 };
 overlay.querySelector('#informeCopy').onclick=async()=>{
  try{
   const {html,plain}=informeEditorContent(editor);
   if(navigator.clipboard?.write&&window.ClipboardItem){
    await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([plain],{type:'text/plain'})})]);
   }else if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(plain);
   else throw new Error('Área de transferência indisponível');
   toast('Corpo do informe copiado com formatação.');
  }catch(err){console.warn('Cópia indisponível',err);toast('Não foi possível copiar automaticamente. Selecione o painel para copiar.')}
 };
 overlay.querySelector('#informeSend').onclick=async()=>{
  const button=overlay.querySelector('#informeSend');
  if(mode==='email'){
   const to=overlay.querySelector('#informeTo').value.trim(),cc=overlay.querySelector('#informeCc').value.trim(),subject=overlay.querySelector('#informeSubject').value.trim();
   const from=overlay.querySelector('#informeFrom').value.trim();
   const addresses=value=>value.split(/[;,]/).map(s=>s.trim()).filter(Boolean);
   if(!addresses(to).length||addresses(to).some(s=>!emailPattern.test(s))||addresses(cc).some(s=>!emailPattern.test(s)))return toast('Informe endereços de e-mail válidos nos campos Para e CC.');
   if(!subject)return toast('Informe o assunto do e-mail.');
   if(from&&!emailPattern.test(from))return toast('Corrija o e-mail do remetente ou deixe o campo De vazio.');
   button.disabled=true;
   try{
    const file=await ensureAttachment();
    const draft=await createInformeEmailDraft({to:addresses(to),cc:addresses(cc),from,subject,body:informeEditorContent(editor),file});
    draft.filename='Informe_'+String(summary.projectName).replace(/[^a-zA-Z0-9_-]+/g,'_')+'_'+localDay(new Date())+'.eml';
    downloadReportFile(draft);
    toast('Rascunho com planilha anexada! Abra o arquivo .eml baixado no Outlook para conferir e enviar.',8000);
   }catch(err){console.error(err);toast('Falha ao preparar o informe: '+err.message)}
   finally{button.disabled=false}
  }else{
   const teamsText=['Equipe: '+(overlay.querySelector('#informeTeam').value.trim()||'Não definida'),
    'Canal: '+(overlay.querySelector('#informeChannel').value.trim()||'Não definido'),
    'Fluxo de trabalho: '+(overlay.querySelector('#informeWorkflow').value.trim()||'Não definido'),informeEditorContent(editor).plain].join('\n');
   // Abrir durante o clique evita bloqueio da janela por políticas de pop-up.
   const teamsWindow=window.open('https://teams.microsoft.com/','_blank','noopener,noreferrer');
   button.disabled=true;
   try{
    const file=await ensureAttachment();downloadReportFile(file);
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(teamsText);
    toast('Informe preparado. Cole no Teams e anexe '+file.filename+'.',7000);
    if(!teamsWindow)toast('Planilha baixada. Abra o Teams manualmente e cole o informe.',7000);
   }catch(err){console.error(err);toast('Falha ao preparar o informe: '+err.message)}
   finally{button.disabled=false}
  }
 };
 overlay.querySelector('#informeTo').focus();
}
function openActivityReport(){
 document.getElementById('activityReportOverlay')?.remove();
 const acts=projectActivities(),p=project();
 const standard=[['ID VGR',a=>a.data.row?.['ID VGR']||''],['ID link',a=>a.data.ed?.idDedicado||a.data.row?.['ID DEDICADO']||''],['Nome da localidade',a=>a.data.row?.UNIDADE||a.data.row?.MUNICIPIO||''],['Nome do analista da atividade',a=>canonicalAnalystName(a.data.analystName)],['Data',a=>{let d=activityDate(a)||'';return /^\d{4}-\d{2}-\d{2}$/.test(d)?d.split('-').reverse().join('/'):d}],['Status',a=>a.data.status||'Pendente'],['Observação',a=>a.data.observations||a.data.observacoes||a.data.observacao||''],['Horário de início',a=>formatReportDateTime(a.data.startAt)],['Horário de término',a=>formatReportDateTime(a.data.endAt)],['Histórico',formatReportHistory]];
 const keys=[...new Set([...(p?.data?.activityTemplate||[]),...(p?.data?.extraFields||[]).map(f=>typeof f==='string'?f:f.name),...acts.flatMap(a=>Object.keys(a.data.row||{}))])].filter(Boolean);
 const columns=[...standard,...keys.filter(k=>!standard.some(c=>c[0].toLocaleUpperCase('pt-BR')===k.toLocaleUpperCase('pt-BR'))).map(k=>[k,a=>a.data.row?.[k]??a.data.ed?.[k]??''])];
 const statuses=[...new Set(['Pendente',...activeStatuses,'Migrada','Quebra','Abandonada',...acts.map(a=>a.data.status).filter(Boolean)])];
 const analysts=[...new Set(acts.map(a=>canonicalAnalystName(a.data.analystName)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const preferenceKey='gi_report_prefs_'+(p?.id||'')+'_'+currentUser().trim().toLowerCase();
  let preferences={};try{preferences=JSON.parse(localStorage.getItem(preferenceKey)||'{}')||{}}catch(e){preferences={}}
 const overlay=document.createElement('div');overlay.id='activityReportOverlay';overlay.className='report-overlay';
 const group=(items,cls)=>`<div class="report-options ${cls}">${items.map((label,i)=>`<label><input type="checkbox" value="${i}" ${cls==='report-fields'&&label==='Histórico'?'':'checked'}><span>${esc(label)}</span></label>`).join('')}</div>`;
 overlay.innerHTML=`<div class="report-dialog report-dialog-wide" role="dialog" aria-modal="true" aria-labelledby="reportTitle"><div class="report-dialog-head"><h3 id="reportTitle">Extrair relatório</h3><button type="button" class="report-close" aria-label="Fechar"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><p class="small muted">Escolha os campos e a origem das atividades. Suas opções ficam salvas neste navegador.</p><div class="report-date-filter"><label>Período <select id="reportPeriod"><option value="screen">Usar filtro da tela</option><option value="all">Todas as datas</option><option value="specific">Data específica</option></select></label><label class="report-date-picker" id="reportDatePicker">Selecionar data<input type="date" id="reportSelectedDate"></label><p class="report-screen-note small muted" id="reportScreenNote">O relatório seguirá exatamente a lista visível na tela, com pesquisa, status e analistas aplicados, na mesma ordem. Os filtros adicionais abaixo não serão usados.</p></div><div class="report-group"><div class="report-group-title"><b>Campos do projeto</b><label><input type="checkbox" class="report-toggle" data-target="report-fields" checked> Selecionar todos</label></div>${group(columns.map(c=>c[0]),'report-fields')}</div><div class="report-group report-optional-filter"><div class="report-group-title"><b>Status</b><label><input type="checkbox" class="report-toggle" data-target="report-statuses" checked> Selecionar todos</label></div>${group(statuses,'report-statuses')}</div><div class="report-group report-optional-filter"><div class="report-group-title"><b>Analistas</b><label><input type="checkbox" class="report-toggle" data-target="report-analysts" checked> Selecionar todos</label></div>${group([...analysts,'Sem analista'],'report-analysts')}</div><div class="report-dialog-actions"><label class="report-format-label">Formato <select id="reportFormat"><option value="xlsx">XLSX</option><option value="xls">XLS</option><option value="xlsm">XLSM</option><option value="csv">CSV</option></select></label><button type="button" class="secondary" id="cancelActivityReport">Cancelar</button><button type="button" id="downloadActivityReport">Baixar relatório</button></div><p class="small muted report-format-note">Cabeçalho roxo e fonte branca: XLSX e XLSM. XLS antigo e CSV não recebem cores.</p></div>`;
 document.body.appendChild(overlay);
 const sendBtn=document.createElement('button');sendBtn.id='reportSendInforme';sendBtn.type='button';sendBtn.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></svg> Enviar informe';
 overlay.querySelector('.report-date-filter').insertBefore(sendBtn,overlay.querySelector('#reportScreenNote'));
  const rep=(cls,names)=>{const selected=preferences[cls];if(!Array.isArray(selected))return;overlay.querySelectorAll('.'+cls+' input').forEach((el,i)=>{el.checked=selected.includes(names[i])})};
  rep('report-fields',columns.map(c=>c[0]));rep('report-statuses',statuses);rep('report-analysts',[...analysts,'Sem analista']);
  overlay.querySelector('#reportFormat').value=['xlsx','xls','xlsm','csv'].includes(preferences.format)?preferences.format:'xlsx';
  overlay.querySelector('#reportPeriod').value=['screen','all','specific'].includes(preferences.period)?preferences.period:'screen';
  overlay.querySelector('#reportSelectedDate').value=preferences.day||localDay(new Date());
  const updateReportMode=()=>{
   const mode=overlay.querySelector('#reportPeriod').value,onScreen=mode==='screen';
   overlay.querySelector('#reportDatePicker').hidden=mode!=='specific';
   overlay.querySelector('#reportScreenNote').hidden=!onScreen;
   overlay.querySelectorAll('.report-optional-filter').forEach(group=>{
    group.classList.toggle('report-filter-inactive',onScreen);
    group.querySelectorAll('input').forEach(input=>input.disabled=onScreen);
   });
  };updateReportMode();
  overlay.querySelector('#reportPeriod').onchange=updateReportMode;
  const updateReportToggles=()=>overlay.querySelectorAll('.report-toggle').forEach(t=>{const inputs=[...overlay.querySelectorAll('.'+t.dataset.target+' input')];t.checked=inputs.length>0&&inputs.every(x=>x.checked)});updateReportToggles();
  const storePreferences=()=>{const picked=(cls,names)=>[...overlay.querySelectorAll('.'+cls+' input')].filter(x=>x.checked).map(x=>names[Number(x.value)]);const next={
   'report-fields':picked('report-fields',columns.map(c=>c[0])),
   'report-statuses':picked('report-statuses',statuses),
   'report-analysts':picked('report-analysts',[...analysts,'Sem analista']),
   format:overlay.querySelector('#reportFormat').value,period:overlay.querySelector('#reportPeriod').value,day:overlay.querySelector('#reportSelectedDate').value
  };try{localStorage.setItem(preferenceKey,JSON.stringify(next))}catch(err){console.warn('Não foi possível salvar preferências do relatório',err)}};
  overlay.addEventListener('change',storePreferences);
  const close=()=>{storePreferences();overlay.remove()};overlay.querySelector('.report-close').onclick=close;overlay.querySelector('#cancelActivityReport').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};
 overlay.querySelectorAll('.report-toggle').forEach(t=>t.onchange=()=>overlay.querySelectorAll('.'+t.dataset.target+' input').forEach(x=>x.checked=t.checked));
 overlay.querySelectorAll('.report-options').forEach(g=>g.addEventListener('change',()=>{let t=overlay.querySelector('.report-toggle[data-target="'+g.classList[1]+'"]');if(t)t.checked=[...g.querySelectorAll('input')].every(x=>x.checked)}));
 const collectReportSelection=()=>{
  const indices=cls=>[...overlay.querySelectorAll('.'+cls+' input:checked')].map(x=>Number(x.value));
  const ci=indices('report-fields'),si=indices('report-statuses'),ai=indices('report-analysts');
  const period=overlay.querySelector('#reportPeriod').value;
  if(!ci.length||(period!=='screen'&&(!si.length||!ai.length)))return toast('Selecione ao menos um campo, status e analista.');
  const chosen=ci.map(i=>columns[i]);const statusSet=new Set(si.map(i=>statuses[i]));const analystSet=new Set(ai.map(i=>[...analysts,'Sem analista'][i]));
  const day=overlay.querySelector('#reportSelectedDate').value;
  if(period==='specific'&&!day)return toast('Selecione a data para extrair o relatório');
  const rows=period==='screen'?reportVisibleActivities(acts):newestActivities((period==='all'?acts:acts.filter(a=>reportDateMatches(a,day))).filter(a=>statusSet.has(a.data.status||'Pendente')&&analystSet.has(canonicalAnalystName(a.data.analystName)||'Sem analista')));
  if(!rows.length)return toast(period==='screen'?'Nenhuma atividade exibida na tela para exportar.':'Nenhuma atividade corresponde aos filtros escolhidos.');
  return {p,rows,chosen,period,day};
 };
 overlay.querySelector('#reportSendInforme').onclick=()=>{
  const selection=collectReportSelection();
  if(!selection)return;
  storePreferences();
  openInformeComposer(selection);
 };
 overlay.querySelector('#downloadActivityReport').onclick=async()=>{
  const selection=collectReportSelection();
  if(!selection)return;
  const format=overlay.querySelector('#reportFormat').value;
  const button=overlay.querySelector('#downloadActivityReport');button.disabled=true;button.textContent='Preparando relatório…';
  try{
   const file=await buildActivityReportFile(selection,format);
   downloadReportFile(file);
   close();
   toast('Relatório exportado: '+selection.rows.length+' atividades.');
  }catch(err){console.error('Falha ao gerar relatório',err);toast('Falha ao gerar planilha: '+err.message)}
  finally{button.disabled=false;button.textContent='Baixar relatório'}
 };
 overlay.querySelector('.report-close').focus();
}
