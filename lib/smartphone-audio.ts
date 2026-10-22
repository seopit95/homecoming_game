// Original mallet phrase and struck-bar partials; no sampled Apple ringtone.
export function smartphoneRing(ctx:Pick<AudioContext,'sampleRate'|'createBuffer'>){
 const rate=ctx.sampleRate,buffer=ctx.createBuffer(1,Math.round(rate*3.4),rate),data=buffer.getChannelData(0);
 const phrase=[[0,587.33],[.14,739.99],[.28,880],[.42,1318.51],[.78,739.99],[.92,880],[1.06,1174.66],[1.20,880]];
 for(const [at,f] of phrase)for(let i=Math.floor(at*rate);i<Math.min(data.length,Math.ceil((at+1.3)*rate));i++){
  const t=i/rate-at,attack=Math.min(1,t/.0025),tail=1-Math.max(0,(t-1.12)/.18);
  data[i]+=attack*tail*(Math.sin(2*Math.PI*f*t)*Math.exp(-t*7.5)*.22+Math.sin(2*Math.PI*f*3.99*t)*Math.exp(-t*24)*.09+Math.sin(2*Math.PI*f*10.65*t)*Math.exp(-t*50)*.025);
 }
 return buffer;
}
