// Рисует иконки приложения в icons/ (нужен playwright с chromium).
const {chromium}=require('playwright');const path=require('path');
const OUT=path.resolve(process.argv[2]||path.join(__dirname,'..'),'icons');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<rect width="1024" height="1024" fill="#191C1F"/>
<rect x="70" y="492" width="884" height="40" rx="12" fill="#7B8184"/>
<g>
 <rect x="446" y="442" width="28" height="140" rx="8" fill="#B1B4B5"/>
 <rect x="360" y="212" width="78" height="600" rx="20" fill="#DD5A48"/>
 <rect x="282" y="262" width="70" height="500" rx="18" fill="#5A7FE0"/>
 <rect x="212" y="312" width="62" height="400" rx="16" fill="#C9A12A"/>
 <rect x="150" y="362" width="54" height="300" rx="14" fill="#3E9E66"/>
 <rect x="122" y="467" width="20" height="90" rx="6" fill="#B1B4B5"/>
</g>
<g transform="translate(1024,0) scale(-1,1)">
 <rect x="446" y="442" width="28" height="140" rx="8" fill="#B1B4B5"/>
 <rect x="360" y="212" width="78" height="600" rx="20" fill="#DD5A48"/>
 <rect x="282" y="262" width="70" height="500" rx="18" fill="#5A7FE0"/>
 <rect x="212" y="312" width="62" height="400" rx="16" fill="#C9A12A"/>
 <rect x="150" y="362" width="54" height="300" rx="14" fill="#3E9E66"/>
 <rect x="122" y="467" width="20" height="90" rx="6" fill="#B1B4B5"/>
</g>
</svg>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage();
for(const [n,s] of [['apple-touch-icon',180],['icon-192',192],['icon-512',512]]){
 await p.setViewportSize({width:s,height:s});await p.setContent(`<html><body style="margin:0">${svg.replace('width="1024" height="1024"',`width="${s}" height="${s}"`)}</body></html>`);
 await p.screenshot({path:path.join(OUT,`${n}.png`),omitBackground:false});}
await b.close();})();
