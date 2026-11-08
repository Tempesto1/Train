// Точка входа: переключение экранов, общий обработчик нажатий, запуск.
import {$,ymd,addDays,isoWeek,weekMonday} from './util.js';
import {S,P,curKey} from './state.js';
import {on} from './bus.js';
import {baseStatus,toast} from './ui.js';
import {sortedSessions} from './model.js';
import {loadCache,removeSession,restoreFrom,connect} from './store.js';
import {renderScale} from './views/scale.js';
import {renderWeek} from './views/week.js';
import {renderProgress} from './views/progress.js';
import {hideTip} from './views/charts.js';
import {openProfile,closeProfile,submitProfile} from './views/profile.js';
import {openEditor,closeEditor,flushEditor,isEditorOpen,refreshEditor,handleEditorClick} from './views/editor.js';

/* ---------- экраны ---------- */
let rq=0;
function scheduleRender(){if(rq)return;rq=requestAnimationFrame(()=>{rq=0;render()})}
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

/* Свайп влево/вправо на экране недели листает недели. */
(function(){
  let sx=0,sy=0,t0=0;const v=$('#weekView');
  v.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;t0=Date.now()},{passive:true});
  v.addEventListener('touchend',e=>{const t=e.changedTouches[0];const dx=t.clientX-sx,dy=t.clientY-sy;if(Date.now()-t0>600||Math.abs(dx)<70||Math.abs(dy)>Math.abs(dx)*0.6)return;
    const k=isoWeek(addDays(weekMonday(S.week),dx<0?7:-7)).key;if(dx<0&&k>curKey())return;go('week',k)},{passive:true});
})();

/* ---------- события от хранилища ---------- */
on('changed',scheduleRender);
on('profile',weightChanged=>{if(isEditorOpen()){if(weightChanged)refreshEditor(false)}else scheduleRender()});

/* ---------- нажатия ---------- */
let exArm=0;
document.addEventListener('click',e=>{
  if(e.target.id==='pf'){closeProfile();return}
  const t=e.target.closest('button');if(!t||t.disabled)return;
  if(t.dataset.go)return go(t.dataset.go);
  if(t.dataset.week)return go('week',t.dataset.week);
  if(t.dataset.open)return openEditor(t.dataset.open);
  if(t.dataset.range){S.range=t.dataset.range==='all'?'all':+t.dataset.range;return renderProgress()}
  const act=t.dataset.act;if(!act)return;
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
  if(e.key==='Escape'){if(!$('#pf').hidden)closeProfile();else if(isEditorOpen())closeEditor();else if(S.view!=='scale')go('scale')}
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
