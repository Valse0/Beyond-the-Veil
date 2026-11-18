import type { EnemyDefinition } from '../../core/types/content.js';

export interface EnemyActorState {
  x:number; y:number; health:number; nextAttackAt:number; stateUntil:number;
  facingX:number; facingY:number; exposedUntil:number; burrowed:boolean;
  nextSpecialAt?:number; attackCount?:number;
}
export interface EnemySpecialIntent {
  kind:'summon'|'heal'|'trap'|'hex'|'web'|'frost-trail'|'parry'|'spore-cloud'|'pounce';
  targetX:number; targetY:number; radius:number; durationMs:number; amount:number; count:number;
}
export interface EnemyIntent {
  velocityX:number; velocityY:number;
  attack?:{id:string;kind:string;damage:number;telegraphMs:number;targetX:number;targetY:number};
  special?:EnemySpecialIntent;
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
  case 'phase-stalk':if(now%3200<550){speed=2.2;vx=dir.x;vy=dir.y;next.burrowed=true;}else{vx=dir.x*.7;vy=dir.y*.7;next.burrowed=false;}break;
  case 'frost-hunt':speed=distance>260?1.35:1;vx=dir.x;vy=dir.y;break;
  case 'mimic':speed=distance<260?1.65:.65;vx=dir.x;vy=dir.y;next.burrowed=actor.exposedUntil<=now&&distance>190;break;
  case 'volatile-bomber':speed=distance<190?1.8:1.1;vx=dir.x;vy=dir.y;break;
  case 'duelist':if(distance<125){vx=-dir.y*.9;vy=dir.x*.9;}else{vx=dir.x;vy=dir.y;}break;
  case 'wraith':speed=actor.health<def.health*.5?1.55:1;vx=dir.x;vy=dir.y;break;
  case 'swarm':speed=1.35;vx=dir.x;vy=dir.y;break;
  default:vx=dir.x;vy=dir.y;
 }
 const norm=unit(vx,vy);next.facingX=dir.x;next.facingY=dir.y;
 const canAttack=distance<=def.attack.range&&now>=actor.nextAttackAt&&!next.burrowed;
 let attack:EnemyIntent['attack'];
 if(canAttack){attack={id:def.attack.id,kind:def.attack.kind,damage:def.attack.damage,telegraphMs:def.attack.telegraph.warningMs,targetX:target.x,targetY:target.y};next.nextAttackAt=now+def.attack.cooldownMs;next.attackCount=(actor.attackCount??0)+1;}
 let special:EnemyIntent['special'];
 if(now>=(actor.nextSpecialAt??0)){
  const common={targetX:target.x,targetY:target.y};
  switch(def.behavior){
   case 'nest-summon':special={...common,kind:'summon',radius:180,durationMs:0,amount:1,count:2};next.nextSpecialAt=now+8500;break;
   case 'support-heal':special={...common,kind:'heal',radius:210,durationMs:0,amount:.12,count:0};next.nextSpecialAt=now+4200;break;
   case 'rune-sapper':special={...common,kind:'trap',radius:58,durationMs:2200,amount:def.attack.damage*1.35,count:1};next.nextSpecialAt=now+6200;break;
   case 'hex-caster':special={...common,kind:'hex',radius:145,durationMs:4200,amount:.15,count:0};next.nextSpecialAt=now+6800;break;
   case 'web-control':special={...common,kind:'web',radius:155,durationMs:2600,amount:.5,count:0};next.nextSpecialAt=now+6100;break;
   case 'frost-hunt':special={...common,kind:'frost-trail',radius:34,durationMs:4200,amount:.45,count:0};next.nextSpecialAt=now+1700;break;
   case 'duelist':special={...common,kind:'parry',radius:0,durationMs:850,amount:.65,count:0};next.nextSpecialAt=now+4300;break;
   case 'flank':special={...common,kind:'pounce',radius:0,durationMs:520,amount:def.attack.damage*1.25,count:1};next.nextSpecialAt=now+5600;break;
   case 'poison-volley':special={...common,kind:'spore-cloud',radius:92,durationMs:3600,amount:5,count:0};next.nextSpecialAt=now+5900;break;
  }
 }
 return{velocityX:norm.x*def.speed*speed,velocityY:norm.y*def.speed*speed,attack,special,state:next,speedMultiplier:speed};
}