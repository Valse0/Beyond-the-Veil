import type { EnemyDefinition } from '../../core/types/content.js';

export interface EnemyActorState {
  x:number; y:number; health:number; nextAttackAt:number; stateUntil:number;
  facingX:number; facingY:number; exposedUntil:number; burrowed:boolean;
}
export interface EnemyIntent {
  velocityX:number; velocityY:number;
  attack?:{id:string;kind:string;damage:number;telegraphMs:number;targetX:number;targetY:number};
  state:EnemyActorState; speedMultiplier:number;
}
const unit=(x:number,y:number)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};

/** Deterministic, engine-independent decision step for every catalogued enemy archetype. */
export function stepEnemyAI(def:EnemyDefinition,actor:EnemyActorState,target:{x:number;y:number},now:number,_deltaMs:number):EnemyIntent {
 const dx=target.x-actor.x,dy=target.y-actor.y,distance=Math.hypot(dx,dy)||1,dir=unit(dx,dy);
 const next={...actor};let vx=0,vy=0,speed=1;
 switch(def.behavior){
  case 'orbit':{const t={x:-dir.y,y:dir.x};vx=dir.x*.62+t.x*.78;vy=dir.y*.62+t.y*.78;break;}
  case 'flank':{const side=Math.floor(now/1800)%2===0?1:-1;vx=dir.x*.45-dir.y*.9*side;vy=dir.y*.45+dir.x*.9*side;break;}
  case 'poison-volley':case 'soul-snipe':case 'artillery':case 'hex-caster':
   if(distance<220){vx=-dir.x*.8;vy=-dir.y*.8;}else if(distance>340){vx=dir.x*.45;vy=dir.y*.45;}break;
  case 'nest-summon':case 'support-heal':case 'rune-sapper':
   if(distance<260){vx=-dir.x*.35;vy=-dir.y*.35;}break;
  case 'shield-advance':case 'rune-guardian':{const t={x:-dir.y,y:dir.x};vx=dir.x*.8+t.x*.12;vy=dir.y*.8+t.y*.12;break;}
  case 'surge':
   if(now%2600<520){speed=2.15;next.facingX=dir.x;next.facingY=dir.y;}else{vx=dir.x*.25;vy=dir.y*.25;}
   if(speed>1){vx=next.facingX;vy=next.facingY;}break;
  case 'leap':
   if(now>=actor.stateUntil){next.stateUntil=now+2600;next.facingX=dir.x;next.facingY=dir.y;}
   if(now>next.stateUntil-450){speed=2.6;vx=next.facingX;vy=next.facingY;}else{vx=dir.x*.25;vy=dir.y*.25;}break;
  case 'burrow':
   if(!actor.burrowed&&now>=actor.stateUntil){next.burrowed=true;next.stateUntil=now+1250;}
   else if(actor.burrowed&&now>=actor.stateUntil){next.burrowed=false;next.exposedUntil=now+900;next.stateUntil=now+2600;}
   if(next.burrowed){speed=1.35;vx=dir.x;vy=dir.y;}else{vx=dir.x*.8;vy=dir.y*.8;}break;
  case 'ambush':
   if(distance>190&&now>=actor.stateUntil){next.burrowed=true;next.stateUntil=now+1500;}
   if(next.burrowed&&now<next.stateUntil){speed=0;}else{next.burrowed=false;speed=1.7;vx=dir.x;vy=dir.y;}break;
  case 'blood-drain':case 'web-control':case 'soul-anchor':
   if(distance<150){vx=-dir.x*.5;vy=-dir.y*.5;}else if(distance>250){vx=dir.x*.5;vy=dir.y*.5;}break;
  case 'phase-stalk':if(now%3200<550){speed=2.2;vx=dir.x;vy=dir.y;}else{vx=dir.x*.7;vy=dir.y*.7;}break;
  case 'frost-hunt':speed=distance>260?1.35:1;vx=dir.x;vy=dir.y;break;
  case 'mimic':speed=distance<260?1.65:.65;vx=dir.x;vy=dir.y;break;
  case 'volatile-bomber':speed=distance<190?1.8:1.1;vx=dir.x;vy=dir.y;break;
  case 'duelist':if(distance<125){vx=-dir.y*.9;vy=dir.x*.9;}else{vx=dir.x;vy=dir.y;}break;
  case 'wraith':speed=actor.health<def.health*.5?1.55:1;vx=dir.x;vy=dir.y;break;
  case 'swarm':speed=1.35;vx=dir.x;vy=dir.y;break;
  default:vx=dir.x;vy=dir.y;
 }
 const norm=unit(vx,vy),canAttack=distance<=def.attack.range&&now>=actor.nextAttackAt&&!next.burrowed;
 let attack:EnemyIntent['attack'];
 if(canAttack){attack={id:def.attack.id,kind:def.attack.kind,damage:def.attack.damage,telegraphMs:def.attack.telegraph.warningMs,targetX:target.x,targetY:target.y};next.nextAttackAt=now+def.attack.cooldownMs;}
 return{velocityX:norm.x*def.speed*speed,velocityY:norm.y*def.speed*speed,attack,state:next,speedMultiplier:speed};
}