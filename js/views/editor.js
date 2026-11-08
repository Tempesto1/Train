// Экран записи тренировки: упражнения по группам мышц, подходы, кардио, кнопка «Готово».
import {$,esc,ymd,addDays,weekMonday,wnum,num,z,fmtN,fmtIn,norm,clone,uid} from '../util.js';
import {TYPES,MUS,LIB,LIBMAP,DEFAULT_PICK,CK,FIELD,STEP} from '../config.js';
import {S,P} from '../state.js';
import {emit} from '../bus.js';
import {toast} from '../ui.js';
import {muscleOf,isBw,isBwName,extraOf,effW,bestOf,setsLine,isEmpty,sortedSessions,buildIndex,prevBefore,compare,cardioDelta} from '../model.js';
import {commitSession,removeSession} from '../store.js';

let E=null; // открытая тренировка: {doc, dirty, timer, idx, armed, showOpt, customFor}

function suggestions(m,doc){
  const have=new Set((doc.exercises||[]).map(e=>norm(e.name)));const out=[];const seen=new Set();
  const add=n=>{const k=norm(n);if(!k||have.has(k)||seen.has(k))return;seen.add(k);out.push(n)};
  sortedSessions().reverse().forEach(s=>{if(TYPES[s.type]&&TYPES[s.type].kind==='strength')(s.exercises||[]).forEach(e=>{if(muscleOf(e,s.type)===m)add(e.name.trim())})});
  (LIB[m]||[]).forEach(x=>add(x[0]));
  return out.slice(0,8);
}
function newEx(name,muscle){return{id:uid(),name,muscle,bw:isBwName(name),sets:[]}}
function openEditor(id){
  const [wkKey,type]=id.split('_');const T=TYPES[type];if(!T)return;
  let doc=S.sessions.get(id);
  if(doc)doc=clone(doc);
  else{
    const mon=weekMonday(wkKey),sun=addDays(mon,6);let date=ymd(S.today);if(date<ymd(mon)||date>ymd(sun))date=ymd(mon);
    doc={id,week:wkKey,type,date,note:''};
    const prev=sortedSessions().filter(s=>s.type===type&&s.week<wkKey&&!isEmpty(s)).pop();
    if(T.kind==='strength'){
      if(prev)doc.exercises=prev.exercises.filter(e=>!T.opt.includes(muscleOf(e,type))).map(e=>({id:uid(),name:e.name,muscle:muscleOf(e,type),bw:isBw(e),sets:[]}));
      else{doc.exercises=[];DEFAULT_PICK[type].forEach(([m,n])=>LIB[m].slice(0,n).forEach(x=>doc.exercises.push(newEx(x[0],m))))}
    }else doc.cardio=(prev&&prev.cardio&&prev.cardio.length?prev.cardio.map(c=>c.kind):['treadmill']).map(k=>({id:uid(),kind:k}));
  }
  (doc.exercises||[]).forEach(e=>{if(!e.id)e.id=uid();e.sets=e.sets||[];e.muscle=muscleOf(e,type);e.bw=isBw(e)});
  (doc.cardio||[]).forEach(c=>{if(!c.id)c.id=uid()});
  E={doc,dirty:false,timer:null,idx:buildIndex(),armed:false,showOpt:{},customFor:null};
  renderEditor();
  $('#sheet').hidden=false;$('#sheet').scrollTop=0;document.documentElement.classList.add('locked');
}
function closeEditor(){
  if(!E)return;flushEditor();E=null;$('#sheet').hidden=true;$('#sheet').innerHTML='';document.documentElement.classList.remove('locked');emit('changed');
}
function touch(){if(!E)return;E.dirty=true;clearTimeout(E.timer);E.timer=setTimeout(flushEditor,700);editorSave('…')}
function flushEditor(){
  if(!E||!E.dirty)return;E.dirty=false;clearTimeout(E.timer);
  const d=clone(E.doc);delete d.example;d.updatedAt=new Date().toISOString();
  if(d.exercises)d.exercises=d.exercises.filter(e=>e.name&&e.name.trim()||e.sets.length);
  if(isEmpty(d)){if(S.sessions.has(d.id))removeSession(d.id);editorSave('')}
  else{commitSession(d);if(S.mode!=='db')editorSave(S.mode==='local'?'В браузере':'')}
}
function editorSave(t){const el=document.getElementById('saveState');if(el)el.textContent=t}

function exCardHTML(e){
  const bw=isBw(e);
  const prevE=prevBefore(E.idx.ex.get(norm(e.name)),E.doc.week);
  const cmp=compare(bestOf(e),prevE);
  let h='<article class="ex" data-ex="'+e.id+'"><header class="ex-h"><input class="ex-name" id="exn-'+e.id+'" value="'+esc(e.name)+'" placeholder="Название упражнения" aria-label="Название упражнения"><button class="tog" data-act="tog-bw" aria-pressed="'+bw+'" title="Упражнение с собственным весом">Свой вес</button><button class="icon" data-act="del-ex" aria-label="Убрать упражнение">×</button></header>';
  h+='<p class="ex-prev">'+(prevE?'Прошлый раз, нед. '+wnum(prevE.week)+': <span class="mono">'+setsLine(prevE.ex,prevE.sets)+'</span>':'Прошлых записей нет')+'</p>';
  if(bw)h+=P.weight!=null?'<p class="bwline">Собственный вес <span class="mono">'+fmtN(P.weight)+' кг</span> + доп. вес<button data-act="profile">изменить</button></p>':'<p class="bwline miss">Ваш вес не указан, пока считается только доп. вес<button data-act="profile">указать</button></p>';
  if(e.sets.length){
    h+='<div class="set-head"><span>#</span><span>'+(bw?'Доп. вес, кг':'Вес, кг')+'</span><span>Повт</span><span></span></div>';
    e.sets.forEach((s,i)=>{const val=bw?(num(s.x)!=null?s.x:null):s.w;
      h+='<div class="set-row" data-set="'+i+'"><span class="set-i">'+(i+1)+'</span><div class="stepper"><button data-act="w-" aria-label="Минус '+fmtN(STEP)+' кг">−</button><input class="w" id="w-'+e.id+'-'+i+'" inputmode="decimal" autocomplete="off" value="'+fmtIn(val)+'" placeholder="0" aria-label="'+(bw?'Дополнительный вес':'Вес')+'"><button data-act="w+" aria-label="Плюс '+fmtN(STEP)+' кг">+</button></div><input class="r" id="r-'+e.id+'-'+i+'" inputmode="numeric" autocomplete="off" value="'+fmtIn(s.r)+'" placeholder="0" aria-label="Повторы"><button class="icon" data-act="del-set" aria-label="Удалить подход">×</button></div>'});
  }
  h+='<footer class="ex-f"><button class="small-btn" data-act="add-set">+ подход</button>'+(prevE&&!e.sets.length?'<button class="small-btn" data-act="repeat-prev">Как в прошлый раз</button>':'')+'<span class="delta '+(cmp?cmp.dir:'')+'" id="d-'+e.id+'">'+(cmp?cmp.text:'')+'</span></footer></article>';
  return h;
}
function cardioCardHTML(c){
  const K=CK[c.kind]||CK.other;const prev=prevBefore(E.idx.car.get(c.kind||'other'),E.doc.week);
  let h='<article class="ex" data-ex="'+c.id+'"><header class="ex-h"><select class="kind" id="k-'+c.id+'" aria-label="Тренажёр">'+Object.keys(CK).map(k=>'<option value="'+k+'"'+(k===c.kind?' selected':'')+'>'+CK[k].name+'</option>').join('')+'</select><button class="icon" data-act="del-ex" aria-label="Убрать">×</button></header>';
  if(prev){const p=[];if(prev.min)p.push(fmtN(prev.min)+' мин');if(prev.km)p.push(fmtN(prev.km)+' км');if(prev.m)p.push(prev.m+' м');if(prev.speed)p.push(fmtN(prev.speed)+' км/ч');if(prev.incline)p.push('наклон '+fmtN(prev.incline)+'%');if(prev.level)p.push('ур. '+prev.level);h+='<p class="ex-prev">Прошлый раз, нед. '+wnum(prev.week)+': <span class="mono">'+(p.join(' · ')||'—')+'</span></p>'}
  else h+='<p class="ex-prev">Прошлых записей нет</p>';
  h+='<div class="cgrid">'+K.f.map(f=>'<label class="cfield">'+FIELD[f].l+'<span class="box"><input class="cf" data-f="'+f+'" id="cf-'+c.id+'-'+f+'" inputmode="decimal" autocomplete="off" value="'+fmtIn(c[f])+'" placeholder="0"><span class="u">'+FIELD[f].u+'</span></span></label>').join('')+'</div>';
  const d=cardioDelta(c,prev);
  h+='<footer class="ex-f"><span class="delta '+(d?d.dir:'')+'" id="d-'+c.id+'">'+(d?d.text:'')+'</span></footer></article>';
  return h;
}
function renderEditor(){
  const d=E.doc,T=TYPES[d.type],mon=weekMonday(d.week);
  let h='<div class="sheet-in t-'+d.type+'"><header class="sheet-h"><button class="tbtn" data-act="close" aria-label="Назад к неделе">‹ Нед. '+wnum(d.week)+'</button><div class="sheet-t"><span class="pl"></span><h2>'+T.name+'</h2></div><span class="save-state" id="saveState"></span></header>';
  h+='<div class="sess-meta"><label class="lbl">Дата тренировки<input type="date" class="inp" id="sessDate" value="'+esc(d.date||'')+'" min="'+ymd(mon)+'" max="'+ymd(addDays(mon,6))+'"></label></div>';
  if(T.kind==='strength'){
    const present=new Set(d.exercises.map(e=>e.muscle));
    const ms=T.muscles.slice();
    T.opt.forEach(m=>{if(present.has(m)||E.showOpt[m])ms.push(m)});
    present.forEach(m=>{if(!ms.includes(m))ms.push(m)});
    ms.forEach(m=>{
      const M=MUS[m],opt=T.opt.includes(m);
      h+='<section class="msec '+M.c+'" data-m="'+m+'"><h3 class="msec-h"><span class="pl"></span>'+M.name+(opt?' <small>по желанию</small>':'')+'</h3>';
      d.exercises.filter(e=>e.muscle===m).forEach(e=>h+=exCardHTML(e));
      const sg=suggestions(m,d);
      h+='<div class="adder"><div class="sugg">'+sg.map(n=>'<button data-act="add-ex" data-m="'+m+'" data-name="'+esc(n)+'">+ '+esc(n)+'</button>').join('')+'<button class="own" data-act="own" data-m="'+m+'">+ своё</button></div>';
      if(E.customFor===m)h+='<div class="custom"><input class="inp" id="customEx" placeholder="Название упражнения" autocomplete="off"><button class="btn" data-act="add-custom" data-m="'+m+'">Добавить</button></div>';
      h+='</div></section>';
    });
    T.opt.forEach(m=>{if(!ms.includes(m))h+='<button class="optbtn" data-act="show-opt" data-m="'+m+'"><span class="pl '+MUS[m].c+'"></span>+ '+MUS[m].name+' сегодня</button>'});
  }else{
    h+='<div class="msec">';(d.cardio||[]).forEach(c=>h+=cardioCardHTML(c));h+='</div>';
    h+='<p class="c-note">Пустые поля считаются нулём: пульс или наклон можно не вписывать.</p>';
    h+='<div class="adder" style="margin-top:18px"><h3>Добавить кардио</h3><div class="sugg">'+Object.keys(CK).map(k=>'<button data-act="add-cardio" data-kind="'+k+'">+ '+CK[k].name+'</button>').join('')+'</div></div>';
  }
  h+='<label class="lbl" style="margin-top:26px">Заметка<textarea class="inp" id="sessNote" rows="2" placeholder="Самочувствие, сон, что поменять в следующий раз">'+esc(d.note||'')+'</textarea></label>';
  if(S.sessions.has(d.id))h+='<div class="danger-zone"><button class="btn danger" data-act="del-session" id="delSess">Удалить тренировку</button></div>';
  h+='<div class="donebar"><button class="btn done" data-act="done">Готово</button></div></div>';
  const sc=$('#sheet').scrollTop;$('#sheet').innerHTML=h;$('#sheet').scrollTop=sc;
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

/* Кнопки внутри экрана тренировки. Вызывается из общего обработчика кликов. */
function handleEditorClick(act,t){
  if(!E)return;
  const d=E.doc;
  if(act==='close')return closeEditor();
  if(act==='done'){const had=E.dirty||S.sessions.has(d.id);closeEditor();if(had&&S.sessions.has(d.id))toast('Тренировка сохранена');return}
  if(act==='show-opt'){E.showOpt[t.dataset.m]=true;renderEditor();return}
  if(act==='own'){E.customFor=t.dataset.m;renderEditor();const i=$('#customEx');if(i)i.focus();return}
  if(act==='add-ex'||act==='add-custom'){
    const name=act==='add-ex'?t.dataset.name:($('#customEx').value||'').trim();if(!name){$('#customEx').focus();return}
    d.exercises.push(newEx(name,t.dataset.m));if(act==='add-custom')E.customFor=null;touch();renderEditor();return;
  }
  if(act==='add-cardio'){d.cardio.push({id:uid(),kind:t.dataset.kind});touch();renderEditor();return}
  if(act==='del-session'){
    if(!E.armed){E.armed=true;t.classList.add('armed');t.textContent='Нажмите ещё раз, чтобы удалить';setTimeout(()=>{if(E&&E.armed){E.armed=false;const b=$('#delSess');if(b){b.classList.remove('armed');b.textContent='Удалить тренировку'}}},3500);return}
    removeSession(d.id);E.dirty=false;closeEditor();toast('Тренировка удалена');return;
  }
  const f=findEx(t);if(!f||!f.item)return;const item=f.item;
  if(act==='del-ex'){f.list.splice(f.list.indexOf(item),1);touch();renderEditor();return}
  if(act==='tog-bw'){
    const on=!isBw(item);
    item.sets=item.sets.map(s=>on?{x:null,r:num(s.r),bw:P.weight}:{w:effW(item,s),r:num(s.r)});
    item.bw=on;touch();renderEditor();return;
  }
  if(act==='add-set'){
    const bw=isBw(item);let base=item.sets[item.sets.length-1];
    if(!base){const prev=prevBefore(E.idx.ex.get(norm(item.name)),d.week);if(prev)base=prev.sets.filter(s=>num(s.r)>0)[0]}
    const ns=bw?{x:base?(extraOf(base)||null):null,r:base?num(base.r):null,bw:P.weight}:{w:base?num(base.w):null,r:base?num(base.r):null};
    item.sets.push(ns);touch();renderEditor();
    const inp=document.getElementById((bw?'r-':'w-')+item.id+'-'+(item.sets.length-1));if(inp&&!base)inp.focus();return;
  }
  if(act==='repeat-prev'){const prev=prevBefore(E.idx.ex.get(norm(item.name)),d.week);if(prev){const bw=isBw(item);item.sets=prev.sets.filter(s=>num(s.r)>0).map(s=>bw?{x:extraOf(s)||null,r:num(s.r),bw:P.weight}:{w:num(s.w),r:num(s.r)});touch();renderEditor()}return}
  const row=t.closest('[data-set]');if(!row)return;const si=+row.dataset.set;const set=item.sets[si];
  if(act==='del-set'){item.sets.splice(si,1);touch();renderEditor();return}
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

export {openEditor,closeEditor,flushEditor,isEditorOpen,refreshEditor,handleEditorClick};
