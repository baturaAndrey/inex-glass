const fs=require('fs');const {createRequire}=require('module');
const R='C:/Users/ba2ra/Documents/__WORKS__/inex-glass';const S=__dirname;
const sharp=createRequire(R+'/package.json')('sharp');const files=require(S+'/inex-files.json');
(async()=>{const pages=require(S+'/pages.json');
const amb=pages.filter(p=>p.cat.startsWith('ograzhdeniya')&&!/стекл/i.test(p.name));
console.log(amb.map((p,i)=>i+' '+p.slug).join('\n'));
const TW=200,TH=150,N=4,ROWS=12;
for(let s=0;s*ROWS<amb.length;s++){const rows=amb.slice(s*ROWS,s*ROWS+ROWS);const comps=[];
 for(const [ri,p] of rows.entries()){const y=ri*TH;comps.push({input:Buffer.from(`<svg width="60" height="${TH}"><text x="4" y="80" font-size="28" fill="red">${s*ROWS+ri}</text></svg>`),left:0,top:y});
  const ph=p.photoInfo.filter(i=>i.sha1).slice(0,N);for(const [ci,i] of ph.entries()){const b=await sharp(files[i.sha1].file).resize(TW,TH,{fit:'cover'}).toBuffer();comps.push({input:b,left:60+ci*TW,top:y})}}
 await sharp({create:{width:60+N*TW,height:rows.length*TH,channels:3,background:'#fff'}}).composite(comps).jpeg({quality:70}).toFile(S+`/sheet${s}.jpg`);}
})();
