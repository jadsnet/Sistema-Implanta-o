
const $=s=>document.querySelector(s);let DB={},page='home',projectId=null,selectedActivity=null,adminTab='Projetos',filterStatus='Todos',customAnalyst='',customStatus='Todos',filterOwner='none';
const statuses=['Pendente','Em andamento','Migrada','Quebra'];
const activeStatuses=['Contatando técnico','Iniciando configuração','Finalizando configuração','Aguardando cliente config Fortinet','Organização de Rack e equipamentos'];
let dateFilter='today', selectedDate=new Date().toLocaleDateString('en-CA'), detailMode='view',homeListLimit=200;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=k=>DB[k]||[];const project=()=>arr('projects').find(x=>x.id===projectId);
let toastTimer;
function toast(s, duration=5000){
 const t=$('#toast');if(!t)return;
 clearTimeout(toastTimer);
 t.textContent=s;t.style.display='block';t.classList.add('toast-visible');
 toastTimer=setTimeout(()=>{t.classList.remove('toast-visible');t.style.display='none'},duration);
}
function save(){localStorage.setItem('gestaoImplantacaoDB',JSON.stringify(DB))}
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
 setTimeout(()=>toast('Salvo automaticamente',3000),0);
},true);

function log(action,detail='',actId=''){DB.log.unshift({id:'log_'+Date.now(),data:{act:action,action,detail,actId,ts:new Date().toISOString(),user:localStorage.getItem('gi_user')||'Administrador'}});save()}
function normStatus(s){if(!s)return'Pendente';let v=String(s).toLowerCase();if(v.includes('contatando')||v.includes('iniciando')||v.includes('finalizando')||v.includes('aguardando cliente')||v.includes('organização de rack')||v.includes('andamento'))return'Em andamento';if(v.includes('migrad')||v.includes('conclu'))return'Migrada';if(v.includes('quebra'))return'Quebra';return'Pendente'}
function getName(p){return p?.data?.name||p?.id||'Projeto'}
function activityName(a){let r=a.data.row||{};return r['ID VGR']||r['ID']||a.id}
function projectActivities(){let p=project();return arr('activities').filter(a=>{let r=a.data.row||{};return !p||!p.data.name||String(r.EMPRESA||'').toLowerCase()===String(p.data.name).toLowerCase()||a.data.projectId===p.id})}
function render(){document.querySelectorAll('.nav').forEach(a=>{const u=new URL(location.href);u.searchParams.set('page',a.dataset.page);if(projectId)u.searchParams.set('project',projectId);else u.searchParams.delete('project');a.href=u.toString()});if(page==='admin'&&!isAdmin())page='home';document.querySelector('.nav[data-page="admin"]').style.display=isAdmin()?'':'none';renderProjectAvatar();document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('#sectionEyebrow').textContent=page==='home'?'PROJETOS':page==='runbook'?'RUNBOOK':page==='logs'?'AUDITORIA':'ADMINISTRAÇÃO';$('#watermark').textContent=project()?('PROJETO '+getName(project()).toUpperCase()):'';$('#pageTitle').textContent=page==='home'?(project()?'Projeto '+getName(project()):'Selecione um projeto'):page==='runbook'?'Realizar runbook':page==='logs'?'Log de atividades':'Painel do administrador';renderUserPicker();const back=$('#topBackProjects');if(back){back.hidden=!(page==='home'&&!!project()&&!selectedActivity);back.onclick=()=>{projectId=null;selectedActivity=null;filterStatus='Todos';filterOwner='none';render()}}if(page==='home')renderHome();if(page==='runbook')renderRunbook();if(page==='logs')renderLogs();if(page==='admin')renderAdmin()}
function renderProjectAvatar(){let host=$('#projectSidebarProfile');if(!host)return;let p=project();host.hidden=!p;if(!p){host.innerHTML='';return}let photo=p.data?.profilePhoto;host.innerHTML=`<div class="project-profile-image">${photo?`<img src="${esc(photo)}" alt="Foto do projeto">`:`<span>${esc(getName(p).slice(0,1).toUpperCase())}</span>`}</div><div class="project-profile-name" title="Projeto ${esc(getName(p))}"><strong>Projeto ${esc(getName(p))}</strong><small>Gestão de Projetos</small></div>`}
function currentUser(){return localStorage.getItem('gi_user')||'Usuário'}
function isAdmin(){return sessionStorage.getItem('gi_admin')==='yes' && currentUser()==='Administrador'}
function firstName(name){return String(name||'').trim().split(/\s+/)[0]||'Usuário'}
function renderUserPicker(){let host=$('#currentUser');if(!host)return;host.innerHTML=`<span class="signed-user">${esc(currentUser())}</span><button class="secondary logout-button" id="logoutButton">Sair</button>`;$('#logoutButton').onclick=()=>{sessionStorage.removeItem('gi_authenticated');sessionStorage.removeItem('gi_admin');localStorage.removeItem('gi_user');showLogin()}}
async function passwordHash(password,salt){const bytes=new TextEncoder().encode(salt+':'+password);const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')}
function newPassword(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';const bytes=new Uint8Array(14);crypto.getRandomValues(bytes);return Array.from(bytes,b=>chars[b%chars.length]).join('')}
async function assignPassword(user){const password=newPassword();user.data.salt=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');user.data.passwordHash=await passwordHash(password,user.data.salt);save();return password}
function showIssuedPassword(email,password){const layer=document.createElement('div');layer.className='credential-overlay';layer.innerHTML=`<div class="credential-card"><h2>Senha temporária criada</h2><p>Usuário: <b>${esc(email)}</b></p><p>Como o sistema está funcionando apenas localmente, a senha não foi enviada por e-mail. Copie e entregue ao usuário por um canal seguro.</p><div class="issued-password">${esc(password)}</div><div class="credential-buttons"><button id="copyIssued">Copiar senha</button><button class="secondary" id="closeIssued">Fechar</button></div></div>`;document.body.appendChild(layer);layer.querySelector('#copyIssued').onclick=()=>navigator.clipboard.writeText(password).then(()=>toast('Senha copiada'));layer.querySelector('#closeIssued').onclick=()=>layer.remove()}
function showLogin(){document.querySelector('.app').style.display='none';document.querySelector('.login-overlay')?.remove();const layer=document.createElement('div');layer.className='login-overlay';layer.innerHTML=`<form class="login-card" id="loginForm"><div class="login-brand"><span class="login-brand-icon" aria-hidden="true"></span><span><b>Gestão de Projetos</b></span></div><h1>Entrar</h1><p>Faça login para acessar o sistema neste navegador.</p><label for="loginEmail">Usuário ou e-mail</label><input id="loginEmail" autocomplete="username" required placeholder="Seu e-mail"><label for="loginPassword">Senha</label><input id="loginPassword" type="password" autocomplete="current-password" required placeholder="Digite sua senha"><div class="login-error" id="loginError" role="alert"></div><button type="submit" class="login-submit">Entrar</button><div class="login-footer"><button type="button" class="login-theme-switch" aria-label="Alternar tema claro e escuro" title="Alternar tema">☀ <span>☾</span></button><small>V.1.0</small></div></form>`;document.body.appendChild(layer);layer.querySelector('.login-theme-switch').onclick=()=>{const mode=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=mode;localStorage.setItem('gi_theme',mode)};layer.querySelector('form').onsubmit=async e=>{e.preventDefault();let login=$('#loginEmail').value.trim(),pass=$('#loginPassword').value;if(!login||!pass.trim()){$('#loginError').textContent='Informe um usuário e uma senha.';return}const adminLogin=login.toLowerCase()==='admin'&&pass==='admin';const name=adminLogin?'Administrador':login;sessionStorage.setItem('gi_authenticated','yes');sessionStorage.setItem('gi_admin',adminLogin?'yes':'no');localStorage.setItem('gi_user',name);layer.remove();document.querySelector('.app').style.display='flex';if(!adminLogin&&page==='admin')page='home';render()}}

function localDay(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value).slice(0,10);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function activityDate(a){const d=a.data||{},r=d.row||{};return localDay(d.startAt||d.endAt||r.DATA||r.Data||r.DATA_ATIVIDADE||r['DATA DA ATIVIDADE']||r['DATA DE ABERTURA']||r['DATA CRIAÇÃO']||'')}
function dateActivities(acts){if(dateFilter==='all')return acts;const day=dateFilter==='other'?selectedDate:localDay(new Date());return acts.filter(a=>{const d=a.data||{};return [d.startAt,d.endAt,...(d.history||[]).map(h=>h.at)].some(v=>localDay(v)===day)||activityDate(a)===day})}
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
function completionLabel(a){const d=a.data||{},st=normStatus(d.status);if(!['Migrada','Quebra'].includes(st)||!d.endAt)return '';
 const when=new Date(d.endAt);return (st==='Migrada'?'Migrada':'Quebrada')+' em '+(Number.isNaN(when.getTime())?'—':when.toLocaleDateString('pt-BR'));}
const funnelIcon='<svg class="date-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5z"/></svg>';
function recordActivityHistory(a,status,notes){if(!a||!['Migrada','Quebra','Abandonada'].includes(status))return;const d=a.data;d.history=d.history||[];d.history.push({at:new Date().toISOString(),analyst:currentUser(),status:status||d.status||'Pendente',notes:String(notes||'')});save()}
function renderHome(){let c=$('#appContent');if(!project()){c.innerHTML=`<div class="panel project-selection-panel"><h3>Selecione um projeto</h3><div class="grid project-selection-grid">${arr('projects').map(p=>`<div class="project" data-project="${esc(p.id)}"><div class="letter">${p.data?.profilePhoto?`<img src="${esc(p.data.profilePhoto)}" alt="Foto de ${esc(getName(p))}">`:esc(getName(p).slice(0,1))}</div><div class="project-selection-info"><b>${esc(getName(p))}</b><div class="sub small">${arr('activities').filter(a=>String((a.data.row||{}).EMPRESA||'').toLowerCase()===getName(p).toLowerCase()).length} atividades</div></div></div>`).join('')}</div></div>`;c.querySelectorAll('[data-project]').forEach(el=>el.onclick=()=>{projectId=el.dataset.project;selectedActivity=null;render()});return}if(selectedActivity){c.innerHTML=activityDetail(selectedActivity,detailMode);wireDetail();return}let acts=dateActivities(projectActivities());let counts=Object.fromEntries(statuses.map(s=>[s,acts.filter(a=>normStatus(a.data.status)===s).length]));c.innerHTML=`<div class="home-filters"><div class="date-buttons"><button class="${dateFilter==='today'?'active':''}" data-datefilter="today">Hoje</button><button class="${dateFilter==='other'?'active':''}" data-datefilter="other">Outro dia</button><button class="${dateFilter==='all'?'active':''}" data-datefilter="all">Total geral</button>${dateFilter==='other'?funnelIcon:''}<input type="date" id="otherDate" value="${esc(selectedDate)}" class="${dateFilter==='other'?'':'hidden'}" aria-label="Escolher data"></div></div><div class="stats">${statuses.map(s=>`<button type="button" class="stat stat-clickable ${filterOwner==='status'&&filterStatus===s?'selected':''}" data-statusfilter="${esc(s)}" aria-pressed="${filterOwner==='status'&&filterStatus===s}">${filterOwner==='status'&&filterStatus===s?`<svg class="stat-filter-watermark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5z"/></svg>`:""}<div class="stat-emoji">${({'Pendente':'⏳','Em andamento':'📋','Migrada':'✅','Quebra':'⚠️'})[s] ? (()=>{const ic=({'Pendente':'⏳','Em andamento':'📋','Migrada':'✅','Quebra':'⚠️'})[s];return `<span class="e s" aria-hidden="true">${ic}</span><span class="e h" aria-hidden="true">${ic}</span><span class="fc" aria-hidden="true"><span class="e f">${ic}</span></span><span class="e d" aria-hidden="true">${ic}</span><span class="gl" aria-hidden="true"></span>`})() : ''}</div><span>${s==='Migrada'?'Migradas':s==='Pendente'?'Pendentes (projeto)':s==='Quebra'?'Quebradas':s}</span><b>${counts[s]}</b></button>`).join('')}<section class="custom-filter-card ${filterOwner==='custom' ? 'selected' : ''}"><h3>🔎 Filtragem customizada ${filterOwner==='custom'?`<svg class="custom-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5z"/></svg>`:""}</h3><div class="custom-filter-fields"><label>Analista<input id="customAnalyst" list="customAnalystNames" placeholder="Todos os analistas" value="${esc(customAnalyst)}"><datalist id="customAnalystNames">${[...new Set(projectActivities().map(a=>a.data.analystName).filter(Boolean))].sort().map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist></label><label>Status<select id="customStatus">${[['Todos','Todos os status'],['Pendente','Pendente'],['Em andamento','Em andamento'],['Contatando técnico','Contatando técnico'],['Iniciando configuração','Iniciando configuração'],['Finalizando configuração','Finalizando configuração'],['Aguardando cliente config Fortinet','Aguardando cliente config Fortinet'],['Organização de Rack e equipamentos','Organização de Rack e equipamentos'],['Migrada','Migradas'],['Quebra','Quebradas']].map(([v,t])=>`<option value="${esc(v)}" ${customStatus===v?'selected':''}>${t}</option>`).join('')}</select></label><button id="clearCustomFilter" class="secondary" type="button">Limpar</button></div><div class="small muted" id="customFilterCount"></div></section></div><div class="substats"><span>Contatando técnico: <b>${acts.filter(a=>a.data.status==='Contatando técnico').length}</b></span><span>Iniciando configuração: <b>${acts.filter(a=>a.data.status==='Iniciando configuração').length}</b></span><span>Finalizando configuração: <b>${acts.filter(a=>a.data.status==='Finalizando configuração').length}</b></span></div><section class="search-section"><div class="report-search-heading"><h3>Buscar atividade</h3><button type="button" class="report-trigger" id="openActivityReport" title="Escolher colunas e exportar relatório"><svg class="report-sheet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 2.5h10l4 4V21H5z"/><path d="M15 2.5V7h4M8 11h8M8 15h8M11 9v10"/></svg><span>Extrair relatório</span></button></div><input id="searchActivity" value="${esc(localStorage.getItem('gi_search_'+(projectId||''))||'')}" placeholder="Buscar por ID, ID do link ou ID do VGR" style="width:100%;margin-bottom:12px"><div class="small muted" id="activityHint">Minhas atividades em andamento:</div><div id="activityList"></div></section>`;c.querySelectorAll('[data-datefilter]').forEach(b=>b.onclick=()=>{dateFilter=b.dataset.datefilter;filterOwner='none';filterStatus='Todos';customAnalyst='';customStatus='Todos';localStorage.removeItem('gi_search_'+(projectId||''));render()});$('#otherDate').onchange=e=>{selectedDate=e.target.value||new Date().toISOString().slice(0,10);dateFilter='other';filterOwner='none';filterStatus='Todos';customAnalyst='';customStatus='Todos';localStorage.removeItem('gi_search_'+(projectId||''));render()};c.querySelectorAll('[data-statusfilter]').forEach(b=>b.onclick=()=>{filterStatus=filterOwner==='status'&&filterStatus===b.dataset.statusfilter?'Todos':b.dataset.statusfilter;filterOwner=filterStatus==='Todos'?'none':'status';customAnalyst='';customStatus='Todos';localStorage.removeItem('gi_search_'+(projectId||''));render()});$('#customAnalyst').oninput=()=>{customAnalyst=$('#customAnalyst').value.trim();filterStatus='Todos';filterOwner=(customAnalyst||customStatus!=='Todos')?'custom':'none';updateFilterIndicators();renderActivityList()};$('#customStatus').onchange=()=>{customStatus=$('#customStatus').value;filterStatus='Todos';filterOwner=(customAnalyst||customStatus!=='Todos')?'custom':'none';updateFilterIndicators();renderActivityList()};$('#clearCustomFilter').onclick=()=>{customAnalyst='';customStatus='Todos';$('#customAnalyst').value='';$('#customStatus').value='Todos';filterOwner='none';updateFilterIndicators();renderActivityList()};$('#openActivityReport').onclick=openActivityReport;$('#searchActivity').oninput=()=>{localStorage.setItem('gi_search_'+(projectId||''),$('#searchActivity').value);renderActivityList()};renderActivityList()}function elapsed(start){if(!start)return '';let sec=Math.max(0,Math.floor((Date.now()-new Date(start).getTime())/1000));if(!Number.isFinite(sec))return '';let h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),ss=sec%60;const time=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;return h>=24?`${new Date(start).toLocaleDateString('pt-BR')} · ${time}`:time} 
function adoptActivity(id){let a=arr('activities').find(x=>x.id===id);if(!a)return;let d=a.data;if(d.analystName&&d.analystName!==currentUser()&&!d.endAt){toast('Atividade já adotada por '+firstName(d.analystName));return}if(project()?.data)project().data.setupOpen=false;d.analystName=currentUser();d.analystId=currentUser();d.status='Contatando técnico';d.startAt=d.startAt||new Date().toISOString();d.endAt=null;recordActivityHistory(a,d.status,'Atividade adotada');log('Atividade adotada',activityName(a),a.id);save();toast('Atividade adotada por '+firstName(currentUser()));selectedActivity=id;detailMode='view';render()}
function abandonActivity(id){
 const a=arr('activities').find(x=>x.id===id);
 if(!a||a.data.analystName!==currentUser())return;
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
 if(a.data.analystName!==currentUser())return toast('Apenas o responsável pode gerar carimbos');
 // Inclui alterações ainda em edição antes de montar o carimbo.
 document.querySelectorAll('[data-edit]').forEach(el=>{a.data.ed=a.data.ed||{};a.data.ed[el.dataset.edit]=el.value});
 const txt=makeActivityStamp(a,type);
 try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(txt)}else{const el=document.createElement('textarea');el.value=txt;el.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(el);el.select();if(!document.execCommand('copy'))throw Error('Cópia indisponível');el.remove()}
 save();toast('Carimbo '+(type==='sae'?'SAE':'Meraki')+' copiado!');
 }catch(e){const modal=document.createElement('div');modal.className='activity-modal-overlay';modal.innerHTML='<div class="activity-modal"><h3>Carimbo gerado</h3><p>Selecione o texto e copie com Ctrl+C.</p><textarea id="stampFallback" rows="14" readonly></textarea><div class="stamp-actions"><button id="stampClose">Fechar</button></div></div>';document.body.appendChild(modal);modal.querySelector('#stampFallback').value=txt;modal.querySelector('#stampFallback').select();modal.querySelector('#stampClose').onclick=()=>modal.remove()}
}
function updateFilterIndicators(){document.querySelectorAll('[data-statusfilter]').forEach(b=>{let active=filterOwner==='status'&&filterStatus===b.dataset.statusfilter;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));let icon=b.querySelector('.stat-filter-watermark');if(icon)icon.remove();if(active)b.insertAdjacentHTML('afterbegin',`<svg class="stat-filter-watermark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5z"/></svg>`)});{const card=document.querySelector('.custom-filter-card');if(card){const active=filterOwner==='custom';card.classList.toggle('selected',active);card.querySelector('.custom-filter-icon')?.remove();if(active)card.querySelector('h3')?.insertAdjacentHTML('beforeend',`<svg class="custom-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5z"/></svg>`);}}}function renderActivityList(){let input=$('#searchActivity');if(!input)return;let q=input.value.trim().toLowerCase();localStorage.setItem('gi_search_'+(projectId||''),input.value);let list=$('#activityList');let projectActs=projectActivities(),all=dateActivities(projectActs);let mine=projectActs.filter(a=>a.data.analystName===currentUser()&&!a.data.endAt&&!['Migrada','Quebra'].includes(normStatus(a.data.status)));let found=q?projectActs.filter(a=>{let r=a.data.row||{};return Object.values(r).some(v=>String(v||'').toLowerCase().includes(q))||activityName(a).toLowerCase().includes(q)}):[];let customOn=filterOwner==='custom'&&(!!customAnalyst||customStatus!=='Todos');let acts=q?found:(customOn?projectActs:(filterOwner==='status'&&filterStatus!=='Todos'?all.filter(a=>normStatus(a.data.status)===filterStatus):dateFilter==='all'?all:all.filter(a=>normStatus(a.data.status)!=='Pendente')));if(customOn&&!q){acts=acts.filter(a=>(!customAnalyst||String(a.data.analystName||'').toLocaleLowerCase('pt-BR').includes(customAnalyst.toLocaleLowerCase('pt-BR')))&&(customStatus==='Todos'||(customStatus==='Em andamento'?normStatus(a.data.status)==='Em andamento':customStatus===a.data.status||normStatus(a.data.status)===customStatus)));}acts=newestActivities(acts);$('#customFilterCount').textContent=customOn?`${acts.length} atividade(s) encontrada(s) na filtragem customizada.`:'';$('#activityHint').textContent=q?'Resultados da busca (todas as datas e status):':customOn?'Resultados da filtragem customizada:':(filterOwner==='status'&&filterStatus!=='Todos'?'Atividades filtradas por status:':dateFilter==='all'?'Todas as atividades do projeto (mais recentes primeiro):':'Atividades da data selecionada:');list.innerHTML=acts.slice(0,homeListLimit).map(a=>{let r=a.data.row||{},d=a.data,st=d.status||'Pendente',adopted=!!d.analystName&&!d.endAt;return `<div class="activity-line" data-view="${esc(a.id)}" tabindex="0" role="button"><div class="activity-main"><b>${esc(activityName(a))}</b><div class="small muted">${esc(r['ENDEREÇO COMPLETO']||r.HOSTNAME||r.EMPRESA||'Atividade')}</div></div><div class="activity-meta">${['Migrada','Quebra'].includes(normStatus(st))&&d.endAt?`<span class="activity-completion-date" title="Data de ${normStatus(st)==='Migrada'?'migração':'quebra'}">${normStatus(st)==='Migrada'?'Migrada':'Quebrada'} em ${esc(new Date(d.endAt).toLocaleDateString('pt-BR'))}</span>`:'<span class="activity-completion-date"></span>'}${adopted?`<span class="elapsed" data-start="${esc(d.startAt||'')}">◴ ${elapsed(d.startAt)}</span><span class="owner" title="${esc(d.analystName)}">${esc(firstName(d.analystName))}</span>`:`<span class="elapsed"></span><span class="owner" title="${esc(d.analystName||'')}">${esc(d.analystName||'')}</span>`}</div><span class="status ${esc(normStatus(st))}">${esc(st)}</span>${adopted&&d.analystName!==currentUser()?'<button class="secondary" disabled>Adotada</button>':`<button data-adopt="${esc(a.id)}">${adopted?'Abrir atividade':'Adotar'}</button>`}</div>`}).join('')+(acts.length>homeListLimit?`<div class="activity-show-more"><span>${homeListLimit} de ${acts.length} atividades</span><button type="button" id="loadMoreActivities" class="secondary">Mostrar mais atividades</button></div>`:'')||'<div class="empty">Nenhuma atividade encontrada.</div>';list.querySelector('#loadMoreActivities')?.addEventListener('click',()=>{homeListLimit+=200;renderActivityList()});list.querySelectorAll('[data-view]').forEach(el=>{el.onclick=e=>{if(e.target.closest('button'))return;selectedActivity=el.dataset.view;detailMode='view';render()};el.onkeydown=e=>{if(e.key==='Enter'){selectedActivity=el.dataset.view;detailMode='view';render()}}});list.querySelectorAll('[data-adopt]').forEach(b=>b.onclick=e=>{e.stopPropagation();let a=arr('activities').find(x=>x.id===b.dataset.adopt);if(a?.data.analystName===currentUser()&&!a.data.endAt){selectedActivity=a.id;detailMode='view';render()}else adoptActivity(b.dataset.adopt)})}
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
 const removedFields=new Set((project()?.data?.removedProjectFields||[]).map(x=>String(x).toLocaleLowerCase('pt-BR')));const keys=[...new Set([...Object.keys(r),...extraDefinitions.map(x=>x.name),'MUNICIPIO','LP','IP LINK','SERIAL MX','TIPO DE ATENDIMENTO','REPARO','NOME DO TÉCNICO','TELEFONE DO TÉCNICO','NOME DO RESPONSÁVEL NO LOCAL','TELEFONE DO RESPONSÁVEL'])].filter(k=>String(k).trim()&&!/^(_status|_analista|_motivo)$/i.test(k)&&!removedFields.has(k.toLocaleLowerCase('pt-BR')));
 const val=k=>ed[k]!==undefined?ed[k]:(r[k]??'');
 const canEdit=adminMode||d.analystName===currentUser();
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
 return `<div class="activity-detail-screen"><div class="detailhead detail-toolbar"><button class="secondary" id="closeDetail">← ${adminMode?'Voltar à lista':'Voltar à busca'}</button><div class="admin-detail-toolbar-right"><span class="status ${esc(normStatus(d.status))}">${esc(d.status||'Pendente')}</span>${adminMode?`<button type="button" class="danger-project admin-delete-activity" id="adminDeleteActivity">Excluir atividade</button>`:''}</div></div>
 <section class="activity-summary"><div class="eyebrow">ID VGR</div><h2>${esc(activityName(a))}</h2><p class="muted">Analista: ${esc(d.analystName||'—')} · Data: ${esc(d.startAt?new Date(d.startAt).toLocaleDateString('pt-BR'):'—')} · Início: ${esc(d.startAt?new Date(d.startAt).toLocaleTimeString('pt-BR'):'—')} · Tempo: ${esc(elapsed(d.startAt)||'—')}${completionLabel(a)?` · ${esc(completionLabel(a))}`:''}</p>
 <div class="activity-summary-layout"><div class="activity-summary-controls"><div class="field"><label>Status da atividade</label><select id="activityStatus" ${canEdit?'':'disabled'}>${[...(d.status==='Pendente'?['Pendente']:[]),'Contatando técnico','Iniciando configuração','Finalizando configuração','Aguardando cliente config Fortinet','Organização de Rack e equipamentos','Migrada','Quebra'].map(st=>`<option ${d.status===st?'selected':''} ${st==='Pendente'?'disabled':''}>${st}</option>`).join('')}</select></div>
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
  if(a.data.analystName!==currentUser())return;
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
  if(a.data.analystName!==currentUser())return;
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
function renderRunbook(){let acts=projectActivities();$('#appContent').innerHTML=`<section class="runbook-search"><h3>Buscar atividade</h3><input id="rbSearch" placeholder="Buscar por ID, ID do link ou ID do VGR" style="width:100%"></section><div id="rbList"></div>`;function list(){let query=$('#rbSearch').value.trim().toLowerCase();let found=query?acts.filter(a=>{let r=a.data.row||{};return [r['ID'],r['ID VGR'],r['ID DEDICADO'],r['ID INTERNET'],r.HOSTNAME,r['ENDEREÇO COMPLETO']].some(v=>String(v||'').toLowerCase().includes(query))}):[];$('#rbList').innerHTML=found.slice(0,100).map(a=>{let r=a.data.row||{},d=a.data;return `<div class="runbook-line" data-rb-row="${esc(a.id)}" tabindex="0" role="button"><div><b>${esc(activityName(a))}</b><span>${esc(r['ENDEREÇO COMPLETO']||r.HOSTNAME||'')}</span></div><div class="runbook-actions">${d.analystName?`<span class="status ${esc(normStatus(d.status))}">${esc(firstName(d.analystName))} · ${elapsed(d.startAt)}</span>`:`<span class="status Pendente">Pendente</span>`}${String(d.analystId||d.analystName||arr('runbooks').find(x=>x.data.activityId===a.id)?.data.by||'').trim().toLocaleLowerCase('pt-BR')===String(currentUser()).trim().toLocaleLowerCase('pt-BR')?`<button data-rb="${esc(a.id)}">Realizar runbook</button>`:''}</div></div>`}).join('')||'<div class="empty">Nenhuma atividade encontrada.</div>';$('#rbList').querySelectorAll('[data-rb-row]').forEach(row=>{row.onclick=e=>{if(e.target.closest('[data-rb]'))return;openRunbook(row.dataset.rbRow)};row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openRunbook(row.dataset.rbRow)}}});$('#rbList').querySelectorAll('[data-rb]').forEach(b=>b.onclick=()=>{let a=arr('activities').find(x=>x.id===b.dataset.rb);if(a&&!a.data.analystName&&!arr('runbooks').some(r=>r.data.activityId===a.id&&r.data.by&&String(r.data.by).toLocaleLowerCase('pt-BR')!==String(currentUser()).toLocaleLowerCase('pt-BR'))){a.data.analystName=currentUser();a.data.analystId=currentUser();a.data.status='Contatando técnico';a.data.startAt=new Date().toISOString();a.data.endAt=null;log('Atividade adotada',activityName(a),a.id);save()}openRunbook(b.dataset.rb)})}$('#rbSearch').oninput=list;list()}async function openRunbook(id){
 let a=arr('activities').find(x=>x.id===id);if(!a)return;
 let r=a.data.row||{},existing=arr('runbooks').find(x=>x.data.activityId===id),slots=existing?.data.slots||[];
 const owner=String(a.data.analystId||a.data.analystName||existing?.data.by||'').trim().toLocaleLowerCase('pt-BR');
 const readOnly=!!owner&&owner!==String(currentUser()).trim().toLocaleLowerCase('pt-BR');
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
   save();if(!silent)toast('Salvo automaticamente',3000);
  });
  return imageWriteQueue;
 }
 const imageCard=(item,i)=>`<div class="evidence-card">${item[2]?`<span class="evidence-group-label">${esc(item[2])}</span>`:''}<b>${esc(item[0])}</b>${item[1]?`<p class="muted"><i>${esc(item[1])}</i></p>`:''}<div class="evidence-drop ${readOnly?'evidence-readonly':''}" data-evidence="${i}" ${readOnly?'':'tabindex="0" role="button"'} aria-label="${readOnly?'Visualizar':'Adicionar'} imagem: ${esc(item[0])}">${images[i]?`<img src="${images[i]}" alt="${esc(item[0])}">`:'<span class="evidence-placeholder">▧</span>'}${readOnly?'':`${images[i]?'<button type="button" class="evidence-remove" title="Remover imagem" aria-label="Remover imagem">×</button>':''}<span class="evidence-hint"><strong>+ ${images[i]?'Trocar':'Adicionar'} print</strong> ou cole com Ctrl+V / arraste aqui</span><input type="file" accept="image/*" hidden>`}</div></div>`;
 $('#appContent').innerHTML=`<div class="runbook-detail"><button class="secondary" id="rbBack">← Voltar</button><div class="runbook-detail-heading"><div class="eyebrow">RUNBOOK · ID VGR</div><h2>${esc(activityName(a))}</h2><p>${esc(r['ENDEREÇO COMPLETO']||r.HOSTNAME||'')}</p><p class="muted">Iniciado por ${esc(firstName(a.data.analystName||currentUser()))} em ${esc(a.data.startAt?new Date(a.data.startAt).toLocaleString('pt-BR'):'—')}</p></div>${sections.map((section)=>`<section class="evidence-section" data-runbook-sheet="${esc(section.id)}"><h3 class="floating-title">${esc(section.title)}</h3><div class="evidence-stack evidence-grid-two">${section.items.map(item=>{const i=flattened.findIndex(x=>x.item===item);return imageCard([item.title,item.description||'',item.group||''],i)}).join('')}</div></section>`).join('')}${readOnly?'<p class="runbook-viewonly">Somente visualização — runbook pertencente a outro analista.</p>':'<div class="runbook-save-actions"><button id="saveRunbook">Salvar runbook</button><button id="generateRunbook">Gerar Runbook (Excel)</button></div>'}</div>`;
 document.onpaste=null;$('#rbBack').onclick=()=>{document.onpaste=null;render()};
 function setImage(i,file){if(!file||!file.type.startsWith('image/'))return;let reader=new FileReader();reader.onload=()=>{images[i]=reader.result;let drop=document.querySelector(`[data-evidence="${i}"]`);if(drop){let old=drop.querySelector('img');if(!old){old=document.createElement('img');drop.querySelector('.evidence-placeholder')?.remove();drop.prepend(old)}old.src=images[i];old.alt=items[i][0];if(!drop.querySelector('.evidence-remove'))old.insertAdjacentHTML('afterend','<button type="button" class="evidence-remove" title="Remover imagem" aria-label="Remover imagem">×</button>');drop.querySelector('.evidence-remove').onclick=e=>{e.stopPropagation();images[i]='';old.remove();drop.querySelector('.evidence-remove')?.remove();drop.insertAdjacentHTML('afterbegin','<span class="evidence-placeholder">▧</span>');drop.querySelector('.evidence-hint strong').textContent='+ Adicionar print';persistRunbookImages().catch(err=>toast('Falha ao salvar: '+err.message))};drop.querySelector('.evidence-hint strong').textContent='+ Trocar print'};persistRunbookImages().catch(err=>toast('Falha ao salvar imagem: '+err.message)) };reader.readAsDataURL(file)}
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
function openNewActivityDialog(p){
 const template=p.data.activityTemplate||[];
 const extras=(p.data.extraFields||[]).map(f=>typeof f==='string'?{name:f,section:'Outras informações'}:f);
 const sample=projectActivities().find(a=>a.data.projectId===p.id)||projectActivities()[0];
 const names=allProjectFieldNames(p);
 const sections=['Equipamento','Link','Localização / Unidade','Outras informações',...(p.data.extraSections||[])].filter(x=>!(p.data.removedDefaultSections||[]).includes(x));
 const group=k=>{const e=extras.find(f=>f.name===k);if(e)return e.section==='Localização'?'Localização / Unidade':e.section;const n=k.toUpperCase();if(/TÉCNICO|RESPONSÁVEL/.test(n))return 'Outras informações';if(/ENDEREÇO|COORDENADAS|EMPRESA|FORTINET|MUNICIPIO|MUNICÍPIO/.test(n))return 'Localização / Unidade';if(/UNIDADE|CLONAR/.test(n))return 'Equipamento';if(/LINK|DEDICADO|INTERNET|VELOCIDADE|OPERADORA|PRODUTO|MEIOS|^LP$|ATENDIMENTO/.test(n))return 'Link';return 'Equipamento'};
 const overlay=document.createElement('div');overlay.className='history-overlay new-activity-overlay';
 overlay.innerHTML=`<div class="history-dialog new-activity-dialog" role="dialog" aria-modal="true" aria-label="Cadastrar nova atividade"><div class="new-activity-head"><h2>Cadastrar nova atividade</h2><button type="button" class="new-activity-close" id="cancelNewActivity" aria-label="Fechar formulário" title="Fechar"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6L18 18M18 6L6 18"/></svg></button></div><form id="newActivityForm">${sections.map(section=>{const keys=names.filter(k=>group(k)===section);if(!keys.length)return '';return `<section class="new-activity-section"><h3 class="new-activity-section-title">${esc(section)}</h3><div class="new-activity-grid">${keys.map(k=>`<label class="field"><span>${esc(k)}</span><input data-newfield="${esc(k)}" placeholder=""></label>`).join('')}</div></section>`}).join('')}<div class="new-activity-footer"><button type="submit">Cadastrar atividade</button></div></form></div>`;
 document.body.appendChild(overlay);overlay.querySelector('#cancelNewActivity').onclick=()=>overlay.remove();overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
 overlay.querySelector('#newActivityForm').onsubmit=e=>{e.preventDefault();const row={};overlay.querySelectorAll('[data-newfield]').forEach(el=>row[el.dataset.newfield]=el.value.trim());if(!Object.values(row).some(Boolean))return toast('Preencha ao menos um campo');DB.activities.push({id:'manual_'+Date.now(),data:{projectId:p.id,row,status:'Pendente',analystName:null,analystId:null,startAt:null,endAt:null}});log('Atividade cadastrada manualmente',getName(p));save();overlay.remove();toast('Atividade cadastrada');renderAdmin()};
}
// Pesquisa/edição administrativa em uma sobreposição. Não altera o usuário responsável
// nem adota atividades; a exclusão só ocorre após confirmação explícita do ID VGR.
function openAdminActivityEditor(){
 if(!isAdmin()||!project())return toast('Acesso exclusivo do administrador');
 const editingProject=projectId;
 let selectedId=null,query='',limit=200;
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
  body.innerHTML=`<div class="admin-search-heading"><h3>Buscar atividade</h3><span class="small muted">${matching.length} de ${all.length} atividade(s)</span></div><input class="admin-activity-search" type="search" placeholder="Buscar por ID, ID do link, ID VGR, analista, status ou endereço" value="${esc(query)}" aria-label="Buscar atividade"/><p class="small muted">Todas as datas e todos os status · mais recentes primeiro</p><div class="admin-activity-results">${matching.slice(0,limit).map(a=>{
   const d=a.data||{},r=d.row||{},status=d.status||'Pendente',done=completionLabel(a);
   return `<div class="activity-line admin-edit-activity-line" data-admin-view="${esc(a.id)}" tabindex="0" role="button" aria-label="Abrir atividade ${esc(activityName(a))}"><div class="activity-main"><b>${esc(activityName(a))}</b><div class="small muted">${esc(r['ENDEREÇO COMPLETO']||r.HOSTNAME||r.EMPRESA||'Atividade')}</div></div><div class="activity-meta"><span class="activity-completion-date">${esc(done)}</span><span class="elapsed">${esc(d.startAt?elapsed(d.startAt):'')}</span><span class="owner" title="${esc(d.analystName||'')}">${esc(d.analystName||'—')}</span></div><span class="status ${esc(normStatus(status))}">${esc(status)}</span><button type="button" data-admin-open="${esc(a.id)}">Abrir atividade</button></div>`}).join('')||'<div class="empty">Nenhuma atividade encontrada.</div>'}</div>${matching.length>limit?`<div class="admin-activity-load"><button type="button" class="secondary" id="adminActivityMore">Mostrar mais (${Math.min(matching.length-limit,200)})</button></div>`:''}`;
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
let tabs=projectId?['← Voltar','Usuários','Configurar projeto']:[];
if(!projectId)adminTab='Projetos';else if(!tabs.includes(adminTab))adminTab='Configurar projeto';
$('#appContent').innerHTML=`<div class="tabs">${tabs.map(t=>`<button class="${adminTab===t?'active':''}" data-atab="${esc(t)}">${esc(t)}</button>`).join('')}</div><div id="adminBody"></div>`;
document.querySelectorAll('[data-atab]').forEach(b=>b.onclick=()=>{if(b.dataset.atab==='← Voltar'){projectId=null;selectedActivity=null;adminTab='Projetos';render();return}adminTab=b.dataset.atab;renderAdmin()});
let b=$('#adminBody');
if(adminTab==='Projetos'){
 b.innerHTML=`<div class="panel"><h3>Projetos cadastrados</h3><p class="muted">Selecione um projeto para abrir suas configurações.</p><div class="project-list admin-project-grid">${arr('projects').map(p=>`<div class="detailhead panel project-row" data-selectp="${esc(p.id)}" role="button" tabindex="0"><div><b>${esc(getName(p))}</b><div class="small muted">${arr('activities').filter(a=>a.data.projectId===p.id||String((a.data.row||{}).EMPRESA||'').toLowerCase()===getName(p).toLowerCase()).length} atividades</div></div><button class="secondary" data-selectp="${esc(p.id)}">Selecionar</button></div>`).join('')}</div><h3>Cadastrar novo projeto</h3><div class="filters"><input id="newProject" placeholder="Nome do projeto"><button id="createProject">Criar projeto</button></div></div>`;
 $('#createProject').onclick=()=>{let name=$('#newProject').value.trim();if(!name)return toast('Informe o nome do projeto');let id=name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-');if(arr('projects').some(p=>p.id===id))return toast('Projeto já existe');DB.projects.push({id,data:{name,createdAt:new Date().toISOString(),setupOpen:true,activityTemplate:[]}});log('Projeto criado',name);save();renderAdmin()};
 b.querySelectorAll('.project-row[data-selectp]').forEach(x=>{const open=()=>{projectId=x.dataset.selectp;adminTab='Configurar projeto';renderAdmin()};x.onclick=open;x.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});
}
if(adminTab==='Usuários'){
 b.innerHTML=`<div class="panel"><h3>Cadastrar usuário</h3><p class="muted">Uma senha temporária será gerada para entrega manual. O envio por e-mail requer um serviço externo.</p><div class="row"><div class="field"><label>Nome</label><input id="uName"></div><div class="field"><label>Sobrenome</label><input id="uLast"></div><div class="field"><label>E-mail</label><input id="uEmail" type="email"></div><div class="field"><label>RE / matrícula</label><input id="uRe"></div></div><button id="createUser" style="margin-top:12px">Cadastrar usuário</button></div><div class="panel"><h3>Usuários cadastrados</h3>${arr('users').map(u=>`<div class="panel user-admin-row"><div><b>${esc((u.data.nome||'')+' '+(u.data.sobrenome||''))}</b><div class="small muted">${esc(u.data.email||'')} · ${esc(u.data.re||'')}</div></div><button class="secondary" data-reset-user="${esc(u.id)}">Redefinir senha</button></div>`).join('')||'<div class="empty">Nenhum usuário.</div>'}</div>`;
 $('#createUser').onclick=async()=>{let nome=$('#uName').value.trim(),sobrenome=$('#uLast').value.trim(),email=$('#uEmail').value.trim(),re=$('#uRe').value.trim();if(!nome||!sobrenome||!email||!re)return toast('Preencha nome, sobrenome, e-mail e matrícula');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return toast('Informe um e-mail válido');if(arr('users').some(u=>u.data.email.toLowerCase()===email.toLowerCase()))return toast('E-mail já cadastrado');let user={id:'u_'+Date.now(),data:{nome,sobrenome,email,re,at:new Date().toISOString()}};DB.users.push(user);let password=await assignPassword(user);log('Usuário cadastrado',email);renderAdmin();showIssuedPassword(email,password)};
 b.querySelectorAll('[data-reset-user]').forEach(btn=>btn.onclick=async()=>{let u=arr('users').find(x=>x.id===btn.dataset.resetUser);if(!u||!confirm('Gerar nova senha temporária para '+u.data.email+'? A senha anterior deixará de funcionar neste navegador.'))return;let password=await assignPassword(u);log('Senha redefinida',u.data.email);showIssuedPassword(u.data.email,password)});
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
     $('#projectPreview').innerHTML=`<p><b>Prévia detectada:</b> ${stagedActivity.rows.length} linhas · ${stagedActivity.headers.length} campos</p><div class="small">${stagedActivity.headers.map(esc).join(' · ')}</div><button id="confirmProjectImport">OK — aplicar modelo e importar atividades</button>`;
     $('#confirmProjectImport').onclick=()=>{let data=stagedActivity;p.data.activityTemplate=data.headers;p.data.extraFields=p.data.extraFields||[];let added=0;data.rows.forEach(row=>{if(!Object.values(row).some(v=>String(v??'').trim()))return;DB.activities.push({id:'imp_'+Date.now()+'_'+added,data:{projectId:p.id,row,status:'Pendente',analystName:null,analystId:null,startAt:null,endAt:null}});added++});save();log('Modelo de projeto importado',`${getName(p)}: ${added} atividades`);toast(`Modelo aplicado: ${data.headers.length} campos e ${added} atividades`);renderAdmin()};
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
async function readTabularFile(file){if(!file)throw Error('Nenhum arquivo selecionado');let ext=(file.name.split('.').pop()||'').toLowerCase(),matrix=[];if(['xls','xlsx','xlsm','ods'].includes(ext)){if(!window.XLSX)throw Error('Biblioteca de leitura de planilhas indisponível; confira a conexão com a internet.');let wb=XLSX.read(await file.arrayBuffer(),{type:'array'});matrix=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false});}else if(ext==='docx'||ext==='doc'){if(!window.mammoth)throw Error('Biblioteca DOCX indisponível; confira a conexão com a internet.');let result=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});let doc=new DOMParser().parseFromString(result.value,'text/html');let table=doc.querySelector('table');if(table)matrix=[...table.rows].map(tr=>[...tr.cells].map(td=>td.textContent.trim()));else matrix=result.value.replace(/<[^>]+>/g,'\n').split(/\n+/).map(x=>[x.trim()]).filter(r=>r[0]);}else{let text=await file.text();if(text.includes('\u0000'))throw Error('Formato não suportado como texto. Tente exportar a planilha como XLSX ou CSV.');matrix=parseCSV(text)}matrix=matrix.filter(r=>Array.isArray(r)&&r.some(v=>String(v??'').trim()));if(matrix.length<1)throw Error('Arquivo vazio.');let headers=matrix[0].map((h,i)=>String(h??'').trim()||`Campo ${i+1}`);let rows=matrix.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'').trim()])));return {headers,rows}}
function parseCSV(t){let out=[],row=[],cell='',q=false;for(let i=0;i<t.length;i++){let c=t[i];if(c==='"'&&q&&t[i+1]==='"'){cell+='"';i++}else if(c==='"')q=!q;else if((c===','||c===';'||c==='\\t')&&!q){row.push(cell);cell=''}else if((c==='\\n'||c==='\\r')&&!q){if(c==='\\r'&&t[i+1]==='\\n')i++;row.push(cell);out.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);out.push(row)}return out}
function downloadCSV(name,rows){let keys=[...new Set(rows.flatMap(o=>Object.keys(o||{})))];let csv=[keys,...rows.map(o=>keys.map(k=>{let v=o[k];if(v&&typeof v==='object')v=JSON.stringify(v);return '"'+String(v??'').replace(/"/g,'""')+'"'}))].map(r=>r.join(';')).join('\\r\\n');let a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
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
async function init(){resetTestDataOnce();const themeBtn=document.getElementById('themeToggle');const setTheme=(mode)=>{document.documentElement.dataset.theme=mode;localStorage.setItem('gi_theme',mode);themeBtn?.setAttribute('aria-label',mode==='light'?'Ativar tema escuro':'Ativar tema claro');themeBtn?.setAttribute('title',mode==='light'?'Ativar tema escuro':'Ativar tema claro')};setTheme(localStorage.getItem('gi_theme')==='light'?'light':'dark');if(themeBtn)themeBtn.onclick=()=>setTheme(document.documentElement.dataset.theme==='light'?'dark':'light');try{let saved=localStorage.getItem('gestaoImplantacaoDB');DB=saved?JSON.parse(saved):{activities:[],analysts:[],log:[],projects:[],runbooks:[],users:[]};for(const key of ['activities','analysts','log','projects','runbooks','users'])if(!Array.isArray(DB[key]))DB[key]=[];}catch(e){DB={activities:[],analysts:[],log:[],projects:[],runbooks:[],users:[]};}await migrateLegacyRunbookFiles();document.querySelectorAll('.nav').forEach(b=>{b.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.button!==0)return;if(b.dataset.page==='admin'&&!isAdmin()){e.preventDefault();return toast('Acesso exclusivo do administrador')}e.preventDefault();page=b.dataset.page;selectedActivity=null;render()})});
 const requested=new URLSearchParams(location.search);const requestedProject=requested.get('project');if(requestedProject&&arr('projects').some(p=>p.id===requestedProject))projectId=requestedProject;
 const requestedPage=requested.get('page');if(['home','runbook','logs','admin'].includes(requestedPage))page=requestedPage;
 if(sessionStorage.getItem('gi_authenticated')==='yes'&&localStorage.getItem('gi_user')){document.querySelector('.app').style.display='flex';render()}else showLogin();setInterval(()=>document.querySelectorAll('.elapsed[data-start]').forEach(el=>el.textContent='◴ '+elapsed(el.dataset.start)),1000)}
init();


// Relatório flexível por colunas, status, analistas e formato.
function formatReportDateTime(value){if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})}
function reportDateMatches(a,day){const d=a.data||{};if(!day)return true;return [d.startAt,d.endAt,d.createdAt,d.updatedAt,...(d.history||[]).map(h=>h.at)].some(t=>localDay(t)===day)||activityDate(a)===day}
function openActivityReport(){
 document.getElementById('activityReportOverlay')?.remove();
 const acts=projectActivities(),p=project();
 const standard=[['ID VGR',a=>a.data.row?.['ID VGR']||''],['ID link',a=>a.data.ed?.idDedicado||a.data.row?.['ID DEDICADO']||''],['Nome da localidade',a=>a.data.row?.UNIDADE||a.data.row?.MUNICIPIO||''],['Nome do analista da atividade',a=>a.data.analystName||''],['Data',a=>{let d=activityDate(a)||'';return /^\d{4}-\d{2}-\d{2}$/.test(d)?d.split('-').reverse().join('/'):d}],['Status',a=>a.data.status||'Pendente'],['Observação',a=>a.data.observations||a.data.observacoes||a.data.observacao||''],['Horário de início',a=>formatReportDateTime(a.data.startAt)],['Horário de término',a=>formatReportDateTime(a.data.endAt)]];
 const keys=[...new Set([...(p?.data?.activityTemplate||[]),...(p?.data?.extraFields||[]).map(f=>typeof f==='string'?f:f.name),...acts.flatMap(a=>Object.keys(a.data.row||{}))])].filter(Boolean);
 const columns=[...standard,...keys.filter(k=>!standard.some(c=>c[0].toLocaleUpperCase('pt-BR')===k.toLocaleUpperCase('pt-BR'))).map(k=>[k,a=>a.data.row?.[k]??a.data.ed?.[k]??''])];
 const statuses=[...new Set(['Pendente',...activeStatuses,'Migrada','Quebra','Abandonada',...acts.map(a=>a.data.status).filter(Boolean)])];
 const analysts=[...new Set(acts.map(a=>a.data.analystName).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const preferenceKey='gi_report_prefs_'+(p?.id||'')+'_'+currentUser().trim().toLowerCase();
  let preferences={};try{preferences=JSON.parse(localStorage.getItem(preferenceKey)||'{}')||{}}catch(e){preferences={}}
 const overlay=document.createElement('div');overlay.id='activityReportOverlay';overlay.className='report-overlay';
 const group=(items,cls)=>`<div class="report-options ${cls}">${items.map((label,i)=>`<label><input type="checkbox" value="${i}" checked><span>${esc(label)}</span></label>`).join('')}</div>`;
 overlay.innerHTML=`<div class="report-dialog report-dialog-wide" role="dialog" aria-modal="true" aria-labelledby="reportTitle"><div class="report-dialog-head"><h3 id="reportTitle">Extrair relatório</h3><button type="button" class="report-close" aria-label="Fechar"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><p class="small muted">Escolha os campos, os status, os analistas e o período desejado. Suas opções ficam salvas neste navegador.</p><div class="report-date-filter"><label>Período <select id="reportPeriod"><option value="screen">Usar período da tela</option><option value="all">Todas as datas</option><option value="specific">Data específica</option></select></label><label class="report-date-picker" id="reportDatePicker">Selecionar data<input type="date" id="reportSelectedDate"></label></div><div class="report-group"><div class="report-group-title"><b>Campos do projeto</b><label><input type="checkbox" class="report-toggle" data-target="report-fields" checked> Selecionar todos</label></div>${group(columns.map(c=>c[0]),'report-fields')}</div><div class="report-group"><div class="report-group-title"><b>Status</b><label><input type="checkbox" class="report-toggle" data-target="report-statuses" checked> Selecionar todos</label></div>${group(statuses,'report-statuses')}</div><div class="report-group"><div class="report-group-title"><b>Analistas</b><label><input type="checkbox" class="report-toggle" data-target="report-analysts" checked> Selecionar todos</label></div>${group([...analysts,'Sem analista'],'report-analysts')}</div><div class="report-dialog-actions"><label class="report-format-label">Formato <select id="reportFormat"><option value="xlsx">XLSX</option><option value="xls">XLS</option><option value="xlsm">XLSM</option><option value="csv">CSV</option></select></label><button type="button" class="secondary" id="cancelActivityReport">Cancelar</button><button type="button" id="downloadActivityReport">Baixar relatório</button></div></div>`;
 document.body.appendChild(overlay);
  const rep=(cls,names)=>{const selected=preferences[cls];if(!Array.isArray(selected))return;overlay.querySelectorAll('.'+cls+' input').forEach((el,i)=>{el.checked=selected.includes(names[i])})};
  rep('report-fields',columns.map(c=>c[0]));rep('report-statuses',statuses);rep('report-analysts',[...analysts,'Sem analista']);
  overlay.querySelector('#reportFormat').value=['xlsx','xls','xlsm','csv'].includes(preferences.format)?preferences.format:'xlsx';
  overlay.querySelector('#reportPeriod').value=['screen','all','specific'].includes(preferences.period)?preferences.period:'screen';
  overlay.querySelector('#reportSelectedDate').value=preferences.day||localDay(new Date());
  const updateReportDate=()=>{overlay.querySelector('#reportDatePicker').hidden=overlay.querySelector('#reportPeriod').value!=='specific'};updateReportDate();
  overlay.querySelector('#reportPeriod').onchange=updateReportDate;
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
 overlay.querySelector('#downloadActivityReport').onclick=()=>{
  const indices=cls=>[...overlay.querySelectorAll('.'+cls+' input:checked')].map(x=>Number(x.value));
  const ci=indices('report-fields'),si=indices('report-statuses'),ai=indices('report-analysts');
  if(!ci.length||!si.length||!ai.length)return toast('Selecione ao menos um campo, status e analista.');
  const chosen=ci.map(i=>columns[i]);const statusSet=new Set(si.map(i=>statuses[i]));const analystSet=new Set(ai.map(i=>[...analysts,'Sem analista'][i]));
  const period=overlay.querySelector('#reportPeriod').value,day=overlay.querySelector('#reportSelectedDate').value;if(period==='specific'&&!day)return toast('Selecione a data para extrair o relatório');const inPeriod=period==='all'?acts:period==='specific'?acts.filter(a=>reportDateMatches(a,day)):dateActivities(acts);const rows=newestActivities(inPeriod.filter(a=>statusSet.has(a.data.status||'Pendente')&&analystSet.has(a.data.analystName||'Sem analista')));
  const matrix=[chosen.map(c=>c[0]),...rows.map(a=>chosen.map(c=>String(c[1](a)??'')))];
  const format=overlay.querySelector('#reportFormat').value;
  const filename='Relatorio_'+String(getName(p)).replace(/[^a-zA-Z0-9_-]+/g,'_')+'_'+new Date().toISOString().slice(0,10);
  let blob;
  if(format==='csv'){
   const safe=v=>{let x=String(v??'');if(/^[\s]*[=+@\-]/.test(x))x="'"+x;return '"'+x.replace(/"/g,'""')+'"'};
   blob=new Blob(['\ufeff'+matrix.map(row=>row.map(safe).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  }else{
   if(!window.XLSX)return toast('Biblioteca de planilhas indisponível. Verifique a conexão ou selecione CSV.');
   try{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(matrix),'Atividades');const bookType=format==='xls'?'biff8':format==='xlsm'?'xlsm':'xlsx';const bytes=XLSX.write(wb,{bookType,type:'array'});blob=new Blob([bytes],{type:'application/octet-stream'});}catch(err){return toast('Falha ao gerar planilha: '+err.message)}
  }
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename+'.'+format;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);close();toast('Relatório exportado: '+rows.length+' atividades.');
 };
 overlay.querySelector('.report-close').focus();
}
