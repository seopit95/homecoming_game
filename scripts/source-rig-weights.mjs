// Pinned CC0 rig data shared by anatomical skin and its bound clothing.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const commit='a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
const pins={
 'default.mhskel':'99f179bce0aa850b45d4191a1d0d234c5851f881c057439470ded3bddf729a24',
 'default_weights.mhw':'0f3641d651ae3d00ad6b4ccee43142edb109d3bd909d27d9e4139ef1beed8625'
};
export function sourceRigWeights(dir,count){
 assert.ok(dir,'Supply the pinned CC0 source rig directory');const files=Object.keys(pins).map(name=>{const text=fs.readFileSync(path.join(dir,name),'utf8'),sha256=crypto.createHash('sha256').update(text).digest('hex');assert.equal(sha256,pins[name]);return {name,text,sha256,url:'https://raw.githubusercontent.com/makehumancommunity/makehuman/'+commit+'/makehuman/data/rigs/'+name};});
 const rig=JSON.parse(files[0].text),weights=JSON.parse(files[1].text);assert.equal(rig.license,'CC0');assert.equal(weights.license,'CC0');
 const total=new Float64Array(count),neck=new Float64Array(count),arm=new Float64Array(count),leg=new Float64Array(count),legLeft=new Float64Array(count),legRight=new Float64Array(count);
 const descends=(bone,roots)=>{for(let b=bone;b;b=rig.bones[b]?.parent)if(roots.includes(b))return true;return false;};
 for(const [name,rows] of Object.entries(weights.weights)){
  const cervical=descends(name,['neck01']),shoulder=descends(name,['upperarm01.L','upperarm01.R']),thighLeft=descends(name,['upperleg01.L']),thighRight=descends(name,['upperleg01.R']);
  for(const [i,w] of rows){assert.ok(i<count&&w>=0);total[i]+=w;if(cervical)neck[i]+=w;if(shoulder)arm[i]+=w;if(thighLeft){leg[i]+=w;legLeft[i]+=w;}if(thighRight){leg[i]+=w;legRight[i]+=w;}}
 }
 for(let i=0;i<count;i++)if(total[i]>0){neck[i]/=total[i];arm[i]/=total[i];leg[i]/=total[i];legLeft[i]/=total[i];legRight[i]/=total[i];}
 return {neck,arm,leg,legLeft,legRight,rig,metadata:{license:'CC0-1.0',sourceCommit:commit,credits:['Data Collection AB','Joel Palmius','Jonas Hauquier'],sources:files.map(({name,url,sha256})=>({name,url,sha256})),construction:'Original MakeHuman authored skeletal influences, normalized per source vertex. Cervical family descends from neck01; moving arm family descends from upperarm01.L/R. Clavicle and shoulder-girdle influences remain on the thorax because this reduced rig articulates the humerus, not the source clavicle bones. Body and garment use the same original source vertex/barycentric bindings.'}};
}
