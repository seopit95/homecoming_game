import {canStandAt,type Solid,type Bounds} from './world.ts';
export type Point={x:number;z:number};
export function findPath(start:Point,goal:Point,solids:Solid[],bounds:Bounds):Point[]{
  const free=(p:Point)=>canStandAt(p.x,p.z,solids,.18,bounds);
  const clear=(a:Point,b:Point)=>{const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.12));for(let i=0;i<=n;i++)if(!free({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;return true;};
  if(!free(start)||!free(goal))return [];
  if(clear(start,goal))return [goal];
  const sx=Math.round(start.x*2),sz=Math.round(start.z*2),key=(x:number,z:number)=>`${x},${z}`;
  const queue:[number,number][]=[],parents=new Map<string,string|null>();
  for(const [dx,dz] of [[0,0],[0,1],[0,-1],[1,0],[-1,0]]){const x=sx+dx,z=sz+dz;if(clear(start,{x:x/2,z:z/2})){queue.push([x,z]);parents.set(key(x,z),null);break;}}
  for(let i=0;i<queue.length&&i<20000;i++){
    const [x,z]=queue[i],p={x:x/2,z:z/2};
    if(Math.hypot(p.x-goal.x,p.z-goal.z)<.8&&clear(p,goal)){
      const path:Point[]=[goal];let at:string|null=key(x,z);
      while(at!==null){const [ax,az]=at.split(',').map(Number);path.push({x:ax/2,z:az/2});at=parents.get(at)??null;}return path.reverse();
    }
    for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const nx=x+dx,nz=z+dz,k=key(nx,nz);if(parents.has(k)||!clear(p,{x:nx/2,z:nz/2}))continue;parents.set(k,key(x,z));queue.push([nx,nz]);
    }
  }
  return [];
}
