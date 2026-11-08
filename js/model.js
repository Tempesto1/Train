// Модель упражнений и расчёты: лучший подход, сравнение с прошлым разом, недели.
import {num,z,fmtN,norm,addDays,mondayOf,isoWeek,weekMonday} from './util.js';
import {MUS,TYPES,ORDER,LIBMAP,FIELD,MIN_WEEKS} from './config.js';
import {S,P} from './state.js';

function muscleOf(e,type){if(e.muscle&&MUS[e.muscle])return e.muscle;const l=LIBMAP.get(norm(e.name));if(l)return l.muscle;const T=TYPES[type];return T&&T.muscles[0]||'chest'}
function isBw(e){if(typeof e.bw==='boolean')return e.bw;const l=LIBMAP.get(norm(e.name));return !!(l&&l.bw)}
const isBwName=n=>{const l=LIBMAP.get(norm(n));return !!(l&&l.bw)};
const bodyOfSet=s=>num(s.bw)!=null?num(s.bw):z(P.weight);
const extraOf=s=>num(s.x)!=null?num(s.x):z(s.w);
function effW(e,s){return isBw(e)?bodyOfSet(s)+extraOf(s):num(s.w)}
function bestOf(e){
  const bw=isBw(e);
  const v=(e.sets||[]).filter(s=>s&&num(s.r)>0&&(bw||num(s.w)!=null));
  if(!v.length)return null;
  let top=-Infinity,vol=0,e1=0,topExtra=0;
  v.forEach(s=>{const w=effW(e,s),r=num(s.r);if(w>top){top=w;topExtra=bw?extraOf(s):0}vol+=w*r;if(w>0)e1=Math.max(e1,w*(1+r/30))});
  const topReps=Math.max(...v.filter(s=>effW(e,s)===top).map(s=>num(s.r)));
  return{top,topReps,topExtra,vol,e1rm:e1,n:v.length,bw};
}
const fmtTop=b=>b.bw?'св'+(b.topExtra?'+'+fmtN(b.topExtra):''):fmtN(b.top);
function fmtSet(e,s){return isBw(e)?'св'+(extraOf(s)?'+'+fmtN(extraOf(s)):'')+'×'+num(s.r):fmtN(num(s.w))+'×'+num(s.r)}
function setsLine(e,sets){return (sets||[]).filter(s=>num(s.r)>0&&(isBw(e)||num(s.w)!=null)).map(s=>fmtSet(e,s)).join(' · ')}


function cardioSum(a){let min=0,km=0;(a||[]).forEach(c=>{min+=z(c.min);km+=z(c.km)});return{min,km}}
function isEmpty(s){
  if(!s)return true;
  if(s.note&&s.note.trim())return false;
  if(TYPES[s.type]&&TYPES[s.type].kind==='cardio')return !(s.cardio||[]).some(c=>Object.keys(FIELD).some(k=>num(c[k])!=null));
  return !(s.exercises||[]).some(ex=>(ex.sets||[]).some(st=>num(st.w)!=null||num(st.r)!=null||num(st.x)!=null));
}
const sess=(wk,t)=>{const s=S.sessions.get(wk+'_'+t);return s&&!isEmpty(s)?s:null};
function sortedSessions(){return [...S.sessions.values()].sort((a,b)=>a.week<b.week?-1:a.week>b.week?1:String(a.date||'').localeCompare(String(b.date||'')))}
function buildIndex(){
  const ex=new Map(),car=new Map();
  for(const s of sortedSessions()){
    const T=TYPES[s.type];if(!T)continue;
    if(T.kind==='strength'){
      for(const e of s.exercises||[]){const b=bestOf(e);if(!b)continue;const k=norm(e.name);if(!k)continue;if(!ex.has(k))ex.set(k,[]);ex.get(k).push(Object.assign({week:s.week,date:s.date,type:s.type,muscle:muscleOf(e,s.type),ex:{name:e.name.trim(),bw:isBw(e)},sets:e.sets},b))}
    }else{
      for(const c of s.cardio||[]){if(!Object.keys(FIELD).some(k=>num(c[k])!=null))continue;const k=c.kind||'other';if(!car.has(k))car.set(k,[]);
        car.get(k).push({week:s.week,date:s.date,min:z(c.min),km:z(c.km),m:z(c.m),speed:z(c.speed),incline:z(c.incline),level:z(c.level),hr:z(c.hr),floors:z(c.floors)})}
    }
  }
  return{ex,car};
}
function prevBefore(list,week){if(!list)return null;let p=null;for(const e of list){if(e.week<week)p=e;else break}return p}
function compare(cur,prev){
  if(!cur||!prev)return null;
  const dw=Math.round((cur.top-prev.top)*100)/100;
  if(dw>0)return{dir:'up',text:'▲ +'+fmtN(dw)+' кг',short:'▲ +'+fmtN(dw)};
  if(dw<0)return{dir:'down',text:'▼ '+fmtN(dw)+' кг',short:'▼ '+fmtN(dw)};
  const dr=cur.topReps-prev.topReps;
  if(dr>0)return{dir:'up',text:'▲ +'+dr+' повт',short:'▲ +'+dr+' п'};
  if(dr<0)return{dir:'down',text:'▼ '+dr+' повт',short:'▼ '+dr+' п'};
  return{dir:'same',text:'= как прошлый раз',short:'='};
}
function cardioDelta(c,prev){
  if(!prev)return null;if(!Object.keys(FIELD).some(k=>num(c[k])!=null))return null;
  const dm=Math.round((z(c.min)-prev.min)*100)/100,dk=Math.round((z(c.km)-prev.km)*100)/100;
  const parts=[];if(dm)parts.push((dm>0?'+':'')+fmtN(dm)+' мин');if(dk)parts.push((dk>0?'+':'')+fmtN(dk)+' км');
  if(!parts.length)return{dir:'same',text:'= как прошлый раз',short:'='};
  const dir=dm>0||(dm===0&&dk>0)?'up':'down';const ar=dir==='up'?'▲ ':'▼ ';
  return{dir,text:ar+parts.join(', '),short:ar+parts[0].replace(' мин','м').replace(' км','км')};
}
function weekStats(key,idx){
  const st={done:0,ton:0,up:0,down:0,groups:{}};
  ORDER.forEach(t=>{const s=sess(key,t);st.groups[t]=!!s;if(!s)return;st.done++;
    if(TYPES[t].kind==='strength')(s.exercises||[]).forEach(e=>{const b=bestOf(e);if(!b)return;st.ton+=b.vol;const c=compare(b,prevBefore(idx.ex.get(norm(e.name)),key));if(c&&c.dir==='up')st.up++;if(c&&c.dir==='down')st.down++});
  });
  return st;
}
function weeksList(){
  const cur=mondayOf(S.today);let earliest=addDays(cur,-7*(MIN_WEEKS-1));
  for(const s of S.sessions.values()){const m=weekMonday(s.week);if(m&&m<earliest)earliest=m}
  const out=[];let m=cur;
  for(let i=0;i<520&&m>=earliest;i++){const iw=isoWeek(m);out.push({key:iw.key,num:iw.num,year:iw.year,mon:m});m=addDays(m,-7)}
  return out;
}

export {muscleOf,isBw,isBwName,bodyOfSet,extraOf,effW,bestOf,fmtTop,fmtSet,setsLine,cardioSum,isEmpty,sess,sortedSessions,buildIndex,prevBefore,compare,cardioDelta,weekStats,weeksList};
