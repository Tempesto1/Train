// Окно с пояснением к экрану — открывается кнопкой «i».
import {$,esc} from '../util.js';
import {INFO} from '../config.js';

const infoBtn=key=>'<button class="ibtn" data-act="info" data-info="'+key+'" aria-label="Что здесь показано">i</button>';
function openInfo(key){
  const I=INFO[key];if(!I)return;const o=$('#info');
  o.innerHTML='<button class="ov-bg" data-act="info-close" aria-label="Закрыть"></button><div class="ov-p info-p" role="dialog" aria-labelledby="infoTitle"><h2 id="infoTitle">'+esc(I.t)+'</h2>'+I.p.map(x=>'<p>'+esc(x)+'</p>').join('')+'<div class="pf-act"><button class="btn" data-act="info-close">Понятно</button></div></div>';
  o.hidden=false;
}
function closeInfo(){const o=$('#info');o.hidden=true;o.innerHTML=''}
const isInfoOpen=()=>!$('#info').hidden;

export {infoBtn,openInfo,closeInfo,isInfoOpen};
