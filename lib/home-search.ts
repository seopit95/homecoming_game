import {apartment as home} from './apartment-layout.ts';

type Point=Readonly<{x:number;z:number}>;
type Cue='breath'|'cry'|'drag';
type Step={goal:Point;lookAt:Point;speed:number;hold:number;cue:Cue|null};
export type HomeSearch={steps:Step[];phase:number;elapsed:number;goal:Point;lookAt:Point;speed:number;cue:Cue|null;cueId:number;retreating:boolean;done:boolean;arrived:boolean;retreatX:number;retreatZ:number};

// Capture knowledge once, before the player camera moves inside the wardrobe.
// Both routes stay outside its closed door; only an observed entry names it.
export function createHomeSearch(witnessed:boolean,interest?:Point):HomeSearch{
 const front={x:home.closet[0]-.9,z:home.closet[2]},room={x:home.search[0]-.45,z:home.search[2]-1.15};
 const evidence=interest?{x:interest.x,z:interest.z}:{x:home.radioStart[0],z:home.radioStart[2]};
 const steps:Step[]=witnessed?[
  {goal:front,lookAt:{x:home.closet[0],z:home.closet[2]},speed:1.15,hold:3.4,cue:'breath'},
  {goal:{x:front.x-.38,z:front.z-.30},lookAt:room,speed:.38,hold:1.5,cue:'drag'},
  {goal:home.bath,lookAt:home.bath,speed:1.15,hold:0,cue:null},
 ]:[
  {goal:evidence,lookAt:evidence,speed:1.05,hold:1.2,cue:'breath'},
  {goal:room,lookAt:{x:1.8*Math.SQRT2,z:room.z},speed:.68,hold:2.3,cue:'cry'},
  {goal:home.bath,lookAt:home.bath,speed:1.1,hold:0,cue:null},
 ];
 return {steps,phase:0,elapsed:0,goal:steps[0].goal,lookAt:steps[0].lookAt,speed:steps[0].speed,cue:null,cueId:0,retreating:false,done:false,arrived:false,retreatX:0,retreatZ:0};
}

// No clock-only escape: holds start on arrival, and survival needs a real retreat.
// The caller owns movement, facing and cue emission; this reuses the same state.
export function stepHomeSearch(search:HomeSearch,position:Point,dt:number){
 if(search.done)return search;
 const step=search.steps[search.phase],last=search.phase===search.steps.length-1;
 const retreat=Math.hypot(position.x-search.retreatX,position.z-search.retreatZ);
 search.retreating=last&&retreat>.65;
 if(Math.hypot(position.x-step.goal.x,position.z-step.goal.z)>(last?.45:.18)){
  search.speed=step.speed;search.elapsed=0;search.arrived=false;return search;
 }
 search.speed=0;
 if(!search.arrived){search.arrived=true;if(step.cue){search.cue=step.cue;search.cueId++;}}
 search.elapsed+=Math.max(0,dt);
 if(search.elapsed<step.hold)return search;
 if(last){search.done=retreat>1.8;return search;}
 const next=search.steps[++search.phase];search.goal=next.goal;search.lookAt=next.lookAt;search.speed=next.speed;search.elapsed=0;search.arrived=false;
 if(search.phase===search.steps.length-1){search.retreatX=position.x;search.retreatZ=position.z;}
 return search;
}
