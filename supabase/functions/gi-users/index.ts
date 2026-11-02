// Supabase Edge Function — gerenciamento de contas somente pelo administrador.
// SUPABASE_SERVICE_ROLE_KEY fica exclusivamente no servidor (secret automático).
import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://jadsnet.github.io',
  'http://localhost:8765',
  'http://127.0.0.1:8765',
]);
const allowedRoles = new Set(['administrador', 'gestor', 'analista']);
const appUrl = 'https://jadsnet.github.io/Sistema-Implanta-o/';
const validMail = (input: unknown): input is string =>
  typeof input === 'string' && /^[a-z0-9._%+-]+@telefonica\.com$/i.test(input)
  && input.length <= 254;

Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://jadsnet.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  const answer = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  });
  if (req.method === 'OPTIONS') return answer(200, { ok: true });
  if (req.method !== 'POST') return answer(405, { error: 'Método não permitido' });
  if (origin && !allowedOrigins.has(origin)) return answer(403, { error: 'Origem não autorizada' });
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return answer(401, { error: 'Autenticação obrigatória' });
  const url = Deno.env.get('SUPABASE_URL');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !secret) return answer(500, { error: 'Configuração de servidor incompleta' });
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    // NUNCA confiar no papel enviado no JSON pelo navegador.
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user?.id || !validMail(user.email))
      return answer(401, { error: 'Sessão inválida' });
    const { data: caller, error: callerError } = await admin.from('gi_profiles')
      .select('id,role,active,must_change_password,email').eq('id', user.id).single();
    if (callerError || !caller?.active || caller.role !== 'administrador'
      || caller.must_change_password || caller.email !== user.email?.toLowerCase())
      return answer(403, { error: 'Somente o administrador pode gerenciar usuários' });

    const input = await req.json();
    const action = input?.action;
    if (action === 'list') {
      const { data, error } = await admin.from('gi_profiles')
        .select('id,email,full_name,registration,role,active,must_change_password')
        .order('email');
      if (error) throw error;
      return answer(200, { users: data });
    }
    if (action === 'invite') {
      const email = String(input.email || '').trim().toLowerCase();
      const name = String(input.name || '').trim().slice(0, 120);
      const registration = String(input.registration || '').trim().slice(0, 60);
      const role = String(input.role || 'analista');
      if (!validMail(email) || !name || !allowedRoles.has(role))
        return answer(400, { error: 'E-mail corporativo, nome e perfil válidos são obrigatórios' });
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: appUrl, data: { full_name: name },
      });
      if (error) return answer(400, { error: error.message });
      if (!data.user?.id) throw Error('Usuário não foi criado');
      const update = await admin.from('gi_profiles').update({
        full_name: name, registration, role, active: true, must_change_password: true,
      }).eq('id', data.user.id);
      if (update.error) throw update.error;
      return answer(200, { ok: true, message: 'Convite enviado para '+email });
    }
    if (action === 'setRole' || action === 'setActive') {
      const userId = String(input.userId || '');
      if (!/^[0-9a-f-]{36}$/i.test(userId))return answer(400,{error:'ID de usuário inválido'});
      if (userId === user.id)return answer(400,{error:'Não é permitido alterar seu próprio perfil ou acesso'});
      const changes: Record<string, unknown> = {};
      if (action === 'setRole') {
        if (!allowedRoles.has(input.role))return answer(400,{error:'Perfil inválido'});
        changes.role = input.role;
      } else changes.active = input.active === true;
      const { data, error } = await admin.from('gi_profiles').update(changes)
        .eq('id', userId).select('id,email,role,active').single();
      if (error)throw error;
      return answer(200,{ ok:true,user:data });
    }
    if (action === 'reset') {
      const email = String(input.email || '').trim().toLowerCase();
      if (!validMail(email))return answer(400,{error:'E-mail inválido'});
      const { data: target } = await admin.from('gi_profiles').select('id')
        .eq('email',email).maybeSingle();
      if (!target) return answer(404,{error:'Conta não encontrada'});
      const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo: appUrl });
      if (error) throw error;
      return answer(200,{ok:true,message:'E-mail de redefinição solicitado'});
    }
    return answer(400, { error: 'Operação desconhecida' });
  } catch (err) {
    console.error('gi-users failure:',err);
    return answer(500, { error: 'Não foi possível concluir a operação. Verifique os logs da função.' });
  }
});
