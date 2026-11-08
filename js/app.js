// Точка входа: переключение экранов, общий обработчик нажатий, запуск.
import {$,ymd,addDays,isoWeek,weekMonday} from './util.js';
import {S,P,curKey} from './state.js';
import {on} from './bus.js';
import {baseStatus,toast} from './ui.js';
import {sortedSessions,firstKey} from './model.js';
import {loadCache,removeSession,restoreFrom,connect} from './store.js';
import {renderScale} from './views/scale.js';
import {renderWeek} from './views/week.js';
import {renderProgress} from './views/progress.js';
import {hideTip} from './views/charts.js';
import {openProfile,closeProfile,submitProfile} from './views/profile.js';
import {openEditor,editorBack,flushEditor,isEditorOpen,refreshEditor,handleEditorClick} from './views/editor.js';
import {openInfo,closeInfo,isInfoOpen} from './views/info.js';
import {openWeeks,closeWeeks,weeksAction,isWeeksOpen} from './views/weeks.js';

/* ---------- экраны ---------- */
let rq=0;
/* Пока открыт экран записи, спрятанные под ним экраны не перерисовываем: это заставляло iOS пересчитывать
   страницу при каждом сохранении, и экран дёргался. Перерисуем при закрытии (оно тоже шлёт 'changed'). */
function scheduleRender(){if(rq||isEditorOpen())return;rq=requestAnimationFrame(()=>{rq=0;render()})}
function render(){
  $('#scaleView').hidden=S.view!=='scale';$('#weekView').hidden=S.view!=='week';$('#progressView').hidden=S.view!=='progress';
  if(S.view==='scale')renderScale();else if(S.view==='week')renderWeek();else renderProgress();
  baseStatus();
}
function go(view,week){
  if(S.view==='scale')S.scaleY=window.scrollY;
  const from=S.view;S.view=view;if(week)S.week=week;hideTip();render();
  if(view==='scale')window.scrollTo(0,from==='scale'?window.scrollY:S.scaleY);else window.scrollTo(0,0);
}

/* ---------- переход между неделями ----------
   Свайп: неделя едет за пальцем; если протянуть дальше четверти экрана (или быстро смахнуть) —
   уезжает, а соседняя въезжает с другой стороны. Стрелки в шапке делают тот же переход. */
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const canGo=dir=>dir>0?S.week<curKey():S.week>firstKey();
function switchWeek(k,dir){S.week=k;window.scrollTo(0,0);hideTip();renderWeek(dir);baseStatus()}
function slideTo(k,dir){
  const el=$('#wkSlide');
  if(!el||reduced()){switchWeek(k,dir);return}
  el.animate([{transform:'none',opacity:1},{transform:'translateX('+(-dir*40)+'%)',opacity:0}],{duration:150,easing:'ease-in',fill:'forwards'}).finished.then(()=>switchWeek(k,dir));
}
(function(){
  const v=$('#weekView');let sx=0,sy=0,t0=0,lock=null,el=null,dx=0;
  v.addEventListener('touchstart',e=>{if(e.touches.length>1){el=null;return}const t=e.touches[0];sx=t.clientX;sy=t.clientY;t0=Date.now();lock=null;dx=0;el=$('#wkSlide')},{passive:true});
  v.addEventListener('touchmove',e=>{
    if(!el)return;const t=e.touches[0],mx=t.clientX-sx,my=t.clientY-sy;
    if(lock===null){if(Math.abs(mx)<8&&Math.abs(my)<8)return;lock=Math.abs(mx)>Math.abs(my)*1.2?'x':'y'}
    if(lock!=='x')return;
    e.preventDefault();
    dx=canGo(mx<0?1:-1)?mx:mx/4; /* дальше первой и текущей недели — тугое сопротивление */
    el.style.transition='none';el.style.transform='translateX('+dx+'px)';el.style.opacity=String(1-Math.min(.45,Math.abs(dx)/700));
  },{passive:false});
  const end=()=>{
    if(!el)return;const cur=el;el=null;if(lock!=='x')return;
    const w=v.clientWidth,dir=dx<0?1:-1,quick=Date.now()-t0<300&&Math.abs(dx)>40;
    if((Math.abs(dx)>w*0.25||quick)&&canGo(dir)){
      const k=isoWeek(addDays(weekMonday(S.week),dir*7)).key;
      cur.style.transition='transform .16s ease-in, opacity .16s ease-in';cur.style.transform='translateX('+(-dir*w)+'px)';cur.style.opacity='0';
      setTimeout(()=>switchWeek(k,dir),160);
    }else{cur.style.transition='transform .22s cubic-bezier(.2,.8,.2,1), opacity .22s';cur.style.transform='';cur.style.opacity=''}
  };
  v.addEventListener('touchend',end);v.addEventListener('touchcancel',end);
})();

/* ---------- события от хранилища ---------- */
on('changed',scheduleRender);
on('profile',weightChanged=>{if(isEditorOpen()){if(weightChanged)refreshEditor(false)}else scheduleRender()});

/* ---------- нажатия ---------- */
/* Пустой обработчик касаний нужен Safari на iPhone, чтобы подсветка :active работала, пока палец прижат. */
document.addEventListener('touchstart',()=>{},{passive:true});
let exArm=0;
document.addEventListener('click',e=>{
  if(e.target.id==='pf'){closeProfile();return}
  const t=e.target.closest('button');if(!t||t.disabled)return;
  if(t.dataset.go)return go(t.dataset.go);
  if(t.dataset.week){if(S.view==='week'&&t.dataset.dir)return slideTo(t.dataset.week,+t.dataset.dir);return go('week',t.dataset.week)}
  if(t.dataset.open)return openEditor(t.dataset.open);
  if(t.dataset.range){S.range=t.dataset.range==='all'?'all':+t.dataset.range;return renderProgress()}
  const act=t.dataset.act;if(!act)return;
  if(act==='info')return openInfo(t.dataset.info);
  if(act==='info-close')return closeInfo();
  if(act==='weeks')return openWeeks();
  if(weeksAction(act))return;
  if(act==='profile')return openProfile();
  if(act==='pf-cancel')return closeProfile();
  if(act==='pf-save'){if(submitProfile()){if(isEditorOpen())refreshEditor(true);else scheduleRender()}return}
  if(act==='del-examples'){
    if(!t.classList.contains('armed')){t.classList.add('armed');t.textContent='Точно удалить?';clearTimeout(exArm);exArm=setTimeout(()=>{t.classList.remove('armed');t.textContent='Удалить примеры'},3500);return}
    [...S.sessions.values()].filter(s=>s.example).forEach(s=>removeSession(s.id));toast('Примеры удалены');return;
  }
  if(act==='copy-json'){
    const data=JSON.stringify({profile:P,sessions:sortedSessions()},null,1);
    const fallback=()=>{const d=$('#dump');d.hidden=false;d.value=data;d.focus();d.select();toast('Выделите текст и скопируйте')};
    try{navigator.clipboard.writeText(data).then(()=>toast('Данные скопированы'),fallback)}catch(_){fallback()}
    return;
  }
  if(act==='restore-open'){$('#restoreBox').hidden=false;$('#restoreText').focus();return}
  if(act==='restore-close'){$('#restoreBox').hidden=true;return}
  if(act==='restore-run'){const v=$('#restoreText').value.trim();if(!v){$('#restoreText').focus();return}restoreFrom(v);return}
  handleEditorClick(act,t);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(isInfoOpen())closeInfo();else if(isWeeksOpen())closeWeeks();else if(!$('#pf').hidden)closeProfile();else if(isEditorOpen())editorBack();else if(S.view!=='scale')go('scale')}
  if(e.key==='Enter'&&e.target.id==='customEx'){e.preventDefault();const b=document.querySelector('[data-act="add-custom"]');b&&b.click()}
});

/* Сохранить незаконченную тренировку при сворачивании; перерисовать, если сменился день. */
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushEditor();else checkDay()});
window.addEventListener('pagehide',()=>flushEditor());
function checkDay(){const t=new Date();if(ymd(t)!==ymd(S.today)){S.today=t;scheduleRender()}}
setInterval(checkDay,60000);

/* ---------- запуск ---------- */
loadCache();render();
connect();
