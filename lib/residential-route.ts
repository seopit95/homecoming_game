// One physical circulation plan for every residential storey.
export const residentialRoute={startFloor:24,refugeFloor:20,liftOffset:.95,climbSeconds:2.4,secondRideSeconds:20,gallery:{halfWidth:1.3,halfLength:23,spawnZ:20.5,homeZ:20.5,homeX:1.3,liftZ:-22.75,boardZ:-23.25,secondLiftX:2.2,stairZ:23,stairCrossZ:23.35}} as const;
export const transferStages=['transfer_gallery','transfer_wait','transfer_enter','transfer_boarding','transfer_panel','transfer_ride','transfer_exit'] as const;
export const isTransferStage=(stage:string)=>stage.startsWith('transfer_');
