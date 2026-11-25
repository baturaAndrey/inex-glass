const fs=require('fs'),path=require('path'),crypto=require('crypto');const {createRequire}=require('module');
const R='C:/Users/ba2ra/Documents/__WORKS__/inex-glass';const S=__dirname;
const sharp=createRequire(R+'/package.json')('sharp');
function fname(src){let p;try{p=new URL(src).pathname}catch{p=src}let d=p;try{d=decodeURIComponent(p)}catch{}const b=d.split(/[\/\\]/).pop()||'';return (b.normalize('NFC').replace(/[^\p{L}\p{N}._-]+/gu,'_').replace(/^[._]+/,'').slice(0,120).toLowerCase())||'photo'}
(async()=>{
const PD=R+'/scripts/.import-tmp/photos';const byName={};const files={};
for(const sha of fs.readdirSync(PD)){for(const f of fs.readdirSync(PD+'/'+sha)){const fp=PD+'/'+sha+'/'+f;const m=await sharp(fp).metadata();files[sha]={file:fp,w:m.width,h:m.height,bytes:fs.statSync(fp).size,fmt:m.format};(byName[f.toLowerCase()]??=[]).push(sha)}}
const pages=JSON.parse(fs.readFileSync(S+'/pages.json'));let un=0,amb=0;const urlInfo={};
for(const p of pages){p.photoInfo=p.photos.map(src=>{const n=fname(src);const raw=decodeURIComponent(new URL(src).pathname.split("/").pop()).toLowerCase();const c=byName[n]||byName[raw]||[];if(!c.length)un++;if(c.length>1)amb++;const sha=c.length===1?c[0]:null;const fi=sha?files[sha]:null;return {src,sha1:sha,candidates:c.length>1?c:undefined,w:fi?.w,h:fi?.h,bytes:fi?.bytes}})}
fs.writeFileSync(S+'/pages.json',JSON.stringify(pages,null,1));
// res/Объекты
const OD=R+'/res/Объекты';const own=[];
for(const d of fs.readdirSync(OD)){const dp=OD+'/'+d;if(!fs.statSync(dp).isDirectory())continue;for(const f of fs.readdirSync(dp)){const fp=dp+'/'+f;if(fs.statSync(fp).isDirectory()){own.push({dir:d,file:f,isDir:true});continue}let m={};try{m=await sharp(fp).metadata()}catch(e){m={err:e.message}}const sha=crypto.createHash('sha1').update(fs.readFileSync(fp)).digest('hex');own.push({dir:d,file:f,w:m.width,h:m.height,fmt:m.format,bytes:fs.statSync(fp).size,sha1:sha,inInexCache:!!files[sha],sameNameInInex:(byName[fname(f)]||[]).length>0})}}
fs.writeFileSync(S+'/own-photos.json',JSON.stringify(own,null,1));
fs.writeFileSync(S+'/inex-files.json',JSON.stringify(files,null,1));
console.log('localFiles',Object.keys(files).length,'unmatchedUrls',un,'ambiguousName',amb);
})();
