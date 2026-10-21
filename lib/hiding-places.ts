import type * as T from 'three';
import type {Target} from './world.ts';

// Legacy local concealment state has no world placements. The story wardrobe
// uses story.hidden; no outdoor cabinets are constructed.
export type HidingPlace={root:T.Group;target:Target;eye:T.Vector3;exit:T.Vector3;approach:T.Vector3;pass:T.Vector3;sweep:T.Vector3[];yaw:number;doorOpen:number;setOpen:(value:number)=>void};
