const fs=require('fs'),path=require('path');
const ROOT='C:/Users/ba2ra/Documents/__WORKS__/inex-glass';
const S=__dirname;
const parsed=JSON.parse(fs.readFileSync(S+'/parsed.json')).filter(r=>r.ok).map(r=>r.value);
const cache={};for(const f of fs.readdirSync(ROOT+'/scripts/.cache/firecrawl')){const j=JSON.parse(fs.readFileSync(ROOT+'/scripts/.cache/firecrawl/'+f));cache[j.oldUrl]=j;}
const out=[];
for(const o of parsed){const j=cache[o.oldUrl];const h=j.data.rawHtml;
 const coord=/placeCoord\s*=\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/.exec(h);
 const geos=[...h.matchAll(/ymaps\.geocode\('([^']*)'/g)].map(m=>m[1]);
 const loc=(/class="example_location"[\s\S]*?<span>([^<]*)<\/span>/.exec(h)||[])[1];
 const p=o.oldUrl.split('/').filter(Boolean);
 out.push({url:o.oldUrl,cat:p.slice(1,-1).join('/'),slug:p.at(-1),name:o.name,loc,city:o.city,region:o.region,year:o.year,kind:o.kindLabel,coord:coord?[+coord[1],+coord[2]]:null,geos,photos:o.photos.map(x=>x.src),task:o.taskText.slice(0,200)});
}
fs.writeFileSync(S+'/pages.json',JSON.stringify(out,null,1));
for(const x of out)console.log([x.cat,x.slug,x.name,x.loc,x.kind,x.coord&&x.coord.join(','),x.geos.join('|'),x.photos.length].join(' ¦ '));
