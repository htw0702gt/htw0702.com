import {notifySlack} from './slack.mjs';
import {settings,validateSettings} from './settings.mjs';
import {normalize,decodeEntry} from './core.mjs';
import {session,authReady,authOrigin,start,callback,hash,cookie,random} from './auth.mjs';
import {syncNotion} from './notion.mjs';
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'}});
async function smallJson(req){const text=await req.text();if(text.length>50000)throw new Error('too large');return JSON.parse(text);}
export async function onRequest({request:req,env}){
 const url=new URL(req.url),path=url.pathname.slice(5),method=req.method;
 try{
 if(path==='appearance'&&method==='GET')return json(await settings(env));
 if(path==='health'&&method==='GET')return json({auth:authReady(env)});
 if(path==='public'&&method==='GET'){if(!env.DB)return json({configured:false,entries:[]});const r=await env.DB.prepare("SELECT id,kind,locale,slug,title,body,meta,updated_at FROM entries WHERE visibility='public' AND kind=? AND locale=? ORDER BY updated_at DESC LIMIT 500").bind(url.searchParams.get('kind')||'',url.searchParams.get('locale')||'tw').all();return json({configured:true,entries:r.results.map(decodeEntry)});}
 if(path==='auth/start'&&method==='GET')return start(req,env);
 if(path==='auth/callback'&&method==='POST'){if(Number(req.headers.get('Content-Length')||0)>10000)return json({error:'too large'},413);return callback(req,env);}
 if(path==='notion/pull'&&method==='POST'){
  const supplied=req.headers.get('Authorization')||'';if(!env.NOTION_SYNC_SECRET||env.NOTION_SYNC_SECRET.length<32||await hash(supplied)!==await hash('Bearer '+env.NOTION_SYNC_SECRET))return json({error:'unauthorized'},401);return json({synced:await syncNotion(env)});
 }
 const user=await session(req,env);if(!user)return json({error:'unauthorized'},401);
 if(!['GET','HEAD'].includes(method)&&(req.headers.get('Origin')!==env.ADMIN_ORIGIN||req.headers.get('X-CSRF-Token')!==user.csrf))return json({error:'forbidden'},403);
 if(path==='appearance'&&method==='POST'){let x;try{x=validateSettings(await smallJson(req));}catch{return json({error:'invalid appearance'},400);}await env.DB.prepare("INSERT INTO sync_state(name,value) VALUES('appearance',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(JSON.stringify(x)).run();return json(x);}
 if(path==='slack/test'&&method==='POST')return json(await notifySlack(env));
 if(path==='me'&&method==='GET')return json({csrf:user.csrf,connections:{auth:true,database:!!env.DB,notion:!!(env.NOTION_TOKEN&&env.NOTION_DATA_SOURCE_ID),slack:!!env.SLACK_WEBHOOK_URL}});
 if(path==='auth/logout'&&method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(cookie(req,'__Host-studio'))).run();const r=json({ok:true});r.headers.append('Set-Cookie','__Host-studio=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0');return r;}
 if(path==='entries'&&method==='GET'){const r=await env.DB.prepare('SELECT * FROM entries ORDER BY updated_at DESC LIMIT 500').all();return json({entries:r.results.map(decodeEntry)});}
 if(path==='entries'&&method==='POST'){
  let raw,x;try{raw=await smallJson(req);x=normalize(raw);}catch{return json({error:'invalid content'},400);}
  const id=raw.id||random(),stamp=new Date().toISOString();
  try{if(raw.id){const res=await env.DB.prepare("UPDATE entries SET kind=?,locale=?,slug=?,title=?,body=?,visibility=?,meta=?,version=version+1,updated_at=? WHERE id=? AND version=? AND source='studio' RETURNING *").bind(x.kind,x.locale,x.slug,x.title,x.body,x.visibility,JSON.stringify(x.meta),stamp,id,raw.version).first();if(!res)return json({error:'conflict'},409);return json({entry:decodeEntry(res)});}
  const r=await env.DB.prepare("INSERT INTO entries(id,kind,locale,slug,title,body,visibility,meta,updated_at) VALUES(?,?,?,?,?,?,?,?,?) RETURNING *").bind(id,x.kind,x.locale,x.slug,x.title,x.body,x.visibility,JSON.stringify(x.meta),stamp).first();return json({entry:decodeEntry(r)},201);}catch{return json({error:'write conflict or unavailable'},409);}
 }
 if(path==='entries'&&method==='DELETE'){const x=await smallJson(req);const r=await env.DB.prepare("DELETE FROM entries WHERE id=? AND version=? AND source='studio' RETURNING id").bind(x.id,x.version).first();return r?json({ok:true}):json({error:'conflict'},409);}
 if(path==='notion/sync'&&method==='POST')return json({synced:await syncNotion(env)});
 return json({error:'not found'},404);
 }catch{return json({error:'service unavailable'},503);}
}
