// Хранилище: кэш в localStorage, база артефакта Claude (если есть), очередь записей, резервные копии.
import {num,clone,sleep} from './util.js';
import {TYPES,CACHE,PCACHE} from './config.js';
import {S,P} from './state.js';
import {emit} from './bus.js';
import {setStatus,baseStatus,toast} from './ui.js';

function loadCache(){
  try{const raw=localStorage.getItem(CACHE);if(raw){const arr=JSON.parse(raw);if(Array.isArray(arr))arr.forEach(d=>{if(d&&d.id)S.sessions.set(d.id,d)})}}catch(e){}
  try{const p=JSON.parse(localStorage.getItem(PCACHE)||'null');if(p&&typeof p==='object')Object.assign(P,{weight:num(p.weight),age:num(p.age)})}catch(e){}
}
function saveCache(){try{localStorage.setItem(CACHE,JSON.stringify([...S.sessions.values()]))}catch(e){}}
function savePCache(){try{localStorage.setItem(PCACHE,JSON.stringify(P))}catch(e){}}
const queues=new Map();
async function queueWrite(id,fn){
  let q=queues.get(id);if(!q){q={busy:false,next:null};queues.set(id,q)}
  q.next=fn;if(q.busy)return;
  while(q.next){const f=q.next;q.next=null;q.busy=true;emit('save-state','Сохраняю…');await runWrite(f);q.busy=false}
  if(![...queues.values()].some(x=>x.busy))emit('save-state',S.readOnly?'Не сохранено':'Сохранено');
}
async function runWrite(fn){
  try{await fn()}catch(e){
    if(e&&e.code==='unavailable'){await sleep(600+Math.random()*900);try{await fn();return}catch(e2){return fail(e2)}}
    fail(e);
  }
}
function fail(e){
  const c=e&&e.code;
  if(c==='invalid_argument'){S.readOnly=true;baseStatus();toast('Нет прав на запись, изменения не сохраняются.')}
  else if(c==='quota_exceeded')toast('Хранилище заполнено. Удалите старые тренировки и попробуйте снова.');
  else if(c==='revoked'||c==='not_granted'||c==='capability_disabled'||c==='capability_removed')setStatus('Хранилище недоступно','warn');
  else toast('Не удалось сохранить. Проверьте связь и попробуйте ещё раз.');
}
function bodyOf(d){const b=clone(d);delete b.id;return b}
function commitSession(d){
  S.sessions.set(d.id,d);saveCache();emit('changed');
  if(S.mode==='db'&&!S.readOnly)queueWrite(d.id,()=>S.db.collection('sessions').doc(d.id).set(bodyOf(d)));
}
function removeSession(id){
  S.sessions.delete(id);saveCache();emit('changed');
  if(S.mode==='db'&&!S.readOnly)queueWrite(id,()=>S.db.collection('sessions').doc(id).delete());
}
function saveProfile(weight,age){
  Object.assign(P,{weight,age});savePCache();S.pLoaded=true;
  if(S.mode==='db'&&!S.readOnly)queueWrite('profile',()=>S.db.doc('profile/me').set({weight,age,updatedAt:new Date().toISOString()}));
}

async function restoreFrom(text){
  let data;try{data=JSON.parse(text)}catch(_){toast('Не получилось прочитать текст. Скопируйте его целиком ещё раз.');return}
  const list=Array.isArray(data)?data:(data&&Array.isArray(data.sessions)?data.sessions:null);
  if(!list){toast('В тексте нет тренировок');return}
  const ok=list.filter(s=>s&&typeof s==='object'&&/^\d{4}-W\d{2}$/.test(s.week||'')&&TYPES[s.type]).map(s=>{const d=clone(s);d.id=s.week+'_'+s.type;return d});
  ok.forEach(d=>S.sessions.set(d.id,d));saveCache();emit('changed');
  const pr=data&&data.profile;if(pr&&num(pr.weight)!=null)saveProfile(num(pr.weight),num(pr.age));
  toast('Восстановлено тренировок: '+ok.length);
  if(S.mode==='db'&&!S.readOnly)for(const d of ok){await runWrite(()=>S.db.collection('sessions').doc(d.id).set(bodyOf(d)))}
}

/* Подключение к базе артефакта Claude. Вне Claude (версия для телефона) база недоступна, и всё хранится локально. */
async function connect(){
  let db=null;
  try{db=window.claude&&typeof window.claude.use==='function'?await window.claude.use('db'):null}catch(_){db=null}
  if(!db){S.mode='local';S.loaded=true;S.pLoaded=true;emit('changed');return}
  S.mode='db';S.db=db;setStatus('Загружаю…');
  const timer=setTimeout(()=>{if(!S.loaded)setStatus(S.sessions.size?'Нет связи, данные могут быть устаревшими':'Нет связи с хранилищем','warn')},10000);
  db.collection('sessions').onSnapshot(snap=>{
    const m=new Map();snap.docs.forEach(d=>{if(d.exists){const b=clone(d.data());b.id=d.id;m.set(d.id,b)}});
    S.sessions=m;saveCache();
    if(!snap.metadata.fromCache){S.loaded=true;clearTimeout(timer)}
    emit('changed');
  },err=>{clearTimeout(timer);S.loaded=true;setStatus('Хранилище недоступно','warn')});
  db.doc('profile/me').onSnapshot(snap=>{
    const old=P.weight;
    if(snap.exists){const p=snap.data();Object.assign(P,{weight:num(p.weight),age:num(p.age)});savePCache()}
    if(!snap.metadata.fromCache||snap.exists)S.pLoaded=true;
    emit('profile',old!==P.weight);
  },()=>{S.pLoaded=true});
}

export {loadCache,saveCache,savePCache,queueWrite,runWrite,commitSession,removeSession,saveProfile,restoreFrom,bodyOf,connect};
