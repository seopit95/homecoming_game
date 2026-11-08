// Static, decorative SVG icons keep the game's controls independent of context providers.
function icon(path:string){return function Icon({size=18}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path}/></svg>;};}
export const ArrowRight=icon('M4 12h16m-6-6 6 6-6 6');
export const Headphones=icon('M4 15v-3a8 8 0 0 1 16 0v3M4 13H2v7h5v-7H4m16 0h2v7h-5v-7h3');
export const Pause=icon('M8 5v14M16 5v14');
export const Play=icon('m8 4 12 8-12 8Z');
export const RotateCcw=icon('M3 10a9 9 0 1 1 1 7M3 4v6h6');
export const SlidersHorizontal=icon('M3 6h6m4 0h8M9 3v6M3 12h12m4 0h2m-6-3v6M3 18h3m4 0h11M6 15v6');
export const Volume2=icon('M3 9h4l5-5v16l-5-5H3Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16');
export const Expand=icon('M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5');
export const Flashlight=icon('M7 3h10v5l-3 4v9h-4v-9L7 8Zm0 5h10m-7 7h4');
