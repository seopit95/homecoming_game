// Distance drives both foot contact and the view, including blocked movement.
export function createPlayerGait(){
 return {phase:0,amount:0,y:0,pitch:0,roll:0,
  reset(){this.phase=this.amount=this.y=this.pitch=this.roll=0;},
  step(distance:number,dt:number,running:boolean,crouched:boolean,enabled:boolean){
   const before=Math.floor(this.phase/Math.PI),stride=crouched?.68:running?1.1:.92;
   this.phase+=Math.max(0,distance)/stride*Math.PI;
   const target=distance>.0001?(crouched?.42:running?1.9:1):0;
   this.amount=enabled?target+(this.amount-target)*Math.exp(-dt*(target?9:12)):0;
   this.y=-Math.cos(this.phase*2)*.022*this.amount;
   this.pitch=Math.sin(this.phase*2)*.003*this.amount;
   this.roll=Math.sin(this.phase)*.004*this.amount;
   return Math.floor(this.phase/Math.PI)!==before;
  }
 };
}
