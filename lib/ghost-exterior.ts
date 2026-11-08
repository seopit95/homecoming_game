import type {Solid} from './world.ts';
import {segmentHitsSolid} from './collision.ts';
export const exteriorGhostScale=(area:string)=>area==='apartment'||area==='resident'?1:1.15;
export type WallSupport={wall:Solid;nx:number;nz:number;distance:number;blend:number};
type Input={time:number;position:{x:number;y:number;z:number};heading:number;moving:number;solids:Solid[];enabled:boolean};
// Only continuous, full-height masonry supports the body. Rails, glazing,
// doors and the final metres before a corner are deliberately floor-only.
function nearbyWall(a:Input):Omit<WallSupport,'blend'>|undefined{
 const p=a.position;
 for(const wall of a.solids){
  if(wall.seeThrough||(wall.h??3)<2.6||Math.abs((wall.y??1.5)-(wall.h??3)/2-p.y)>.08)continue;
  const c=Math.cos(wall.yaw??0),s=Math.sin(wall.yaw??0),x=(p.x-wall.x)*c-(p.z-wall.z)*s,z=(p.x-wall.x)*s+(p.z-wall.z)*c;
  const alongZ=wall.d>wall.w,thickness=alongZ?wall.w:wall.d,length=alongZ?wall.d:wall.w,across=alongZ?x:z,along=alongZ?z:x;
  if(thickness>.6||length<7||length/2-Math.abs(along)<4.5)continue;
  const distance=Math.abs(across)-thickness/2;
  if(distance<.84||distance>1.4)continue;
  const sign=Math.sign(across),nx=sign*(alongZ?c:s),nz=sign*(alongZ?-s:c);
  if(Math.abs(nx*Math.sin(a.heading)+nz*Math.cos(a.heading))>.12)continue;
  const target={x:p.x-nx*distance,z:p.z-nz*distance};
  if(a.solids.some(other=>other!==wall&&(other.y??1.5)+(other.h??3)/2>p.y+.05&&(other.y??1.5)-(other.h??3)/2<p.y+2.55&&[-1.15,0,1.15].some(offset=>segmentHitsSolid({x:p.x+Math.sin(a.heading)*offset,z:p.z+Math.cos(a.heading)*offset},{x:target.x+Math.sin(a.heading)*offset,z:target.z+Math.cos(a.heading)*offset},other,.55))))continue;
  return {wall,nx,nz,distance};
 }
}
export class ExteriorCrawl{
 private last=-1;private clock=0;private blend=0;private safe=true;private support?:Omit<WallSupport,'blend'>;
 get attached(){return this.blend>0;}
 get canAdvance(){return this.safe||this.blend===0;}
 reset(){this.last=-1;this.clock=0;this.blend=0;this.safe=true;this.support=undefined;}
 step(a:Input):WallSupport|{blend:0}{
  let dt=this.last<0?0:Math.max(0,Math.min(.05,a.time-this.last));
  if(a.time<this.last||a.time-this.last>.25){this.reset();dt=0;}
  this.last=a.time;
  if(a.enabled&&a.moving>.03)this.clock+=dt;
  const next=a.enabled?nearbyWall(a):undefined;
  const same=next&&(!this.support||next.wall===this.support.wall);
  this.safe=!!same;
  const cycle=this.clock%9,target=same&&cycle>2&&cycle<6?1:0;
  this.blend+=Math.max(-dt/1.15,Math.min(dt/1.15,target-this.blend));
  if(next&&same)this.support=next;
  if(this.blend<=0){this.blend=0;this.support=next;return {blend:0};}
  if(!this.support)return {blend:0};
  // A smoothstep has zero angular speed at both support changes.
  const b=this.blend;return {...this.support,blend:b*b*(3-2*b)};
 }
}
