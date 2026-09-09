import type {Game} from './game';
type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown};
export function registerGameTools(game:Game){
  const context=(document as Document & {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
  if(!context?.registerTool)return ()=>{};
  const lifecycle=new AbortController();
  for(const tool of [
    {name:'read_game_status',description:'Read the current room, objective, pause state and ending without revealing future events.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>game.snapshot()},
    {name:'pause_game',description:'Pause the active horror game, its danger timer and audio. Does not restart or advance the story.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object');game.pause(true);return {paused:game.snapshot().paused};}},
  ]){try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser API; the game works without it. */}}
  return ()=>lifecycle.abort();
}
