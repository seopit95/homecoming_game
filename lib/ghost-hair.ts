import * as T from 'three';
import {surface} from './materials.ts';
import authored from './assets/ghost-hair.json' with {type:'json'};

export function createHair(head:T.Group){
  const hair=new T.Group();hair.name='ghost-scalp-hair';head.add(hair);
  const tails=new T.Group();tails.name='ghost-long-hair';head.add(tails);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(authored.position,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(authored.uv,2));geometry.setIndex(authored.index);
  const material=surface('hair','#626d72',{roughness:.65,bumpScale:.00025,alphaTest:.32,alphaToCoverage:true,side:T.DoubleSide});
  const mesh=new T.Mesh(geometry,material);mesh.name='ghost-authored-long-hair';
  mesh.userData.rest=new Float32Array(authored.position);mesh.userData.anchors=new Float32Array(authored.anchor);mesh.userData.skinDelta=new Float32Array(authored.skinDelta);
  mesh.userData.face=head.getObjectByName('ghost-continuous-face');
  mesh.castShadow=mesh.receiveShadow=true;tails.add(mesh);return {hair,tails};
}
export function settleHair(tails:T.Group,figure:T.Group,time:number,floor:number,heightAt?:(x:number,z:number)=>number){
  tails.updateWorldMatrix(true,false);
  const world=tails.matrixWorld,inverse=world.clone().invert(),bodyInverse=figure.matrixWorld.clone().invert(),mesh=tails.children[0] as T.Mesh,p=mesh.geometry.getAttribute('position');
  const rest=mesh.userData.rest as Float32Array,anchors=mesh.userData.anchors as Float32Array,delta=mesh.userData.skinDelta as Float32Array,lengthScale=tails.scale.y,open=mesh.userData.face?.userData.openness??0;
  const point=new T.Vector3(),anchor=new T.Vector3(),up=new T.Vector3(0,1,0).transformDirection(world);
  const gravity=new T.Quaternion().setFromUnitVectors(up,new T.Vector3(0,1,0)),bend=new T.Quaternion(),identity=new T.Quaternion();
  for(let i=0;i<p.count;i++){
    const weight=T.MathUtils.smoothstep(-.16-rest[i*3+1],0,.45),phase=rest[i*3]*11+rest[i*3+2]*8;
    point.fromArray(rest,i*3);anchor.fromArray(anchors,i*3);
    point.x+=delta[i*3]*open;point.y+=delta[i*3+1]*open;point.z+=delta[i*3+2]*open;
    // The passenger rig shortens only loose lengths. Compensate its group
    // scale at the roots so the complete authored scalp remains on the skull.
    point.y=(anchor.y+(point.y-anchor.y)*(1-weight*(1-lengthScale)))/lengthScale;anchor.y/=lengthScale;
    point.applyMatrix4(world);anchor.applyMatrix4(world);
    // Keep the complete skull/temple fit rigid; wet lengths bend below the
    // jaw around their own guide, so a tilted head cannot pull hair into itself.
    bend.copy(identity).slerp(gravity,weight);point.sub(anchor).applyQuaternion(bend).add(anchor);
    point.x+=Math.sin(time*.85+phase)*.003*weight;point.z+=Math.sin(time*.7+phase)*.002*weight;
    if(heightAt){
      const support=heightAt(figure.position.x,point.z)+.09;
      if(point.y<support){const drag=support-point.y;point.z-=drag*.25;point.y=Math.max(support,heightAt(figure.position.x,point.z)+.09)+.001;}
    }else{
      point.applyMatrix4(bodyInverse);
      // Seated hair drapes in front of the inclined backrest, then onto the
      // lap. Work in the figure frame so a transformed/rolling car stays valid.
      if(lengthScale<1&&point.y<1.22)point.z=Math.max(point.z,.036-.15*Math.max(.6,point.y));
      if(point.y<floor){point.z-=(floor-point.y)*.25;point.y=floor+.001;}
      point.applyMatrix4(figure.matrixWorld);
    }
    point.applyMatrix4(inverse);p.setXYZ(i,point.x,point.y,point.z);
  }
  p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
}
