import * as T from 'three';
import {assetUrl} from './asset-url.ts';
import runtimeTextures from './runtime-textures.json' with {type:'json'};

export async function loadTexture(url:string,flipY=true){
  const compact=runtimeTextures[url as keyof typeof runtimeTextures];
  if(compact){try{return await readTexture(assetUrl(compact),flipY);}catch{/* The retained source also recovers old or interrupted deployments. */}}
  return readTexture(assetUrl(url),flipY);
}
async function readTexture(url:string,flipY:boolean){
  if(typeof createImageBitmap!=='function'){
    const texture=await new T.TextureLoader().loadAsync(url);texture.flipY=flipY;return texture;
  }
  const read=async(cache?:RequestCache)=>{
    const response=await fetch(url,cache?{cache}:undefined);
    if(!response.ok)throw new Error(`Image request failed: HTTP ${response.status}`);
    return response.blob();
  };
  let blob:Blob;
  try{blob=await read();}catch(error){
    // Retry a failed transfer once with a fresh response; decode failures remain visible.
    if(!(error instanceof TypeError))throw error;
    blob=await read('reload');
  }
  // Orient during decoding, so each GPU upload can use the bitmap directly.
  // Facility UVs are already authored for unflipped source images.
  const bitmap=await createImageBitmap(blob,{imageOrientation:flipY?'flipY':'none',premultiplyAlpha:'none',colorSpaceConversion:'none'});
  const texture=new T.Texture(bitmap);texture.flipY=false;texture.needsUpdate=true;return texture;
}
