import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { aovAdmin } from '../server/aov-admin.mjs';
import { readAov } from '../server/aov.mjs';
import fallback from '../data/aov-htw0702aov.json' with { type: 'json' };

function fakeDB() {
  const sessions=new Map(),limits=new Map(),state=new Map();
  return { sessions,limits,state,prepare(sql){
    return {bind(...args){
      return {async first(){
        if(sql.startsWith('SELECT attempts'))return limits.get(args[0])||null;
        if(sql.startsWith('SELECT csrf')){const session=sessions.get(args[0]);return session?.subject===args[1]&&session.expires>args[2]?session:null}
        if(sql.startsWith('SELECT value'))return state.has(args[0])?{value:state.get(args[0])}:null;
        throw Error('Unhandled query: '+sql);
      },async run(){
        if(sql.startsWith('INSERT INTO aov_login_limits')){const old=limits.get(args[0]);limits.set(args[0],{attempts:old?.until>args[2]?old.attempts+1:1,until:args[3]});return}
        if(sql.startsWith('DELETE FROM aov_login_limits')){limits.delete(args[0]);return}
        if(sql.startsWith('INSERT INTO sessions')){sessions.set(args[0],{subject:args[1],csrf:args[2],expires:args[3]});return}
        if(sql.startsWith('DELETE FROM sessions')){sessions.delete(args[0]);return}
        if(sql.startsWith('INSERT INTO sync_state')){state.set(args[0],args[1]);return}
        throw Error('Unhandled write: '+sql);
      }};
    }};
  }};
}

test('AoV admin uses the source password format, CSRF, and keeps archived matches',async()=>{
  const password='correct-password-123';
  const salt=randomBytes(16),digest=pbkdf2Sync(password,salt,100000,32,'sha256');
  const env={DB:fakeDB(),AOV_ADMIN_PASSWORD_HASH:`pbkdf2-sha256$100000$${salt.toString('hex')}$${digest.toString('hex')}`};
  const req=(path,method='GET',body,extra={})=>new Request(`https://htw0702.com/api/aov-admin/${path}`,{method,headers:{Origin:'https://htw0702.com','Content-Type':'application/json',...extra},body:body?JSON.stringify(body):undefined});
  assert.equal((await aovAdmin(req('session'),env)).status,401);
  assert.equal((await aovAdmin(req('login','POST',{username:'htw0702',password:'incorrect'}),env)).status,401);
  const login=await aovAdmin(req('login','POST',{username:'htw0702',password}),env);
  assert.equal(login.status,200);
  const csrf=(await login.json()).csrf,cookie=login.headers.get('Set-Cookie').split(';')[0];
  assert.ok(csrf&&cookie.startsWith('__Host-aov-admin='));
  const record={handle:'htw0702aov',matches:[{id:'new-match',playedAt:'2026-09-28 20:00',board:[{hero:'娜塔亞',kills:12}]}]};
  assert.equal((await aovAdmin(req('save','PUT',record,{Cookie:cookie}),env)).status,403);
  const saved=await aovAdmin(req('save','PUT',record,{Cookie:cookie,'X-CSRF-Token':csrf}),env);
  assert.equal(saved.status,200);
  assert.deepEqual((await saved.json()).matches[0].board,[{hero:'娜塔亞',kills:12}]);
  const published=await readAov(env,fallback);
  assert.equal(published.matches.length,1);
  assert.equal(published.archiveVersion,2);
  const logout=await aovAdmin(req('logout','POST',null,{Cookie:cookie,'X-CSRF-Token':csrf}),env);
  assert.equal(logout.status,200);
  assert.equal((await aovAdmin(req('session','GET',null,{Cookie:cookie}),env)).status,401);
});
