// Строка статуса и всплывающие сообщения.
import {$} from './util.js';
import {S} from './state.js';

function setStatus(text,cls){const el=$('#status');el.className='status'+(cls?' '+cls:'');el.textContent=text}
function baseStatus(){
  if(S.readOnly)return setStatus('Только просмотр','warn');
  if(S.mode==='local')return setStatus(window.STANDALONE?'Хранится на этом устройстве':'Сохраняется в этом браузере');
  if(S.mode==='db'&&S.loaded)return setStatus('Синхронизировано','ok');
}
/* Сообщение внизу. action — необязательная кнопка {label, fn}, например «Вернуть» после удаления. */
let toastT;
function toast(msg,action){
  const t=$('#toast');t.textContent=msg;
  if(action){const b=document.createElement('button');b.className='toast-act';b.textContent=action.label;b.onclick=()=>{t.hidden=true;clearTimeout(toastT);action.fn()};t.appendChild(b)}
  t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true},action?5000:2600);
}

export {setStatus,baseStatus,toast};
