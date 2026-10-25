import type{Area,Stage}from'./story.ts';

export function escapeMood(area:Area,stage:Stage){return ['stairs','transfer','annex','archive','plant','parking'].includes(area)||area==='lift'&&stage.startsWith('transfer_');}

// Local fixtures sag twice in a long cycle. Adjacent tubes remain readable;
// the exit's cold pool never flickers, and reduced-motion lighting is steady.
export function escapeLamp(time:number,seed:number,reduced:boolean,exitCue=false){
 if(exitCue)return .4;
 const base=seed%3===0?.29:seed%3===1?.18:.075;if(reduced)return Math.max(.14,base);
 const phase=((time+seed*2.73)%19+19)%19;
 const dip=Math.max(0,1-Math.abs(phase-1.1)/.34)+Math.max(0,1-Math.abs(phase-2.05)/.28);
 return base*(1-.92*dip)*(.93+.07*Math.sin(time*1.8+seed));
}

const times=[1.15,6.4,14.8,25.2,39.5,57];
export function escapeCue(area:Area,index:number){
 if(!['stairs','transfer','lift','annex','archive','plant','parking'].includes(area)||index>=times.length)return null;
 const quiet=area==='annex'||area==='archive',kind=index%3===0?'ballast':index%3===2?'wet-drop':'pipe-groan';
 return {at:times[index]+(quiet?3:0),kind:kind as'ballast'|'pipe-groan'|'wet-drop',level:(quiet?.48:.82)*(index%3===2?.75:1)};
}
