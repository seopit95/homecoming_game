type Point={x:number;z:number};
// A visible back really is a blind spot. Hearing and close contact remain independent.
export function perceives({ghost,player,heading,lineOfSight,torch,crouched,noise}:{ghost:Point;player:Point;heading:number;lineOfSight:boolean;torch:boolean;crouched:boolean;noise:number}){
  const dx=player.x-ghost.x,dz=player.z-ghost.z,d=Math.hypot(dx,dz);
  if(noise>0&&d<noise)return true;
  if(!lineOfSight)return false;
  if(d<1.15)return true;
  const facing=(dx*Math.sin(heading)+dz*Math.cos(heading))/d;
  return facing>.5&&d<(torch?23:crouched?6:13);
}
