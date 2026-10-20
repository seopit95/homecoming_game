export type SearchStep={point:'front'|'cross'|'away';pause:number;voice?:'here'};
// Choose once per search, never every frame. Avoid repeating the last route.
export function shelterSearchPlan(previous=-1,random:()=>number=Math.random){
 const choices=[0,1,2].filter(n=>n!==previous),kind=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
 const wait=2.5+random()*1.7,linger=1.6+random()*1.4;
 const cross:SearchStep={point:'cross',pause:0},away:SearchStep={point:'away',pause:0};
 const steps:SearchStep[]=kind===0?[cross,away]:kind===1?[{point:'front',pause:linger},cross,away]:[cross,{point:'away',pause:.8+random()*.8},{point:'front',pause:linger,voice:'here'},cross,away];
 return {kind,wait,steps};
}
