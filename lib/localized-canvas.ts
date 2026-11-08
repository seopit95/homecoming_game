import {translate,type Language} from './i18n.ts';
import type {Texture} from 'three';
let language:Language='en';
type Command={method:string;args:unknown[]}|{property:string;value:unknown};
type RecordState={context:CanvasRenderingContext2D;background:HTMLCanvasElement|null;commands:Command[];state:Record<string,unknown>;transform:DOMMatrix|null};
const records=new Set<WeakRef<RecordState>>(),textures=new Set<WeakRef<Texture>>();
const contexts=new WeakMap<CanvasRenderingContext2D,CanvasRenderingContext2D>();
const properties=['font','fillStyle','strokeStyle','textAlign','textBaseline','direction','globalAlpha','globalCompositeOperation','lineWidth','lineCap','lineJoin','shadowColor','shadowBlur','shadowOffsetX','shadowOffsetY','filter','imageSmoothingEnabled'] as const;
function text(context:CanvasRenderingContext2D,args:unknown[]){
 const [source,x,y,maxWidth]=args as [string,number,number,number?];
 const translated=translate(String(source),language);
 const available=context.textAlign==='center'?Math.max(1,Math.min(x,context.canvas.width-x)*1.92):context.textAlign==='right'||context.textAlign==='end'?Math.max(1,x-4):Math.max(1,context.canvas.width-x-4);
 context.fillText(translated,x,y,maxWidth??available);
}
/** Records only the small text-overlay portion of procedural signs, never the WebGL canvas. */
export function localizedContext(canvas:HTMLCanvasElement|null|undefined):CanvasRenderingContext2D|null{
 if(!canvas)return null;const context=canvas.getContext('2d');if(!context)return null;
 // Lightweight scene-test devices have no drawable backing canvas.
 if(!context.canvas||typeof context.drawImage!=='function')return context;
 const existing=contexts.get(context);if(existing)return existing;
 const record:RecordState={context,background:null,commands:[],state:{},transform:null};records.add(new WeakRef(record));
 function reset(){record.background=null;record.commands=[];record.state={};}
 function capture(){
  if(record.background)return;
  const background=document.createElement('canvas');background.width=canvas!.width;background.height=canvas!.height;
  background.getContext('2d')?.drawImage(canvas!,0,0);record.background=background;
  for(const property of properties)record.state[property]=context![property];
  record.transform=typeof context!.getTransform==='function'?context!.getTransform():null;
 }
 const proxy=new Proxy(context,{
  get(target,property){
   const value=Reflect.get(target,property,target);if(typeof value!=='function')return value;
   return (...args:unknown[])=>{
    const name=String(property);
    if((name==='clearRect'||name==='fillRect')&&args[0]===0&&args[1]===0&&Number(args[2])>=canvas.width&&Number(args[3])>=canvas.height)reset();
    if(name==='fillText'){capture();record.commands.push({method:name,args});text(target,args);return;}
    const result=value.apply(target,args);
    if(record.background&&!['measureText','getImageData','getTransform','isPointInPath','isPointInStroke','createLinearGradient','createRadialGradient','createPattern'].includes(name))record.commands.push({method:name,args});
    return result;
   };
  },
  set(target,property,value){Reflect.set(target,property,value,target);if(record.background)record.commands.push({property:String(property),value});return true;}
 });contexts.set(context,proxy);return proxy;
}
export function localizedTexture<T extends Texture>(texture:T):T{textures.add(new WeakRef(texture));return texture;}
export function setCanvasLanguage(next:Language){
 if(next===language)return;language=next;
 for(const reference of records){const record=reference.deref();if(!record){records.delete(reference);continue;}if(!record.background)continue;
  const context=record.context;context.save();context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='copy';context.drawImage(record.background,0,0);
  for(const [property,value] of Object.entries(record.state))Reflect.set(context,property,value,context);if(record.transform)context.setTransform(record.transform);
  for(const command of record.commands)if('property'in command)Reflect.set(context,command.property,command.value,context);else if(command.method==='fillText')text(context,command.args);else{const method=Reflect.get(context,command.method,context);if(typeof method==='function')method.apply(context,command.args);}
  context.restore();
 }
 for(const reference of textures){const texture=reference.deref();if(!texture)textures.delete(reference);else texture.needsUpdate=true;}
}
