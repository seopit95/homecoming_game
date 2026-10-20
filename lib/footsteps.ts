import type {Area} from './story.ts';
export type FootSurface='wood'|'tile'|'concrete'|'metal'|'wet';
export function playerFootSurface(area:Area,x:number,z:number,drained=false):FootSurface{
 if(area==='apartment'||area==='office')return 'wood';
 if(area==='resident')return z>5.95?'tile':'wood';
 if(area==='lift')return 'metal';
 if(area==='courtyard'||area==='aftermath'||area==='landing'&&x<-.9)return 'wet';
 if(area==='parking')return !drained&&Math.abs(x)<2.3&&Math.abs(z+19)<2.6?'wet':'concrete';
 if(area==='plant')return !drained&&Math.abs(x)<1.75&&Math.abs(z+20)<9.5?'wet':'concrete';
 if(area==='archive')return 'concrete';
 if(area==='corridor'&&Math.abs(x+2.6)<.3&&Math.abs(z+8)<1.2)return 'wet';
 return 'tile';
}
