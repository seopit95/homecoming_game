import type {Solid} from './world.ts';

export type Occupant={x:number;z:number;r:number};

// Rotating doors use their local width/depth, not a large world-axis bounding box.
export function solidContainsPoint(s:Solid,x:number,z:number,r=0){
  const dx=x-s.x,dz=z-s.z,c=Math.cos(s.yaw??0),n=Math.sin(s.yaw??0);
  return Math.abs(dx*c-dz*n)<s.w/2+r&&Math.abs(dx*n+dz*c)<s.d/2+r;
}

export function segmentHitsSolid(a:{x:number;z:number},b:{x:number;z:number},s:Solid,r=0){
  const c=Math.cos(s.yaw??0),n=Math.sin(s.yaw??0),ax=a.x-s.x,az=a.z-s.z,dx=b.x-a.x,dz=b.z-a.z;
  let lo=0,hi=1;
  for(const [origin,d,half] of [[ax*c-az*n,dx*c-dz*n,s.w/2+r],[ax*n+az*c,dx*n+dz*c,s.d/2+r]]){
    if(Math.abs(d)<1e-9){if(origin<=-half||origin>=half)return false;}
    else{const t1=(-half-origin)/d,t2=(half-origin)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>=hi)return false;}
  }
  return true;
}
