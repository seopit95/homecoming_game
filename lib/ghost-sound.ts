export type GhostSoundPosition={x:number;y:number;z:number;distance:number;occluded:boolean};

// Listener-relative coordinates keep HRTF front/back cues correct as the head turns.
// Web Audio's default listener faces -Z, matching the game camera.
export function ghostSoundPosition(listener:{x:number;y:number;z:number},source:{x:number;y:number;z:number},yaw:number,pitch:number,occluded:boolean):GhostSoundPosition{
  const dx=source.x-listener.x,dy=source.y-listener.y,dz=source.z-listener.z;
  const x=dx*Math.cos(yaw)-dz*Math.sin(yaw),back=dx*Math.sin(yaw)+dz*Math.cos(yaw);
  return {x,y:dy*Math.cos(pitch)+back*Math.sin(pitch),z:back*Math.cos(pitch)-dy*Math.sin(pitch),distance:Math.hypot(dx,dy,dz),occluded};
}

// A paired, rounded chest thump, with a quiet tail so the loop never clicks.
export function heartbeatBuffer(ctx:BaseAudioContext){
  const buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),data=buffer.getChannelData(0);
  for(const [start,strength] of [[0,1],[.22,.65]])for(let i=0;i<ctx.sampleRate*.18;i++){
    const t=i/ctx.sampleRate,envelope=Math.min(1,t/.008)*Math.exp(-t*30)*Math.max(0,1-t/.18);
    data[Math.floor(start*ctx.sampleRate)+i]+=strength*envelope*(Math.sin(2*Math.PI*(58*t-40*t*t))*.7+Math.sin(2*Math.PI*94*t)*.12);
  }
  return buffer;
}
