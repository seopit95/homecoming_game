import type {Object3D} from 'three';

// Double the floor area by spreading the plan along both axes, keeping human-scale furniture.
export const apartmentScale=Math.SQRT2;
const s=apartmentScale;
export const homePosition=(x:number,y:number,z:number):[number,number,number]=>[x*s,y,z*s];
export const apartment={
  width:13.2*s,depth:12.5*s,bounds:{x:6.6*s-.22,z:6.25*s-.22},
  stand:homePosition(0,1.65,4.8),seat:homePosition(-1.2,1.15,2.5),sleep:homePosition(4.8,.98,4.7),title:homePosition(0,1.63,5.65),
  wakeStand:homePosition(3.35,1.65,3.5),switch:[1.8*s+.17,1.35,4.2*s],flashlight:homePosition(3.65,.94,2.65),
  doorZ:-6.25*s+.14,door:[0,1.2,-6.25*s+.39],shoes:homePosition(0,.2,-4.65),phone:homePosition(-3.15,.58,2.4),
  radio:homePosition(2.75,1.1,5.15),radioStart:[2.75*s,1.65,5.15*s-1.25],breaker:[1.8*s+.285,1.6,-4.75*s],closet:[6.08*s-.65,1.25,1.55*s],
  hidden:[6.08*s-.7,1.48,1.55*s],search:[6.08*s-2.1,0,1.55*s],bath:{x:5.1*s,z:-3.7*s},haunt:homePosition(3,0,-3.1),
} as const;

// Move a furniture assembly as one unit; its dimensions and small component offsets stay unchanged.
export function spaceFurniture(root:Object3D,solids:{x:number;z:number}[]=[]){
  let anchor:{x:number;z:number;offsetX:number;offsetZ:number;child:number;solid:number}|undefined;
  function finish(){
    if(!anchor)return;const dx=anchor.x*(s-1)+anchor.offsetX,dz=anchor.z*(s-1)+anchor.offsetZ;
    for(const child of root.children.slice(anchor.child)){child.position.x+=dx;child.position.z+=dz;}
    for(const solid of solids.slice(anchor.solid)){solid.x+=dx;solid.z+=dz;}
    anchor=undefined;
  }
  return {finish,at:(x:number,z:number,offsetX=0,offsetZ=0)=>{finish();anchor={x,z,offsetX,offsetZ,child:root.children.length,solid:solids.length};}};
}
