// Создаётся tools/build.js — руками не править.
// Сначала сеть (чтобы обновления приходили сразу), без сети или при долгом ответе — кэш.
const C='rv-15d3e4f341';
const CORE=[
 "./",
 "./css/base.css",
 "./css/editor.css",
 "./css/profile.css",
 "./css/progress.css",
 "./css/scale.css",
 "./css/tokens.css",
 "./css/week.css",
 "./icons/apple-touch-icon.png",
 "./icons/icon-192.png",
 "./icons/icon-512.png",
 "./index.html",
 "./js/app.js",
 "./js/bus.js",
 "./js/config.js",
 "./js/model.js",
 "./js/state.js",
 "./js/store.js",
 "./js/ui.js",
 "./js/util.js",
 "./js/views/charts.js",
 "./js/views/editor.js",
 "./js/views/info.js",
 "./js/views/profile.js",
 "./js/views/progress.js",
 "./js/views/scale.js",
 "./js/views/week.js",
 "./js/views/weeks.js",
 "./manifest.webmanifest"
];
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
