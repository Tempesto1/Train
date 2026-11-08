// Окно «Мои данные»: вес тела, возраст и номер текущей недели тренировок.
import {$,num,fmtIn,weekMonday,MG} from '../util.js';
import {S,P,curKey} from '../state.js';
import {saveProfile} from '../store.js';
import {toast} from '../ui.js';
import {weekNo,weekDiff,earliestWeek,startForNo} from '../model.js';

/* Наименьший допустимый номер текущей недели: все записи должны оказаться не раньше недели 1. */
function minWeekNo(){const e=earliestWeek();return e?weekDiff(e,curKey())+1:1}
function startLabel(n){
  if(!(n>=1))return '';
  const mon=weekMonday(startForNo(n));
  return 'Неделя 1 — с '+mon.getDate()+' '+MG[mon.getMonth()]+(mon.getFullYear()!==S.today.getFullYear()?' '+mon.getFullYear():'');
}

function openProfile(){
  const o=$('#pf');const n=weekNo(curKey());
  o.innerHTML='<div class="ov-p"><h2 id="pfTitle">Мои данные</h2><p>Вес тела прибавляется к доп. весу в подтягиваниях, брусьях и других упражнениях с собственным весом. Возраст пригодится позже, чтобы оценивать пропорции силовых.</p>'
   +'<div class="pf-grid"><label class="lbl">Вес тела<span class="pf-box"><input id="pfW" inputmode="decimal" autocomplete="off" value="'+fmtIn(P.weight)+'" placeholder="80"><span>кг</span></span></label><label class="lbl">Возраст<span class="pf-box"><input id="pfA" inputmode="numeric" autocomplete="off" value="'+fmtIn(P.age)+'" placeholder="25"><span>лет</span></span></label></div>'
   +'<label class="lbl pf-week">Сейчас идёт неделя №<span class="pf-box"><input id="pfN" inputmode="numeric" autocomplete="off" value="'+n+'"><span id="pfNHint">'+startLabel(n)+'</span></span></label>'
   +'<p class="pf-note">Если вы уже занимаетесь, впишите, какая по счёту сейчас неделя. Даты остаются по календарю, меняются только номера.</p>'
   +'<div class="pf-act"><button class="btn ghost" data-act="pf-cancel">Отмена</button><button class="btn" data-act="pf-save">Сохранить</button></div></div>';
  o.hidden=false;
}
function closeProfile(){$('#pf').hidden=true;$('#pf').innerHTML=''}

document.addEventListener('input',e=>{if(e.target.id==='pfN'){const h=$('#pfNHint');if(h)h.textContent=startLabel(Math.round(num(e.target.value)))}});

/* Сохраняет форму. Возвращает true, если данные приняты. */
function submitProfile(){
  const w=num($('#pfW').value),a=num($('#pfA').value),n=num($('#pfN').value);
  if(w!=null&&(w<25||w>300)){toast('Впишите вес тела в килограммах, например 78');$('#pfW').focus();return false}
  if(a!=null&&(a<10||a>100)){toast('Проверьте возраст');$('#pfA').focus();return false}
  if(n==null||n<1||n>520||Math.round(n)!==n){toast('Впишите номер недели целым числом, например 6');$('#pfN').focus();return false}
  const min=minWeekNo();
  if(n<min){toast('У вас есть записи раньше: номер недели не меньше '+min);$('#pfN').focus();return false}
  const start=n===weekNo(curKey())&&!P.start?null:startForNo(n);
  saveProfile(w==null?null:Math.round(w*10)/10,a==null?null:Math.round(a),start);closeProfile();toast('Данные сохранены');
  return true;
}

export {openProfile,closeProfile,submitProfile};
