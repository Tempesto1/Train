// Экран недели: день-линейка и тренировочные дни с упражнениями.
import {$,esc,ymd,parseYmd,addDays,isoWeek,weekMonday,wnum,num,z,fmtN,fmtTon,norm,rangeLabel,MG,WD} from '../util.js';
import {TYPES,ORDER,MUS,MUS_ORDER,CK,FIELD} from '../config.js';
import {S,curKey} from '../state.js';
import {sess,weekStats,buildIndex,bestOf,compare,cardioDelta,cardioSum,prevBefore,muscleOf,fmtTop,isEmpty} from '../model.js';

function liftsHTML(s,key,idx){
  const T=TYPES[s.type];let h='';
  if(T.kind==='strength'){
    const groups=new Map();(s.exercises||[]).forEach(e=>{const b=bestOf(e);if(!b)return;const m=muscleOf(e,s.type);if(!groups.has(m))groups.set(m,[]);groups.get(m).push([e,b])});
    const multi=groups.size>1;
    MUS_ORDER.filter(m=>groups.has(m)).forEach(m=>{
      if(multi)h+='<span class="lift-m">'+MUS[m].name+'</span>';
      groups.get(m).forEach(([e,b])=>{const c=compare(b,prevBefore(idx.ex.get(norm(e.name)),key));h+='<span class="lift"><span class="n">'+esc(e.name)+'</span><span class="v">'+fmtTop(b)+'×'+b.topReps+'</span><span class="a '+(c?c.dir:'same')+'">'+(c?c.short:'новое')+'</span></span>'});
    });
  }else{
    (s.cardio||[]).forEach(c=>{if(!Object.keys(FIELD).some(k=>num(c[k])!=null))return;const p=[];if(z(c.min))p.push(fmtN(z(c.min))+' мин');if(z(c.km))p.push(fmtN(z(c.km))+' км');if(z(c.m))p.push(z(c.m)+' м');const d=cardioDelta(c,prevBefore(idx.car.get(c.kind||'other'),key));
      h+='<span class="lift"><span class="n">'+esc((CK[c.kind]||CK.other).name)+'</span><span class="v">'+(p.join(' · ')||'—')+'</span><span class="a '+(d?d.dir:'same')+'">'+(d?d.short:'новое')+'</span></span>'});
  }
  return h;
}
function renderWeek(){
  const key=S.week,mon=weekMonday(key),idx=buildIndex(),ck=curKey(),todayS=ymd(S.today),ty=S.today.getFullYear();
  const prevKey=isoWeek(addDays(mon,-7)).key,nextKey=isoWeek(addDays(mon,7)).key,isCur=key===ck;
  const st=weekStats(key,idx),pst=weekStats(prevKey,idx);
  let h='<header class="bar"><button class="tbtn" data-go="scale">‹ Шкала</button><div class="navs"><button class="tbtn" data-week="'+prevKey+'" aria-label="Предыдущая неделя">‹ '+wnum(prevKey)+'</button><button class="tbtn" data-week="'+nextKey+'" aria-label="Следующая неделя"'+(key>=ck?' disabled':'')+'>'+wnum(nextKey)+' ›</button></div></header>';
  const cmp=[st.done+' из 4 тренировок'];
  if(st.ton){let t='совокупность весов <span class="mono">'+fmtTon(st.ton)+'</span>';if(pst.ton){const d=st.ton-pst.ton;if(Math.abs(d)>=50)t+=' <span class="mono '+(d>0?'up':'down')+'">'+(d>0?'▲ +':'▼ −')+fmtTon(Math.abs(d))+'</span>'}cmp.push(t)}
  if(st.up||st.down)cmp.push('к прошлому разу: <span class="up">▲'+st.up+'</span>'+(st.down?' <span class="down">▼'+st.down+'</span>':''));
  h+='<div class="wk-hero"><div class="wk-big"><small>неделя</small>'+wnum(key)+'</div><div class="wk-side"><div class="wk-range">'+rangeLabel(mon,ty)+(isCur?'<span class="tag">сейчас</span>':'')+'</div><div class="wk-cmp">'+cmp.map(c=>'<span>'+c+'</span>').join('')+'</div></div></div>';
  const marks={};ORDER.forEach(t=>{const s=sess(key,t);if(s&&s.date)(marks[s.date]=marks[s.date]||[]).push(t)});
  h+='<div class="hr" aria-hidden="true">';
  for(let i=0;i<7;i++){const d=addDays(mon,i),k=ymd(d);h+='<div class="'+(k===todayS?'today':k>todayS?'fut':'')+'"><span>'+WD[i]+'</span><span class="dn">'+d.getDate()+'</span><span class="pls">'+(marks[k]||[]).map(t=>'<span class="pl t-'+t+'"></span>').join('')+'</span></div>'}
  h+='</div><div class="divs">';
  ORDER.forEach(t=>{
    const id=key+'_'+t,s=sess(key,t),T=TYPES[t];
    if(!s){h+='<button class="dv empty t-'+t+'" data-open="'+id+'"><span class="plate off"></span><span><span class="dv-name">'+T.name+'</span><span class="dv-when">не записано</span></span><span class="cta">+ записать</span></button>';return}
    let when='';if(s.date){const d=parseYmd(s.date);when=WD[(d.getDay()+6)%7]+', '+d.getDate()+' '+MG[d.getMonth()]}
    let stat='',plus='';
    if(T.kind==='strength'){
      let nEx=0,nSets=0,ton=0;(s.exercises||[]).forEach(e=>{const b=bestOf(e);if(!b)return;nEx++;nSets+=b.n;ton+=b.vol;if(muscleOf(e,t)==='shoulders')plus='<span class="dv-plus">+ плечи</span>'});
      stat='<b>'+fmtTon(ton)+'</b><span>'+nEx+' упр · '+nSets+' подх</span>';
    }else{const cs=cardioSum(s.cardio);stat='<b>'+fmtN(cs.min)+' мин</b>'+(cs.km?'<span>'+fmtN(cs.km)+' км</span>':'')}
    const lifts=liftsHTML(s,key,idx);
    h+='<button class="dv t-'+t+'" data-open="'+id+'"><span class="plate"></span><span><span class="dv-name">'+T.name+plus+'</span><span class="dv-when">'+when+(s.example?' · пример':'')+'</span></span><span class="dv-st">'+stat+'</span>'+(lifts?'<span class="dv-lifts">'+lifts+'</span>':'')+'</button>';
  });
  h+='</div>';
  if(S.loaded&&![...S.sessions.values()].some(s=>!isEmpty(s)))h+='<p class="hint"><b>Начните с сегодняшней тренировки.</b> Нажмите на день и запишите подходы. Со следующей недели рядом с каждым упражнением появится прошлый результат и стрелка роста.</p>';
  h+='<p class="swipe-hint">Листайте недели свайпом влево и вправо</p>';
  $('#weekView').innerHTML=h;
}


export {renderWeek};
