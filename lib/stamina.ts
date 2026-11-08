export type Stamina={value:number;rest:number;exhausted:boolean};
export const freshStamina=():Stamina=>({value:1,rest:1.5,exhausted:false});
export const canSprint=(s:Stamina)=>!s.exhausted&&s.value>0;
export function stepStamina(s:Stamina,dt:number,sprinting:boolean,moving:boolean):Stamina{
  if(dt<=0)return s;
  if(sprinting&&moving){const value=Math.max(0,s.value-dt/6.5);return {value,rest:0,exhausted:s.exhausted||value===0};}
  const rest=Math.min(1.5,s.rest+dt),recovery=Math.max(0,dt-(1.5-s.rest));
  const value=Math.min(1,s.value+recovery/9);
  return {value,rest,exhausted:s.exhausted&&value<.25};
}
