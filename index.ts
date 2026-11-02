// Gravação de arquivos de runbook só com checagem de tipo e proprietário no servidor.
import { createClient } from 'npm:@supabase/supabase-js@2';

const origins = new Set(['https://jadsnet.github.io','http://localhost:8765','http://127.0.0.1:8765']);
const maximum = 8 * 1024 * 1024;
const corporate = (s: unknown) => typeof s === 'string' && /^[a-z0-9._%+\-]+@telefonica\.com$/i.test(s);
const png = (data: Uint8Array) => data[0]===0x89&&data[1]===0x50&&data[2]===0x4e&&data[3]===0x47;
const jpeg = (data: Uint8Array) => data[0]===0xff&&data[1]===0xd8&&data[2]===0xff;
const gif = (data: Uint8Array) => data[0]===0x47&&data[1]===0x49&&data[2]===0x46&&data[3]===0x38;
const webp = (data: Uint8Array) => new TextDecoder().decode(data.slice(0,4))==='RIFF'
  && new TextDecoder().decode(data.slice(8,12))==='WEBP';
function validateImages(bytes: Uint8Array){
  let values: unknown;
  try{values=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw Error('JSON de imagens inválido')}
  if(!Array.isArray(values)||values.length>120)throw Error('Número de evidências inválido');
  for(const image of values){
    if(image===''||image===null)continue;
    if(typeof image!=='string')throw Error('Evidência inválida');
    const matched=image.match(/^data:image\/(png|jpeg|gif|webp);base64,([a-z0-9+/=]+)$/i);
    if(!matched)throw Error('Formato de evidência não permitido');
    if(matched[2].length>4*1024*1024)throw Error('Imagem excede o limite de tamanho');
    const raw=Uint8Array.from(atob(matched[2]),x=>x.charCodeAt(0));
    if(raw.length>3*1024*1024||!(matched[1]==='png'?png(raw):matched[1]==='jpeg'?jpeg(raw):matched[1]==='gif'?gif(raw):webp(raw)))
      throw Error('Assinatura de imagem incompatível');
  }
}
Deno.serve(async req=>{
  const origin=req.headers.get('origin')||'';
  const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://jadsnet.github.io',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'};
  const reply=(status:number,payload:Record<string,unknown>)=>new Response(JSON.stringify(payload),{status,headers});
  if(req.method==='OPTIONS')return reply(200,{ok:true});
  if(req.method!=='POST')return reply(405,{error:'Método inválido'});
  if(origin&&!origins.has(origin))return reply(403,{error:'Origem recusada'});
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return reply(401,{error:'Sessão obrigatória'});
  const url=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!secret)return reply(500,{error:'Serviço indisponível'});
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const {data:{user},error}=await admin.auth.getUser(token);
    if(error||!user||!corporate(user.email))return reply(401,{error:'Sessão inválida'});
    const {data:profile}=await admin.from('gi_profiles').select('role,active,must_change_password,email')
      .eq('id',user.id).single();
    if(!profile?.active||profile.must_change_password||profile.email!==user.email?.toLowerCase())
      return reply(403,{error:'Conta sem permissão'});
    const input=await req.json();
    const key=String(input?.key||''),action=String(input?.action||'');
    if(key.length>200||!key||!['put','delete'].includes(action))return reply(400,{error:'Operação inválida'});
    const image=key.match(/^runbook-imagens:([a-z0-9_-]+):([a-zA-Z0-9_\-]+)$/);
    const model=/^[a-z0-9_-]{1,150}$/.test(key);
    if(!image&&!model)return reply(400,{error:'Chave de arquivo inválida'});
    const project=image?image[1]:key;
    const manager=profile.role==='administrador'||profile.role==='gestor';
    const {data:projectRecord}=await admin.from('gi_records').select('id')
      .eq('kind','projects').eq('id',project).maybeSingle();
    if(!projectRecord)return reply(404,{error:'Projeto não encontrado'});
    if(model&&!manager)return reply(403,{error:'Somente gestores alteram o modelo de planilha'});
    if(image&&!manager){
      const {data:act}=await admin.from('gi_records').select('owner_id,project_id')
        .eq('kind','activities').eq('id',image[2]).maybeSingle();
      if(!act||act.project_id!==project||act.owner_id!==user.id)
        return reply(403,{error:'Atividade pertence a outro analista'});
    }
    const destination=project+'/'+encodeURIComponent(key);
    if(action==='delete'){
      const {error:storageError}=await admin.storage.from('gi-runbooks').remove([destination]);
      if(storageError)throw storageError;
      return reply(200,{ok:true});
    }
    const content=String(input.contentBase64||'');
    if(content.length>Math.ceil(maximum*4/3)+16)return reply(413,{error:'Arquivo excede 8 MB'});
    const bytes=Uint8Array.from(atob(content),c=>c.charCodeAt(0));
    if(bytes.length<2||bytes.length>maximum)return reply(400,{error:'Tamanho inválido'});
    const mime=image?'application/json':'application/octet-stream';
    if(image)validateImages(bytes);
    else if(!(bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===0x03&&bytes[3]===0x04)
       && !(bytes[0]===0xd0&&bytes[1]===0xcf&&bytes[2]===0x11&&bytes[3]===0xe0))
      return reply(400,{error:'Runbook não é XLS/XLSX válido'});
    const {error:storageError}=await admin.storage.from('gi-runbooks')
      .upload(destination,bytes,{upsert:true,contentType:mime});
    if(storageError)throw storageError;
    return reply(200,{ok:true});
  }catch(error){console.error('gi-files:',error);return reply(400,{error:error instanceof Error?error.message:'Arquivo recusado'});}
});
