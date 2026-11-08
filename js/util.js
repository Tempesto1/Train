// Общие помощники: DOM, даты (ISO-недели), числа и форматирование.
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseYmd=s=>{const a=String(s).split('-').map(Number);return new Date(a[0],a[1]-1,a[2])};
const addDays=(d,n)=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x};
const mondayOf=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);const y=t.getUTCFullYear();const w=Math.ceil(((t-Date.UTC(y,0,1))/86400000+1)/7);return{year:y,num:w,key:y+'-W'+pad(w)}}
function weekMonday(key){const m=/^(\d{4})-W(\d{2})$/.exec(key);if(!m)return null;return addDays(mondayOf(new Date(+m[1],0,4)),(+m[2]-1)*7)}
const wnum=key=>+String(key).slice(6);
const num=v=>{if(v===''||v==null)return null;const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:null};
const z=v=>num(v)||0;
const fmtN=n=>(Math.round(n*100)/100).toString().replace('.',',');
const fmtIn=n=>n==null?'':String(n).replace('.',',');
const norm=s=>String(s||'').trim().toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ');
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=()=>Math.random().toString(36).slice(2,9);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function fmtTon(v){return v>=1000?fmtN(Math.round(v/100)/10)+' т':Math.round(v)+' кг'}
function plural(n,a,b,c){const m10=n%10,m100=n%100;if(m10===1&&m100!==11)return a;if(m10>=2&&m10<=4&&(m100<12||m100>14))return b;return c}

const MG=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const WD=['пн','вт','ср','чт','пт','сб','вс'];
function rangeLabel(mon,todayYear){const sun=addDays(mon,6);let s=mon.getMonth()===sun.getMonth()?mon.getDate()+'–'+sun.getDate()+' '+MG[sun.getMonth()]:mon.getDate()+' '+MG[mon.getMonth()].slice(0,3)+' – '+sun.getDate()+' '+MG[sun.getMonth()].slice(0,3);if(sun.getFullYear()!==todayYear)s+=' '+sun.getFullYear();return s}

export {$,esc,pad,ymd,parseYmd,addDays,mondayOf,isoWeek,weekMonday,wnum,num,z,fmtN,fmtIn,norm,clone,uid,sleep,fmtTon,plural,MG,WD,rangeLabel};
