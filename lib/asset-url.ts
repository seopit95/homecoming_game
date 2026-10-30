const buildBase=(import.meta as ImportMeta&{env?:{BASE_URL?:string}}).env?.BASE_URL??'/';

// itch.io mounts each ZIP in an unknown CDN subdirectory. Sites keeps base '/'.
export function assetUrl(url:string,base=buildBase){
 return url.startsWith('/')&&!url.startsWith('//')?base+url.slice(1):url;
}
