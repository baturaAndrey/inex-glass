const {createRequire}=require('module');const r=createRequire('C:/Users/ba2ra/Documents/__WORKS__/inex-glass/package.json');
const ExcelJS=r('exceljs');(async()=>{const wb=new ExcelJS.Workbook();await wb.xlsx.readFile('C:/Users/ba2ra/Documents/__WORKS__/inex-glass/res/Объекты/Объекты.xlsx');
for(const ws of wb.worksheets){console.log('SHEET',ws.name,ws.rowCount);ws.eachRow((row,i)=>{console.log(i,row.values.slice(1).map(v=>String(v&&v.text||v&&v.richText?.map(t=>t.text).join('')||v||'').replace(/\s+/g,' ').slice(0,70)).join(' ¦ '))})}})();
