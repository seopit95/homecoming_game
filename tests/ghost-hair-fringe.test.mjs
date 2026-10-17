import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import hair from '../lib/assets/ghost-hair.json' with {type:'json'};

// Restoring the old forehead-length root layers must fail this face-framing check.
test('wet fringe breaks the straight forehead silhouette while leaving one eye and the mouth readable',()=>{
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(hair.position,3));g.setIndex(hair.index);
 const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld(true);const ray=new T.Raycaster();
 const covered=(x,y)=>{ray.set(new T.Vector3(x,y,1),new T.Vector3(0,0,-1));return ray.intersectObject(mesh).some(h=>h.point.z>.14);};
 const left=[-.10,-.08,-.06,-.04].flatMap(x=>[.10,.13,.16,.19].map(y=>covered(x,y)));
 const right=[.04,.06,.08].flatMap(x=>[.12,.14,.16].map(y=>!covered(x,y)));
 assert.ok(left.filter(Boolean).length>=8,'long damp clumps must cross the left brow/eye/cheek instead of ending above the forehead');
 assert.ok(right.filter(Boolean).length>=5,'one eye must remain visible through the asymmetrical fringe');
 for(const y of [.005,.025,.045])assert.equal(covered(0,y),false,'do not hide the central jaw-opening silhouette');
 g.dispose();mesh.material.dispose();
});

test('face-framing clumps do not fold sharply when a cheek ray leaves the side of the face',()=>{
 const start=hair.position.length/3-17*41*3;
 for(let lock=0;lock<17;lock++)for(let row=11;row<40;row++){
  const i=start+lock*41*3+row*3+1,j=i+3;
  assert.ok(Math.abs(hair.position[i*3+2]-hair.position[j*3+2])<.036,`abrupt depth fold at curtain ${lock}, row ${row}`);
 }
});
