// Original PCM synthesis. No samples, soundfonts, presets or melodies imported.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const out=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/audio/finale-v137');
await fs.mkdir(out,{recursive:true});
const rate=24000,pi=Math.PI*2,notes=m=>440*2**((m-69)/12),clamp=x=>Math.max(0,Math.min(1,x));
let seed=137;const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
const assets=[];
async function write(name,channels,targetPeak){
 let peak=0;for(const c of channels)for(const x of c)peak=Math.max(peak,Math.abs(x));
 const gain=targetPeak/peak,n=channels[0].length,count=channels.length,bytes=Buffer.alloc(44+n*count*2);
 bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(count,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*count*2,28);bytes.writeUInt16LE(count*2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(n*count*2,40);
 let sum=0,step=0,clipped=0;
 for(let i=0;i<n;i++)for(let c=0;c<count;c++){const sample=Math.round(channels[c][i]*gain*32767);bytes.writeInt16LE(sample,44+(i*count+c)*2);sum+=(sample/32768)**2;if(Math.abs(sample)>=32767)clipped++;if(i)step=Math.max(step,Math.abs((sample-Math.round(channels[c][i-1]*gain*32767))/32768));}
 await fs.writeFile(path.join(out,name),bytes);
 assets.push({file:name,sampleRate:rate,channels:count,duration:n/rate,bytes:bytes.length,peakDbFS:20*Math.log10(targetPeak),rmsDbFS:10*Math.log10(sum/(n*count)),clippedSamples:clipped,maxAdjacentStep:step,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const horn=new Float32Array(rate*1.05);let air=0;
for(let i=0;i<horn.length;i++){const t=i/rate,env=clamp(t/.025)*clamp((1.05-t)/.22);air=.8*air+.2*noise();let v=0;for(const f of [116.54,155.56])for(let h=1;h<=7;h++)v+=Math.sin(pi*f*h*t+.018*Math.sin(pi*5*t))/h**1.3;horn[i]=(v*.36+air*.16)*env;}
await write('truck-horn.wav',[horn],.68);
const impact=new Float32Array(rate*2.7);let low=0;
for(let i=0;i<impact.length;i++){const t=i/rate,n=noise();low=.93*low+.07*n;const onset=clamp(t/.002),thump=Math.sin(pi*(38*t+10*(1-Math.exp(-t*7))))*Math.exp(-t*7),crumple=low*2.5*Math.exp(-t*3.5)+n*.38*Math.exp(-t*13);let metal=0;for(const f of [283,479,733,1231])metal+=Math.sin(pi*f*t+Math.sin(pi*21*t)*.2)*.055*Math.exp(-t*(1.8+f/500));const glass=(n-low)*.11*Math.exp(-Math.max(0,t-.08)*2.4)*clamp((t-.06)/.05);impact[i]=(thump*.8+crumple+metal+glass)*onset*clamp((2.7-t)/.25);}
await write('truck-impact.wav',[impact],.88);
const length=rate*48,left=new Float32Array(length),right=new Float32Array(length);
function tone(start,duration,hz,level,pan,pluck=false){for(let i=Math.max(0,Math.round(start*rate));i<Math.min(length,Math.round((start+duration)*rate));i++){const t=i/rate-start,env=pluck?clamp(t/.009)*Math.exp(-t/1.45)*clamp((duration-t)/.5):clamp(t/1.6)*clamp((duration-t)/2.2);const phase=pi*hz*t+.012*Math.sin(pi*.31*t),v=(Math.sin(phase)+Math.sin(2*phase)*.21+Math.sin(3*phase)*.065)*env*level;left[i]+=v*Math.sqrt((1-pan)/2);right[i]+=v*Math.sqrt((1+pan)/2);}}
const chords=[[50,57,65,76],[46,53,62,69],[43,58,62,69],[45,52,58,73],[50,57,65,76],[46,53,62,69],[43,58,62,69],[50,57,64,65]];
chords.forEach((chord,bar)=>chord.forEach((m,j)=>tone(bar*6,9,notes(m),j===0?.065:.025,(j-1.5)*.35)));
const melody=[77,76,74,69,70,69,65,64,77,76,74,72,70,69,64,62];
melody.forEach((m,i)=>{tone(i*3+.25,5.5,notes(m),.085,i%2?.15:-.15,true);tone(i*3+.59,5.5,notes(m)*.999,.022,i%2?-.5:.5,true);});
tone(0,48,notes(38),.019,0);tone(0,48,notes(51),.003,.6);
for(let i=0;i<length;i++){const t=i/rate,env=clamp(t/1.8)*clamp((48-t)/2.4);left[i]*=env;right[i]*=env;}
await write('last-letter.wav',[left,right],.58);
await fs.writeFile(path.join(out,'sources.json'),JSON.stringify({title:'귀가 · 마지막 충돌과 남겨진 편지',created:'2026-10-30',method:'Original deterministic additive synthesis written for this game; no third-party recordings, samples, soundfonts, presets, MIDI or existing compositions.',license:'CC0-1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',generator:'scripts/author-finale-audio.mjs',assets},null,2)+'\n');
console.log(JSON.stringify(assets,null,2));
