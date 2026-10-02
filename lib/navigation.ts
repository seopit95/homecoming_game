import {canStandAt,type Solid,type Bounds} from './world.ts';
import {segmentHitsSolid} from './collision.ts';
export type Point={x:number;z:number};
export const pursuerRadius=.43;

export function findPursuitPath(start:Point,goal:Point,solids:Solid[],bounds:Bounds){
  let approach=goal;
  if(!canStandAt(goal.x,goal.z,solids,pursuerRadius,bounds)){
    let best=Infinity;
    for(const distance of [.125,.25,.375,.5])for(let i=0;i<24;i++){
      const angle=i*Math.PI/12,p={x:goal.x+Math.cos(angle)*distance,z:goal.z+Math.sin(angle)*distance};
      if(!canStandAt(p.x,p.z,solids,pursuerRadius,bounds)||!clearPath(goal,p,solids,bounds,0))continue;
      const score=distance+Math.hypot(p.x-start.x,p.z-start.z)*.001;
      if(score<best){best=score;approach=p;}
    }
    if(!Number.isFinite(best))return [];
  }
  return findPath(start,approach,solids,bounds,pursuerRadius);
}
// Slab intersection against expanded obstacles preserves the pursuer's clearance.
// Sampling only a centre ray would let a smoothed route clip a door jamb.
export function clearPath(a:Point,b:Point,solids:Solid[],bounds:Bounds,r=.18){
  if(!canStandAt(a.x,a.z,solids,r,bounds)||!canStandAt(b.x,b.z,solids,r,bounds))return false;
  return !solids.some(s=>segmentHitsSolid(a,b,s,r));
}
export function findPath(start:Point,goal:Point,solids:Solid[],bounds:Bounds,r=.18):Point[]{
  const free=(p:Point)=>canStandAt(p.x,p.z,solids,r,bounds);
  const clear=(a:Point,b:Point)=>clearPath(a,b,solids,bounds,r);
  if(!free(start)||!free(goal))return [];
  if(clear(start,goal))return [goal];
  // Keep ordinary searches coarse; a finer retry covers walkable gaps that fall
  // between half-metre grid lines, such as the archive reception desk.
  const coarse=search(2);return coarse.length?coarse:search(4);
  function search(scale:number):Point[]{
    const sx=Math.round(start.x*scale),sz=Math.round(start.z*scale),key=(x:number,z:number)=>`${x},${z}`;
    // A* keeps searches across the larger floors local to the likely route.
    type Node={x:number;z:number;g:number;f:number};
    const heap:Node[]=[],parents=new Map<string,string|null>(),cost=new Map<string,number>();
    const heuristic=(x:number,z:number)=>Math.abs(x-goal.x*scale)+Math.abs(z-goal.z*scale);
    const better=(a:Node,b:Node)=>a.f<b.f||(a.f===b.f&&a.g>b.g);
    function push(n:Node){let i=heap.length;heap.push(n);while(i>0){const p=(i-1)>>1;if(!better(n,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=n;}
    function pop(){const first=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&better(heap[child+1],heap[child]))child++;if(!better(heap[child],last))break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;}
    for(const [dx,dz] of [[0,0],[0,1],[0,-1],[1,0],[-1,0]]){const x=sx+dx,z=sz+dz;if(clear(start,{x:x/scale,z:z/scale})){push({x,z,g:0,f:heuristic(x,z)});parents.set(key(x,z),null);cost.set(key(x,z),0);break;}}
    for(let i=0;heap.length&&i<20000;i++){
      const {x,z,g}=pop();if(g!==cost.get(key(x,z)))continue;const p={x:x/scale,z:z/scale};
      if(Math.hypot(p.x-goal.x,p.z-goal.z)<.8&&clear(p,goal)){
        const path:Point[]=[goal];let at:string|null=key(x,z);
        while(at!==null){const [ax,az]=at.split(',').map(Number);path.push({x:ax/scale,z:az/scale});at=parents.get(at)??null;}
        path.reverse();const smooth:Point[]=[];let from=start,index=0;
        while(index<path.length){let far=path.length-1;while(far>index&&!clear(from,path[far]))far--;smooth.push(path[far]);from=path[far];index=far+1;}
        return smooth;
      }
      for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){
        const nx=x+dx,nz=z+dz,k=key(nx,nz),nextCost=g+1;if(nextCost>=(cost.get(k)??Infinity)||!clear(p,{x:nx/scale,z:nz/scale}))continue;parents.set(k,key(x,z));cost.set(k,nextCost);push({x:nx,z:nz,g:nextCost,f:nextCost+heuristic(nx,nz)});
      }
    }
    return [];
  }
}
