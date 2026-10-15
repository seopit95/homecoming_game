import * as T from 'three';

export async function loadTexture(url:string,flipY=true){
  if(typeof createImageBitmap!=='function'){
    const texture=await new T.TextureLoader().loadAsync(url);texture.flipY=flipY;return texture;
  }
  // Orient during decoding, so each GPU upload can use the bitmap directly.
  // Facility UVs are already authored for unflipped source images.
  const bitmap=await new T.ImageBitmapLoader().setOptions({imageOrientation:flipY?'flipY':'none',premultiplyAlpha:'none',colorSpaceConversion:'none'}).loadAsync(url);
  const texture=new T.Texture(bitmap);texture.flipY=false;texture.needsUpdate=true;return texture;
}
