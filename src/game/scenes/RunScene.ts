import Phaser from 'phaser';
import type { ElementId, RegionId, EnemyDefinition, BossDefinition, CharacterDefinition, WeaponDefinition } from '../../core/types/content.js';
import type { RunState, UpgradeId } from '../../core/types/game.js';
import { CHARACTERS, STARTING_CHARACTER } from '../../data/characters.js';
import { ENEMIES } from '../../data/enemies.js';
import { BOSSES } from '../../data/bosses.js';
import { WEAPONS } from '../../data/weapons.js';
import { PASSIVES } from '../../data/passives.js';
import { ELEMENTS } from '../../data/elements.js';
import { REGIONS } from '../../data/regions.js';
import { findNearestTarget } from '../../gameplay/combat/combat-rules.js';
import { advanceRun, applyUpgrade, createRunState, gainExperience, receiveDamage, recordKill } from '../../gameplay/run/run-model.js';
import { stepEnemyAI, type EnemyActorState } from '../../gameplay/enemies/enemy-runtime.js';
import { applyElementHit, tickElementStatuses, type ElementState } from '../../gameplay/elements/element-runtime.js';
import { addPassive, addWeapon, deriveBuildStats, EMPTY_BUILD, evolveWeapon, upgradePassive, upgradeWeapon, weaponLevelStats, type BuildState } from '../../gameplay/weapons/build-runtime.js';
import { createBossEncounter, damageBoss, getBossAttack, type BossEncounterState } from '../../gameplay/bosses/boss-runtime.js';
import { createHazardCycle, stepRegionHazard, type HazardCycle, type HazardEvent } from '../../gameplay/regions/region-runtime.js';
import { EMPTY_GAMEPAD_FRAME, resolveGamepadInput, type GamepadFrame, type GamepadActions } from '../input/gamepad-controls.js';

const RUN_MS = 900000;
const BOSS_START_MS = 840000;
const WORLD_W = 2400;
const WORLD_H = 1800;
const BASE_CHOICES: { id: UpgradeId; title: string; detail: string }[] = [
  { id: 'power', title: 'Keskin Ruh', detail: 'Temel hasar +6' },
  { id: 'haste', title: 'Hızlı Akış', detail: 'Temel saldırı aralığı azalır' },
  { id: 'vitality', title: 'Kara Yaşam', detail: 'Azami can +20' },
  { id: 'magnet', title: 'Ruh Mıknatısı', detail: 'XP çekim alanı +65' }
];
type LevelChoice = { id:string; title:string; detail:string; kind:'base'|'weapon-add'|'weapon-up'|'passive-add'|'passive-up'; contentId?:string };

const elementTint:Record<ElementId,number>={fire:0xff8652,ice:0x8fdcff,poison:0x9ac65d,dark:0x9b78c8,spirit:0x73d7c8,lightning:0xf4dc74,blood:0xc84c60};

export class RunScene extends Phaser.Scene {
  private state:RunState=createRunState();
  private character:CharacterDefinition=STARTING_CHARACTER;
  private region=REGIONS[0]!;
  private build:BuildState={weapons:[],passives:[]};
  private player!:Phaser.Physics.Arcade.Sprite;
  private enemies!:Phaser.Physics.Arcade.Group;
  private shots!:Phaser.Physics.Arcade.Group;
  private orbs!:Phaser.Physics.Arcade.Group;
  private keys!:Record<string,Phaser.Input.Keyboard.Key>;
  private cursors!:Phaser.Types.Input.Keyboard.CursorKeys;
  private previousGamepadFrame:GamepadFrame=EMPTY_GAMEPAD_FRAME;
  private gamepadMoveX=0;
  private gamepadMoveY=0;
  private overlayButtons:Phaser.GameObjects.Rectangle[]=[];
  private overlayActions:(()=>void)[]=[];
  private overlaySelectionIndex=0;
  private overlayBackIndex:number|null=null;
  private hud!:Phaser.GameObjects.Text;
  private clock!:Phaser.GameObjects.Text;
  private health!:Phaser.GameObjects.Rectangle;
  private bossHud?:Phaser.GameObjects.Text;
  private bossHealth?:Phaser.GameObjects.Rectangle;
  private joystick!:Phaser.GameObjects.Arc;
  private thumb!:Phaser.GameObjects.Arc;
  private touchStart?:Phaser.Math.Vector2;
  private overlay:Phaser.GameObjects.GameObject[]=[];
  private paused=false;
  private queuedLevels=0;
  private nextDamage=0;
  private dashReady=0;
  private dashUntil=0;
  private abilityReady=0;
  private lastHud=0;
  private lastSpawn=0;
  private weaponReady:Record<string,number>={};
  private bossDefinition?:BossDefinition;
  private bossState?:BossEncounterState;
  private bossSprite?:Phaser.Physics.Arcade.Sprite;
  private bossPhaseText?:Phaser.GameObjects.Text;
  private enemyStates=new WeakMap<Phaser.Physics.Arcade.Sprite,EnemyActorState>();
  private elementStates=new WeakMap<Phaser.Physics.Arcade.Sprite,ElementState>();
  private bossElementState:ElementState={};
  private hazardCycle:HazardCycle=createHazardCycle();
  private hazardMarker?:Phaser.GameObjects.Graphics;
  private hazardTarget={x:0,y:0};
  private activeHazardId='';
  private hazardHasHit=false;
  private hazardLabel?:Phaser.GameObjects.Text;
  private bossSpawned=false;
  private runFinished=false;
  private basePowerBonus=0;
  private baseMagnetBonus=0;
  private baseHasteMultiplier=1;
  private playerSlowUntil=0;
  private playerSlowMultiplier=1;
  private enemyZones:{x:number;y:number;radius:number;expiresAt:number;nextTickAt:number;damage:number;slow:number;marker:Phaser.GameObjects.Graphics}[]=[];

  constructor(){super('run');}

  init(data:{characterId?:string;regionId?:RegionId}):void {
    this.character=CHARACTERS.find(c=>c.id===data?.characterId)??STARTING_CHARACTER;
    this.region=REGIONS.find(r=>r.id===data?.regionId)??REGIONS[0]!;
  }

  create():void {
    this.time.paused=false;this.physics.world.resume();
    this.state={...createRunState(),health:this.character.health,maxHealth:this.character.health,moveSpeed:this.character.moveSpeed,damage:18*this.character.stats.damageMultiplier,attackIntervalMs:720};
    this.build=EMPTY_BUILD;
    const startingWeapon=WEAPONS.find(w=>w.id===this.character.startingWeaponId)??WEAPONS[0]!;
    const startingPassive=PASSIVES.find(p=>p.id===this.character.startingPassiveId)??PASSIVES[0]!;
    this.build=addWeapon(this.build,startingWeapon);this.build=addPassive(this.build,startingPassive);
    this.paused=false;this.queuedLevels=0;this.nextDamage=0;this.dashReady=0;this.dashUntil=0;this.abilityReady=0;
    this.previousGamepadFrame=EMPTY_GAMEPAD_FRAME;this.gamepadMoveX=0;this.gamepadMoveY=0;this.clearOverlay();
    this.lastSpawn=this.time.now;this.weaponReady={};this.bossDefinition=undefined;this.bossState=undefined;this.bossSprite=undefined;
    this.bossElementState={};this.enemyStates=new WeakMap();this.elementStates=new WeakMap();
    this.basePowerBonus=0;this.baseMagnetBonus=0;this.baseHasteMultiplier=1;this.playerSlowUntil=0;this.playerSlowMultiplier=1;this.enemyZones=[];
    this.hazardCycle=createHazardCycle(this.time.now);this.activeHazardId='';this.hazardHasHit=false;this.bossSpawned=false;this.runFinished=false;
    this.makeTextures();
    this.physics.world.setBounds(0,0,WORLD_W,WORLD_H);
    this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H).setBackgroundColor(this.region.palette[0]??'#15131a');
    const floor=this.add.graphics();floor.fillStyle(0x19171d,1);floor.fillRect(0,0,WORLD_W,WORLD_H);
    floor.lineStyle(1,0x3a3337,0.12);
    for(let i=0;i<28;i++){const x=Phaser.Math.Between(80,WORLD_W-80),y=Phaser.Math.Between(80,WORLD_H-80);floor.lineStyle(2,0x8a795d,0.08);floor.strokeCircle(x,y,Phaser.Math.Between(18,64));}
    floor.setDepth(-10);
    this.enemies=this.physics.add.group();this.shots=this.physics.add.group({maxSize:100});this.orbs=this.physics.add.group({maxSize:80});
    this.player=this.physics.add.sprite(WORLD_W/2,WORLD_H/2,'hunter').setCircle(12).setCollideWorldBounds(true).setDepth(3);
    this.cameras.main.startFollow(this.player,true,0.08,0.08);
    this.cursors=this.input.keyboard!.createCursorKeys();
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,SPACE,E,ESC,ENTER') as Record<string,Phaser.Input.Keyboard.Key>;
    this.physics.add.overlap(this.shots,this.enemies,(a,b)=>this.hitEnemy(a as Phaser.Physics.Arcade.Sprite,b as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player,this.enemies,(_p,e)=>this.contactDamage(e as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player,this.orbs,(_p,o)=>this.collectOrb(o as Phaser.Physics.Arcade.Sprite));
    this.createHud();this.createTouchControls();this.spawnEnemy();this.refreshBuildStats();
  }

  private makeTextures():void {
    const make=(key:string,color:number,r:number):void=>{
      if(this.textures.exists(key))return;
      const g=this.add.graphics();g.fillStyle(color,1);g.fillCircle(r+3,r+3,r);g.lineStyle(2,0xe8d7b6,.75);g.strokeCircle(r+3,r+3,r);
      g.generateTexture(key,(r+3)*2,(r+3)*2);g.destroy();
    };
    make('hunter',0xc2a36d,13);make('shot',0xe8c77a,5);make('orb',0x69b7a5,5);make('boss-'+this.region.bossId,0x8e4567,31);
    for(const enemy of ENEMIES)make('enemy-'+enemy.id,enemy.color,enemy.radius);
  }

  private createHud():void {
    const w=this.scale.width;
    this.hud=this.add.text(22,18,'',{fontFamily:'Arial',fontSize:'15px',color:'#eee5d6',lineSpacing:6}).setScrollFactor(0).setDepth(100);
    this.clock=this.add.text(w/2,18,'00:00',{fontFamily:'Georgia',fontSize:'23px',color:'#d4b777'}).setOrigin(.5,0).setScrollFactor(0).setDepth(100);
    this.add.rectangle(w-130,32,180,12,0x352d32).setScrollFactor(0).setDepth(100);
    this.health=this.add.rectangle(w-220,32,160,8,0xb95d62).setOrigin(0,.5).setScrollFactor(0).setDepth(101);
    const pause=this.add.text(w-34,68,'Ⅱ',{fontSize:'25px',color:'#d6c8b3'}).setOrigin(.5).setScrollFactor(0).setDepth(110).setInteractive();
    pause.on('pointerup',()=>this.openPause());
    this.bossHud=this.add.text(w/2,56,'',{fontSize:'13px',color:'#e7c9a1',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(110).setVisible(false);
    this.add.rectangle(w/2,82,300,8,0x352d32).setScrollFactor(0).setDepth(109).setVisible(false);
    this.bossHealth=this.add.rectangle(w/2-150,82,300,5,0xb94b5b).setOrigin(0,.5).setScrollFactor(0).setDepth(111).setVisible(false);
    this.bossPhaseText=this.add.text(w/2,96,'',{fontSize:'11px',color:'#c8b69d'}).setOrigin(.5,0).setScrollFactor(0).setDepth(110).setVisible(false);
    this.refreshHud();
  }

  private createTouchControls():void {
    const h=this.scale.height,w=this.scale.width;
    this.joystick=this.add.circle(88,h-90,47,0xd9c7a7,.12).setStrokeStyle(2,0xd9c7a7,.35).setScrollFactor(0).setDepth(105);
    this.thumb=this.add.circle(88,h-90,19,0xd9c7a7,.28).setScrollFactor(0).setDepth(106);
    const button=(x:number,label:string,color:number,fn:()=>void):void=>{
      const c=this.add.circle(x,h-86,34,color,.75).setStrokeStyle(2,0xe5d6ba,.6).setScrollFactor(0).setDepth(105).setInteractive();
      this.add.text(x,h-86,label,{fontSize:'12px',color:'#fff2df',fontStyle:'bold'}).setOrigin(.5).setScrollFactor(0).setDepth(106);c.on('pointerdown',fn);
    };
    button(w-130,'DASH',0x73534c,()=>this.tryDash());button(w-52,'E',0x586f69,()=>this.useAbility());
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.x<w*.48&&p.y>h*.48)this.touchStart=new Phaser.Math.Vector2(p.x,p.y);});
    this.input.on('pointerup',()=>{this.touchStart=undefined;this.thumb.setPosition(this.joystick.x,this.joystick.y);});
  }

  update(time:number,delta:number):void {
    const frame=this.readGamepadFrame();
    const gamepad=resolveGamepadInput(frame,this.previousGamepadFrame);
    this.previousGamepadFrame=frame;
    this.gamepadMoveX=gamepad.moveX;this.gamepadMoveY=gamepad.moveY;
    if(this.paused){this.handleOverlayInput(gamepad);return;}
    if(this.runFinished)return;
    if(gamepad.southPressed)this.tryDash();
    if(gamepad.westPressed)this.useAbility();
    if(gamepad.startPressed){this.openPause();return;}
    this.state=advanceRun(this.state,delta);
    this.move(time);if(this.paused)return;this.moveEnemies(time);this.updateEnemyZones(time);this.spawnDirector(time);this.fireWeapons(time);this.updateProjectiles(time);
    this.expireShots(time);this.magnetize();this.updateElementStatuses(time);this.updateRegionHazard(time);
    if(!this.bossSpawned&&this.state.elapsedMs>=BOSS_START_MS)this.spawnBoss();
    if(this.state.elapsedMs>=RUN_MS&&!this.bossState&&!this.bossSpawned)this.spawnBoss();
    if(time-this.lastHud>120){this.refreshHud();this.lastHud=time;}
  }

  private readGamepadFrame():GamepadFrame {
    const pad=this.input.gamepad?.getPad(0);
    if(!pad)return EMPTY_GAMEPAD_FRAME;
    return {
      axisX:pad.leftStick.x,axisY:pad.leftStick.y,
      dpadLeft:pad.left,dpadRight:pad.right,dpadUp:pad.up,dpadDown:pad.down,
      south:pad.A,west:pad.X,east:pad.B,start:pad.isButtonDown(9)
    };
  }

  private move(time:number):void {
    let x=(this.keys.D.isDown||this.cursors.right.isDown?1:0)-(this.keys.A.isDown||this.cursors.left.isDown?1:0);
    let y=(this.keys.S.isDown||this.cursors.down.isDown?1:0)-(this.keys.W.isDown||this.cursors.up.isDown?1:0);
    if(this.gamepadMoveX!==0||this.gamepadMoveY!==0){x=this.gamepadMoveX;y=this.gamepadMoveY;}
    if(this.touchStart&&this.input.activePointer.isDown){const p=this.input.activePointer,dx=p.x-this.touchStart.x,dy=p.y-this.touchStart.y,len=Math.max(1,Math.hypot(dx,dy));x=dx/len;y=dy/len;this.thumb.setPosition(this.joystick.x+Phaser.Math.Clamp(dx,-27,27),this.joystick.y+Phaser.Math.Clamp(dy,-27,27));}
    const dir=new Phaser.Math.Vector2(x,y);if(dir.length()>1)dir.normalize();
    if(Phaser.Input.Keyboard.JustDown(this.keys.SPACE))this.tryDash();
    if(Phaser.Input.Keyboard.JustDown(this.keys.E))this.useAbility();
    if(Phaser.Input.Keyboard.JustDown(this.keys.ESC))this.openPause();
    const stats=this.currentBuildStats();const speed=this.character.moveSpeed*stats.moveSpeedMultiplier*(time<this.playerSlowUntil?this.playerSlowMultiplier:1);
    if(time>=this.dashUntil)this.player.setVelocity(dir.x*speed,dir.y*speed);
    else if(dir.length()>0)this.player.setVelocity(dir.x*speed*2.6,dir.y*speed*2.6);
  }

  private tryDash():void {
    if(this.time.now<this.dashReady||this.paused)return;
    const velocity=(this.player.body as Phaser.Physics.Arcade.Body).velocity.clone();
    const dir=velocity.length()?velocity.normalize():new Phaser.Math.Vector2(1,0);
    this.dashUntil=this.time.now+190;this.dashReady=this.time.now+1150;
    this.player.setVelocity(dir.x*this.state.moveSpeed*2.8,dir.y*this.state.moveSpeed*2.8);this.cameras.main.shake(75,.0018);
  }

  private useAbility():void {
    if(this.time.now<this.abilityReady||this.paused)return;
    const stats=this.currentBuildStats();this.abilityReady=this.time.now+this.character.ability.cooldownMs*stats.abilityCooldownMultiplier;
    const element=this.character.elementSynergies[0];
    const targets=this.activeTargets();
    for(const enemy of targets){
      if(Phaser.Math.Distance.Between(this.player.x,this.player.y,enemy.x,enemy.y)>this.character.ability.range)continue;
      this.damageEnemy(enemy,this.state.damage*this.character.ability.damageMultiplier*stats.damageMultiplier*this.character.stats.damageMultiplier,element);
      const a=Phaser.Math.Angle.Between(this.player.x,this.player.y,enemy.x,enemy.y);
      enemy.setVelocity(Math.cos(a)*150,Math.sin(a)*150);
    }
    this.cameras.main.shake(110,.003);
  }

  private moveEnemies(time:number):void {
    for(const child of this.enemies.getChildren()){
      const enemy=child as Phaser.Physics.Arcade.Sprite;if(!enemy.active)continue;
      if(enemy.getData('isBoss')){this.moveBoss(enemy,time);continue;}
      const def=this.enemyDefinition(enemy);if(!def)continue;
      const old=this.enemyStates.get(enemy)??{x:enemy.x,y:enemy.y,health:Number(enemy.getData('health')),nextAttackAt:0,stateUntil:0,facingX:1,facingY:0,exposedUntil:0,burrowed:false};
      const state={...old,x:enemy.x,y:enemy.y,health:Number(enemy.getData('health'))};
      const intent=stepEnemyAI(def,state,{x:this.player.x,y:this.player.y},time,16);
      this.enemyStates.set(enemy,intent.state);
      if(intent.special)this.applyEnemySpecial(enemy,def,intent.special);
      if(def.behavior==='mimic'&&!intent.state.burrowed&&!enemy.getData('mimicRevealed')){enemy.setData('mimicRevealed',true);this.enemyStates.set(enemy,{...intent.state,burrowed:false,exposedUntil:Number.MAX_SAFE_INTEGER});enemy.clearTint();enemy.setAlpha(1);this.cameras.main.shake(70,.001);}
      if(def.behavior==='volatile-bomber'){
        const primed=Phaser.Math.Distance.Between(enemy.x,enemy.y,this.player.x,this.player.y)<175;
        if(Boolean(enemy.getData('primed'))!==primed){enemy.setData('primed',primed);enemy.setTint(primed?0xf2b34d:0xffffff);}
      }
      if(def.behavior==='surge'&&(enemy.x<def.radius+36||enemy.x>WORLD_W-def.radius-36||enemy.y<def.radius+36||enemy.y>WORLD_H-def.radius-36)&&intent.speedMultiplier>1){enemy.setVelocity(0,0);this.enemyStates.set(enemy,{...intent.state,exposedUntil:time+1250});}
      const status=this.elementStates.get(enemy)??{};
      const effects=tickElementStatuses(status,time);this.elementStates.set(enemy,effects.state);
      const slow=effects.slowed?.55:1;
      let vx=intent.velocityX*slow,vy=intent.velocityY*slow;
      if(Number(enemy.getData('pounceUntil')??0)>time){vx=Number(enemy.getData('pounceX'))*def.speed*3.1;vy=Number(enemy.getData('pounceY'))*def.speed*3.1;}
      if(def.behavior==='swarm'){
        const pack=this.activeTargets().filter(other=>other!==enemy&&this.enemyDefinition(other)?.behavior==='swarm'&&Phaser.Math.Distance.Between(enemy.x,enemy.y,other.x,other.y)<115).length;
        const packBoost=1+Math.min(.45,pack*.12);vx*=packBoost;vy*=packBoost;
      }
      enemy.setVelocity(effects.stunned?0:vx,effects.stunned?0:vy);
      if(effects.damage>0)this.damageEnemy(enemy,effects.damage);
      const concealed=intent.state.burrowed||Number(enemy.getData('untargetableUntil')??0)>time;
      enemy.setAlpha(concealed?.28:1);
      if(intent.attack&&intent.special?.kind!=='pounce'){
        const empowered=def.behavior==='ambush'&&(intent.state.attackCount??0)===1&&!enemy.getData('ambushSpent');
        if(empowered)enemy.setData('ambushSpent',true);
        const buffed=Number(enemy.getData('damageBuffUntil')??0)>time?Number(enemy.getData('damageBuff')??1):1;
        const damage=intent.attack.damage*(empowered?1.8:1)*buffed;
        if(def.behavior==='artillery'){
          const velocity=(this.player.body as Phaser.Physics.Arcade.Body).velocity;
          this.telegraphAttack(enemy,def,this.player.x+velocity.x*.7,this.player.y+velocity.y*.7,damage,intent.attack.telegraphMs,'circle',58);
        }else if(def.behavior==='wraith'){
          for(let strike=0;strike<3;strike++)this.time.delayedCall(strike*850,()=>{if(enemy.active)this.telegraphAttack(enemy,def,intent.attack!.targetX,intent.attack!.targetY,damage,Math.min(520,intent.attack!.telegraphMs),def.attack.telegraph.shape,46);});
          if((intent.state.attackCount??0)%3===0)this.enemyStates.set(enemy,{...intent.state,exposedUntil:time+1150});
        }else this.telegraphAttack(enemy,def,intent.attack.targetX,intent.attack.targetY,damage,intent.attack.telegraphMs,def.attack.telegraph.shape,46);
        if(def.behavior==='soul-snipe')enemy.setData('untargetableUntil',time+650);
      }
    }
  }

  private moveBoss(boss:Phaser.Physics.Arcade.Sprite,time:number):void {
    if(!this.bossDefinition||!this.bossState)return;
    const lightning=this.bossElementState.lightning;
    if((lightning?.stunnedUntil??0)>time){boss.setVelocity(0,0);return;}
    const dx=this.player.x-boss.x,dy=this.player.y-boss.y,dist=Math.hypot(dx,dy)||1;
    if(dist>145)boss.setVelocity(dx/dist*this.bossDefinition.health*.006,dy/dist*this.bossDefinition.health*.006);else boss.setVelocity(0,0);
    const phase=this.bossDefinition.phases[this.bossState.phaseIndex]!;
    const attack=getBossAttack(this.bossState,phase,time);this.bossState=attack.state;
    if(attack.attack)this.telegraphAttack(boss,undefined,this.player.x,this.player.y,attack.attack.damage,attack.attack.telegraph.warningMs,attack.attack.telegraph.shape,100);
  }

  private telegraphAttack(source:Phaser.Physics.Arcade.Sprite,def:EnemyDefinition|undefined,x:number,y:number,damage:number,warning:number,shape:string,radius:number):void {
    const marker=this.add.graphics().setDepth(8);
    const color=def?0xd5ad63:0xc95a65;
    const draw=():void=>{
      marker.clear();marker.lineStyle(3,color,.9);marker.fillStyle(color,.13);
      const angle=Phaser.Math.Angle.Between(source.x,source.y,x,y);
      if(shape==='line'){marker.lineBetween(source.x,source.y,x,y);marker.lineBetween(source.x+Math.cos(angle+Math.PI/2)*12,source.y+Math.sin(angle+Math.PI/2)*12,x+Math.cos(angle+Math.PI/2)*12,y+Math.sin(angle+Math.PI/2)*12);}
      else if(shape==='cross'){marker.lineBetween(x-radius,y,x+radius,y);marker.lineBetween(x,y-radius,x,y+radius);}
      else if(shape==='cone'){const left=angle-.48,right=angle+.48;marker.fillTriangle(source.x,source.y,source.x+Math.cos(left)*radius*2,source.y+Math.sin(left)*radius*2,source.x+Math.cos(right)*radius*2,source.y+Math.sin(right)*radius*2);}
      else if(shape==='ring'){marker.strokeCircle(x,y,radius);marker.strokeCircle(x,y,radius*.68);}
      else{marker.strokeCircle(x,y,radius);marker.fillCircle(x,y,radius);}
    };
    draw();
    this.time.delayedCall(Math.max(0,warning),()=>{
      if(!source.active||this.runFinished){marker.destroy();return;}
      marker.clear();marker.lineStyle(2,0xe65d63,.95);marker.fillStyle(0xe65d63,.22);
      if(shape==='line'){marker.lineBetween(source.x,source.y,x,y);}
      else if(shape==='cross'){marker.lineBetween(x-radius,y,x+radius,y);marker.lineBetween(x,y-radius,x,y+radius);}
      else if(shape==='cone'){const angle=Phaser.Math.Angle.Between(source.x,source.y,x,y);marker.fillTriangle(source.x,source.y,source.x+Math.cos(angle-.48)*radius*2,source.y+Math.sin(angle-.48)*radius*2,source.x+Math.cos(angle+.48)*radius*2,source.y+Math.sin(angle+.48)*radius*2);}
      else{marker.strokeCircle(x,y,radius);marker.fillCircle(x,y,radius);}
      if(this.isInsideTelegraph(shape,source,x,y,radius)){
        this.receiveCombatDamage(damage);
        if(def?.behavior==='blood-drain'&&source.active){const hp=Number(source.getData('health'))+damage*.35;source.setData('health',Math.min(Number(source.getData('maxHealth')),hp));}
        if(def?.behavior==='soul-snipe'&&source.active)source.setData('untargetableUntil',this.time.now+520);
      }
      this.time.delayedCall(180,()=>marker.destroy());
    });
  }

  private isInsideTelegraph(shape:string,source:Phaser.Physics.Arcade.Sprite,x:number,y:number,radius:number):boolean {
    const px=this.player.x,py=this.player.y;
    if(shape==='line'){
      const dx=x-source.x,dy=y-source.y,len2=dx*dx+dy*dy||1;
      const t=Phaser.Math.Clamp(((px-source.x)*dx+(py-source.y)*dy)/len2,0,1);
      return Phaser.Math.Distance.Between(px,py,source.x+t*dx,source.y+t*dy)<=22;
    }
    if(shape==='cone'){
      const angle=Phaser.Math.Angle.Between(source.x,source.y,x,y),toPlayer=Phaser.Math.Angle.Between(source.x,source.y,px,py);
      return Phaser.Math.Distance.Between(source.x,source.y,px,py)<=radius*2&&Math.abs(Phaser.Math.Angle.Wrap(toPlayer-angle))<=.48;
    }
    const distance=Phaser.Math.Distance.Between(px,py,x,y);
    if(shape==='ring')return distance<=radius+18&&distance>=radius*.68-18;
    if(shape==='cross')return distance<=radius&&(Math.abs(px-x)<=22||Math.abs(py-y)<=22);
    return distance<=radius+18;
  }

  private spawnDirector(time:number):void {
    if(time-this.lastSpawn<Math.max(420,1450-this.state.elapsedMs/850)||this.enemies.countActive(true)>=42)return;
    this.lastSpawn=time;this.spawnEnemy();
    if(this.state.elapsedMs>90000&&Math.random()<.25)this.spawnEnemy();
  }

  private spawnEnemy():void {
    const angle=Math.random()*Math.PI*2,distance=Phaser.Math.Between(390,570);
    const x=Phaser.Math.Clamp(this.player.x+Math.cos(angle)*distance,35,WORLD_W-35);
    const y=Phaser.Math.Clamp(this.player.y+Math.sin(angle)*distance,35,WORLD_H-35);
    const pool=this.region.enemyIds.map(id=>ENEMIES.find(e=>e.id===id)).filter((e):e is EnemyDefinition=>Boolean(e));
    if(!pool.length)return;
    const def=pool[Phaser.Math.Between(0,pool.length-1)]!;
    this.createEnemy(x,y,def,1+Math.min(2.5,this.state.elapsedMs/360000));
  }

  private createEnemy(x:number,y:number,def:EnemyDefinition,scale:number):void {
    const enemy=this.enemies.create(x,y,'enemy-'+def.id) as Phaser.Physics.Arcade.Sprite;
    enemy.setDepth(2).setCircle(def.radius).setData('enemyType',def.id).setData('health',Math.round(def.health*scale)).setData('maxHealth',Math.round(def.health*scale)).setData('experience',def.experience);
    if(def.behavior==='mimic'){enemy.setAlpha(.2).setTint(0xd5bd8b).setData('mimicRevealed',false);}
    this.enemyStates.set(enemy,{x,y,health:Math.round(def.health*scale),nextAttackAt:0,stateUntil:0,facingX:1,facingY:0,exposedUntil:0,burrowed:false,nextSpecialAt:this.time.now+1800,attackCount:0});
  }

  private spawnBoss():void {
    if(this.bossSpawned)return;
    this.bossSpawned=true;this.bossDefinition=BOSSES.find(b=>b.id===this.region.bossId);
    if(!this.bossDefinition)return;
    this.bossState=createBossEncounter(this.bossDefinition);
    const boss=this.enemies.create(this.player.x+330,this.player.y,'boss-'+this.bossDefinition.id) as Phaser.Physics.Arcade.Sprite;
    boss.setDepth(4).setCircle(32).setData('isBoss',true).setData('health',this.bossDefinition.health).setData('experience',80);
    this.bossSprite=boss;this.bossHud?.setText(this.bossDefinition.name).setVisible(true);this.bossHealth?.setVisible(true);this.bossPhaseText?.setText(this.bossDefinition.phases[0]!.name).setVisible(true);
    this.cameras.main.flash(450,70,25,40);
  }

  private fireWeapons(time:number):void {
    const targets=this.activeTargets();if(!targets.length)return;
    for(const progress of this.build.weapons){
      const weapon=WEAPONS.find(w=>w.id===progress.weaponId);if(!weapon)continue;
      const stats=weaponLevelStats(progress,weapon),ready=this.weaponReady[weapon.id]??0;
      if(time<ready)continue;
      const target=findNearestTarget(this.player,targets);if(!target)continue;
      const distance=Phaser.Math.Distance.Between(this.player.x,this.player.y,target.x,target.y);
      if(distance>stats.range)continue;
      this.weaponReady[weapon.id]=time+stats.intervalMs/(this.currentBuildStats().attackSpeedMultiplier*this.baseHasteMultiplier);
      const damage=stats.damage*this.currentBuildStats().damageMultiplier*this.character.stats.damageMultiplier;
      const behavior=progress.evolved?this.evolvedWeaponBehavior(weapon):weapon.behavior;
      this.executeWeapon(weapon,behavior,damage,stats.projectiles,stats.range,target);
    }
  }

  private evolvedWeaponBehavior(weapon:WeaponDefinition):string {
    const evolved:Record<string,string>={
      'veil-bolt':'fan-volley','gravecleaver':'cleaving-arc','oath-pike':'chain-lightning',
      'ember-chains':'chain-lightning','winter-orbit':'orbiting-blades','briar-seed':'area-seed',
      'soul-lantern':'spirit-seeker','blood-loom':'life-tether','stormglass':'fan-volley',
      'iron-bell':'defensive-pulse','rune-mortar':'delayed-mortar','eclipse-sigil':'delayed-sigil'
    };
    return evolved[weapon.id]??weapon.behavior;
  }

  private executeWeapon(weapon:WeaponDefinition,behavior:string,damage:number,projectiles:number,range:number,target:Phaser.Physics.Arcade.Sprite):void {
    const targets=this.activeTargets(),element=weapon.element;
    const angle=Phaser.Math.Angle.Between(this.player.x,this.player.y,target.x,target.y);
    if(behavior==='cleaving-arc'||behavior==='defensive-pulse'||behavior==='orbiting-blades'){
      const radius=behavior==='cleaving-arc'?Math.min(150,range):behavior==='orbiting-blades'?Math.min(105,range):Math.min(135,range);
      for(const enemy of targets){const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,enemy.x,enemy.y);if(d>radius)continue;
        if(behavior==='cleaving-arc'){const a=Phaser.Math.Angle.Between(this.player.x,this.player.y,enemy.x,enemy.y);if(Math.abs(Phaser.Math.Angle.Wrap(a-angle))>1.15)continue;}
        this.damageEnemy(enemy,damage,element);
      }
      this.cameras.main.shake(45,.001);return;
    }
    if(behavior==='chain-lightning'){
      let current=target;const hit=new Set<Phaser.Physics.Arcade.Sprite>();
      for(let i=0;i<Math.min(3,projectiles+1);i++){if(hit.has(current))break;hit.add(current);this.damageEnemy(current,damage*(1-i*.16),element);
        const next=targets.filter(t=>!hit.has(t)).sort((a,b)=>Phaser.Math.Distance.Between(current.x,current.y,a.x,a.y)-Phaser.Math.Distance.Between(current.x,current.y,b.x,b.y))[0];if(!next||Phaser.Math.Distance.Between(current.x,current.y,next.x,next.y)>170)break;current=next;}
      return;
    }
    if(behavior==='life-tether'){this.damageEnemy(target,damage,element);this.healPlayer(damage*this.currentBuildStats().lifesteal);return;}
    if(behavior==='delayed-mortar'||behavior==='delayed-sigil'||behavior==='area-seed'){
      const marker=this.add.graphics().setDepth(7);marker.lineStyle(2,elementTint[element],.9);marker.strokeCircle(target.x,target.y,Math.min(72,range*.28));
      this.time.delayedCall(behavior==='area-seed'?450:650,()=>{if(!this.runFinished){this.damageTargetsInRadius(target.x,target.y,Math.min(78,range*.3),damage,element);}marker.destroy();});return;
    }
    const count=behavior==='fan-volley'?Math.max(3,projectiles):projectiles;
    for(let i=0;i<count;i++){
      const spread=count>1?(i-(count-1)/2)*.22:0;
      this.createProjectile(weapon,damage,element,angle+spread,behavior==='homing-projectile'||behavior==='spirit-seeker',behavior==='piercing-thrust'?2:1,target);
    }
  }

  private createProjectile(weapon:WeaponDefinition,damage:number,element:ElementId,angle:number,homing:boolean,pierce:number,target:Phaser.Physics.Arcade.Sprite):void {
    const shot=this.shots.create(this.player.x,this.player.y,'shot') as Phaser.Physics.Arcade.Sprite;
    shot.setDepth(5).setCircle(5).setTint(elementTint[element]).setData('damage',damage).setData('element',element).setData('expires',this.time.now+1900)
      .setData('weaponId',weapon.id).setData('homing',homing).setData('target',target).setData('pierce',pierce).setData('area',weapon.behavior==='area-seed'?70:0);
    shot.setVelocity(Math.cos(angle)*Math.max(180,weapon.projectileSpeed),Math.sin(angle)*Math.max(180,weapon.projectileSpeed));
  }

  private updateProjectiles(_time:number):void {
    for(const child of this.shots.getChildren()){
      const shot=child as Phaser.Physics.Arcade.Sprite;if(!shot.active||!shot.getData('homing'))continue;
      let target=shot.getData('target') as Phaser.Physics.Arcade.Sprite|undefined;
      if(!target?.active){target=findNearestTarget(shot,this.activeTargets());if(target)shot.setData('target',target);}
      if(target?.active){const angle=Phaser.Math.Angle.Between(shot.x,shot.y,target.x,target.y);shot.setVelocity(Math.cos(angle)*330,Math.sin(angle)*330);}
    }
  }

  private expireShots(time:number):void {
    for(const child of this.shots.getChildren()){const shot=child as Phaser.Physics.Arcade.Sprite;if(shot.active&&time>Number(shot.getData('expires')))shot.destroy();}
  }

  private hitEnemy(shot:Phaser.Physics.Arcade.Sprite,enemy:Phaser.Physics.Arcade.Sprite):void {
    if(!shot.active||!enemy.active)return;
    const area=Number(shot.getData('area')??0),element=shot.getData('element') as ElementId|undefined;
    this.damageEnemy(enemy,Number(shot.getData('damage')),element);
    if(area>0)this.damageTargetsInRadius(enemy.x,enemy.y,area,Number(shot.getData('damage'))*.55,element);
    const pierce=Number(shot.getData('pierce')??1)-1;
    if(pierce>0)shot.setData('pierce',pierce);else shot.destroy();
  }

  private damageTargetsInRadius(x:number,y:number,radius:number,damage:number,element?:ElementId):void {
    for(const target of this.activeTargets())if(Phaser.Math.Distance.Between(x,y,target.x,target.y)<=radius)this.damageEnemy(target,damage,element);
  }

  private damageEnemy(enemy:Phaser.Physics.Arcade.Sprite,baseDamage:number,element?:ElementId):void {
    if(!enemy.active||this.runFinished||Number(enemy.getData('untargetableUntil')??0)>this.time.now)return;
    if(enemy.getData('isBoss')){this.damageBossTarget(enemy,baseDamage,element);return;}
    const def=this.enemyDefinition(enemy);if(!def)return;
    const actor=this.enemyStates.get(enemy);
    if(actor?.burrowed||(!enemy.getData('mimicRevealed')&&def.behavior==='mimic'))return;
    const existing=this.elementStates.get(enemy)??{};
    const curse=existing.dark&&existing.dark.expiresAt>this.time.now?existing.dark.stacks:0;
    let damage=baseDamage*(1+curse*.06);
    if(actor&&def.behavior!=='mimic'&&actor.exposedUntil>this.time.now)damage*=1.25;
    const armorBroken=Number(enemy.getData('armorBrokenUntil')??0)>this.time.now;
    if((def.behavior==='shield-advance'||def.behavior==='rune-guardian')&&!armorBroken&&element!=='lightning'&&this.isEnemyFacingPlayer(enemy,actor))damage*=.35;
    if(def.behavior==='rune-guardian'&&element==='lightning')enemy.setData('armorBrokenUntil',this.time.now+5200);
    if(def.behavior==='pursue'&&this.isEnemyFacingPlayer(enemy,actor)&&!element)damage*=.8;
    if(def.behavior==='duelist'&&Number(enemy.getData('parryUntil')??0)>this.time.now&&element!=='lightning')damage*=.35;
    if(def.behavior==='duelist'&&element==='lightning')enemy.setData('parryUntil',0);
    if(def.behavior==='burrow'&&actor?.burrowed)return;
    const anchor=this.activeTargets().find(other=>other!==enemy&&this.enemyDefinition(other)?.behavior==='soul-anchor'&&Phaser.Math.Distance.Between(other.x,other.y,enemy.x,enemy.y)<200);
    if(anchor)damage*=.88;
    if(element){
      const elementDef=ELEMENTS.find(e=>e.id===element)!;
      const tuned={...elementDef,buildupPerHit:elementDef.buildupPerHit*this.currentBuildStats().elementalBuildupMultiplier};
      const hit=applyElementHit(existing,tuned,damage,def.resistances[element]??0,this.time.now,ELEMENTS);
      this.elementStates.set(enemy,hit.state);damage=hit.damage+(hit.reaction?.damage??0);
      if(hit.triggered&&element==='spirit')this.healPlayer(Math.max(1,this.state.maxHealth*.025));
      if(hit.triggered&&element==='blood')this.healPlayer(damage*(.03+this.currentBuildStats().lifesteal));
      if(hit.triggered&&element==='lightning')this.chainLightningFrom(enemy,damage*.4);
    }
    const hp=Number(enemy.getData('health'))-damage;enemy.setData('health',hp).setTint(element?elementTint[element]:0xffffff);
    this.time.delayedCall(70,()=>{if(enemy.active)enemy.clearTint();});
    if(hp>0)return;
    if(def.behavior==='volatile-bomber'){
      const radius=enemy.getData('primed')?112:58;const blast=this.add.circle(enemy.x,enemy.y,radius,0xe3a64e,.22).setDepth(7);
      if(Phaser.Math.Distance.Between(this.player.x,this.player.y,enemy.x,enemy.y)<radius+18)this.receiveCombatDamage(def.attack.damage*(enemy.getData('primed')?1:.5));
      this.time.delayedCall(260,()=>blast.destroy());
    }
    this.dropExperience(enemy,Number(enemy.getData('experience')));this.state=recordKill(this.state);enemy.destroy();
  }

  private chainLightningFrom(source:Phaser.Physics.Arcade.Sprite,damage:number):void {
    const next=this.activeTargets().filter(target=>target!==source)
      .sort((a,b)=>Phaser.Math.Distance.Between(source.x,source.y,a.x,a.y)-Phaser.Math.Distance.Between(source.x,source.y,b.x,b.y))[0];
    if(next&&Phaser.Math.Distance.Between(source.x,source.y,next.x,next.y)<=190)this.damageEnemy(next,damage);
  }

  private damageBossTarget(boss:Phaser.Physics.Arcade.Sprite,baseDamage:number,element?:ElementId):void {
    if(!this.bossDefinition||!this.bossState||this.bossState.defeated)return;
    const curse=this.bossElementState.dark&&this.bossElementState.dark.expiresAt>this.time.now?this.bossElementState.dark.stacks:0;
    let damage=baseDamage*(1+curse*.06);
    if(element){
      const elementDef=ELEMENTS.find(e=>e.id===element)!;
      const tuned={...elementDef,buildupPerHit:elementDef.buildupPerHit*this.currentBuildStats().elementalBuildupMultiplier};
      const hit=applyElementHit(this.bossElementState,tuned,damage,this.bossDefinition.resistance[element]??0,this.time.now,ELEMENTS);
      this.bossElementState=hit.state;damage=hit.damage+(hit.reaction?.damage??0);
      if(hit.triggered&&element==='spirit')this.healPlayer(Math.max(1,this.state.maxHealth*.025));
      if(hit.triggered&&element==='blood')this.healPlayer(damage*(.03+this.currentBuildStats().lifesteal));
      if(hit.triggered&&element==='lightning')this.chainLightningFrom(boss,damage*.4);
    }
    if(element&&this.bossDefinition.weakness.includes(element))damage*=1.3;
    const transition=damageBoss(this.bossState,this.bossDefinition,damage,this.time.now);this.bossState=transition.state;
    boss.setData('health',transition.state.health).setTint(element?elementTint[element]:0xffffff);
    this.time.delayedCall(70,()=>{if(boss.active)boss.clearTint();});
    if(transition.changed&&!transition.state.defeated){this.bossPhaseText?.setText(transition.current.name);this.cameras.main.flash(320,90,38,55);
      for(const id of transition.current.addEnemyIds){const def=ENEMIES.find(e=>e.id===id);if(def)this.createEnemy(boss.x+Phaser.Math.Between(-90,90),boss.y+Phaser.Math.Between(-90,90),def,1.2);}}
    this.bossHealth?.setSize(300*Phaser.Math.Clamp(transition.state.health/transition.state.maxHealth,0,1),5);
    if(transition.state.defeated)this.defeatBoss(boss);
  }

  private defeatBoss(boss:Phaser.Physics.Arcade.Sprite):void {
    this.dropExperience(boss,80);boss.destroy();this.bossSprite=undefined;this.bossHud?.setText('BOSS YENİLDİ');this.bossPhaseText?.setText('Sandık ödülü kazanıldı');
    for(const progress of [...this.build.weapons]){const weapon=WEAPONS.find(w=>w.id===progress.weaponId);if(weapon)this.build=evolveWeapon(this.build,weapon);}
    this.refreshBuildStats();this.cameras.main.flash(500,175,135,72);
    this.time.delayedCall(900,()=>this.finishRun(true));
  }

  private dropExperience(source:Phaser.Physics.Arcade.Sprite,xp:number):void {
    const orb=this.orbs.create(source.x,source.y,'orb') as Phaser.Physics.Arcade.Sprite;
    orb.setDepth(2).setCircle(6).setData('xp',xp);
  }

  private contactDamage(enemy:Phaser.Physics.Arcade.Sprite):void {
    if(this.time.now<this.nextDamage||this.time.now<this.dashUntil||!enemy.active)return;
    const def=this.enemyDefinition(enemy);const actor=this.enemyStates.get(enemy);if(actor?.burrowed||Number(enemy.getData('untargetableUntil')??0)>this.time.now)return;const damage=enemy.getData('isBoss')?(this.bossDefinition?.contactDamage??24):(def?.contactDamage??9);
    this.nextDamage=this.time.now+650;this.receiveCombatDamage(damage);
  }

  private receiveCombatDamage(amount:number):void {
    const armor=this.currentBuildStats().armor+this.character.stats.armor;
    const reduced=Math.max(1,amount*(1-armor/(armor+100)));
    this.state=receiveDamage(this.state,reduced);this.cameras.main.shake(90,.002);this.refreshHud();
    if(this.state.health<=0)this.finishRun(false);
  }

  private healPlayer(amount:number):void {this.state={...this.state,health:Math.min(this.state.maxHealth,this.state.health+Math.max(0,amount))};}

  private updateElementStatuses(time:number):void {
    for(const child of this.enemies.getChildren()){
      const enemy=child as Phaser.Physics.Arcade.Sprite;if(!enemy.active)continue;
      const status=this.elementStates.get(enemy);if(!status)continue;
      const tick=tickElementStatuses(status,time);this.elementStates.set(enemy,tick.state);
      if(tick.damage>0)this.damageEnemy(enemy,tick.damage);
      enemy.setAlpha(tick.slowed||Boolean(this.enemyStates.get(enemy)?.burrowed)? .58:1);
    }
    if(this.bossState&&this.bossSprite?.active){const tick=tickElementStatuses(this.bossElementState,time);this.bossElementState=tick.state;if(tick.damage>0)this.damageBossTarget(this.bossSprite,tick.damage);}
  }

  private updateRegionHazard(time:number):void {
    const result=stepRegionHazard(this.region,this.hazardCycle,time);this.hazardCycle=result.cycle;
    const event:HazardEvent=result.event;
    if(event.phase==='idle'){this.hazardMarker?.destroy();this.hazardMarker=undefined;this.hazardLabel?.destroy();this.hazardLabel=undefined;this.activeHazardId='';this.hazardHasHit=false;return;}
    if(this.activeHazardId!==event.hazard.id){
      this.activeHazardId=event.hazard.id;this.hazardHasHit=false;
      const angle=Math.random()*Math.PI*2;this.hazardTarget={x:Phaser.Math.Clamp(this.player.x+Math.cos(angle)*150,50,WORLD_W-50),y:Phaser.Math.Clamp(this.player.y+Math.sin(angle)*150,50,WORLD_H-50)};
      this.hazardMarker?.destroy();this.hazardMarker=this.add.graphics().setDepth(6);
      this.hazardLabel?.destroy();this.hazardLabel=this.add.text(this.hazardTarget.x,this.hazardTarget.y-58,event.hazard.name,{fontSize:'12px',color:'#f1d59b',backgroundColor:'#251d20',padding:{x:5,y:3}}).setOrigin(.5).setDepth(7);
    }
    if(this.hazardMarker){this.hazardMarker.clear();const active=event.phase==='active';this.hazardMarker.lineStyle(3,active?0xe55d54:0xd7b568,.95);this.hazardMarker.fillStyle(active?0xd84f4f:0xd7b568,active?.25:.1);this.hazardMarker.strokeCircle(this.hazardTarget.x,this.hazardTarget.y,66);this.hazardMarker.fillCircle(this.hazardTarget.x,this.hazardTarget.y,66);}
    if(event.phase==='active'&&!this.hazardHasHit&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.hazardTarget.x,this.hazardTarget.y)<82){this.hazardHasHit=true;this.receiveCombatDamage(12);}
  }

  private isEnemyFacingPlayer(enemy:Phaser.Physics.Arcade.Sprite,actor?:EnemyActorState):boolean {
    if(!actor)return false;
    const dx=this.player.x-enemy.x,dy=this.player.y-enemy.y,d=Math.hypot(dx,dy)||1;
    return (dx/d)*actor.facingX+(dy/d)*actor.facingY>.55;
  }

  private applyEnemySpecial(enemy:Phaser.Physics.Arcade.Sprite,def:EnemyDefinition,special:import('../../gameplay/enemies/enemy-runtime.js').EnemySpecialIntent):void {
    if(special.kind==='summon'){
      const active=this.enemies.getChildren().filter(child=>(child as Phaser.Physics.Arcade.Sprite).active&&child!==enemy&&child.getData('summonedBy')===enemy).length;
      const minion=ENEMIES.find(e=>e.id==='rootbound-husk');
      if(minion&&this.enemies.countActive(true)<42)for(let i=0;i<Math.min(special.count,Math.max(0,4-active));i++){
        const angle=(Math.PI*2*i)/Math.max(1,special.count),x=enemy.x+Math.cos(angle)*52,y=enemy.y+Math.sin(angle)*52;
        this.createEnemy(x,y,minion,.55);
        const child=this.enemies.getChildren()[this.enemies.getChildren().length-1] as Phaser.Physics.Arcade.Sprite;
        child.setData('summonedBy',enemy).setData('experience',0);
      }
      return;
    }
    if(special.kind==='heal'){
      for(const child of this.enemies.getChildren()){
        const ally=child as Phaser.Physics.Arcade.Sprite;if(!ally.active||ally===enemy||ally.getData('isBoss'))continue;
        if(Phaser.Math.Distance.Between(enemy.x,enemy.y,ally.x,ally.y)<=special.radius){
          const hp=Number(ally.getData('health')),max=Number(ally.getData('maxHealth')??hp);
          ally.setData('health',Math.min(max,hp+max*special.amount)).setTint(0x9bd49a);
          this.time.delayedCall(180,()=>{if(ally.active)ally.clearTint();});
        }
      }
      return;
    }
    if(special.kind==='parry'){enemy.setData('parryUntil',this.time.now+special.durationMs);return;}
    if(special.kind==='pounce'){
      const dx=special.targetX-enemy.x,dy=special.targetY-enemy.y,d=Math.hypot(dx,dy)||1;
      enemy.setData('pounceX',dx/d).setData('pounceY',dy/d).setData('pounceUntil',this.time.now+special.durationMs);
      this.telegraphAttack(enemy,def,special.targetX,special.targetY,special.amount,420,'line',52);return;
    }
    if(special.kind==='hex'){
      for(const child of this.enemies.getChildren()){
        const ally=child as Phaser.Physics.Arcade.Sprite;if(!ally.active||ally===enemy)continue;
        if(Phaser.Math.Distance.Between(enemy.x,enemy.y,ally.x,ally.y)<=special.radius)ally.setData('damageBuffUntil',this.time.now+special.durationMs).setData('damageBuff',1+special.amount);
      }
      this.createEnemyZone(special.targetX,special.targetY,special.radius,special.durationMs,0,0x9b78c8,0);
      return;
    }
    if(special.kind==='trap'||special.kind==='web'||special.kind==='spore-cloud'){
      const damage=special.kind==='trap'?special.amount:special.kind==='spore-cloud'?special.amount:0;
      const slow=special.kind==='web'?.5:0;
      const color=special.kind==='web'?0x83c6c9:0x9ac65d;
      const warning=this.add.graphics().setDepth(6);warning.lineStyle(3,color,.9);warning.strokeCircle(special.targetX,special.targetY,special.radius);warning.fillStyle(color,.12);warning.fillCircle(special.targetX,special.targetY,special.radius);
      this.time.delayedCall(680,()=>{warning.destroy();if(!this.runFinished)this.createEnemyZone(special.targetX,special.targetY,special.radius,special.durationMs,damage,color,slow);});
      return;
    }
    if(special.kind==='frost-trail'){
      this.createEnemyZone(enemy.x,enemy.y,special.radius,special.durationMs,0,0x8fdcff,special.amount);
    }
  }

  private createEnemyZone(x:number,y:number,radius:number,durationMs:number,damage:number,color:number,slow:number):void {
    const marker=this.add.graphics().setDepth(6);
    marker.fillStyle(color,.2);marker.lineStyle(2,color,.8);marker.fillCircle(x,y,radius);marker.strokeCircle(x,y,radius);
    this.enemyZones.push({x,y,radius,expiresAt:this.time.now+durationMs,nextTickAt:this.time.now+350,damage,slow,marker});
  }

  private updateEnemyZones(time:number):void {
    this.enemyZones=this.enemyZones.filter(zone=>{
      if(time>=zone.expiresAt){zone.marker.destroy();return false;}
      const inside=Phaser.Math.Distance.Between(this.player.x,this.player.y,zone.x,zone.y)<=zone.radius+12;
      if(inside&&zone.slow>0){this.playerSlowUntil=time+220;this.playerSlowMultiplier=zone.slow;}
      if(inside&&zone.damage>0&&time>=zone.nextTickAt){this.receiveCombatDamage(zone.damage);zone.nextTickAt=time+850;}
      return true;
    });
  }

  private enemyDefinition(enemy:Phaser.Physics.Arcade.Sprite):EnemyDefinition|undefined {
    return ENEMIES.find(def=>def.id===enemy.getData('enemyType'));
  }

  private activeTargets():Phaser.Physics.Arcade.Sprite[] {
    return this.enemies.getChildren().filter(child=>{const enemy=child as Phaser.Physics.Arcade.Sprite;return enemy.active&&!this.enemyStates.get(enemy)?.burrowed&&Number(enemy.getData('untargetableUntil')??0)<=this.time.now&&(enemy.getData('mimicRevealed')!==false);}) as Phaser.Physics.Arcade.Sprite[];
  }

  private currentBuildStats(){return deriveBuildStats(this.build,PASSIVES);}

  private refreshBuildStats():void {
    const stats=this.currentBuildStats();this.state={...this.state,moveSpeed:this.character.moveSpeed*stats.moveSpeedMultiplier,
      damage:18+this.basePowerBonus,magnetRadius:112+this.baseMagnetBonus+stats.magnetRadiusBonus};
  }

  private magnetize():void {
    const radius=this.state.magnetRadius;
    for(const child of this.orbs.getChildren()){const orb=child as Phaser.Physics.Arcade.Sprite;if(!orb.active)continue;
      const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,orb.x,orb.y);
      if(d<=radius){const a=Phaser.Math.Angle.Between(orb.x,orb.y,this.player.x,this.player.y);orb.setVelocity(Math.cos(a)*250,Math.sin(a)*250);}else orb.setVelocity(0,0);
    }
  }

  private collectOrb(orb:Phaser.Physics.Arcade.Sprite):void {
    if(!orb.active||this.paused)return;
    const gain=Number(orb.getData('xp'))*this.currentBuildStats().xpGainMultiplier;
    const result=gainExperience(this.state,gain);this.state=result.state;this.queuedLevels+=result.levelsGained;orb.destroy();
    if(this.queuedLevels>0)this.showLevelUp();
  }

  private buildChoices():LevelChoice[] {
    const choices:LevelChoice[]=BASE_CHOICES.map(c=>({...c,kind:'base'}));
    for(const weapon of WEAPONS){
      const owned=this.build.weapons.find(w=>w.weaponId===weapon.id);
      if(owned&&owned.level<weapon.maxLevel)choices.push({id:'weapon-up:'+weapon.id,title:weapon.name+' +',detail:'Silah seviyesi '+(owned.level+1),kind:'weapon-up',contentId:weapon.id});
      else if(!owned&&this.build.weapons.length<6)choices.push({id:'weapon-add:'+weapon.id,title:weapon.name,detail:weapon.category+' silahını kuşan',kind:'weapon-add',contentId:weapon.id});
    }
    for(const passive of PASSIVES){
      const owned=this.build.passives.find(p=>p.passiveId===passive.id);
      if(owned&&owned.level<passive.maxLevel)choices.push({id:'passive-up:'+passive.id,title:passive.name+' +',detail:'Pasif seviyesi '+(owned.level+1),kind:'passive-up',contentId:passive.id});
      else if(!owned&&this.build.passives.length<6)choices.push({id:'passive-add:'+passive.id,title:passive.name,detail:passive.category+' pasifini kuşan',kind:'passive-add',contentId:passive.id});
    }
    const shuffled=[...choices];for(let i=shuffled.length-1;i>0;i--){const j=Phaser.Math.Between(0,i);[shuffled[i],shuffled[j]]=[shuffled[j]!,shuffled[i]!];}
    return shuffled.slice(0,4);
  }

  private pauseRunWorld():void {this.paused=true;this.time.paused=true;this.physics.world.pause();}
  private resumeRunWorld():void {this.time.paused=false;this.physics.world.resume();this.paused=false;}

  private handleOverlayInput(actions:GamepadActions):void {
    if(actions.leftPressed||actions.upPressed)this.navigateOverlay(-1);
    if(actions.rightPressed||actions.downPressed)this.navigateOverlay(1);
    if(actions.southPressed||actions.startPressed)this.activateOverlayOption(this.overlaySelectionIndex);
    else if(actions.eastPressed&&this.overlayBackIndex!==null)this.activateOverlayOption(this.overlayBackIndex);

    if(Phaser.Input.Keyboard.JustDown(this.cursors.left)||Phaser.Input.Keyboard.JustDown(this.cursors.up))this.navigateOverlay(-1);
    if(Phaser.Input.Keyboard.JustDown(this.cursors.right)||Phaser.Input.Keyboard.JustDown(this.cursors.down))this.navigateOverlay(1);
    if(Phaser.Input.Keyboard.JustDown(this.keys.ENTER)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE))this.activateOverlayOption(this.overlaySelectionIndex);
    if(Phaser.Input.Keyboard.JustDown(this.keys.ESC)&&this.overlayBackIndex!==null)this.activateOverlayOption(this.overlayBackIndex);
  }

  private registerOverlayOption(button:Phaser.GameObjects.Rectangle,action:()=>void):void {
    const index=this.overlayButtons.length;
    this.overlayButtons.push(button);this.overlayActions.push(action);
    button.on('pointerover',()=>this.setOverlaySelection(index));
    button.on('pointerup',()=>this.activateOverlayOption(index));
    this.setOverlaySelection(this.overlaySelectionIndex);
  }

  private setOverlaySelection(index:number):void {
    if(!this.overlayButtons.length)return;
    this.overlaySelectionIndex=(index+this.overlayButtons.length)%this.overlayButtons.length;
    this.overlayButtons.forEach((button,i)=>{
      const selected=i===this.overlaySelectionIndex;
      button.setFillStyle(selected?0x463344:0x28212a,.98).setStrokeStyle(selected?3:2,selected?0xf0d39a:0x9b8059,.98);
    });
  }

  private navigateOverlay(direction:number):void {
    if(this.overlayButtons.length)this.setOverlaySelection(this.overlaySelectionIndex+direction);
  }

  private activateOverlayOption(index:number):void {
    const action=this.overlayActions[index];
    if(action)action();
  }

  private createOverlayButton(x:number,y:number,width:number,height:number,label:string,action:()=>void):void {
    const button=this.add.rectangle(x,y,width,height,0x28212a,.98).setStrokeStyle(2,0x9b8059).setScrollFactor(0).setDepth(201).setInteractive({useHandCursor:true});
    const text=this.add.text(x,y,label,{fontSize:'18px',color:'#fff2df',fontStyle:'bold'}).setOrigin(.5).setScrollFactor(0).setDepth(202);
    this.overlay.push(button,text);this.registerOverlayOption(button,action);
  }

  private showLevelUp():void {
    this.pauseRunWorld();this.clearOverlay();const w=this.scale.width,h=this.scale.height;
    this.overlay.push(this.add.rectangle(w/2,h/2,w,h,0x08070b,.88).setScrollFactor(0).setDepth(200));
    this.overlay.push(this.add.text(w/2,h*.23,'GÜÇLENME SEÇİMİ',{fontFamily:'Georgia',fontSize:'30px',color:'#e8d6ad'}).setOrigin(.5).setScrollFactor(0).setDepth(201));
    this.overlay.push(this.add.text(w/2,h*.31,'Bir gelişim seç. Her seçim koşunu değiştirir.',{fontSize:'15px',color:'#aaa0a0'}).setOrigin(.5).setScrollFactor(0).setDepth(201));
    this.buildChoices().forEach((choice,i)=>{
      const x=w/2+(i-1.5)*220;
      const card=this.add.rectangle(x,h*.55,196,170,0x28212a,.98).setStrokeStyle(2,0x9b8059).setScrollFactor(0).setDepth(201).setInteractive({useHandCursor:true});
      const name=this.add.text(x,h*.5,choice.title,{fontFamily:'Georgia',fontSize:'17px',color:'#e8d6ad',align:'center',wordWrap:{width:170}}).setOrigin(.5).setScrollFactor(0).setDepth(202);
      const detail=this.add.text(x,h*.61,choice.detail,{fontSize:'12px',color:'#b9b0ae',align:'center',wordWrap:{width:165}}).setOrigin(.5).setScrollFactor(0).setDepth(202);
      this.overlay.push(card,name,detail);this.registerOverlayOption(card,()=>this.chooseUpgrade(choice));
    });
  }

  private chooseUpgrade(choice:LevelChoice):void {
    if(choice.kind==='base'){
      if(choice.id==='power'){this.basePowerBonus+=6;this.refreshBuildStats();}
      else if(choice.id==='haste'){this.baseHasteMultiplier=Math.min(1.65,this.baseHasteMultiplier*1.1);}
      else if(choice.id==='magnet'){this.baseMagnetBonus+=65;this.refreshBuildStats();}
      else this.state=applyUpgrade(this.state,choice.id as UpgradeId);
    }
    if(choice.kind==='weapon-add'){const def=WEAPONS.find(w=>w.id===choice.contentId);if(def)this.build=addWeapon(this.build,def);}
    if(choice.kind==='weapon-up'){const def=WEAPONS.find(w=>w.id===choice.contentId);if(def)this.build=upgradeWeapon(this.build,def);}
    if(choice.kind==='passive-add'){const def=PASSIVES.find(p=>p.id===choice.contentId);if(def)this.build=addPassive(this.build,def);}
    if(choice.kind==='passive-up'){const def=PASSIVES.find(p=>p.id===choice.contentId);if(def)this.build=upgradePassive(this.build,def);}
    this.refreshBuildStats();this.queuedLevels=Math.max(0,this.queuedLevels-1);this.clearOverlay();this.refreshHud();
    if(this.queuedLevels>0)this.showLevelUp();else this.resumeRunWorld();
  }

  private openPause():void {
    if(this.paused)return;this.pauseRunWorld();this.clearOverlay();const w=this.scale.width,h=this.scale.height;
    const shade=this.add.rectangle(w/2,h/2,w,h,0x08070b,.84).setScrollFactor(0).setDepth(200);
    const title=this.add.text(w/2,h*.36,'DURAKLATILDI',{fontFamily:'Georgia',fontSize:'34px',color:'#e8d6ad'}).setOrigin(.5).setScrollFactor(0).setDepth(201);
    this.overlay.push(shade,title);
    this.createOverlayButton(w/2,h*.52,260,54,'DEVAM ET',()=>{this.clearOverlay();this.resumeRunWorld();});
    this.createOverlayButton(w/2,h*.64,260,54,'ANA MENÜ',()=>this.scene.start('main-menu'));
    this.overlayBackIndex=0;
  }

  private finishRun(won:boolean):void {
    if(this.runFinished)return;this.runFinished=true;this.pauseRunWorld();this.clearOverlay();const w=this.scale.width,h=this.scale.height;
    const shade=this.add.rectangle(w/2,h/2,w,h,0x08070b,.9).setScrollFactor(0).setDepth(200);
    const title=this.add.text(w/2,h*.32,won?'KOŞU TAMAMLANDI':'AVCI DÜŞTÜ',{fontFamily:'Georgia',fontSize:'36px',color:'#e8d6ad'}).setOrigin(.5).setScrollFactor(0).setDepth(201);
    const summary=this.add.text(w/2,h*.45,'Seviye '+this.state.level+'   •   '+this.state.kills+' düşman',{fontSize:'18px',color:'#c0b5a8'}).setOrigin(.5).setScrollFactor(0).setDepth(201);
    this.overlay.push(shade,title,summary);
    this.createOverlayButton(w/2,h*.59,260,54,'YENİ KOŞU',()=>this.scene.restart());
    this.createOverlayButton(w/2,h*.7,260,54,'ANA MENÜ',()=>this.scene.start('main-menu'));
    this.overlayBackIndex=1;
  }

  private clearOverlay():void {this.overlay.forEach(o=>o.destroy());this.overlay=[];this.overlayButtons=[];this.overlayActions=[];this.overlaySelectionIndex=0;this.overlayBackIndex=null;}

  private refreshHud():void {
    if(!this.hud||!this.clock||!this.health)return;
    const seconds=Math.floor(this.state.elapsedMs/1000);
    this.clock.setText(String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'));
    this.hud.setText(this.character.name+'  •  LV '+this.state.level+'\nXP '+Math.floor(this.state.experience)+' / '+this.state.experienceToNext+'  •  Düşman '+this.state.kills+'\n'+this.region.name+'  •  Silah '+this.build.weapons.length+'/6  •  Pasif '+this.build.passives.length+'/6');
    this.health.setSize(160*Phaser.Math.Clamp(this.state.health/this.state.maxHealth,0,1),8);
    if(this.bossState){this.bossHud?.setVisible(true);this.bossHealth?.setVisible(true);this.bossHealth?.setSize(300*Phaser.Math.Clamp(this.bossState.health/this.bossState.maxHealth,0,1),5);}
  }
}
