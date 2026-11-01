// Gerçek uygulamayı web çıktısından (dist/) açıp ham ekran görüntülerini /tmp/raw/<dil>/ içine yakalar.
// Hazırlık ve kullanım: scripts/store/README.md
const {chromium}=require('playwright');const fs=require('fs');
const lang=process.argv[2]||'tr';
const YID=Object.entries(JSON.parse(require('fs').readFileSync(`/tmp/seed-${lang}.json`,'utf8')).rooms).find(([k,v])=>v.type==='yatak')[0];
const SHOTS=[
 {n:'home',r:'/'},
 {n:'tanisma',r:'/taniyalim',fresh:true},
 {n:'bugun',r:'/bugun'},
 {n:'yemek',r:'/yemek',click:[lang==='en'?'Zucchini fritters':'Kabak mücver']},
 {n:'ev3d',r:'/',scroll:1000},
 {n:'bahce',r:'/bahce'},
 {n:'moka',r:'/moka'},
 {n:'dolap',r:'/oda/'+YID,click:[lang==='en'?'Wardrobe':'Dolap',lang==='en'?'Closet':'Dolap'],scroll:330},
 {n:'plan',r:'/plan'},
 {n:'bakim',r:'/bakim'},
 {n:'gelisim',r:'/gelisim'},
];
const only=process.argv.slice(3);
(async()=>{const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:430,height:932},deviceScaleFactor:3,locale:lang==='en'?'en-US':'tr-TR'});

const OV=[[/(\d+) tasks seni bekliyor\. İstersen birini yapalım mı\?/,'$1 tasks are waiting. Want to knock one out together?'],[/Mutfak \((\d+)\)/,'Kitchen ($1)'],[/Balkon \((\d+)\)/,'Balcony ($1)'],[/Yatak odam \((\d+)\)/,'My bedroom ($1)'],[/Bütün ışıklarım yanık, çay hep demli\. Ne güzel bir seri ☕/,'All my lights are on and the tea is always hot. What a lovely streak ☕'],[/^%(\d+)$/,'$1%'],[/^Tümü/,'All'],[/^Temiz( \d+)$/,'Clean$1'],[/^Kirli( \d+)$/,'Dirty$1'],[/^Ütü( \d+)$/,'Iron$1'],[/Sağlıklı/,'Healthy'],[/Dengeli/,'Balanced'],[/Keyif yemeği/,'Treat meal'],[/Moka bir yapay zekâdir[^]*$/,'Moka is an AI. Answers can be wrong and are not medical or psychological advice. In an emergency, call your local emergency number.']];

const TXJS=lang==='en'?fs.readFileSync('/tmp/tx.js','utf8'):null;
const OVSRC=JSON.stringify(OV.map(([a,b])=>[a.source,b]));
const DOMTX=`(()=>{const OV=${OVSRC}.map(([a,b])=>[new RegExp(a),b]);const ovr=t=>{for(const [a,b] of OV)t=t.replace(a,b);return t;};const run=()=>{const w=document.createTreeWalker(document.body||document,4);let n;while(n=w.nextNode()){const v=ovr(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v;}document.querySelectorAll('div,span,input,textarea').forEach(el=>{if(el.placeholder){const t=window.__tx(el.placeholder);if(t!==el.placeholder)el.placeholder=t;}
const kids=[...el.childNodes];if(!kids.length||!kids.every(k=>k.nodeType===3))return;const j=kids.map(k=>k.nodeValue).join('');if(!j.trim())return;const t=ovr(window.__tx(j));if(t!==j){kids[0].nodeValue=t;kids.slice(1).forEach(k=>k.nodeValue='');}});};
new MutationObserver(()=>{clearTimeout(window.__t);window.__t=setTimeout(run,50);}).observe(document,{childList:true,subtree:true,characterData:true});setInterval(run,500);})()`;
const state=fs.readFileSync(`/tmp/seed-${lang}.json`,'utf8');
if(TXJS){await ctx.addInitScript(TXJS);await ctx.addInitScript(DOMTX);}
await ctx.addInitScript(([s])=>{ if(!localStorage.getItem('layfapp.v1')){localStorage.setItem('layfapp.v1',s);localStorage.setItem('layfapp.intro','1');localStorage.setItem('layfapp.guest','1');localStorage.setItem('layfapp.planChoice','1');localStorage.setItem('layfapp.persona',JSON.stringify({skipped:true}));}},[state]);

fs.mkdirSync(`/tmp/raw/${lang}`,{recursive:true});
for(const s of SHOTS){ if(only.length&&!only.includes(s.n))continue;
const c2=s.fresh?await b.newContext({viewport:{width:430,height:932},deviceScaleFactor:3,locale:lang==='en'?'en-US':'tr-TR'}):ctx;
if(s.fresh){const st=JSON.parse(state);st.setup=false;await c2.addInitScript(([x])=>{localStorage.setItem('layfapp.v1',x);localStorage.setItem('layfapp.intro','1');localStorage.setItem('layfapp.guest','1');localStorage.setItem('layfapp.planChoice','1');},[JSON.stringify(st)]);}
if(s.fresh&&TXJS){await c2.addInitScript(TXJS);await c2.addInitScript(DOMTX);}
const p=await c2.newPage();p.on('pageerror',e=>console.log('ERR',s.n,e.message));
await p.goto('http://localhost:8099'+s.r);await p.waitForTimeout(8000);
for(const t of s.click||[]){try{await p.getByText(t,{exact:true}).first().click({timeout:3000});await p.waitForTimeout(1200);}catch(e){console.log('noclick',s.n,t)}}
if(s.wait)await p.waitForTimeout(s.wait);if(s.scroll){await p.mouse.move(215,500);await p.mouse.wheel(0,s.scroll);await p.waitForTimeout(1500);}
await p.screenshot({path:`/tmp/raw/${lang}/${s.n}.png`});await p.close();}
await b.close()})()
