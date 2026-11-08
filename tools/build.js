const fs=require('fs'),path=require('path');
// Собирает версию для телефона из src/app.html в корень репозитория (или в папку из аргумента).
const ROOT=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'src','app.html'),'utf8');
const cut=src.indexOf('</style>')+'</style>'.length;
const headPart=src.slice(0,cut), bodyPart=src.slice(cut);
const out=process.argv[2]?path.resolve(process.argv[2]):ROOT;fs.mkdirSync(path.join(out,'icons'),{recursive:true});
const html=`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Веса">
<meta name="theme-color" content="#191C1F">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<script>window.STANDALONE=true;</script>
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font-size:14px}img{max-width:100%}[hidden]{display:none!important}</style>
${headPart}
<style>body::before{background:#191C1F!important}</style>
</head>
<body>
${bodyPart}
<script>
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})})}
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'manifest.webmanifest'),JSON.stringify({
  name:'Рабочие веса',short_name:'Веса',lang:'ru',start_url:'./',scope:'./',display:'standalone',
  background_color:'#191C1F',theme_color:'#191C1F',
  icons:[{src:'icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'icons/icon-512.png',sizes:'512x512',type:'image/png'},{src:'icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]
},null,2));
const ver=Date.now().toString(36);
fs.writeFileSync(path.join(out,'sw.js'),`const C='rv-${ver}';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put('./index.html',cp));return res}).catch(()=>caches.match('./index.html')));return}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res})));
});
`);
console.log('built',ver);
