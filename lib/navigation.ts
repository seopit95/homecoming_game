import {canStandAt,type Solid,type Bounds} from './world.ts';
export type Point={x:number;z:number};
// Slab intersection against expanded obstacles preserves the pursuer's clearance.
// Sampling only a centre ray would let a smoothed route clip a door jamb.
export function clearPath(a:Point,b:Point,solids:Solid[],bounds:Bounds,r=.18){
  if(!canStandAt(a.x,a.z,solids,r,bounds)||!canStandAt(b.x,b.z,solids,r,bounds))return false;
  const dx=b.x-a.x,dz=b.z-a.z;
  return !solids.some(s=>{
    let lo=0,hi=1;
    for(const [origin,d,min,max] of [[a.x,dx,s.x-s.w/2-r,s.x+s.w/2+r],[a.z,dz,s.z-s.d/2-r,s.z+s.d/2+r]]){
      if(Math.abs(d)<1e-9){if(origin<=min||origin>=max)return false;}
      else{const t1=(min-origin)/d,t2=(max-origin)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>=hi)return false;}
    }
    return true;
  });
}
export function findPath(start:Point,goal:Point,solids:Solid[],bounds:Bounds):Point[]{
  const free=(p:Point)=>canStandAt(p.x,p.z,solids,.18,bounds);
  const clear=(a:Point,b:Point)=>clearPath(a,b,solids,bounds);
  if(!free(start)||!free(goal))return [];
  if(clear(start,goal))return [goal];
  const sx=Math.round(start.x*2),sz=Math.round(start.z*2),key=(x:number,z:number)=>`${x},${z}`;
  // A* keeps searches across the larger floors local to the likely route.
  type Node={x:number;z:number;g:number;f:number};
  const heap:Node[]=[],parents=new Map<string,string|null>(),cost=new Map<string,number>();
  const heuristic=(x:number,z:number)=>Math.abs(x-goal.x*2)+Math.abs(z-goal.z*2);
  const better=(a:Node,b:Node)=>a.f<b.f||(a.f===b.f&&a.g>b.g);
  function push(n:Node){let i=heap.length;heap.push(n);while(i>0){const p=(i-1)>>1;if(!better(n,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=n;}
  function pop(){const first=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&better(heap[child+1],heap[child]))child++;if(!better(heap[child],last))break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;}
  for(const [dx,dz] of [[0,0],[0,1],[0,-1],[1,0],[-1,0]]){const x=sx+dx,z=sz+dz;if(clear(start,{x:x/2,z:z/2})){push({x,z,g:0,f:heuristic(x,z)});parents.set(key(x,z),null);cost.set(key(x,z),0);break;}}
  for(let i=0;heap.length&&i<20000;i++){
    const {x,z,g}=pop();if(g!==cost.get(key(x,z)))continue;const p={x:x/2,z:z/2};
    if(Math.hypot(p.x-goal.x,p.z-goal.z)<.8&&clear(p,goal)){
      const path:Point[]=[goal];let at:string|null=key(x,z);
      while(at!==null){const [ax,az]=at.split(',').map(Number);path.push({x:ax/2,z:az/2});at=parents.get(at)??null;}
      path.reverse();const smooth:Point[]=[];let from=start,index=0;
      while(index<path.length){let far=path.length-1;while(far>index&&!clear(from,path[far]))far--;smooth.push(path[far]);from=path[far];index=far+1;}
      return smooth;
    }
    for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const nx=x+dx,nz=z+dz,k=key(nx,nz),nextCost=g+1;if(nextCost>=(cost.get(k)??Infinity)||!clear(p,{x:nx/2,z:nz/2}))continue;parents.set(k,key(x,z));cost.set(k,nextCost);push({x:nx,z:nz,g:nextCost,f:nextCost+heuristic(nx,nz)});
    }
  }
  return [];
}
