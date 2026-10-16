import * as T from 'three';
import legs from './assets/ghost-legs.json' with {type:'json'};
import {createAnatomicalLimb} from './ghost-arms.ts';

export function createAnatomicalLeg(parent:T.Group,side:number,material:T.Material,foot:T.Mesh){
 return createAnatomicalLimb(parent,side<0?legs.r:legs.l,material,foot,.42,.84,true);
}
