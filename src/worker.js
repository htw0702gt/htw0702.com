import {onRequest as studio} from '../server/studio.mjs';
import {KNOWN, renderDocument} from '../server/document.mjs';
import {SEARCH_KINDS, fallbackItems, guideItems, hrefFor, normalizePublic} from '../server/public-content.mjs';
const NOTION_VERSION="2025-09-03";
const allowedLocales=new Set(["tw","en","jp"]),allowedKinds=new Set(["blog","works","wiki","now","store"]);
function json(data,status=200,cache="no-store"){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":cache}})}
function textProp(p){return(p?.title||p?.rich_text||[]).map(x=>x?.plain_text||x?.text?.content||"").join("")}
function selectProp(p){return p?.select?.name||null}
function numberProp(p){return typeof p?.number==="number"?p.number:null}
function dateProp(p){return p?.date?.start||null}
function itemFromPage(page){const p=page.properties||{};return{
  id:page.id,name:textProp(p.Name),body:textProp(p.Body),slug:textProp(p.Slug),kind:selectProp(p.Kind),locale:selectProp(p.Locale),updated:p.Updated?.last_edited_time||page.last_edited_time||null,
  hero:textProp(p.hero)||textProp(p.Hero),mode:textProp(p.mode)||textProp(p.Mode),rank:textProp(p.rank)||textProp(p.Rank),lane:selectProp(p.lane)||selectProp(p.Lane),result:selectProp(p.result)||selectProp(p.Result),
  kills:numberProp(p.kills)??numberProp(p.Kills),deaths:numberProp(p.deaths)??numberProp(p.Deaths),assists:numberProp(p.assists)??numberProp(p.Assists),minutes:numberProp(p.minutes)??numberProp(p.Minutes),
  gold:numberProp(p.gold)??numberProp(p.Gold),damage:numberProp(p.damage)??numberProp(p.Damage),damageTaken:numberProp(p.damageTaken)??numberProp(p.DamageTaken),teamfight:numberProp(p.teamfight)??numberProp(p.Teamfight),rating:numberProp(p.rating)??numberProp(p.Rating),
  evidence:textProp(p.evidence)||textProp(p.Evidence),teamKills:numberProp(p.teamKills)??numberProp(p.TeamKills),playedAt:dateProp(p.playedAt)||dateProp(p.PlayedAt)||dateProp(p.Date)
}}
async function notionQuery(env,{locale,kind,pageSize=100}){if(!env.NOTION_TOKEN)return{items:[],configured:false};const filters=[{property:"Visibility",select:{equals:"public"}},{property:"Publish",checkbox:{equals:true}},{property:"Locale",select:{equals:locale}},{property:"Kind",select:{equals:kind}}];const r=await fetch(`https://api.notion.com/v1/data_sources/${env.NOTION_DATA_SOURCE_ID}/query`,{method:"POST",headers:{authorization:`Bearer ${env.NOTION_TOKEN}`,"content-type":"application/json","Notion-Version":NOTION_VERSION},body:JSON.stringify({filter:{and:filters},sorts:[{timestamp:"last_edited_time",direction:"descending"}],page_size:pageSize})});if(!r.ok)throw new Error(`Notion ${r.status}`);const d=await r.json();return{items:(d.results||[]).map(itemFromPage),configured:true}}
function safeUrl(v){if(!v)return null;try{const u=new URL(v);return u.protocol==="https:"?u.href:null}catch{return null}}
function alias(path){return({"/":"/tw","/me":"/tw/me","/wiki":"/tw/wiki","/blog":"/tw/blog","/works":"/tw/works","/store":"/tw/store","/social":"/tw/social","/search":"/tw/search","/now":"/tw/now","/games":"/tw/games","/admin":"/tw/admin"})[path]||null}
function isAovPath(path){const p=path.toLowerCase();return /(?:^|\/)games\/aov(?:\/|$)/.test(p)||/(?:^|\/)aov(?:\/|$)/.test(p)||p.includes("htw0702aov")}
function isRetiredPath(path){const p=path.toLowerCase();return /(?:^|\/)games\/lol(?:\/|$)/.test(p)||/(?:^|\/)plans(?:\/|$)/.test(p)||/(?:^|\/)world(?:\/|$)/.test(p)}
function isStatic(path){return path.startsWith("/assets/")||path.startsWith("/images/")||path==="/robots.txt"||path==="/sitemap.xml"||path==="/favicon.ico"||/\.[a-z0-9]{1,8}$/i.test(path)}
function localeHome(path){const m=path.toLowerCase().match(/^\/(tw|en|jp)(?:\/|$)/);return m?`/${m[1]}`:"/tw"}
async function published(env,locale,kind){let remote=[];try{remote=(await notionQuery(env,{locale,kind})).items||[]}catch{remote=[]}remote=normalizePublic(remote);if(remote.length)return remote;return fallbackItems(locale,kind)}
async function searchItems(env,locale,q){const chunks=await Promise.all(SEARCH_KINDS.map(kind=>published(env,locale,kind)));let items=chunks.flat();if(env.DB){try{const r=await env.DB.prepare("SELECT id,kind,locale,slug,title,body,updated_at,source FROM entries WHERE visibility='public' AND locale=? ORDER BY updated_at DESC LIMIT 500").bind(locale).all();const ids=new Set(items.map(x=>x.id));for(const x of normalizePublic((r.results||[]).map(row=>({id:row.id,name:row.title,body:row.body,slug:row.slug,kind:row.kind,locale:row.locale,updated:row.updated_at,source:row.source}))))if(x.source!=="notion"&&!ids.has(x.id))items.push(x)}catch{}}items.push(...guideItems(locale));const query=q.trim().toLowerCase();if(query)items=items.filter(x=>(`${x.name} ${x.body} ${x.slug}`).toLowerCase().includes(query));const seen=new Set(),out=[];for(const x of items){const k=`${x.kind}:${x.slug}`;if(seen.has(k))continue;seen.add(k);out.push({name:x.name,kind:x.kind,slug:x.slug,updated:x.updated||null,href:hrefFor(locale,x),snippet:String(x.body||"").replace(/\s+/g," ").slice(0,180)});if(out.length>=40)break}return out}
async function document(request,env,status,locale,route){const shell=await env.ASSETS.fetch(new Request(new URL("/index.html",request.url)));const html=renderDocument(await shell.text(),{locale,route,status,query:Boolean(new URL(request.url).searchParams.get("q"))});const headers={"content-type":"text/html; charset=utf-8","cache-control":route==="admin"?"no-store":"public, max-age=300","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"};return new Response(request.method==="HEAD"?null:html,{status,headers})}
export default{async fetch(request,env){const u=new URL(request.url),path=u.pathname.replace(/\/+$/,"")||"/";
  if(u.hostname==='admin.htw0702.com'&&path==='/')return Response.redirect(new URL('/tw/admin',u.origin),302);
  if(/^\/api\/(health|appearance|public|me|entries|auth\/.*|notion\/.*|slack\/.*)$/.test(path))return studio({request,env});
  if(path==="/api/aov"||path.startsWith("/api/aov/")||path==="/api/lol"||path.startsWith("/api/lol/")||path==="/api/riot"||path.startsWith("/api/riot/"))return json({error:"not_found"},404);
  const reading=request.method==="GET"||request.method==="HEAD";
  if(reading&&(isAovPath(path)||isRetiredPath(path)))return Response.redirect(new URL(localeHome(path),u.origin),301);
  if(reading){const r=alias(path);if(r)return Response.redirect(new URL(r,u.origin),302)}
  if(path==="/api/content"){const locale=u.searchParams.get("locale")||"tw",kind=u.searchParams.get("kind")||"blog";if(!allowedLocales.has(locale)||!allowedKinds.has(kind))return json({error:"invalid query"},400);const items=await published(env,locale,kind);return json({items,configured:Boolean(env.NOTION_TOKEN),source:items.some(x=>x.source==="site")?"site":"cms"})}
  if(path==="/api/search"){const locale=u.searchParams.get("locale")||"tw",q=u.searchParams.get("q")||"";if(!allowedLocales.has(locale)||q.length>80)return json({error:"invalid query"},400);return json({locale,query:q,items:await searchItems(env,locale,q)},200,"public, max-age=60")}
  if(path==="/api/payments")return json({wise:safeUrl(env.WISE_PAYMENT_URL),paypal:safeUrl(env.PAYPAL_PAYMENT_URL),bitcoin:(env.BTC_ADDRESS||"").trim()||null});
  if(path==="/api/admin/status")return json({appleConfigured:Boolean(env.APPLE_CLIENT_ID&&env.APPLE_TEAM_ID&&env.APPLE_KEY_ID&&env.APPLE_PRIVATE_KEY&&env.SESSION_SECRET),locked:true});
  if(path.startsWith("/api/"))return json({error:"not_found"},404);
  if(!reading)return json({error:"not_found"},404);
  if(isStatic(path))return env.ASSETS.fetch(request);
  const parts=path.split("/").filter(Boolean);const locale=allowedLocales.has(parts[0])?parts.shift():null;const route=parts.join("/");
  if(!locale)return document(request,env,404,"tw",route);
  return document(request,env,KNOWN.has(route)?200:404,locale,route)
}};
