type Point={x:number;z:number};
export const annexRadio={source:{x:10.48,z:20},approach:{x:10.48,z:21.1}};

// A steady broadcast gets one investigation, rather than permanent immunity.
export function createRadioLure(){
 let active=false,cycle=0,heard=-1,nextHear=0;
 return {
  get active(){return active;},
  toggle(){active=!active;if(active)cycle++;return active;},
  interest(listener:Point,now:number,playerKnown:boolean):Point|null{
   if(!active||playerKnown||heard===cycle||now<nextHear||Math.hypot(listener.x-annexRadio.source.x,listener.z-annexRadio.source.z)>17)return null;
   heard=cycle;nextHear=now+12;return {...annexRadio.approach};
  },
  reset(){active=false;cycle=0;heard=-1;nextHear=0;},
 };
}
