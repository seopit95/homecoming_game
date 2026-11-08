export type Stamina={value:number;exhausted:boolean;rest:number};
export const fullStamina=():Stamina=>({value:100,exhausted:false,rest:0});
export function updateStamina(state:Stamina,sprinting:boolean,dt:number):Stamina{
  if(sprinting&&!state.exhausted){const value=Math.max(0,state.value-dt*18);return {value,exhausted:value===0,rest:0};}
  const rest=state.rest+dt;
  const recovered=Math.min(100,state.value+8*(Math.max(0,rest-1)-Math.max(0,state.rest-1)));
  return {value:recovered,exhausted:state.exhausted&&recovered<28,rest};
}
