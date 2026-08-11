import { consultar } from './scripts/kpv/comum.ts';
function webpSize(b: Buffer): {w:number,h:number}|null {
  if (b.length<30||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP') return null;
  const fmt=b.toString('ascii',12,16);
  try{
    if(fmt==='VP8X')return{w:1+((b[24]|b[25]<<8|b[26]<<16)&0xFFFFFF),h:1+((b[27]|b[28]<<8|b[29]<<16)&0xFFFFFF)};
    if(fmt==='VP8 ')return{w:(b[26]|b[27]<<8)&0x3FFF,h:(b[28]|b[29]<<8)&0x3FFF};
    if(fmt==='VP8L'){const bits=b[21]|b[22]<<8|b[23]<<16|b[24]<<24;return{w:(bits&0x3FFF)+1,h:((bits>>14)&0x3FFF)+1};}
  }catch{}
  return null;
}
const rows = await consultar(`SELECT l.id, l.seller_id, u.name sname, u.email, l.status, l.images FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.status='active'`) as any[];
console.log(`escaneando capa de ${rows.length} anuncios ativos...`);
type S={nome:string,email:string,baixa:number,total:number};
const porVend=new Map<string,S>();
let i=0;
async function medir(u:string):Promise<number>{ // menor lado, 0 se falhar
  try{const r=await fetch(u,{headers:{Range:'bytes=0-127'}});const b=Buffer.from(await r.arrayBuffer());const s=webpSize(b);return s?Math.min(s.w,s.h):0;}catch{return 0;}
}
async function worker(){
  while(i<rows.length){
    const r=rows[i++];
    const s=porVend.get(r.seller_id)??{nome:r.sname,email:r.email,baixa:0,total:0};
    s.total++;
    let imgs:any=[];try{imgs=JSON.parse(r.images||'[]')}catch{}
    if(imgs[0]){const menor=await medir(imgs[0]);if(menor&&menor<800)s.baixa++;}
    porVend.set(r.seller_id,s);
    if(i%150===0)console.log(`  ${i}/${rows.length}`);
  }
}
await Promise.all(Array.from({length:24},worker));
const arr=[...porVend.values()].filter(s=>s.baixa>0).sort((a,b)=>b.baixa-a.baixa);
console.log(`\n=== VENDEDORES COM FOTO DE CAPA BAIXA (<800px) ===`);
for(const s of arr) console.log(`  ${String(s.baixa)+'/'+s.total} baixas  ${String(s.nome).slice(0,28).padEnd(28)} ${s.email}`);
console.log(`\ntotal vendedores afetados: ${arr.length}`);
console.log(`total anuncios com capa baixa: ${arr.reduce((a,s)=>a+s.baixa,0)}`);
