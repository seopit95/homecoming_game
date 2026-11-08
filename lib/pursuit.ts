import type {Area} from './story.ts';

// Ordinary pursuit beats walking; the announced surge also beats sprinting.
// Corners, occlusion, distractions and the physical stroke budget still apply.
export function pursuitPace(area:Area,base:number,seconds:number,distance:number){
 const rank:Partial<Record<Area,number>>={apartment:0,landing:1,corridor:2,transfer:2,stairs:2,resident:3,office:4,annex:5,courtyard:6,archive:7,plant:8,parking:9};
 const phase=Math.max(0,seconds)%8.5,burst=phase>=.8&&phase<2.2&&distance>1.8;
 // The 44–46 m galleries need one stamina tank plus time to use the lift.
 // Cap scripted bases too: otherwise the alarm's old 4.4 m/s overrides the
 // escape margin. ghostStep applies .85, so ordinary motion still beats the
 // 2 m/s walk. A 15% route increase keeps pressure on the longer stamina
 // tank without shortening entry grace or changing domestic search beats.
 const routePace:Partial<Record<Area,number>>={landing:2.8,corridor:2.8,transfer:2.8,stairs:2.85,archive:2.85,plant:2.85,parking:base>3?3.15:3};
 const ordinary=routePace[area];
 if(ordinary!==undefined)return {speed:(burst?4.25:ordinary)*1.15,burst};
 return {speed:Math.max(base,2.85+(rank[area]??0)*.14)+(['apartment','resident'].includes(area)?.17:0)+(burst?.9:0),burst};
}
