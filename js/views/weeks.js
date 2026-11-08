// Окно «Счёт недель»: какая по счёту сейчас неделя. Меняется кнопками − и + в любую сторону,
// шкала за окном обновляется сразу; сохраняется при закрытии.
import {$,weekMonday,MG} from '../util.js';
import {S,P,curKey} from '../state.js';
import {emit} from '../bus.js';
import {saveProfile} from '../store.js';
import {weekNo,weekDiff,earliestWeek,startForNo} from '../model.js';

let W=null; // {n, start0}
function dateOf(key){const m=weekMonday(key);return m.getDate()+' '+MG[m.getMonth()]+(m.getFullYear()!==S.today.getFullYear()?' '+m.getFullYear():'')}
function render(){
  const n=W.n,st=startForNo(n),e=earliestWeek();
  const before=e&&e<st?weekDiff(e,st):0;
  $('#wk').innerHTML='<button class="ov-bg" data-act="weeks-close" aria-label="Закрыть"></button><div class="ov-p" role="dialog" aria-labelledby="wkTitle"><h2 id="wkTitle">Счёт недель</h2>'
    +'<p class="wk-q">Какая по счёту сейчас неделя тренировок?</p>'
    +'<div class="wk-step"><button data-act="weeks-dec" aria-label="Меньше"'+(n<=1?' disabled':'')+'>−</button><output id="wkN">'+n+'</output><button data-act="weeks-inc" aria-label="Больше"'+(n>=520?' disabled':'')+'>+</button></div>'
    +'<p class="wk-from">Неделя 1 — с '+dateOf(st)+'</p>'
    +(before?'<p class="wk-warn">Записи за '+before+' '+(before===1?'неделю':before<5?'недели':'недель')+' окажутся до начала счёта. Они никуда не денутся и будут подписаны «до начала».</p>':'')
    +'<div class="pf-act">'+(e?'<button class="btn ghost" data-act="weeks-auto">С первой записи</button>':'')+'<button class="btn" data-act="weeks-close">Готово</button></div></div>';
}
function openWeeks(){W={n:Math.max(1,weekNo(curKey())),start0:P.start};$('#wk').hidden=false;render()}
/* Изменение сразу применяется к шкале (в памяти), записывается при закрытии. */
function setN(n){W.n=Math.min(520,Math.max(1,n));P.start=startForNo(W.n);render();emit('changed')}
function weeksAction(act){
  if(!W)return false;
  if(act==='weeks-dec'){setN(W.n-1);return true}
  if(act==='weeks-inc'){setN(W.n+1);return true}
  if(act==='weeks-auto'){const e=earliestWeek();if(e){P.start=e;W.n=weekDiff(e,curKey())+1;render();emit('changed')}return true}
  if(act==='weeks-close'){closeWeeks();return true}
  return false;
}
function closeWeeks(){
  if(!W)return;
  if(P.start!==W.start0)saveProfile(P.weight,P.age,P.start);
  W=null;$('#wk').hidden=true;$('#wk').innerHTML='';emit('changed');
}
const isWeeksOpen=()=>!!W;

export {openWeeks,closeWeeks,weeksAction,isWeeksOpen};
