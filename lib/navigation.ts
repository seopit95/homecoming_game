import {canStandAt,type Solid,type Bounds} from './world.ts';
import {segmentHitsSolid} from './collision.ts';
export type Point={x:number;z:number};
export const pursuerRadius=.43;

// A turning body advances along its own heading. Sweep the complete stroke,
// including thin/moving doors; separate axis slides would detach the gait.
export function movePursuer(p:Point,heading:number,distance:number,solids:Solid[],bounds:Bounds){
  const next={x:p.x+Math.sin(heading)*distance,z:p.z+Math.cos(heading)*distance};
  if(!clearPath(p,next,solids,bounds,pursuerRadius))return false;
  p.x=next.x;p.z=next.z;return true;
}

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
  if(!canStandAt(start.x,start.z,solids,r,bounds)||!canStandAt(goal.x,goal.z,solids,r,bounds))return [];
  if(clearPath(start,goal,solids,bounds,r))return [goal];
  // An unreachable route can visit thousands of edges. Reject distant solids
  // cheaply before the exact rotated-box test; rebuild on every query so moving
  // doors never leave stale collision data behind.
  const obstacles=solids.map(s=>{
    const c=Math.abs(Math.cos(s.yaw??0)),n=Math.abs(Math.sin(s.yaw??0)),hw=s.w/2+r,hd=s.d/2+r;
    const x=c*hw+n*hd,z=n*hw+c*hd;
    return {s,minX:s.x-x,maxX:s.x+x,minZ:s.z-z,maxZ:s.z+z};
  });
  const inside=(p:Point)=>p.x>(bounds.minX??-bounds.x)&&p.x<bounds.x&&Math.abs(p.z)<bounds.z;
  const clear=(a:Point,b:Point)=>{
    if(!inside(a)||!inside(b))return false;
    const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minZ=Math.min(a.z,b.z),maxZ=Math.max(a.z,b.z);
    return !obstacles.some(o=>maxX>o.minX&&minX<o.maxX&&maxZ>o.minZ&&minZ<o.maxZ&&segmentHitsSolid(a,b,o.s,r));
  };
  // Keep ordinary searches coarse; a finer retry covers walkable gaps that fall
  // between half-metre grid lines, such as the archive reception desk.
  const coarse=search(2);return coarse.length?coarse:search(4);
  function search(scale:number):Point[]{
    const sx=Math.round(start.x*scale),sz=Math.round(start.z*scale);
    const minX=Math.floor((bounds.minX??-bounds.x)*scale)-1,minZ=-Math.ceil(bounds.z*scale)-1,columns=Math.ceil(bounds.x*scale)-minX+2;
    const key=(x:number,z:number)=>(z-minZ)*columns+x-minX;
    // A* keeps searches across the larger floors local to the likely route.
    type Node={x:number;z:number;g:number;f:number};
    const heap:Node[]=[],parents=new Map<number,number|null>(),cost=new Map<number,number>();
    const heuristic=(x:number,z:number)=>Math.abs(x-goal.x*scale)+Math.abs(z-goal.z*scale);
    const better=(a:Node,b:Node)=>a.f<b.f||(a.f===b.f&&a.g>b.g);
    function push(n:Node){let i=heap.length;heap.push(n);while(i>0){const p=(i-1)>>1;if(!better(n,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=n;}
    function pop(){const first=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&better(heap[child+1],heap[child]))child++;if(!better(heap[child],last))break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;}
    for(const [dx,dz] of [[0,0],[0,1],[0,-1],[1,0],[-1,0]]){const x=sx+dx,z=sz+dz;if(clear(start,{x:x/scale,z:z/scale})){push({x,z,g:0,f:heuristic(x,z)});parents.set(key(x,z),null);cost.set(key(x,z),0);break;}}
    for(let i=0;heap.length&&i<20000;i++){
      const {x,z,g}=pop();if(g!==cost.get(key(x,z)))continue;const p={x:x/scale,z:z/scale};
      if(Math.hypot(p.x-goal.x,p.z-goal.z)<.8&&clear(p,goal)){
        const path:Point[]=[goal];let at:number|null=key(x,z);
        while(at!==null){path.push({x:(at%columns+minX)/scale,z:(Math.floor(at/columns)+minZ)/scale});at=parents.get(at)??null;}
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
