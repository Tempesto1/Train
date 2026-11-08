// Сборка. Запуск: npm run build (один раз перед этим: npm install).
//  1. sw.js — список файлов для работы без интернета и версия кэша (хэш содержимого).
//  2. dist/artifact.html — вся версия одним файлом для артефакта на claude.ai:
//     CSS встроен, JS склеен esbuild, блоки <!-- pwa:start -->…<!-- pwa:end --> вырезаны.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.join(__dirname,'..');
const rel=p=>path.relative(ROOT,p).split(path.sep).join('/');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);

/* ---------- 1. service worker ---------- */
const assets=['index.html','manifest.webmanifest',
  ...walk(path.join(ROOT,'css')).map(rel),
  ...walk(path.join(ROOT,'js')).map(rel),
  ...walk(path.join(ROOT,'icons')).map(rel)].filter(f=>/\.(html|webmanifest|css|js|png)$/.test(f)).sort();
const hash=crypto.createHash('sha1');assets.forEach(f=>hash.update(f).update(fs.readFileSync(path.join(ROOT,f))));
const ver=hash.digest('hex').slice(0,10);
fs.writeFileSync(path.join(ROOT,'sw.js'),`// Создаётся tools/build.js — руками не править.
// Сначала сеть (чтобы обновления приходили сразу), без сети или при долгом ответе — кэш.
const C='rv-${ver}';
const CORE=${JSON.stringify(['./',...assets.map(f=>'./'+f)],null,1)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function fromNet(r,key){
  const same=new URL(r.url).origin===location.origin;
  const net=fetch(same?new Request(r,{cache:'no-cache'}):r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(C).then(c=>c.put(key,cp))}return res});
  const late=new Promise(ok=>setTimeout(ok,3500)).then(()=>caches.match(key)).then(hit=>hit||net);
  return Promise.race([net,late]).catch(()=>caches.match(key));
}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  e.respondWith(fromNet(r,r.mode==='navigate'?'./index.html':r).then(res=>res||caches.match(r)));
});
`);

/* ---------- 2. артефакт для claude.ai ---------- */
let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
html=html.replace(/<!-- pwa:start[\s\S]*?<!-- pwa:end -->\n?/g,'');
const css=[];
html=html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">\n?/g,(m,f)=>{css.push(`/* ${f} */\n`+fs.readFileSync(path.join(ROOT,f),'utf8'));return css.length===1?'<!--CSS-->\n':''});
html=html.replace('<!--CSS-->',`<style>\n${css.join('\n')}</style>`);
const js=require('esbuild').buildSync({entryPoints:[path.join(ROOT,'js','app.js')],bundle:true,format:'iife',write:false,target:'es2019',charset:'utf8',legalComments:'none'}).outputFiles[0].text;
html=html.replace('<script type="module" src="js/app.js"></script>',`<script>\n${js}</script>`);
// Артефакт оборачивается в свой <html>/<head>/<body>: оставляем только содержимое.
const head=html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\n?|<meta name="viewport"[^>]*>\n?/g,'').trim();
const body=html.match(/<body>([\s\S]*?)<\/body>/)[1].trim();
fs.mkdirSync(path.join(ROOT,'dist'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'dist','artifact.html'),head+'\n\n'+body+'\n');
console.log('sw.js: '+assets.length+' файлов, версия '+ver+'\ndist/artifact.html: '+Math.round(fs.statSync(path.join(ROOT,'dist','artifact.html')).size/1024)+' КБ');
