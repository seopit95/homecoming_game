import {localizedContext,localizedTexture} from './localized-canvas.ts';
import * as T from 'three';
import {sharePrintedTexture} from './materials.ts';

// Original unbranded props. All motion is sampled from the same cutscene clock.
export function createDrivingBottles(car:T.Group,hands:T.Group){
  const green=new T.MeshStandardMaterial({color:'#216c37',roughness:.24,metalness:.08,emissive:'#12351b',emissiveIntensity:.15});
  const dark=new T.MeshStandardMaterial({color:'#07170a',roughness:.35});
  const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=localizedContext(c)!;
  ctx.fillStyle='#dbdeca';ctx.fillRect(0,0,256,128);ctx.fillStyle='#1d4a2b';ctx.font='bold 52px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('소주',128,66);
  const map=sharePrintedTexture(localizedTexture(new T.CanvasTexture(c)),['unbranded-soju-v1']);map.colorSpace=T.SRGBColorSpace;
  const label=new T.MeshStandardMaterial({map,roughness:.75,emissive:'#81846b',emissiveIntensity:.09});
  function bottle(name:string){
    const group=new T.Group();group.name=name;car.add(group);
    const shape=new T.LatheGeometry([[0,0],[.026,0],[.031,.008],[.031,.125],[.028,.143],[.013,.17],[.012,.211]].map(([x,y])=>new T.Vector2(x,y)),24);
    const glass=new T.Mesh(shape,green);glass.castShadow=glass.receiveShadow=true;group.add(glass);
    const paper=new T.Mesh(new T.CylinderGeometry(.0314,.0314,.056,24,1,true),label);paper.position.y=.086;group.add(paper);
    const lip=new T.Mesh(new T.TorusGeometry(.0105,.002,6,20),green);lip.rotation.x=Math.PI/2;lip.position.y=.211;group.add(lip);
    const mouth=new T.Mesh(new T.CircleGeometry(.0088,20),dark);mouth.name='soju-open-mouth';mouth.rotation.x=-Math.PI/2;mouth.position.y=.209;group.add(mouth);
    return group;
  }
  const loose=bottle('memory-soju-empty-2'),held=bottle('memory-held-soju');
  const original=hands.getObjectByName('memory-driver-hand-right')!.parent!;
  const drinking=original.clone();drinking.name='memory-drinking-hand';drinking.getObjectByName('memory-driver-hand-right')!.name='memory-drinking-palm';car.add(drinking);
  const up=new T.Vector3(0,1,0),axis=new T.Vector3(-.25,-.15,.957).normalize(),raised=new T.Quaternion().setFromUnitVectors(up,axis);
  const arm=new T.Quaternion().setFromEuler(new T.Euler(.15,0,Math.PI-.15));
  const rest=new T.Vector3(.35,.305,-.69),mouth=new T.Vector3(-.33,1.20,-.5),upright=new T.Quaternion().setFromUnitVectors(up,new T.Vector3(0,0,1));
  function pose(time:number,driving:boolean,reduced:boolean){
    const t=driving?time:20;
    const sip=(a:number,b:number)=>T.MathUtils.smoothstep(t,a,a+.55)*(1-T.MathUtils.smoothstep(t,b-.75,b));
    const lift=driving?Math.max(sip(.25,2.95),sip(12.3,15.15)):0;
    held.position.copy(rest).lerp(mouth,lift);held.quaternion.copy(upright).slerp(raised,lift);
    drinking.visible=lift>0;original.visible=!drinking.visible;
    drinking.position.copy(held.position).addScaledVector(up.clone().applyQuaternion(held.quaternion),.045);drinking.position.y-=.085;drinking.quaternion.copy(arm);
    loose.position.set(.54,.305,-.78);
    loose.quaternion.setFromUnitVectors(up,new T.Vector3(-.6,0,1).normalize());loose.rotateY(1.7+(reduced?0:Math.sin(t*2.3+1)*.045));
  }
  pose(0,true,true);return {pose};
}
