const fs=require('fs');
const R='C:/Users/ba2ra/Documents/__WORKS__/inex-glass';const S=__dirname;
const pages=require(S+'/pages.json');
// --- glass classification (name/category + visual check of first 4 photos, sheet*.jpg) ---
const METAL_ONLY_VISUAL=new Set(['festival-atrium','stanciya-pavlika-morozova','arkaim-plaza-lestnica','chelyabenergo','energosbyt-chelyabinsk','kottedzh-3-grande-forge','profilaktorii-izumrud','progimnaziya-133','sokol-fit','tk-krasnoderevschik-trosy','triumf','trk-ural-lestnica','zavod-ograzhdeniya','zhaso']);
const UNCLEAR_VISUAL=new Set(['koncertnyi-zal-omsk','koncertnyi-zal-omsk-drugoe','koncertnyi-zal-omsk-lestnica','balkonnyye-ograzhdeniya','tk-paroplaza','fokus-atrium']);
function glass(p){if(METAL_ONLY_VISUAL.has(p.slug))return 'no (visual: stainless/metal only)';if(UNCLEAR_VISUAL.has(p.slug))return 'unclear (visual)';
 if(!p.cat.startsWith('ograzhdeniya'))return 'yes (category)';if(/стекл|стекол/i.test(p.name))return 'yes (name)';return 'yes (visual)';}
// --- normalisation ---
const GENERIC=new Set(['квартира','коттедж','частный коттедж','офисное здание','офис','жилой дом','беседка','веранда','гостиница','медицинский центр','административное здание','салон красоты','фитнес клуб','пентхаус','самонесущие ограждения','душевая трапеция','оздоровительный комплекс','станция','вокзал','прогимназия']);
const PREFIX=/^(?:трк|трц|тц|тк|тд|бд|оц|spa|гостиница|группа|ледовая арена)\s+/i;
function normLabel(s){if(!s)return '';let t=s.toLowerCase().replace(/[«»"']/g,'').replace(/ё/g,'е').replace(/\s+/g,' ').trim();for(let i=0;i<3;i++)t=t.replace(PREFIX,'');t=t.replace(/^детским мир$/,'детский мир');return t.trim()}
const REGION_OF={'Сургут':'ХМАО','Ханты-Мансийский автономный округ – Югра':'ХМАО','Пласт':'ЧО','Челябинская область':'ЧО','поселок Вавиловец':'ЧО','поселок Соколиная гора':'ЧО','Сатка':'ЧО','Магнитогорск':'ЧО','Златоуст':'ЧО','Варна':'ЧО','Челябинск':'ЧО'};
const isRegion=x=>/округ|область/.test(x);
const cityOf=p=>p.loc||p.city||p.region||null;
function normAddr(g){return g.toLowerCase().replace(/ё/g,'е').replace(/^(челябинск|пласт|омск)\s+/,'').replace(/(^|\s)(улица|ул|поселок|пос|дом|д)\.?\s*/g,' ').replace(/[.,\s]+/g,' ').trim()}
const ck=c=>c?c.join(','):null;
const coordLabels={};for(const p of pages){const k=ck(p.coord);if(k)(coordLabels[k]??=new Set()).add(normLabel(p.kind))}
const DEFAULT_COORDS=new Set(Object.entries(coordLabels).filter(([k,v])=>v.size>1).map(([k])=>k));
// --- grouping ---
const groups=new Map();
for(const p of pages){const lab=normLabel(p.kind);const addr=p.geos[1]?normAddr(p.geos[1]):null;let key;
 if(lab&&!GENERIC.has(lab))key='L:'+lab;else if(addr)key='A:'+addr;else key='U:'+p.url;
 const c=cityOf(p);
 if(key.startsWith('L:')){const cands=[...groups.keys()].filter(k=>k===key||k.startsWith(key+'@'));let hit=null;
  for(const k of cands){const gc=groups.get(k).pages.map(cityOf).filter(Boolean);
   if(!c||!gc.length||gc.some(x=>x===c||(REGION_OF[x]&&REGION_OF[x]===REGION_OF[c]&&(isRegion(x)||isRegion(c)))))hit=k}
  if(hit)key=hit;else if(cands.length)key=key+'@'+c;}
 if(!groups.has(key))groups.set(key,{key,pages:[]});groups.get(key).pages.push(p);}
// --- uncached sibling pages (CSV rows not in the Firecrawl cache), matched by slug stem ---
const csv=fs.readFileSync(R+'/docs/inex/12-migration-inex-su.csv','utf8').split(/\r?\n/).filter(l=>l.startsWith('/portfolio/')).map(l=>{const [u,n,a,note]=l.split(';');return {url:u,action:a,note}});
const cached=new Set(pages.map(p=>p.url));
const STEMS={'L:кольцо':['tk-kolco'],'L:урал':['trk-ural'],'L:аркаим плаза':['arkaim-plaza'],'L:фестиваль':['festival'],'L:сургутнефтегаз':['surgutneftegaz'],'L:трактор':['la-traktor'],'L:sokol fit':['sokol-fit'],'L:березка':['berezka','dveri-steklyannye-v-gostinize-berezka'],'L:пароplaza':['paraplaza','paroplaza'],'L:энергосбыт':['energosbyt'],'L:родник':['trk-rodnik'],'L:горки':['trk-gorki'],'L:сбербанк':['sberbank-ishim'],'L:шахматная академия':['ugorskaya-shahmatnaya'],'L:концертный зал':['koncertnyi-zal'],'L:рестостар':['restostar'],'L:краснодеревщик':['krasnoderevschik'],'L:комсомольский':['komsomolskii'],'L:buta spa':['buta'],'L:пентхаус':['penthaus-1']};
const unc=csv.filter(r=>!cached.has(r.url));
const out=[];
for(const g of groups.values()){const ps=g.pages;let st=STEMS[g.key]||[];if(ps.some(p=>p.slug.startsWith('penthaus-1')))st=['penthaus-1'];
 const uncachedSiblings=unc.filter(r=>st.some(s=>r.url.split('/').pop().startsWith(s))).map(r=>`${r.url} [${r.action}${r.note?': '+r.note:''}]`);
 const cities=[...new Set(ps.map(cityOf).filter(Boolean))];const addrs=[...new Set(ps.flatMap(p=>p.geos.slice(1)))];
 const coords=[...new Set(ps.map(p=>ck(p.coord)).filter(Boolean))];const realCoords=coords.filter(c=>!DEFAULT_COORDS.has(c));
 const signals=[];if(ps.length>1){if(g.key.startsWith('L:'))signals.push('same map label');if(g.key.startsWith('A:'))signals.push('same geocode address');
  if(realCoords.length===1&&ps.filter(p=>p.coord&&!DEFAULT_COORDS.has(ck(p.coord))).length>1)signals.push('same specific coords');
  if(cities.length===1&&ps.every(cityOf))signals.push('same city on all pages');
  if(addrs.length===1&&ps.filter(p=>p.geos[1]).length>1&&!g.key.startsWith('A:'))signals.push('same geocode address');}
 const flags=[];if(realCoords.length>1)flags.push('different specific coords: '+realCoords.join(' / '));if(cities.length>1)flags.push('different city/region strings: '+cities.join(' / '));if(ps.length>1&&ps.some(p=>!cityOf(p)))flags.push('some pages have no city');
 const gl=ps.map(glass);
 const confidence=ps.length===1?'single':(signals.length>=2&&!(realCoords.length>1)?'high':'medium');
 const photos=ps.flatMap(p=>p.photoInfo);
 out.push({groupName:g.key.startsWith('L:')?ps[0].kind:ps[0].name,key:g.key,city:cities[0]||null,cities,addresses:addrs,coords,coordsAreCityDefault:coords.filter(c=>DEFAULT_COORDS.has(c)),
  pages:ps.map((p,i)=>({url:p.url,category:p.cat,name:p.name,mapLabel:p.kind||null,location:cityOf(p),photos:p.photos.length,glass:gl[i]})),
  categories:[...new Set(ps.map(p=>p.cat))],photoCount:photos.length,photosLocal:photos.filter(i=>i.sha1).length,photosMaxWidth:Math.max(0,...photos.map(i=>i.w||0)),
  glass:gl.some(x=>x.startsWith('yes'))?'yes':gl.some(x=>x.startsWith('unclear'))?'unclear':'no',
  merge:{confidence,signals,flags},uncachedSiblings,suggestedLinks:[],xlsx:null});}
// suggested (NOT merged) links
const SUG=[[/zavod-(ograzhdeniya|peregorodka-1|peregorodka-2)$/,'slug stem «zavod-*», all «Офисное здание» Челябинск, coords = city default — likely one building, confirm'],[/(dushevaya-pryamaya-09|kottedzh-3-grande-forge)$/,'both cottages in пос. Вавиловец — maybe one house'],[/(snezhnaya-koroleva|trk-gorki-lift)$/,'Снежная Королева has exactly the coords of ТРК Горки (store inside the mall?)'],[/kozyrki\/kottedzh-1$/,'uncached lestnicy/kottedzh-1 has the same slug'],[/(aluminievyi-vitrag-03|aluminievyi-vitrag-08)$/,'Бр.Кашириных 162 А vs 162 — neighbouring buildings, kept separate'],[/(kolonna-04|surgutneftegaz-atrium)$/,'НГДУ is a Сургутнефтегаз division — kept separate'],[/pryamye\/gostinica$/,'uncached dveri/gostinica-dveri-1/-2 may be the same hotel'],[/(sberbank-omsk|mts-omsk)$/,'same coords = Omsk city default, NOT a signal']];
for(const [re,why] of SUG){const gs=out.filter(o=>o.pages.some(p=>re.test(p.url)));for(const o of gs)o.suggestedLinks.push({why,with:gs.filter(x=>x!==o).map(x=>x.groupName+' ('+x.pages.map(p=>p.url.split('/').pop()).join(',')+')')})}
// xlsx / res/Объекты mapping
const X=[['01 ТРК Кольцо','ТРК «Кольцо»','tk-kolco','L:кольцо'],['02 РМК-Арена','РМК-Арена','rmk-arena',null],['03 Аэропорт Челябинск','Аэропорт Челябинск','aeroport-chelyabinsk',null],['04 ТРЦ «Алмаз»','ТРЦ «Алмаз»','trc-almaz-chelyabinsk',null],['05 Угорская шахматная академия','Угорская шахматная академия','ugorskaya-shahmatnaya-akademiya','L:шахматная академия'],['06 Аркаим Плаза','Аркаим Плаза','arkaim-plaza','L:аркаим плаза'],['07 Сбербанк Ишим','Сбербанк (Ишим)','sberbank-ishim','L:сбербанк'],['08 Сбербанк Омск','Сбербанк (Омск)','sberbank-omsk','L:сбербанк@Омск'],['09 Сургутнефтегаз','Главное управление «Сургутнефтегаз»','glavnoe-upravlenie-surgutneftegaz','L:сургутнефтегаз'],['010 Концертный зал (Омск)','Концертный зал (Омск)','koncertnyj-zal-omsk','L:концертный зал'],['011 Трактор','«Трактор» арена','traktor-arena','L:трактор'],['012 ТРК Урал','ТРК «Урал»','trk-ural','L:урал'],['013 ТРК Родник','ТРК «Родник»','trk-rodnik','L:родник'],['014 Мизар',null,null,null]];
for(const [dir,name,slug,key] of X){const o=out.find(x=>x.key===key);if(o)o.xlsx={folder:dir,name,slug}}
out.sort((a,b)=>b.pages.length-a.pages.length||b.photoCount-a.photoCount);
fs.writeFileSync(S+'/objects-grouped.json',JSON.stringify({generatedAt:new Date().toISOString(),method:'key = normalized Yandex-map label (iconContent) when not generic, split by city/region; generic labels grouped only by identical geocode address; coords used as confirmation only (city-default coords excluded)',defaultCoords:[...DEFAULT_COORDS],xlsxWithoutInexPages:X.filter(x=>!x[3]).map(x=>x[0]),groups:out},null,1));
console.log('groups',out.length,'multi',out.filter(o=>o.pages.length>1).length,'pages in multi',out.filter(o=>o.pages.length>1).reduce((a,o)=>a+o.pages.length,0),'glass yes/unclear/no',['yes','unclear','no'].map(x=>out.filter(o=>o.glass===x).length).join('/'),'default coords',[...DEFAULT_COORDS]);
for(const o of out.filter(o=>o.pages.length>1||o.uncachedSiblings.length||o.glass!=='yes'))console.log(`${o.groupName} | ${o.cities.join('/')} | ${o.pages.length}p ${o.photoCount}ph | ${o.categories.join(',')} | ${o.merge.confidence} [${o.merge.signals.join('; ')}] ${o.merge.flags.join('; ')} | glass=${o.glass} | +${o.uncachedSiblings.length} uncached: ${o.uncachedSiblings.map(u=>u.split(' ')[0].split('/').pop()).join(',')}`);
