// Экран записи тренировки. Шапка и «Готово» закреплены, прокручивается только середина.
// Упражнения — отдельные блоки по группам мышц; второстепенные действия спрятаны в меню «⋯»;
// новые упражнения добавляются через список («+ Упражнение»). Подходы и блоки появляются и исчезают плавно.
import {$,esc,ymd,addDays,weekMonday,num,z,fmtN,fmtIn,norm,clone,uid} from '../util.js';
import {TYPES,ORDER,MUS,LIB,LIBMAP,DEFAULT_PICK,CK,FIELD,STEP} from '../config.js';
import {S,P} from '../state.js';
import {emit} from '../bus.js';
import {toast} from '../ui.js';
import {muscleOf,isBw,isBwName,extraOf,effW,bestOf,setsLine,isEmpty,sortedSessions,buildIndex,prevBefore,compare,cardioDelta,weekNo,fmtWeekNo} from '../model.js';
import {infoBtn} from './info.js';
import {commitSession,removeSession} from '../store.js';

/* Открытая тренировка: {doc, dirty, timer, idx, armed, showOpt, menu, picker, anim, busy} */
let E=null;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE='cubic-bezier(.2,.8,.2,1)';

/* ---------- данные ---------- */
function suggestions(m,doc){
  const have=new Set((doc.exercises||[]).map(e=>norm(e.name)));const out=[];const seen=new Set();
  const add=n=>{const k=norm(n);if(!k||have.has(k)||seen.has(k))return;seen.add(k);out.push(n)};
  sortedSessions().reverse().forEach(s=>{if(TYPES[s.type]&&TYPES[s.type].kind==='strength')(s.exercises||[]).forEach(e=>{if(muscleOf(e,s.type)===m)add(e.name.trim())})});
  (LIB[m]||[]).forEach(x=>add(x[0]));
  return out.slice(0,14);
}
function newEx(name,muscle){return{id:uid(),name,muscle,bw:isBwName(name),sets:[]}}
/* Заполнить новую тренировку упражнениями прошлого такого же дня (без подходов) или упражнениями по умолчанию. */
function prefill(doc){
  const type=doc.type,T=TYPES[type];
  const prev=sortedSessions().filter(s=>s.type===type&&s.week<doc.week&&!isEmpty(s)).pop();
  delete doc.exercises;delete doc.cardio;
  if(T.kind==='strength'){
    if(prev)doc.exercises=prev.exercises.filter(e=>!T.opt.includes(muscleOf(e,type))).map(e=>({id:uid(),name:e.name,muscle:muscleOf(e,type),bw:isBw(e),sets:[]}));
    else{doc.exercises=[];DEFAULT_PICK[type].forEach(([m,n])=>LIB[m].slice(0,n).forEach(x=>doc.exercises.push(newEx(x[0],m))))}
  }else doc.cardio=(prev&&prev.cardio&&prev.cardio.length?prev.cardio.map(c=>c.kind):['treadmill']).map(k=>({id:uid(),kind:k}));
}
/* Есть ли в тренировке вписанные цифры (заметка не считается). */
function hasEntries(d){return !isEmpty(Object.assign({},d,{note:''}))}
/* Сменить день, если ошиблись: без цифр — подставить упражнения нового дня, с цифрами (силовая → силовая) — оставить как есть. */
function switchType(nt){
  const d=E.doc,old=d.id,filled=hasEntries(d);
  d.type=nt;d.id=d.week+'_'+nt;
  if(!filled)prefill(d);
  (d.exercises||[]).forEach(e=>{e.muscle=muscleOf(e,nt)});
  if(S.sessions.has(old))removeSession(old);
  E.showOpt={};E.menu=null;
  $('#sheet').className='sheet t-'+nt;renderTitle();
  E.anim={sel:'.msec'};touch();renderEditor();
  toast('День изменён: '+TYPES[nt].name);
}
function renderTitle(){const el=$('#edTitle');if(el)el.innerHTML='<span class="pl"></span><h2>'+TYPES[E.doc.type].short+'</h2><span class="caret" aria-hidden="true">▾</span>'}
function touch(){if(!E)return;E.dirty=true;clearTimeout(E.timer);E.timer=setTimeout(flushEditor,700);editorSave('…')}
function flushEditor(){
  if(!E||!E.dirty)return;E.dirty=false;clearTimeout(E.timer);
  const d=clone(E.doc);delete d.example;d.updatedAt=new Date().toISOString();
  if(d.exercises)d.exercises=d.exercises.filter(e=>e.name&&e.name.trim()||e.sets.length);
  if(isEmpty(d)){if(S.sessions.has(d.id))removeSession(d.id);editorSave('')}
  else{commitSession(d);if(S.mode!=='db')editorSave(S.mode==='local'?'Сохранено':'')}
}
function editorSave(t){const el=document.getElementById('saveState');if(el)el.textContent=t}

/* ---------- экран закреплён по размеру видимой области (учитывая клавиатуру) ---------- */
let lockY=0;
function lockBody(){lockY=window.scrollY;document.body.style.top=-lockY+'px';document.body.classList.add('locked')}
function unlockBody(){document.body.classList.remove('locked');document.body.style.top='';window.scrollTo(0,lockY)}
function fitSheet(){
  const sh=$('#sheet'),vv=window.visualViewport;if(!sh||sh.hidden||!vv)return;
  sh.style.height=vv.height+'px';sh.style.top=vv.offsetTop+'px';
  sh.classList.toggle('kb',vv.height<window.innerHeight-120); /* клавиатура открыта: убрать нижний отступ под полоску «домой» */
}
if(window.visualViewport){visualViewport.addEventListener('resize',fitSheet);visualViewport.addEventListener('scroll',fitSheet)}

/* ---------- анимации появления и исчезновения ---------- */
function animateIn(el){
  if(!el||reduced())return;
  const cs=getComputedStyle(el),h=el.offsetHeight;
  el.style.overflow='hidden';
  el.animate([
    {height:'0px',paddingTop:'0px',paddingBottom:'0px',marginBottom:'0px',opacity:0,transform:'translateY(-6px)'},
    {height:h+'px',paddingTop:cs.paddingTop,paddingBottom:cs.paddingBottom,marginBottom:cs.marginBottom,opacity:1,transform:'none'}
  ],{duration:240,easing:EASE}).finished.then(()=>{el.style.overflow=''},()=>{});
}
function animateOut(el,done){
  if(!el||reduced()){done();return}
  const cs=getComputedStyle(el),h=el.offsetHeight;
  el.style.overflow='hidden';E.busy=true;
  el.animate([
    {height:h+'px',paddingTop:cs.paddingTop,paddingBottom:cs.paddingBottom,marginBottom:cs.marginBottom,opacity:1},
    {height:'0px',paddingTop:'0px',paddingBottom:'0px',marginBottom:'0px',opacity:0}
  ],{duration:180,easing:'ease-in',fill:'forwards'}).finished.then(()=>{if(E)E.busy=false;done()},()=>{if(E)E.busy=false;done()});
}

/* ---------- открыть / закрыть ---------- */
function openEditor(id){
  const [wkKey,type]=id.split('_');const T=TYPES[type];if(!T)return;
  let doc=S.sessions.get(id);
  if(doc)doc=clone(doc);
  else{
    const mon=weekMonday(wkKey),sun=addDays(mon,6);let date=ymd(S.today);if(date<ymd(mon)||date>ymd(sun))date=ymd(mon);
    doc={id,week:wkKey,type,date,note:''};prefill(doc);
  }
  (doc.exercises||[]).forEach(e=>{if(!e.id)e.id=uid();e.sets=e.sets||[];e.muscle=muscleOf(e,type);e.bw=isBw(e)});
  (doc.cardio||[]).forEach(c=>{if(!c.id)c.id=uid()});
  E={doc,dirty:false,timer:null,idx:buildIndex(),armed:false,showOpt:{},menu:null,picker:null,anim:null,busy:false};
  const sh=$('#sheet');
  sh.getAnimations().forEach(x=>x.cancel());sh.style.pointerEvents='';
  sh.className='sheet t-'+type;
  sh.innerHTML='<header class="ed-top"><div class="ed-top-in"><button class="tbtn" data-act="close" aria-label="Назад к неделе">‹ Нед. '+fmtWeekNo(weekNo(doc.week))+'</button>'
    +'<button class="sheet-t" data-act="type-menu" id="edTitle" aria-label="Сменить день или удалить тренировку"></button><span class="save-state" id="saveState"></span>'+infoBtn('editor')+'</div></header>'
    +'<div class="ed-scroll" id="edScroll"><div class="ed-in" id="edIn"></div></div>'
    +'<footer class="ed-foot"><div class="ed-foot-in"><button class="btn done" data-act="done">Готово</button></div></footer>'
    +'<div class="picker" id="picker" hidden></div>';
  renderTitle();renderEditor();
  lockBody();sh.hidden=false;fitSheet();
  if(!reduced())sh.animate([{opacity:0,transform:'translateY(28px)'},{opacity:1,transform:'none'}],{duration:260,easing:EASE});
}
function closeEditor(){
  if(!E)return;flushEditor();E=null;
  const sh=$('#sheet');
  /* Анимацию закрытия обязательно снять после скрытия: с fill:'forwards' она остаётся на элементе
     и при следующем открытии снова делает экран прозрачным (невидимым, но нажимаемым). */
  const blur=document.activeElement;if(blur&&sh.contains(blur))blur.blur();
  sh.style.pointerEvents='none';
  let a=null;
  const hide=()=>{if(a)a.cancel();sh.hidden=true;sh.innerHTML='';sh.style.height='';sh.style.top='';sh.style.pointerEvents=''};
  unlockBody();emit('changed');
  if(reduced())hide();else{a=sh.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(28px)'}],{duration:170,easing:'ease-in',fill:'forwards'});a.finished.then(hide,hide)}
}
/* «Назад» (Escape): сначала закрыть список выбора, потом сам экран. */
function editorBack(){if(!E)return;if(E.picker){E.picker=null;renderPicker();return}closeEditor()}

/* ---------- разметка ---------- */
function exCardHTML(e){
  const bw=isBw(e),menu=E.menu===e.id;
  const prevE=prevBefore(E.idx.ex.get(norm(e.name)),E.doc.week);
  const cmp=compare(bestOf(e),prevE);
  let h='<article class="ex" data-ex="'+e.id+'"><header class="ex-h"><input class="ex-name" id="exn-'+e.id+'" value="'+esc(e.name)+'" placeholder="Название упражнения" aria-label="Название упражнения">'
    +'<button class="icon more'+(menu?' on':'')+'" data-act="menu" aria-label="Действия с упражнением" aria-expanded="'+menu+'">⋯</button></header>';
  if(menu)h+='<div class="ex-menu"><button class="tog" data-act="tog-bw" aria-pressed="'+bw+'"><span class="chk" aria-hidden="true"></span>С собственным весом</button><button class="lnk-del" data-act="del-ex">Удалить упражнение</button></div>';
  h+='<p class="ex-meta">'+(bw?'<span class="badge">свой вес</span>':'')+(prevE?'<span>Прошлый раз, нед. '+weekNo(prevE.week)+':</span> <span class="mono">'+setsLine(prevE.ex,prevE.sets)+'</span>':'<span>Первый раз</span>')+'</p>';
  if(bw)h+=P.weight!=null?'<p class="bwline">Ваш вес <span class="mono">'+fmtN(P.weight)+' кг</span> + доп. вес <button data-act="profile">изменить</button></p>':'<p class="bwline miss">Вес тела не указан, пока считается только доп. вес <button data-act="profile">указать</button></p>';
  if(e.sets.length){
    h+='<div class="set-head"><span>#</span><span>'+(bw?'Доп. вес, кг':'Вес, кг')+'</span><span>Повт</span><span></span></div><div class="sets">';
    e.sets.forEach((s,i)=>{const val=bw?(num(s.x)!=null?s.x:null):s.w;
      h+='<div class="set-row" data-set="'+i+'"><span class="set-i">'+(i+1)+'</span><div class="stepper"><button data-act="w-" aria-label="Минус '+fmtN(STEP)+' кг">−</button><input class="w" id="w-'+e.id+'-'+i+'" inputmode="decimal" autocomplete="off" value="'+fmtIn(val)+'" placeholder="0" aria-label="'+(bw?'Дополнительный вес':'Вес')+'"><button data-act="w+" aria-label="Плюс '+fmtN(STEP)+' кг">+</button></div><input class="r" id="r-'+e.id+'-'+i+'" inputmode="numeric" autocomplete="off" value="'+fmtIn(s.r)+'" placeholder="0" aria-label="Повторы"><button class="icon del" data-act="del-set" aria-label="Удалить подход">×</button></div>'});
    h+='</div>';
  }
  h+='<footer class="ex-f"><button class="add-set" data-act="add-set">+ Подход</button>'+(prevE&&!e.sets.length?'<button class="ed-lnk" data-act="repeat-prev">как в прошлый раз</button>':'')+'<span class="delta '+(cmp?cmp.dir:'')+'" id="d-'+e.id+'">'+(cmp?cmp.text:'')+'</span></footer></article>';
  return h;
}
function cardioCardHTML(c){
  const K=CK[c.kind]||CK.other,menu=E.menu===c.id;const prev=prevBefore(E.idx.car.get(c.kind||'other'),E.doc.week);
  let h='<article class="ex" data-ex="'+c.id+'"><header class="ex-h"><select class="kind" id="k-'+c.id+'" aria-label="Тренажёр">'+Object.keys(CK).map(k=>'<option value="'+k+'"'+(k===c.kind?' selected':'')+'>'+CK[k].name+'</option>').join('')+'</select>'
    +'<button class="icon more'+(menu?' on':'')+'" data-act="menu" aria-label="Действия" aria-expanded="'+menu+'">⋯</button></header>';
  if(menu)h+='<div class="ex-menu"><button class="lnk-del" data-act="del-ex">Убрать тренажёр</button></div>';
  if(prev){const p=[];if(prev.min)p.push(fmtN(prev.min)+' мин');if(prev.km)p.push(fmtN(prev.km)+' км');if(prev.m)p.push(prev.m+' м');if(prev.speed)p.push(fmtN(prev.speed)+' км/ч');if(prev.incline)p.push('наклон '+fmtN(prev.incline)+'%');if(prev.level)p.push('ур. '+prev.level);h+='<p class="ex-meta"><span>Прошлый раз, нед. '+weekNo(prev.week)+':</span> <span class="mono">'+(p.join(' · ')||'—')+'</span></p>'}
  else h+='<p class="ex-meta"><span>Первый раз</span></p>';
  h+='<div class="cgrid">'+K.f.map(f=>'<label class="cfield">'+FIELD[f].l+'<span class="box"><input class="cf" data-f="'+f+'" id="cf-'+c.id+'-'+f+'" inputmode="decimal" autocomplete="off" value="'+fmtIn(c[f])+'" placeholder="0"><span class="u">'+FIELD[f].u+'</span></span></label>').join('')+'</div>';
  const d=cardioDelta(c,prev);
  h+='<footer class="ex-f"><span class="delta '+(d?d.dir:'')+'" id="d-'+c.id+'">'+(d?d.text:'')+'</span></footer></article>';
  return h;
}
function renderEditor(){
  const d=E.doc,T=TYPES[d.type],mon=weekMonday(d.week);
  let h='<label class="ed-date"><span>Дата</span><input type="date" id="sessDate" value="'+esc(d.date||'')+'" min="'+ymd(mon)+'" max="'+ymd(addDays(mon,6))+'"></label>';
  if(T.kind==='strength'){
    const present=new Set(d.exercises.map(e=>e.muscle));
    const ms=T.muscles.slice();
    T.opt.forEach(m=>{if(present.has(m)||E.showOpt[m])ms.push(m)});
    present.forEach(m=>{if(!ms.includes(m))ms.push(m)});
    ms.forEach(m=>{
      const M=MUS[m],opt=T.opt.includes(m),list=d.exercises.filter(e=>e.muscle===m);
      h+='<section class="msec '+M.c+'" data-m="'+m+'"><h3 class="msec-h"><span class="pl"></span>'+M.name+(opt?'<small>по желанию</small>':'')+'<span class="msec-n">'+(list.length?list.length+' упр.':'')+'</span></h3>';
      h+='<div class="ex-list">'+list.map(exCardHTML).join('')+'</div>';
      h+='<button class="add-ex" data-act="pick" data-m="'+m+'">+ Упражнение</button></section>';
    });
    T.opt.forEach(m=>{if(!ms.includes(m))h+='<button class="optbtn" data-act="show-opt" data-m="'+m+'"><span class="pl '+MUS[m].c+'"></span>+ '+MUS[m].name+' сегодня</button>'});
  }else{
    h+='<section class="msec t-cardio"><div class="ex-list">'+(d.cardio||[]).map(cardioCardHTML).join('')+'</div>';
    h+='<button class="add-ex" data-act="pick" data-m="cardio">+ Тренажёр</button></section>';
  }
  h+='<div class="ed-bottom"><label class="lbl">Заметка<textarea class="inp" id="sessNote" rows="2" placeholder="Самочувствие, сон, что поменять в следующий раз">'+esc(d.note||'')+'</textarea></label>';
  if(S.sessions.has(d.id))h+='<button class="lnk-del" data-act="del-session" id="delSess">Удалить тренировку</button>';
  h+='</div>';
  const sc=$('#edScroll');const top=sc.scrollTop;$('#edIn').innerHTML=h;sc.scrollTop=top;
  if(E.anim){const el=$('#edIn').querySelector(E.anim.sel);E.anim=null;if(el){animateIn(el);if(el.matches('.ex,.msec'))setTimeout(()=>el.scrollIntoView({block:'nearest',behavior:reduced()?'auto':'smooth'}),60)}}
}
function renderPicker(){
  const p=$('#picker');if(!p)return;
  if(!E||!E.picker){if(!p.hidden){const panel=p.querySelector('.pk-panel');const hide=()=>{p.hidden=true;p.innerHTML=''};if(panel&&!reduced())panel.animate([{transform:'none'},{transform:'translateY(100%)'}],{duration:160,easing:'ease-in',fill:'forwards'}).finished.then(hide,hide);else hide()}return}
  const m=E.picker,d=E.doc;let title,rows;
  if(m==='type'){
    const filled=hasEntries(d);
    title='День тренировки';
    rows=ORDER.map(t=>{const busy=t!==d.type&&!isEmpty(S.sessions.get(d.week+'_'+t));const kindLock=t!==d.type&&filled&&TYPES[t].kind!==TYPES[d.type].kind;
      const why=busy?'уже записан':kindLock?'сначала очистите подходы':'';
      return '<button class="pk-row t-'+t+(t===d.type?' cur':'')+'" data-act="set-type" data-type="'+t+'"'+(why?' disabled':'')+'><span class="pl"></span><span>'+TYPES[t].name+'</span>'+(t===d.type?'<span class="pk-note">сейчас</span>':why?'<span class="pk-note">'+why+'</span>':'')+'</button>'}).join('')
      +'<button class="pk-row pk-del" data-act="del-session"><span>Удалить тренировку</span></button>';
  }
  else if(m==='cardio'){title='Добавить кардио';rows=Object.keys(CK).map(k=>'<button class="pk-row" data-act="add-cardio" data-kind="'+k+'"><span>'+CK[k].name+'</span><span class="pk-plus">+</span></button>').join('')}
  else{title=MUS[m].name;rows=suggestions(m,d).map(n=>'<button class="pk-row" data-act="add-ex" data-m="'+m+'" data-name="'+esc(n)+'"><span>'+esc(n)+'</span>'+(isBwName(n)?'<span class="badge">свой вес</span>':'')+'<span class="pk-plus">+</span></button>').join('')}
  p.innerHTML='<button class="pk-bg" data-act="pick-close" aria-label="Закрыть список"></button><div class="pk-panel" role="dialog" aria-label="'+esc(title)+'"><div class="pk-h"><h3>'+esc(title)+'</h3><button class="tbtn" data-act="pick-close">Закрыть</button></div>'
    +'<div class="pk-list">'+(rows||'<p class="pk-empty">Все упражнения из списка уже добавлены.</p>')+'</div>'
    +(m==='cardio'||m==='type'?'':'<div class="pk-custom"><input class="inp" id="customEx" placeholder="Своё упражнение" autocomplete="off"><button class="btn" data-act="add-custom" data-m="'+m+'">Добавить</button></div>')+'</div>';
  const was=p.hidden;p.hidden=false;
  if(was&&!reduced()){p.querySelector('.pk-panel').animate([{transform:'translateY(100%)'},{transform:'none'}],{duration:240,easing:EASE});p.querySelector('.pk-bg').animate([{opacity:0},{opacity:1}],{duration:200})}
}
function findEx(el){const card=el.closest('[data-ex]');if(!card||!E)return null;const id=card.dataset.ex;const list=E.doc.exercises||E.doc.cardio;return{card,item:list.find(x=>x.id===id),list}}
function refreshDelta(item){
  const el=document.getElementById('d-'+item.id);if(!el)return;let c;
  if(E.doc.type==='cardio')c=cardioDelta(item,prevBefore(E.idx.car.get(item.kind||'other'),E.doc.week));
  else c=compare(bestOf(item),prevBefore(E.idx.ex.get(norm(item.name)),E.doc.week));
  el.className='delta '+(c?c.dir:'');el.textContent=c?c.text:'';
}

const isEditorOpen=()=>!!E;
/* Перерисовать открытую тренировку (например, после смены веса тела). */
function refreshEditor(reindex){if(!E)return;if(reindex)E.idx=buildIndex();renderEditor()}

/* ---------- нажатия внутри экрана тренировки (вызывается из общего обработчика) ---------- */
function handleEditorClick(act,t){
  if(!E||E.busy)return;
  const d=E.doc;
  if(act==='close')return closeEditor();
  if(act==='done'){const had=E.dirty||S.sessions.has(d.id);closeEditor();if(had&&S.sessions.has(d.id))toast('Тренировка сохранена');return}
  if(act==='show-opt'){E.showOpt[t.dataset.m]=true;E.anim={sel:'[data-m="'+t.dataset.m+'"]'};renderEditor();return}
  if(act==='pick'){E.picker=t.dataset.m;E.menu=null;renderPicker();return}
  if(act==='pick-close'){E.picker=null;renderPicker();return}
  if(act==='add-ex'||act==='add-custom'){
    const name=act==='add-ex'?t.dataset.name:($('#customEx').value||'').trim();if(!name){$('#customEx').focus();return}
    const e=newEx(name,t.dataset.m);d.exercises.push(e);E.picker=null;renderPicker();E.anim={sel:'[data-ex="'+e.id+'"]'};touch();renderEditor();return;
  }
  if(act==='add-cardio'){const c={id:uid(),kind:t.dataset.kind};d.cardio.push(c);E.picker=null;renderPicker();E.anim={sel:'[data-ex="'+c.id+'"]'};touch();renderEditor();return}
  if(act==='del-session'){
    /* Без подтверждения: удаляем сразу, а в сообщении даём «Вернуть». */
    const was=S.sessions.get(d.id);const back=was?clone(was):null;
    if(was)removeSession(d.id);E.dirty=false;E.picker=null;closeEditor();
    toast(back?'Тренировка удалена':'Тренировка не сохранена',back?{label:'Вернуть',fn:()=>commitSession(back)}:null);return;
  }
  if(act==='type-menu'){E.picker='type';E.menu=null;renderPicker();return}
  if(act==='set-type'){const nt=t.dataset.type;E.picker=null;renderPicker();if(nt!==d.type)switchType(nt);return}
  const f=findEx(t);if(!f||!f.item)return;const item=f.item;
  if(act==='menu'){E.menu=E.menu===item.id?null:item.id;const open=E.menu===item.id;renderEditor();if(open){const m=$('#edIn').querySelector('[data-ex="'+item.id+'"] .ex-menu');animateIn(m)}return}
  if(act==='del-ex'){E.menu=null;animateOut(f.card,()=>{if(!E)return;f.list.splice(f.list.indexOf(item),1);touch();renderEditor()});return}
  if(act==='tog-bw'){
    const on=!isBw(item);
    item.sets=item.sets.map(s=>on?{x:null,r:num(s.r),bw:P.weight}:{w:effW(item,s),r:num(s.r)});
    item.bw=on;touch();renderEditor();return;
  }
  if(act==='add-set'){
    const bw=isBw(item);let base=item.sets[item.sets.length-1];
    if(!base){const prev=prevBefore(E.idx.ex.get(norm(item.name)),d.week);if(prev)base=prev.sets.filter(s=>num(s.r)>0)[0]}
    const ns=bw?{x:base?(extraOf(base)||null):null,r:base?num(base.r):null,bw:P.weight}:{w:base?num(base.w):null,r:base?num(base.r):null};
    item.sets.push(ns);const i=item.sets.length-1;
    E.anim={sel:'[data-ex="'+item.id+'"] '+(i===0?'.sets':'[data-set="'+i+'"]')};touch();renderEditor();
    const inp=document.getElementById((bw?'r-':'w-')+item.id+'-'+i);if(inp&&!base)inp.focus();return;
  }
  if(act==='repeat-prev'){const prev=prevBefore(E.idx.ex.get(norm(item.name)),d.week);if(prev){const bw=isBw(item);item.sets=prev.sets.filter(s=>num(s.r)>0).map(s=>bw?{x:extraOf(s)||null,r:num(s.r),bw:P.weight}:{w:num(s.w),r:num(s.r)});E.anim={sel:'[data-ex="'+item.id+'"] .sets'};touch();renderEditor()}return}
  const row=t.closest('[data-set]');if(!row)return;const si=+row.dataset.set;const set=item.sets[si];
  if(act==='del-set'){animateOut(row,()=>{if(!E)return;item.sets.splice(si,1);touch();renderEditor()});return}
  if(act==='w+'||act==='w-'){
    const bw=isBw(item);const cur=bw?z(set.x):z(set.w);let nv=Math.round((cur+(act==='w+'?STEP:-STEP))*100)/100;if(nv<0)nv=0;
    if(bw){set.x=nv||null;row.querySelector('.w').value=nv?fmtIn(nv):''}else{set.w=nv;row.querySelector('.w').value=fmtIn(nv)}
    touch();refreshDelta(item);return;
  }
}

document.addEventListener('input',e=>{
  if(!E)return;const t=e.target;
  if(t.id==='sessDate'){E.doc.date=t.value;touch();return}
  if(t.id==='sessNote'){E.doc.note=t.value;touch();return}
  const f=findEx(t);if(!f||!f.item)return;
  if(t.classList.contains('ex-name')){f.item.name=t.value;touch();return}
  if(t.classList.contains('cf')){f.item[t.dataset.f]=num(t.value);touch();refreshDelta(f.item);return}
  const row=t.closest('[data-set]');if(!row)return;const set=f.item.sets[+row.dataset.set];
  if(t.classList.contains('w')){if(isBw(f.item))set.x=num(t.value);else set.w=num(t.value)}
  if(t.classList.contains('r')){const v=num(t.value);set.r=v==null?null:Math.round(v)}
  touch();refreshDelta(f.item);
});
document.addEventListener('change',e=>{
  if(!E)return;const t=e.target;const f=findEx(t);
  if(t.classList.contains('ex-name')&&f){if(!f.item.sets.length){const l=LIBMAP.get(norm(f.item.name));if(l)f.item.bw=l.bw}renderEditor();return}
  if(t.classList.contains('kind')&&f){f.item.kind=t.value;touch();renderEditor()}
});
/* Поле, в которое пишут, не должно прятаться под клавиатурой. */
document.addEventListener('focusin',e=>{
  if(!E||!e.target.matches('#edIn input, #edIn textarea'))return;
  setTimeout(()=>{if(E&&document.activeElement===e.target)e.target.scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'})},320);
});

export {openEditor,closeEditor,editorBack,flushEditor,isEditorOpen,refreshEditor,handleEditorClick};
