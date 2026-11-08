// Графики (столбики, спарклайны) и всплывающая подсказка при нажатии.
import {$,esc} from '../util.js';

const charts={};
function sparkSVG(id,pts,n,cls){
  if(!pts.length)return '<svg class="spark"></svg>';
  const W=108,H=40,p=5;let lo=Math.min(...pts.map(q=>q.v)),hi=Math.max(...pts.map(q=>q.v));if(hi===lo){hi+=1;lo-=1}
  const X=i=>n<=1?W/2:p+i*(W-2*p)/(n-1),Y=v=>H-p-(v-lo)*(H-2*p)/(hi-lo);
  const xy=pts.map(q=>[X(q.i),Y(q.v)]);
  const line='M'+xy.map(a=>a[0].toFixed(1)+' '+a[1].toFixed(1)).join(' L');
  const area=line+' L'+xy[xy.length-1][0].toFixed(1)+' '+H+' L'+xy[0][0].toFixed(1)+' '+H+' Z';
  const last=xy[xy.length-1];
  charts[id]={xs:xy.map(a=>a[0]),ys:xy.map(a=>a[1]),labels:pts.map(q=>q.label),W};
  return '<svg class="spark '+cls+'" viewBox="0 0 '+W+' '+H+'" data-chart="'+id+'" role="img" aria-label="'+esc(pts.map(q=>q.label).join('; '))+'">'+(pts.length>1?'<path class="ar" d="'+area+'"/><path class="ln" d="'+line+'"/>':'')+'<circle class="pt" cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="4"/><circle class="hl" r="0" cx="0" cy="0"/></svg>';
}
function barsSVG(id,series,ck,fmt,H){
  const W=320,top=18,bottom=22,left=4,right=4,n=series.length;
  const max=Math.max(...series.map(s=>s.v),1);const bw=Math.min(22,(W-left-right)/n*0.62);const step=(W-left-right)/n;
  const Y=v=>H-bottom-(v/max)*(H-top-bottom);
  let h='<svg viewBox="0 0 '+W+' '+H+'" data-chart="'+id+'" role="img" aria-label="'+esc(series.map(s=>'нед. '+s.num+': '+fmt(s.v)).join('; '))+'">';
  h+='<line class="grid-l" x1="0" x2="'+W+'" y1="'+(H-bottom)+'" y2="'+(H-bottom)+'"/><line class="grid-l" x1="0" x2="'+W+'" y1="'+top+'" y2="'+top+'" stroke-dasharray="2 4"/>';
  const lblEvery=n>12?2:1;const maxI=series.findIndex(s=>s.v===max);const xs=[],ys=[],labels=[];
  series.forEach((s,i)=>{const cx=left+step*i+step/2;const x=cx-bw/2;const y=Y(s.v);const hgt=H-bottom-y;xs.push(cx);ys.push(s.v>0?y:H-bottom);labels.push('нед. '+s.num+' · '+(s.v?fmt(s.v):'нет записей'));
    if(s.v>0){const r=Math.min(4,bw/2,hgt);h+='<path class="bar-m'+(s.key===ck?' cur':'')+'" d="M'+x+' '+(H-bottom)+' V'+(y+r)+' Q'+x+' '+y+' '+(x+r)+' '+y+' H'+(x+bw-r)+' Q'+(x+bw)+' '+y+' '+(x+bw)+' '+(y+r)+' V'+(H-bottom)+' Z"/>'}
    if(i%lblEvery===0||i===n-1)h+='<text class="ax" x="'+cx+'" y="'+(H-6)+'" text-anchor="middle">'+s.num+'</text>';
    if(s.v>0&&(i===maxI||i===n-1))h+='<text class="axv" x="'+cx+'" y="'+(y-5)+'" text-anchor="middle">'+fmt(s.v)+'</text>';
  });
  charts[id]={xs,ys,labels,W,bars:true};
  return h+'</svg>';
}

function showTip(svg,clientX){
  const c=charts[svg.dataset.chart];if(!c||!c.xs.length)return;const r=svg.getBoundingClientRect();const vx=(clientX-r.left)/r.width*c.W;
  let bi=0,bd=Infinity;c.xs.forEach((x,i)=>{const d=Math.abs(x-vx);if(d<bd){bd=d;bi=i}});
  const hl=svg.querySelector('.hl');if(hl&&!c.bars){hl.setAttribute('cx',c.xs[bi]);hl.setAttribute('cy',c.ys[bi]);hl.setAttribute('r',4)}
  const tip=$('#tip');tip.textContent=c.labels[bi];tip.hidden=false;
  const scale=r.width/c.W;let x=r.left+c.xs[bi]*scale;const y=r.top+c.ys[bi]*scale;
  const tw=tip.offsetWidth;x=Math.max(tw/2+8,Math.min(window.innerWidth-tw/2-8,x));tip.style.left=x+'px';tip.style.top=y+'px';
}
function hideTip(){const t=$('#tip');if(t&&!t.hidden){t.hidden=true;document.querySelectorAll('svg .hl').forEach(h=>h.setAttribute('r',0))}}
document.addEventListener('pointerdown',e=>{const svg=e.target.closest&&e.target.closest('svg[data-chart]');if(svg)showTip(svg,e.clientX);else hideTip()});
document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const svg=e.target.closest&&e.target.closest('svg[data-chart]');if(svg)showTip(svg,e.clientX);else hideTip()});
window.addEventListener('scroll',hideTip,{passive:true});

export {charts,sparkSVG,barsSVG,showTip,hideTip};
