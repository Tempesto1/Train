// Строка статуса и всплывающие сообщения.
import {$} from './util.js';
import {S} from './state.js';

function setStatus(text,cls){const el=$('#status');el.className='status'+(cls?' '+cls:'');el.textContent=text}
function baseStatus(){
  if(S.readOnly)return setStatus('Только просмотр','warn');
  if(S.mode==='local')return setStatus(window.STANDALONE?'Хранится на этом устройстве':'Сохраняется в этом браузере');
  if(S.mode==='db'&&S.loaded)return setStatus('Синхронизировано','ok');
}
let toastT;function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true},2600)}

export {setStatus,baseStatus,toast};
