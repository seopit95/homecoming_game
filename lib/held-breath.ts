export type HeldBreath={air:number;holding:boolean;locked:boolean;gasp:number};
export const freshHeldBreath=():HeldBreath=>({air:1,holding:false,locked:false,gasp:0});
export function stepHeldBreath(s:HeldBreath,dt:number,requested:boolean,hidden:boolean):HeldBreath{
  if(dt<=0)return s;
  const holding=hidden&&requested&&!s.locked&&s.air>0;
  const air=Math.max(0,Math.min(1,s.air+dt*(holding?-1/12:.18))),ranOut=holding&&air===0;
  const gasp=ranOut?2.2:Math.max(0,s.gasp-dt),locked=ranOut||s.locked&&(air<.45||gasp>0);
  return {air,holding:holding&&!ranOut,locked,gasp};
}
export function playerBreathLevel(s:HeldBreath,effort:number,hidden:boolean){
  return s.holding?0:Math.max(effort,hidden?.16:0,s.gasp>0?.8:0);
}
export function stepBreathNotice(current:number,dt:number,distance:number,level:number,clear:boolean){
  if(dt<=0)return current;
  return clear&&level>0&&distance<1.4+3.2*level?Math.min(1,current+dt*(.7+level*.8)):Math.max(0,current-dt*1.5);
}
