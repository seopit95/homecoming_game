import type {Area} from './story.ts';

// Ordinary pursuit beats walking; the announced surge also beats sprinting.
// Corners, occlusion, distractions and the physical stroke budget still apply.
export function pursuitPace(area:Area,base:number,seconds:number,distance:number){
 const rank:Partial<Record<Area,number>>={apartment:0,landing:1,corridor:2,stairs:2,resident:3,office:4,annex:5,courtyard:6,archive:7,plant:8,parking:9};
 const phase=Math.max(0,seconds)%8.5,burst=phase>=.8&&phase<2.2&&distance>1.8;
 // The straight first gallery has no way to break sight: leave time for a
 // depleted runner to recover, while stopping still lets the pursuer catch up.
 if(area==='archive'||area==='plant')return {speed:Math.max(base,2.45)+(burst?.45:0),burst};
 if(area==='landing')return {speed:3.40+(burst?.45:0),burst};
 return {speed:Math.max(base,2.8+(rank[area]??0)*.12)+(['apartment','resident'].includes(area)?.12:0)+(burst?.9:0),burst};
}
