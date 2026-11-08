// Окно «Мои данные»: вес тела и возраст.
import {$,num,fmtIn} from '../util.js';
import {P} from '../state.js';
import {saveProfile} from '../store.js';
import {toast} from '../ui.js';

function openProfile(){
  const o=$('#pf');
  o.innerHTML='<div class="ov-p"><h2 id="pfTitle">Мои данные</h2><p>Вес тела прибавляется к доп. весу в подтягиваниях, брусьях и других упражнениях с собственным весом. Возраст пригодится позже, чтобы оценивать пропорции силовых.</p>'
   +'<div class="pf-grid"><label class="lbl">Вес тела<span class="pf-box"><input id="pfW" inputmode="decimal" autocomplete="off" value="'+fmtIn(P.weight)+'" placeholder="80"><span>кг</span></span></label><label class="lbl">Возраст<span class="pf-box"><input id="pfA" inputmode="numeric" autocomplete="off" value="'+fmtIn(P.age)+'" placeholder="25"><span>лет</span></span></label></div>'
   +'<div class="pf-act"><button class="btn ghost" data-act="pf-cancel">Позже</button><button class="btn" data-act="pf-save">Сохранить</button></div></div>';
  o.hidden=false;setTimeout(()=>{const i=$('#pfW');if(i&&!i.value)i.focus()},60);
}
function closeProfile(){$('#pf').hidden=true;$('#pf').innerHTML=''}

/* Сохраняет форму. Возвращает true, если данные приняты. */
function submitProfile(){
  const w=num($('#pfW').value),a=num($('#pfA').value);
  if(w==null||w<25||w>300){toast('Впишите вес тела в килограммах, например 78');$('#pfW').focus();return false}
  if(a!=null&&(a<10||a>100)){toast('Проверьте возраст');$('#pfA').focus();return false}
  saveProfile(Math.round(w*10)/10,a==null?null:Math.round(a));closeProfile();toast('Данные сохранены');
  return true;
}

export {openProfile,closeProfile,submitProfile};
