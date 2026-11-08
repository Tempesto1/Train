// Главный экран: вертикальная шкала недель.
import {$,ymd,addDays,fmtN,fmtTon,rangeLabel,weekMonday,MG} from '../util.js';
import {TYPES,ORDER} from '../config.js';
import {S,P,curKey} from '../state.js';
import {sess,weekStats,buildIndex,weeksList,weekNo,startKey} from '../model.js';

function renderScale(){
  const weeks=weeksList(),idx=buildIndex(),ck=curKey(),todayS=ymd(S.today),ty=S.today.getFullYear();
  let h='';
  weeks.forEach(wk=>{
    const st=weekStats(wk.key,idx),isCur=wk.key===ck;
    const marks={};ORDER.forEach(t=>{const s=sess(wk.key,t);if(s&&s.date)(marks[s.date]=marks[s.date]||[]).push(t)});
    let ticks='';
    for(let i=0;i<7;i++){
      const d=addDays(wk.mon,i),k=ymd(d),y='bottom:'+(i*18+9)+'px';
      ticks+='<span class="'+(k===todayS?'tk today':k>todayS?'tk fut':'tk')+'" style="'+y+'"></span>';
      if(marks[k])ticks+='<span class="mk" style="'+y+'">'+marks[k].map(t=>'<span class="pl t-'+t+'"></span>').join('')+'</span>';
      if(k===todayS)ticks+='<span class="needle" style="'+y+'"></span>';
    }
    const groups=ORDER.map(t=>'<span class="pl t-'+t+(st.groups[t]?'':' off')+'" title="'+TYPES[t].short+'"></span>').join('');
    const stats=[];if(st.done)stats.push(st.done+'/4');if(st.ton)stats.push(fmtTon(st.ton));
    let statsH=stats.join(' · ');if(st.up)statsH+=' <span class="up">▲'+st.up+'</span>';if(st.down)statsH+=' <span class="down">▼'+st.down+'</span>';
    if(!st.done)statsH=isCur?'ещё ничего не записано':'—';
    h+='<button class="sw'+(isCur?' cur':'')+(st.done?' has':'')+'" data-week="'+wk.key+'" aria-label="Неделя '+wk.num+', '+rangeLabel(wk.mon,ty)+'">'
      +'<span class="sw-num">'+wk.num+'</span><span class="sw-r">'+ticks+'</span>'
      +'<span class="sw-i"><span class="sw-range">'+rangeLabel(wk.mon,ty)+(isCur?'<span class="tag">сейчас</span>':'')+'</span><span class="sw-g">'+groups+'</span><span class="sw-s">'+statsH+'</span></span>'
      +'<span class="sw-go">›</span></button>';
  });
  $('#scale').innerHTML=h;
  let n='';
  const exWeeks=[...new Set([...S.sessions.values()].filter(s=>s.example).map(s=>weekNo(s.week)))].sort((a,b)=>a-b);
  if(S.pLoaded&&P.weight==null)n+='<div class="note"><p>Укажите свой вес и возраст. Вес нужен для подтягиваний, брусьев и других упражнений с собственным весом.</p><button class="lnk" data-act="profile">Указать</button></div>';
  if(exWeeks.length)n+='<div class="note"><p>Недели '+exWeeks[0]+'–'+exWeeks[exWeeks.length-1]+' заполнены примерами.</p><button class="lnk" data-act="del-examples">Удалить примеры</button></div>';
  $('#notice').innerHTML=n;
  const m1=weekMonday(startKey());
  $('#scaleFoot').textContent='Неделя 1 началась '+m1.getDate()+' '+MG[m1.getMonth()]+(m1.getFullYear()!==ty?' '+m1.getFullYear():'')+'. Шкала идёт снизу вверх: деление — день, длинная метка — начало недели. Номер текущей недели можно поменять в «Мои данные».';
  $('#pfBtn').innerHTML=P.weight!=null?'<span class="mono">'+fmtN(P.weight)+' кг</span>':'Мои данные';
}


export {renderScale};
