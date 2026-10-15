import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// Offset the receiver by 5 mm in world space; negative depth bias imprints
// the shadow-map grid onto curved skin and shallow-lit plaster.
export function configureShadow(light:T.SpotLight){
 light.castShadow=true;light.shadow.bias=0;light.shadow.normalBias=.005;
}

// A low energy room reflection gives metal and wet surfaces a readable shape in the dark.
export function roomReflections(renderer:T.WebGLRenderer,scene:T.Scene){
 const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),target=pmrem.fromScene(room,.04,.1,100);room.dispose();pmrem.dispose();scene.environment=target.texture;scene.environmentIntensity=.1;return target;
}
