// Экран прогресса: совокупность весов по группам мышц, упражнения, кардио.
import {$,esc,fmtN,fmtTon,plural} from '../util.js';
import {MUS,MUS_ORDER,CK} from '../config.js';
import {S,P,curKey} from '../state.js';
import {buildIndex,weeksList,prevBefore,compare,fmtTop,weekNo} from '../model.js';
import {sparkSVG,barsSVG} from './charts.js';

function renderProgress(){
  const all=weeksList();const rw=(S.range==='all'?all:all.slice(0,S.range)).slice().reverse();
  const n=rw.length,pos=new Map(rw.map((w,i)=>[w.key,i])),idx=buildIndex(),ck=curKey();
  let h='<header class="bar"><button class="tbtn" data-go="scale">‹ Шкала</button><h1 class="logo" style="font-size:24px">Прогресс</h1></header>';
  h+='<div class="ptabs" role="tablist" aria-label="Период">'+[[4,'4 недели'],[12,'12 недель'],['all','Всё время']].map(r=>'<button data-range="'+r[0]+'" aria-selected="'+(S.range===r[0])+'">'+r[1]+'</button>').join('')+'</div>';
  h+='<p class="p-lead">Совокупность весов — это сумма «вес × повторы» по всем подходам за неделю. В упражнениях с собственным весом считается ваш вес плюс доп. вес.</p>';
  if(!idx.ex.size&&!idx.car.size){$('#progressView').innerHTML=h+'<p class="empty-p">Пока нечего сравнивать. Запишите тренировки хотя бы за две недели, и здесь появятся графики.</p>'+footTools();return}
  // weekly volume per muscle
  const vol={};MUS_ORDER.forEach(m=>vol[m]=new Map());const tot=new Map();
  idx.ex.forEach(list=>list.forEach(e=>{if(!pos.has(e.week))return;vol[e.muscle].set(e.week,(vol[e.muscle].get(e.week)||0)+e.vol);tot.set(e.week,(tot.get(e.week)||0)+e.vol)}));
  const ser=map=>rw.map(w=>({key:w.key,num:w.num,v:map.get(w.key)||0}));
  const lastV=map=>{const v=map.get(ck);return v?fmtTon(v):''};
  h+='<h2 class="sec-t t-all">Все группы<span class="tot">'+lastV(tot)+'</span></h2><p class="sec-sub">Совокупность весов по неделям, все силовые дни</p><div class="chart t-all">'+barsSVG('tot',ser(tot),ck,fmtTon,150)+'</div>';
  // per muscle
  const byM={};MUS_ORDER.forEach(m=>byM[m]=[]);
  idx.ex.forEach(list=>{const inR=list.filter(e=>pos.has(e.week));if(!inR.length)return;const last=inR[inR.length-1];byM[last.muscle].push({list,inR,last})});
  MUS_ORDER.forEach(m=>{
    const rows=byM[m];if(!rows.length&&!vol[m].size)return;const M=MUS[m];
    h+='<h2 class="sec-t '+M.c+'"><span class="pl"></span>'+M.name+'<span class="tot">'+lastV(vol[m])+'</span></h2><p class="sec-sub">Совокупность весов: '+M.name.toLowerCase()+'</p><div class="chart '+M.c+'">'+barsSVG('v'+m,ser(vol[m]),ck,fmtTon,120)+'</div>';
    rows.sort((a,b)=>a.last.week<b.last.week?1:a.last.week>b.last.week?-1:0);
    h+='<div class="prows">';
    rows.forEach((r,ri)=>{
      const perWeek=new Map();r.inR.forEach(e=>{const p=perWeek.get(e.week);if(!p||e.top>p.top||(e.top===p.top&&e.topReps>p.topReps))perWeek.set(e.week,e)});
      const pts=[...perWeek.values()].map(e=>({i:pos.get(e.week),v:e.top,label:'нед. '+weekNo(e.week)+' · '+fmtTop(e)+' × '+e.topReps+(e.bw?' ('+fmtN(e.top)+' кг)':'')}));
      const cmp=compare(r.last,prevBefore(r.list,r.last.week));
      const gain=r.last.top-perWeek.get(r.inR[0].week).top;
      const sub=[];if(r.last.bw&&P.weight!=null)sub.push('всего '+fmtN(r.last.top)+' кг');else if(r.last.e1rm)sub.push('≈1ПМ '+Math.round(r.last.e1rm)+' кг');if(pts.length>1&&gain)sub.push((gain>0?'+':'')+fmtN(gain)+' кг за период');if(!sub.length)sub.push(pts.length+' '+plural(pts.length,'неделя','недели','недель'));
      h+='<div class="prow"><div style="min-width:0"><div class="prow-name">'+esc(r.last.ex.name)+'</div><div class="prow-sub">'+sub.join(' · ')+'</div></div>'+sparkSVG('s'+m+ri,pts,n,M.c)+'<div class="prow-val"><div class="v">'+fmtTop(r.last)+(r.last.bw?'':' кг')+'×'+r.last.topReps+'</div><span class="delta '+(cmp?cmp.dir:'same')+'">'+(cmp?cmp.text.replace(' как прошлый раз',''):'первый раз')+'</span></div></div>';
    });
    h+='</div>';
  });
  // cardio
  const cmin=new Map(),crow=[];
  idx.car.forEach((list,k)=>{const inR=list.filter(e=>pos.has(e.week));inR.forEach(e=>cmin.set(e.week,(cmin.get(e.week)||0)+e.min));if(inR.length)crow.push({k,inR})});
  if(crow.length){
    const fm=v=>fmtN(v)+' мин';
    h+='<h2 class="sec-t t-cardio"><span class="pl"></span>Кардио<span class="tot">'+(cmin.get(ck)?fm(cmin.get(ck)):'')+'</span></h2><p class="sec-sub">Минуты кардио по неделям. Невписанные поля считаются нулём</p><div class="chart t-cardio">'+barsSVG('cmin',ser(cmin),ck,fm,120)+'</div><div class="prows">';
    crow.forEach((r,ri)=>{
      const perWeek=new Map();r.inR.forEach(e=>{const p=perWeek.get(e.week)||{week:e.week,min:0,km:0,m:0,speed:0};p.min+=e.min;p.km+=e.km;p.m+=e.m;p.speed=Math.max(p.speed,e.speed);perWeek.set(e.week,p)});
      const pw=[...perWeek.values()];const pts=pw.map(e=>({i:pos.get(e.week),v:e.min,label:'нед. '+weekNo(e.week)+' · '+fmtN(e.min)+' мин'+(e.km?' · '+fmtN(e.km)+' км':'')}));
      const last=pw[pw.length-1],before=pw[pw.length-2];const dm=before?Math.round((last.min-before.min)*100)/100:null;
      const sub=[];if(last.km)sub.push(fmtN(last.km)+' км');if(last.m)sub.push(last.m+' м');if(last.speed)sub.push(fmtN(last.speed)+' км/ч');if(!sub.length)sub.push('минут за неделю');
      h+='<div class="prow"><div style="min-width:0"><div class="prow-name">'+esc((CK[r.k]||CK.other).name)+'</div><div class="prow-sub">'+sub.join(' · ')+'</div></div>'+sparkSVG('c'+ri,pts,n,'t-cardio')+'<div class="prow-val"><div class="v">'+fmtN(last.min)+' мин</div><span class="delta '+(dm==null?'same':dm>0?'up':dm<0?'down':'same')+'">'+(dm==null?'первый раз':dm>0?'▲ +'+fmtN(dm)+' мин':dm<0?'▼ '+fmtN(dm)+' мин':'=')+'</span></div></div>';
    });
    h+='</div>';
  }
  $('#progressView').innerHTML=h+footTools();
}
function footTools(){return '<div class="foot-tools"><p>Резервная копия: скопируйте все записи текстом и сохраните, например, в Заметки. Тем же текстом можно восстановить данные здесь или в другой версии приложения.</p><button class="tbtn" data-act="copy-json">Скопировать данные</button><button class="tbtn" data-act="restore-open">Восстановить из копии</button><textarea id="dump" class="inp" rows="4" readonly hidden></textarea><div id="restoreBox" hidden style="flex-basis:100%"><textarea id="restoreText" class="inp" rows="5" placeholder="Вставьте сюда скопированный текст"></textarea><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-act="restore-run">Восстановить</button><button class="btn ghost" data-act="restore-close">Отмена</button></div></div></div>'}

export {renderProgress};
