import Phaser from 'phaser';
import type { ElementId, RegionId, RegionPathDefinition, EnemyDefinition, BossDefinition, CharacterDefinition, WeaponDefinition, PassiveSpecialMechanic } from '../../core/types/content.js';
import type { ChallengeId, GameMode, RunState, UpgradeId } from '../../core/types/game.js';
import { CHARACTERS, STARTING_CHARACTER } from '../../data/characters.js';
import { ENEMIES } from '../../data/enemies.js';
import { BOSSES } from '../../data/bosses.js';
import { getBossTraces } from '../../data/boss-traces.js';
import { WEAPONS } from '../../data/weapons.js';
import { PASSIVES } from '../../data/passives.js';
import { RELICS } from '../../data/relics.js';
import { CRAFTING_MATERIALS } from '../../data/crafting.js';
import { ELEMENTS } from '../../data/elements.js';
import { REGIONS } from '../../data/regions.js';
import { resolveEnvironment, getElementWeatherMultiplier, getEnvironmentLabel } from '../../gameplay/world/environment-runtime.js';
import { resolveCharacterAbility } from '../../gameplay/characters/character-ability-runtime.js';
import { getEnvironmentalLoreLandmark, type EnvironmentalLoreLandmark } from '../../data/environmental-lore.js';
import { resolveUnlockedRegionPaths } from '../../gameplay/world/region-path-runtime.js';
import { resolveStoryWorldState } from '../../gameplay/world/story-world-state.js';
import { resolveRegionMap, getRegionMapLayout, resolveRegionMapPosition, isRegionMapWalkable, type RegionMapLayout } from '../../gameplay/world/region-map-runtime.js';
import { resolveBossVariant } from '../../gameplay/bosses/boss-variant-runtime.js';
import { findNearestTarget } from '../../gameplay/combat/combat-rules.js';
import { advanceRun, applyUpgrade, createRunState, gainExperience, recordKill } from '../../gameplay/run/run-model.js';
import { stepEnemyAI, type EnemyActorState } from '../../gameplay/enemies/enemy-runtime.js';
import { applyElementHit, tickElementStatuses, type ElementState } from '../../gameplay/elements/element-runtime.js';
import { addPassive, addWeapon, choosePassiveSpecial, chooseWeaponBranch, deriveBuildStats, EMPTY_BUILD, evolveWeapon, upgradePassive, upgradeWeapon, weaponLevelStats, type BuildState } from '../../gameplay/weapons/build-runtime.js';
import { getActiveWeaponSynergies, getWeaponSynergyChainBonus, getWeaponSynergyDamageMultiplier } from '../../gameplay/weapons/weapon-synergies.js';
import { addCurseStack, createPassiveSpecialRuntimeState, getLowHealthLifestealBonus, getWeakenedDamageMultiplier, grantFreeReroll, isFrozenTarget, isPassiveSpecialActive, isPoisonBloomReady, resolveCriticalHit, resolveLastWard, resolveSealedPlate, tryPassiveCooldown, type PassiveSpecialRuntimeState } from '../../gameplay/passives/passive-runtime.js';
import { createBossEncounter, damageBoss, getBossAttack, type BossEncounterState } from '../../gameplay/bosses/boss-runtime.js';
import { createBossArena, damageBossArenaObject, getBossArenaDamageMultiplier, getSafeBossArenaObject, stepBossArena, transitionBossArenaPhase, type BossArenaObjectKind, type BossArenaState } from '../../gameplay/bosses/boss-arena-runtime.js';
import { createHazardCycle, getRegionHazardMechanic, stepRegionHazard, type HazardCycle, type HazardEvent, type RegionHazardMechanic } from '../../gameplay/regions/region-runtime.js';
import { applyBossHuntResult, applyRunResult } from '../../gameplay/run/run-results.js';
import { getGameModeRules, resolveGameMode } from '../../gameplay/run/game-mode-runtime.js';
import { getNewGamePlusModifiers, recordCompletedEnding, scaleNewGamePlusBoss, scaleNewGamePlusEnemy } from '../../gameplay/run/new-game-plus-runtime.js';
import { completeEndlessBossCycle, createEndlessRuntimeState, getEndlessRule, getEndlessRuleModifiers, getEndlessSurvivalReward, scaleEndlessBoss, shouldSpawnEndlessBoss, type EndlessRuntimeState } from '../../gameplay/run/endless-runtime.js';
import { canAddChallengeWeapon, getChallengeModifiers, getChallengeVictoryBonus, resolveChallengeId } from '../../gameplay/run/challenge-runtime.js';
import { createWaveDirector, stepWaveDirector, waveRandom, type WaveDirectorState } from '../../gameplay/spawning/wave-director.js';
import { advanceRunEvent, createRunEventState, getRunEventName, getRunEventObjective, getRunEventReward, recordRunEventAction, startDueRunEvent, type RunEventAction, type RunEventKind, type RunEventState } from '../../gameplay/events/run-events.js';
import type { SaveManager } from '../../systems/save/save-manager.js';
import type { SaveData } from '../../systems/save/save-types.js';
import { areQuestObjectivesComplete, chooseQuestBranch, recordQuestEvent, startAvailableQuests } from '../../gameplay/quests/quest-runtime.js';
import { QUESTS, QUEST_BY_ID } from '../../data/quests.js';
import { completeEnding } from '../../gameplay/endings/ending-runtime.js';
import { EMPTY_GAMEPAD_FRAME, resolveGamepadInput, type GamepadFrame, type GamepadActions } from '../input/gamepad-controls.js';
import { createLevelUpControlState, drawLevelUpChoices as drawChoicesFromPool, spendLevelUpBanish, spendLevelUpReroll, spendLevelUpSkip, type LevelUpControlState } from '../../gameplay/level-up/level-up-controls.js';
import { derivePermanentUpgradeEffects, type PermanentUpgradeEffects } from '../../gameplay/progression/permanent-upgrades.js';
import { getActiveEquipmentProfile } from '../../gameplay/progression/equipment-profiles.js';
import { deriveRelicStats, getRelicDamageMultiplier, type RelicStats } from '../../gameplay/relics/relic-runtime.js';

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
type LevelChoice = { id:string; title:string; detail:string; kind:'base'|'weapon-add'|'weapon-up'|'weapon-branch'|'passive-add'|'passive-up'|'passive-special'; contentId?:string; branchId?:string };

const elementTint:Record<ElementId,number>={fire:0xff8652,ice:0x8fdcff,poison:0x9ac65d,dark:0x9b78c8,spirit:0x73d7c8,lightning:0xf4dc74,blood:0xc84c60};

export class RunScene extends Phaser.Scene {
  private state:RunState=createRunState();
  private character:CharacterDefinition=STARTING_CHARACTER;
  private region=REGIONS[0]!;
  private gameMode:GameMode='survival';
  private challengeId:ChallengeId|null=null;
  private endlessState:EndlessRuntimeState=createEndlessRuntimeState();
  private newGamePlusLevel=0;
  private scaledEnemyDefinitions=new Map<string,EnemyDefinition>();
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
  private levelUpControls:LevelUpControlState=createLevelUpControlState();
  private currentLevelChoices:LevelChoice[]=[];
  private banishMode=false;
  private nextDamage=0;
  private dashReady=0;
  private dashUntil=0;
  private abilityReady=0;
  private abilityGuardUntil=0;
  private abilityGuardDamageMultiplier=.35;
  private abilityLastEffect='';
  private abilityLastDamage=0;
  private abilityLastHealing=0;
  private abilityDelayedZoneFired=false;
  private abilityDelayedZoneCandidateCount=0;
  private abilityDelayedZoneInRangeCount=0;
  private abilityDelayedZoneRunFinished=false;
  private abilityDelayedZoneDamage=0;
  private abilityDelayedZoneTimer?:Phaser.Time.TimerEvent;
  private lastHud=0;
  private waveDirector:WaveDirectorState=createWaveDirector(1);
  private runEventState:RunEventState=createRunEventState(1);
  private eventObjects!:Phaser.Physics.Arcade.Group;
  private eventHud?:Phaser.GameObjects.Text;
  private environmentHud?:Phaser.GameObjects.Text;
  private environmentOverlay?:Phaser.GameObjects.Rectangle;
  private environmentPhaseOverlay?:Phaser.GameObjects.Rectangle;
  private environmentKey='';
  private environmentState=resolveEnvironment('cursed-forest',0);
  private eventSetupPending=false;
  private pendingCursedStage=1;
  private runSeed=1;
  private weaponReady:Record<string,number>={};
  private lastWeaponExecution?:{weaponId:string;behavior:string};
  private bossDefinition?:BossDefinition;
  private bossEncounterIdsAtRegionEntry:string[]=[];
  private activeBossVariantId:string|null=null;
  private bossState?:BossEncounterState;
  private bossSprite?:Phaser.Physics.Arcade.Sprite;
  private bossPhaseText?:Phaser.GameObjects.Text;
  private bossArenaObjects!:Phaser.Physics.Arcade.Group;
  private bossTraceObjects!:Phaser.GameObjects.Group;
  private bossArenaState?:BossArenaState;
  private playerPoisonStacks=0;
  private playerPoisonExpiresAt=0;
  private playerPoisonNextTickAt=0;
  private arenaInteractionReadyAt=0;
  private lastBossArenaVisualsAt=0;
  private enemyStates=new WeakMap<Phaser.Physics.Arcade.Sprite,EnemyActorState>();
  private elementStates=new WeakMap<Phaser.Physics.Arcade.Sprite,ElementState>();
  private bossElementState:ElementState={};
  private lastElementReactionId='';
  private hazardCycle:HazardCycle=createHazardCycle();
  private hazardMarker?:Phaser.GameObjects.Graphics;
  private hazardTarget={x:0,y:0};
  private activeHazardId='';
  private hazardHasHit=false;
  private hazardLabel?:Phaser.GameObjects.Text;
  private hazardCounterLabel?:Phaser.GameObjects.Text;
  private hazardDirection={x:1,y:0};
  private hazardTargetForced=false;
  private hazardPoisonStacks=0;
  private hazardPoisonExpiresAt=0;
  private hazardPoisonNextTickAt=0;
  private hazardLastEffectId='';
  private hazardLastDamage=0;
  private bossSpawned=false;
  private bossVictoryPending=false;
  private bossChestOverlapCount=0;
  private bossChestLastOverlapAtMs:number|null=null;
  private bossChestCollectCount=0;
  private bossChestLastCollectAtMs:number|null=null;
  private bossChestLastCollectObjectActive:boolean|null=null;
  private bossChestLastCollectPending:boolean|null=null;
  private bossChestCollectOutcome:'none'|'entered'|'inactive'|'not-pending'|'opened'='none';
  private bossChestOpenedAtMs:number|null=null;
  private bossChestFinishScheduledAtMs:number|null=null;
  private bossChestFinishCallbackAtMs:number|null=null;
  private bossChestFinishTimer?:Phaser.Time.TimerEvent;
  private runFinished=false;
  private runSoulEssence=0;
  private lastRunSaved:boolean|null=null;
  private basePowerBonus=0;
  private baseMagnetBonus=0;
  private baseHasteMultiplier=1;
  private playerSlowUntil=0;
  private playerSlowMultiplier=1;
  private enemyZones:{x:number;y:number;radius:number;expiresAt:number;nextTickAt:number;damage:number;slow:number;affectsEnemies:boolean;marker:Phaser.GameObjects.Graphics}[]=[];
  private passiveZones:{x:number;y:number;radius:number;expiresAt:number;nextTickAt:number;damage:number;tickMs:number;marker:Phaser.GameObjects.Graphics}[]=[];
  private passiveSpecialState:PassiveSpecialRuntimeState=createPassiveSpecialRuntimeState();
  private passiveSpecialFeedback?:Phaser.GameObjects.Text;
  private weaponSynergyGuardUntil=0;
  private weaponSynergyGuardReduction=.28;
  private weaponSynergyTriggers:string[]=[];
  private permanentUpgradeEffects:PermanentUpgradeEffects=derivePermanentUpgradeEffects(undefined);
  private equippedRelicIds:string[]=[];
  private relicStats:RelicStats=deriveRelicStats([],'cursed-hunter');
  private runRelicIds:string[]=[];
  private bossChestOpened=false;
  private completedTreasureHunt=false;
  private runDiscoveredEnemyIds:string[]=[];
  private runDiscoveredLoreIds:string[]=[];
  private runDiscoveredPathIds:string[]=[];
  private activeStoryPaths:RegionPathDefinition[]=[];
  private mapLayout:RegionMapLayout=getRegionMapLayout(this.region.id);
  private mapWalls!:Phaser.Physics.Arcade.StaticGroup;
  private mapBoundaryCount=0;
  private mapConnected=false;
  private activeStoryWorldState:ReturnType<typeof resolveStoryWorldState>|null=null;
  private storyWorldObjectCount=0;
  private lastTraversedStoryPathId:string|null=null;
  private questSaveData?:SaveData;
  private questHud?:Phaser.GameObjects.Text;
  private questJournalOpen=false;
  private questHudPanel?:Phaser.GameObjects.Rectangle;
  private pendingQuestChoiceId:string|null=null;
  private questChoiceErrorText?:Phaser.GameObjects.Text;
  private runDiscoveredWeaponIds:string[]=[];
  private unlockedWeaponVariantIds:string[]=[];
  private runCraftingMaterials:Record<string,number>={};
  private browserSynergyTestTargets:Phaser.Physics.Arcade.Sprite[]=[];
  private browserSynergyInitialHealth:number[]=[];
  private browserSynergyPlayerHealthBefore=0;

  constructor(){super('run');}

  private assertBrowserTestMode():void {
    if(this.registry.get('browserTestMode')!==true)throw new Error('Browser test controls are disabled.');
  }

  browserTestTriggerHazard(hazardId:string):{regionId:string;hazardId:string;telegraphMs:number;shape:string} {
    this.assertBrowserTestMode();
    const region=REGIONS.find(item=>item.hazards.some(hazard=>hazard.id===hazardId));
    const index=region?.hazards.findIndex(hazard=>hazard.id===hazardId)??-1;
    const hazard=region?.hazards[index];
    const mechanic=getRegionHazardMechanic(hazardId);
    if(!region||!hazard||!mechanic)throw new Error('Unknown region hazard: '+hazardId);
    this.region=region;
    this.state={...this.state,health:this.state.maxHealth};
    this.player.setPosition(WORLD_W/2,WORLD_H/2).setVelocity(0,0);
    this.hazardTarget={x:this.player.x,y:this.player.y};
    this.playerSlowUntil=0;this.playerSlowMultiplier=1;
    this.hazardPoisonStacks=0;this.hazardPoisonExpiresAt=0;this.hazardPoisonNextTickAt=0;
    this.hazardLastEffectId='';this.hazardLastDamage=0;
    this.hazardCycle={hazardIndex:index,nextAt:this.time.now,activeUntil:0,telegraphUntil:0};
    this.activeHazardId='';this.hazardHasHit=false;this.hazardTargetForced=true;
    this.updateRegionHazard(this.time.now);
    return {regionId:region.id,hazardId,telegraphMs:hazard.telegraphMs,shape:mechanic.shape};
  }

  browserTestHazardSnapshot():{regionId:string;activeHazardId:string;lastEffectId:string;lastDamage:number;health:number;maxHealth:number;poisonStacks:number;slowActive:boolean;activeEnemyCount:number} {
    this.assertBrowserTestMode();
    return {regionId:this.region.id,activeHazardId:this.activeHazardId,lastEffectId:this.hazardLastEffectId,lastDamage:this.hazardLastDamage,health:this.state.health,maxHealth:this.state.maxHealth,poisonStacks:this.hazardPoisonStacks,slowActive:this.time.now<this.playerSlowUntil,activeEnemyCount:this.enemies.countActive(true)};
  }

  /** Development-only bridge used by Playwright; never callable in production builds. */
  browserTestRestartRegion(regionId:string):void {
    this.assertBrowserTestMode();
    if(!REGIONS.some(region=>region.id===regionId))throw new Error('Unknown region map: '+regionId);
    this.scene.restart({characterId:this.character.id,regionId:regionId as RegionId,gameMode:this.gameMode,challengeId:this.challengeId??undefined});
  }

  browserTestRestartCharacter(characterId:string):void {
    this.assertBrowserTestMode();
    if(!CHARACTERS.some(character=>character.id===characterId))throw new Error('Unknown test character: '+characterId);
    this.scene.restart({characterId,regionId:this.region.id,gameMode:this.gameMode,challengeId:this.challengeId??undefined});
  }

  browserTestAbilityProbe():{effect:string;beforeHealth:number;afterHealth:number;beforePlayerX:number;afterPlayerX:number;targetVelocity:number;targetHealthBefore:number;targetHealthAfter:number;guardActive:boolean;markedTargetCount:number;cooldownRemainingMs:number} {
    this.assertBrowserTestMode();
    this.waveDirector={...this.waveDirector,nextSpawnAtMs:Number.POSITIVE_INFINITY,nextEliteAtMs:Number.POSITIVE_INFINITY};
    for(const child of [...this.enemies.getChildren()]){const enemy=child as Phaser.Physics.Arcade.Sprite;(enemy.getData('eliteMarker') as Phaser.GameObjects.GameObject|undefined)?.destroy();enemy.destroy();}
    const definition=ENEMIES.find(item=>item.regionId===this.region.id);
    if(!definition)throw new Error('The active region has no ability probe target.');
    const targets=[this.createEnemy(this.player.x+64,this.player.y,definition,10),this.createEnemy(this.player.x+90,this.player.y+42,definition,10),this.createEnemy(this.player.x+112,this.player.y-38,definition,10)];
    // Keep probe targets alive through delayed abilities; starting weapons must not pre-empt the effect under test.
    for(const target of targets){
      target.setData('abilityProbeTarget',true).setData('health',100_000).setData('maxHealth',100_000).setVelocity(0,0);
      // Keep the probe actors damageable, but exclude contact/shot overlaps from this isolated ability test.
      (target.body as Phaser.Physics.Arcade.Body).checkCollision.none=true;
    }
    const beforeHealth=this.character.id==='blood-priestess'?this.state.maxHealth*.7:this.state.health;
    this.state={...this.state,health:beforeHealth};
    const beforePlayerX=this.player.x,targetHealthBefore=Number(targets[0]!.getData('health'));
    this.useAbility();
    const target=targets[0]!,targetVelocity=(target.body as Phaser.Physics.Arcade.Body).velocity.length();
    return {effect:this.abilityLastEffect,beforeHealth,afterHealth:this.state.health,beforePlayerX,afterPlayerX:this.player.x,targetVelocity,targetHealthBefore,targetHealthAfter:target.active?Number(target.getData('health')):0,guardActive:this.time.now<this.abilityGuardUntil,markedTargetCount:targets.filter(item=>Number(item.getData('abilityMarkedUntil')??0)>this.time.now).length,cooldownRemainingMs:Math.max(0,this.abilityReady-this.time.now)};
  }

  browserTestChallengeProbe():{
    challengeId:ChallengeId;maxWeaponSlots:number;maxHealthMultiplier:number;enemyMoveSpeedMultiplier:number;
    maxHealth:number;expectedMaxHealth:number;weaponSlotsUsed:number;weaponAddChoiceCount:number;
    enemySpeedRatio:number;bossSpeedRatio:number;
  } {
    this.assertBrowserTestMode();
    if(!this.challengeId)throw new Error('Challenge probe requires a valid challenge selection.');
    const modifiers=getChallengeModifiers(this.challengeId);
    const baseMaxHealth=this.character.health+this.permanentUpgradeEffects.maxHealthBonus+this.relicStats.maxHealthBonus;
    const originalBuild=this.build;
    this.build={weapons:WEAPONS.slice(0,3).map(weapon=>({weaponId:weapon.id,level:1,evolved:false})),passives:[]};
    const weaponAddChoiceCount=this.buildChoices().filter(choice=>choice.kind==='weapon-add').length;
    this.build=originalBuild;
    for(const child of [...this.enemies.getChildren()]){
      const enemy=child as Phaser.Physics.Arcade.Sprite;
      (enemy.getData('eliteMarker') as Phaser.GameObjects.GameObject|undefined)?.destroy();
      enemy.destroy();
    }
    this.waveDirector={...this.waveDirector,nextSpawnAtMs:Number.POSITIVE_INFINITY,nextEliteAtMs:Number.POSITIVE_INFINITY};
    const definition=ENEMIES.find(enemy=>enemy.id===this.region.enemyIds[0]);
    if(!definition)throw new Error('Challenge probe requires a regional enemy.');
    const enemy=this.createEnemy(this.player.x+220,this.player.y,definition,1);
    const actor=this.enemyStates.get(enemy);
    if(!actor)throw new Error('Challenge enemy state was not initialized.');
    const probeTime=this.time.now+32;
    const intent=stepEnemyAI(definition,{...actor,x:enemy.x,y:enemy.y,health:Number(enemy.getData('health'))},{x:this.player.x,y:this.player.y},probeTime,16);
    this.moveEnemies(probeTime);
    const baseEnemySpeed=Math.hypot(intent.velocityX,intent.velocityY);
    const actualEnemySpeed=(enemy.body as Phaser.Physics.Arcade.Body).velocity.length();
    const enemySpeedRatio=baseEnemySpeed>0?actualEnemySpeed/baseEnemySpeed:0;
    for(const child of [...this.enemies.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    this.spawnBoss();
    if(!this.bossSprite||!this.bossDefinition||!this.bossState)throw new Error('Challenge probe could not spawn the regional boss.');
    this.bossSprite.setPosition(this.player.x+420,this.player.y);
    (this.bossSprite.body as Phaser.Physics.Arcade.Body).reset(this.bossSprite.x,this.bossSprite.y);
    const phase=this.bossDefinition.phases[this.bossState.phaseIndex]!;
    const baseBossSpeed=this.bossDefinition.health*.006*(phase.movementMultiplier??1);
    this.moveBoss(this.bossSprite,probeTime+32);
    const actualBossSpeed=(this.bossSprite.body as Phaser.Physics.Arcade.Body).velocity.length();
    return {
      challengeId:this.challengeId,maxWeaponSlots:modifiers.maxWeaponSlots,maxHealthMultiplier:modifiers.maxHealthMultiplier,
      enemyMoveSpeedMultiplier:modifiers.enemyMoveSpeedMultiplier,maxHealth:this.state.maxHealth,
      expectedMaxHealth:Math.max(1,Math.floor(baseMaxHealth*modifiers.maxHealthMultiplier)),
      weaponSlotsUsed:3,weaponAddChoiceCount,enemySpeedRatio,bossSpeedRatio:baseBossSpeed>0?actualBossSpeed/baseBossSpeed:0
    };
  }

  browserTestSnapshot():{
    ability:{effect:string;cooldownRemainingMs:number;guardActive:boolean;lastDamage:number;lastHealing:number;markedTargetCount:number;delayedZoneFired:boolean;delayedZoneCandidateCount:number;delayedZoneInRangeCount:number;delayedZoneRunFinished:boolean;delayedZoneDamage:number;sceneTimePaused:boolean;sceneActive:boolean;sceneTimeNow:number;delayedTimer:{paused:boolean;hasDispatched:boolean;elapsed:number;delay:number;timeScale:number}|null};
    gameMode:GameMode;newGamePlusLevel:number;newGamePlusModifiers:ReturnType<typeof getNewGamePlusModifiers>;challengeId:ChallengeId|null;challengeModifiers:{maxWeaponSlots:number;maxHealthMultiplier:number;enemyMoveSpeedMultiplier:number;victorySoulEssenceBonus:number};weaponSlotsUsed:number;waveSpawnIndex:number;activeEnemyCount:number;
    endless:{bossCyclesCompleted:number;nextBossAtMs:number;ruleId:string|null;ruleName:string|null;ruleModifiers:{enemyHealthMultiplier:number;enemyMoveSpeedMultiplier:number;incomingDamageMultiplier:number;experienceMultiplier:number}};
    level:number;experience:number;experienceToNext:number;queuedLevels:number;elapsedMs:number;playerX:number;playerY:number;
    environment:{timeOfDay:string;weather:string;timeLabel:string;weatherLabel:string;enemyMoveSpeedMultiplier:number;elementDamageMultipliers:Partial<Record<ElementId,number>>};
    regionMap:{regionId:string;roomIds:string[];wallCount:number;connected:boolean;playerWalkable:boolean};
    paused:boolean;bossSpawned:boolean;bossVariantId:string|null;bossChestAvailable:boolean;bossVictoryPending:boolean;evolvedWeaponIds:string[];choices:{id:string;title:string;kind:string;contentId?:string;branchId?:string}[];
    runSoulEssence:number;runRelicIds:string[];equippedRelicIds:string[];runCraftingMaterials:Record<string,number>;kills:number;runFinished:boolean;lastRunSaved:boolean|null;bossHealth:number|null;bossMaxHealth:number|null;health:number;maxHealth:number;damage:number;moveSpeed:number;
    questProgress:Record<string,{status:'active'|'completed';objectiveProgress:Record<string,number>}>;
    questChoice:{questId:string;choiceIds:string[]}|null;questTrackerText:string;
    discoveredLoreIds:string[];discoveredPathIds:string[];explorationLandmarks:{id:string;kind:string;name:string;description:string;motif:string;decorationVisible:boolean}[];availableStoryPathIds:string[];lastTraversedStoryPathId:string|null;
    storyWorldState:{npcId:string|null;npcName:string|null;npcFateId:string|null;npcFateLabel:string|null;atmosphereId:string|null;atmosphereName:string|null;renderedObjectCount:number};
    passives:{passiveId:string;level:number;special:boolean}[];activePassiveSpecialIds:string[];activeWeaponSynergyIds:string[];weaponSynergyTriggers:string[];
    weapons:{weaponId:string;level:number;branchId:string|null;evolved:boolean;stats:{damage:number;intervalMs:number;range:number;projectiles:number;pierce:number;areaMultiplier:number;chainTargetBonus:number;branchName:string|null}|null}[];
    shotDiagnostics:{weaponId:string;damage:number}[];
    bossChestDiagnostics:{overlapCount:number;lastOverlapAtMs:number|null;collectCount:number;lastCollectAtMs:number|null;lastCollectObjectActive:boolean|null;lastCollectPending:boolean|null;collectOutcome:'none'|'entered'|'inactive'|'not-pending'|'opened';openedAtMs:number|null;finishScheduledAtMs:number|null;finishCallbackAtMs:number|null;finishTimer:{paused:boolean;hasDispatched:boolean;elapsed:number;delay:number;timeScale:number}|null;sceneTime:{paused:boolean;now:number;active:boolean};playerBody:{x:number;y:number;width:number;height:number;enabled:boolean};chestBody:{x:number;y:number;width:number;height:number;enabled:boolean}|null};
    runEvents:{selected:RunEventKind[];active:{kind:RunEventKind;progress:number;stage:number;status:string}|null;completed:RunEventKind[];failed:RunEventKind[]};
    controls:LevelUpControlState;permanentUpgradeEffects:PermanentUpgradeEffects;savedPermanentUpgradeLevels:Record<string,number>;saveLoadStatus:string;
  } {
    this.assertBrowserTestMode();
    return {
      ability:{effect:this.character.ability.effect,cooldownRemainingMs:Math.max(0,this.abilityReady-this.time.now),guardActive:this.time.now<this.abilityGuardUntil,lastDamage:this.abilityLastDamage,lastHealing:this.abilityLastHealing,markedTargetCount:this.activeTargets().filter(target=>Number(target.getData('abilityMarkedUntil')??0)>this.time.now).length,delayedZoneFired:this.abilityDelayedZoneFired,delayedZoneCandidateCount:this.abilityDelayedZoneCandidateCount,delayedZoneInRangeCount:this.abilityDelayedZoneInRangeCount,delayedZoneRunFinished:this.abilityDelayedZoneRunFinished,delayedZoneDamage:this.abilityDelayedZoneDamage,sceneTimePaused:this.time.paused,sceneActive:this.sys.isActive(),sceneTimeNow:this.time.now,delayedTimer:this.abilityDelayedZoneTimer?{paused:this.abilityDelayedZoneTimer.paused,hasDispatched:this.abilityDelayedZoneTimer.hasDispatched,elapsed:this.abilityDelayedZoneTimer.getElapsed(),delay:this.abilityDelayedZoneTimer.delay,timeScale:this.abilityDelayedZoneTimer.timeScale}:null},
      level:this.state.level,experience:this.state.experience,experienceToNext:this.state.experienceToNext,
      regionMap:{regionId:this.mapLayout.regionId,roomIds:this.mapLayout.rooms.map(room=>room.id),wallCount:this.mapBoundaryCount,connected:this.mapConnected,playerWalkable:isRegionMapWalkable(this.mapLayout,this.player.x,this.player.y,-24)},
      gameMode:this.gameMode,newGamePlusLevel:this.newGamePlusLevel,newGamePlusModifiers:getNewGamePlusModifiers(this.newGamePlusLevel),challengeId:this.challengeId,challengeModifiers:getChallengeModifiers(this.challengeId),weaponSlotsUsed:this.build.weapons.length,waveSpawnIndex:this.waveDirector.spawnIndex,activeEnemyCount:this.enemies.countActive(true),queuedLevels:this.queuedLevels,elapsedMs:this.state.elapsedMs,playerX:this.player.x,playerY:this.player.y,environment:{timeOfDay:this.environmentState.timeOfDay,weather:this.environmentState.weather,timeLabel:this.environmentState.timeLabel,weatherLabel:this.environmentState.weatherLabel,enemyMoveSpeedMultiplier:this.environmentState.enemyMoveSpeedMultiplier,elementDamageMultipliers:{...this.environmentState.elementDamageMultipliers}},paused:this.paused,bossSpawned:this.bossSpawned,bossVariantId:this.activeBossVariantId,bossChestAvailable:this.eventObjects.getChildren().some(object=>object.getData('eventObjectType')==='boss-chest'),bossVictoryPending:this.bossVictoryPending,
      evolvedWeaponIds:this.build.weapons.filter(weapon=>weapon.evolved).map(weapon=>weapon.weaponId),
      choices:this.currentLevelChoices.map(({id,title,kind,contentId,branchId})=>({id,title,kind,contentId,branchId})),
      passives:this.build.passives.map(item=>({...item})),activePassiveSpecialIds:this.build.passives.filter(item=>item.special).map(item=>item.passiveId),
      activeWeaponSynergyIds:this.build.weapons.flatMap(weapon=>getActiveWeaponSynergies(weapon.weaponId,this.build.passives.map(passive=>passive.passiveId)).map(synergy=>synergy.id)),weaponSynergyTriggers:[...this.weaponSynergyTriggers],
      weapons:this.build.weapons.map(progress=>{const definition=WEAPONS.find(item=>item.id===progress.weaponId);const stats=definition?weaponLevelStats(progress,definition,this.unlockedWeaponVariantIds):undefined;return {weaponId:progress.weaponId,level:progress.level,branchId:progress.branchId??null,evolved:progress.evolved,stats:stats?{damage:stats.damage,intervalMs:stats.intervalMs,range:stats.range,projectiles:stats.projectiles,pierce:stats.pierce,areaMultiplier:stats.areaMultiplier,chainTargetBonus:stats.chainTargetBonus,branchName:stats.branchName??null}:null};}),
      shotDiagnostics:this.shots.getChildren().filter(child=>child.active&&child.getData('weaponId')).map(child=>({weaponId:String(child.getData('weaponId')),damage:Number(child.getData('damage'))})), 
      runSoulEssence:this.runSoulEssence,runRelicIds:[...this.runRelicIds],equippedRelicIds:[...this.equippedRelicIds],runCraftingMaterials:{...this.runCraftingMaterials},kills:this.state.kills,runFinished:this.runFinished,lastRunSaved:this.lastRunSaved,
      bossHealth:this.bossState?.health??null,bossMaxHealth:this.bossState?.maxHealth??null,endless:{bossCyclesCompleted:this.endlessState.bossCyclesCompleted,nextBossAtMs:this.endlessState.nextBossAtMs,ruleId:getEndlessRule(this.state.elapsedMs)?.id??null,ruleName:getEndlessRule(this.state.elapsedMs)?.name??null,ruleModifiers:getEndlessRuleModifiers(this.state.elapsedMs)},health:this.state.health,maxHealth:this.state.maxHealth,damage:this.state.damage,moveSpeed:this.state.moveSpeed,
      questProgress:Object.fromEntries(Object.entries(this.questSaveData?.story.quests??{}).map(([id,progress])=>[id,{status:progress.status,objectiveProgress:{...progress.objectiveProgress}}])),
      questChoice:this.pendingQuestChoiceId?{questId:this.pendingQuestChoiceId,choiceIds:QUEST_BY_ID.get(this.pendingQuestChoiceId)?.choices.map(choice=>choice.id)??[]}:null,questTrackerText:String(this.questHud?.text??''),
      discoveredLoreIds:[...this.runDiscoveredLoreIds],discoveredPathIds:[...this.runDiscoveredPathIds],explorationLandmarks:this.eventObjects.getChildren().filter(object=>object.getData('eventObjectType')==='exploration-lore'||object.getData('eventObjectType')==='exploration-secret').map(object=>({id:String(object.getData('explorationPointId')),kind:String(object.getData('eventObjectType')),name:String(object.getData('explorationName')),description:String(object.getData('explorationDescription')),motif:String(object.getData('explorationMotif')),decorationVisible:Boolean((object.getData('eventObjectDecoration') as Phaser.GameObjects.GameObject|undefined)?.active)})),availableStoryPathIds:this.activeStoryPaths.map(path=>path.id),lastTraversedStoryPathId:this.lastTraversedStoryPathId,
      storyWorldState:{npcId:this.activeStoryWorldState?.npc?.definition.id??null,npcName:this.activeStoryWorldState?.npc?.definition.name??null,npcFateId:this.activeStoryWorldState?.npc?.fateId??null,npcFateLabel:this.activeStoryWorldState?.npc?.fate.label??null,atmosphereId:this.activeStoryWorldState?.atmosphere?.id??null,atmosphereName:this.activeStoryWorldState?.atmosphere?.name??null,renderedObjectCount:this.storyWorldObjectCount},
      bossChestDiagnostics:(()=>{
        const playerBody=this.player.body as Phaser.Physics.Arcade.Body;
        const chest=this.eventObjects.getChildren().find(object=>object.getData('eventObjectType')==='boss-chest');
        const chestBody=chest?.body as Phaser.Physics.Arcade.Body|undefined;
        return {
          overlapCount:this.bossChestOverlapCount,lastOverlapAtMs:this.bossChestLastOverlapAtMs,
          collectCount:this.bossChestCollectCount,lastCollectAtMs:this.bossChestLastCollectAtMs,
          lastCollectObjectActive:this.bossChestLastCollectObjectActive,lastCollectPending:this.bossChestLastCollectPending,
          collectOutcome:this.bossChestCollectOutcome,openedAtMs:this.bossChestOpenedAtMs,
          finishScheduledAtMs:this.bossChestFinishScheduledAtMs,finishCallbackAtMs:this.bossChestFinishCallbackAtMs,
          finishTimer:this.bossChestFinishTimer?{paused:this.bossChestFinishTimer.paused,hasDispatched:this.bossChestFinishTimer.hasDispatched,elapsed:this.bossChestFinishTimer.elapsed,delay:this.bossChestFinishTimer.delay,timeScale:this.bossChestFinishTimer.timeScale}:null,
          sceneTime:{paused:this.time.paused,now:this.time.now,active:this.sys.isActive()},
          playerBody:{x:playerBody.x,y:playerBody.y,width:playerBody.width,height:playerBody.height,enabled:playerBody.enable},
          chestBody:chestBody?{x:chestBody.x,y:chestBody.y,width:chestBody.width,height:chestBody.height,enabled:chestBody.enable}:null
        };
      })(),
      runEvents:{selected:[...this.runEventState.selectedEvents],active:this.runEventState.activeEvent?{kind:this.runEventState.activeEvent.kind,progress:this.runEventState.activeEvent.progress,stage:this.runEventState.activeEvent.stage,status:this.runEventState.activeEvent.status}:null,completed:[...this.runEventState.completedEvents],failed:[...this.runEventState.failedEvents]},
      controls:{...this.levelUpControls,bannedChoiceIds:[...this.levelUpControls.bannedChoiceIds]},
      permanentUpgradeEffects:{...this.permanentUpgradeEffects},
      savedPermanentUpgradeLevels:(()=>{const manager=this.registry.get('saveManager') as SaveManager|undefined;const loaded=manager?.load();return loaded&&'data' in loaded?{...loaded.data.progression.permanentUpgrades}:{};})(),
      saveLoadStatus:String(this.registry.get('saveLoadStatus')??'unavailable')
    };
  }

  browserTestFireWeaponSynergy(weaponId:string,passiveId:string):{activeSynergyIds:string[];primaryHealth:number;secondaryHealth:number;secondaryDamage:number;synergyKind:string} {
    this.assertBrowserTestMode();
    const weapon=WEAPONS.find(item=>item.id===weaponId),passive=PASSIVES.find(item=>item.id===passiveId);
    if(!weapon||!passive)throw new Error('Unknown browser test weapon/passive pair.');
    const active=getActiveWeaponSynergies(weaponId,[passiveId]);
    if(active.length!==1)throw new Error('Expected exactly one authored synergy for '+weaponId+'/'+passiveId+'.');
    const synergy=active[0]!;

    // Keep every scenario independent: old targets and delayed zones must not leak into the next case.
    for(const child of [...this.enemies.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    for(const child of [...this.shots.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    for(const child of [...this.orbs.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    this.passiveZones.forEach(zone=>zone.marker.destroy());this.passiveZones=[];
    this.clearOverlay();this.runFinished=false;this.paused=false;this.time.paused=false;this.physics.world.resume();
    // Stop autonomous spawning and auto-attacks so ambient XP pickups cannot open a level-up
    // overlay while a delayed synergy effect is being measured.
    this.waveDirector={...this.waveDirector,nextSpawnAtMs:Number.POSITIVE_INFINITY,nextEliteAtMs:Number.POSITIVE_INFINITY};
    for(const key of Object.keys(this.weaponReady))this.weaponReady[key]=Number.POSITIVE_INFINITY;
    this.queuedLevels=0;this.currentLevelChoices=[];
    this.state={...this.state,health:this.state.maxHealth,experience:0,experienceToNext:10,level:1};
    this.build={weapons:[{weaponId,level:1,evolved:false}],passives:[{passiveId,level:1,special:false}]};
    this.weaponReady[weaponId]=Number.POSITIVE_INFINITY;
    this.weaponSynergyTriggers=[];

    const definition=ENEMIES.find(item=>item.id===this.region.enemyIds[0]);
    if(!definition)throw new Error('The current region has no test enemy.');
    const targetCount=synergy.kind==='storm-lance'?4:2;
    const targets=Array.from({length:targetCount},(_,index)=>{
      const enemy=this.createEnemy(this.player.x+40+index*24,this.player.y+(index%2)*4,definition,1);
      const body=enemy.body as Phaser.Physics.Arcade.Body;
      body.enable=false;
      return enemy;
    });
    const primary=targets[0]!,secondary=targets[1]!;
    this.browserSynergyTestTargets=targets;
    this.browserSynergyInitialHealth=targets.map(enemy=>Number(enemy.getData('health')));
    this.browserSynergyPlayerHealthBefore=this.state.maxHealth-(synergy.kind==='blood-thread'?20:0);
    this.state={...this.state,health:this.browserSynergyPlayerHealthBefore};

    if(synergy.kind==='frost-ring')this.elementStates.set(primary,{ice:{buildup:0,stacks:1,expiresAt:this.time.now+10_000,nextTickAt:this.time.now+10_000}});
    if(synergy.kind==='crown-sigil')for(const enemy of targets)enemy.setData('weakenedUntil',this.time.now+10_000);
    if(synergy.kind==='crown-guidance'){
      secondary.setData('weakenedUntil',this.time.now+10_000);
      const shot=this.shots.create(this.player.x,this.player.y,'shot') as Phaser.Physics.Arcade.Sprite;
      shot.setData('weaponId',weaponId).setData('damage',12).setData('element','spirit').setData('expires',this.time.now+1900).setData('homing',true).setData('target',primary).setData('pierce',1).setData('area',0);
      primary.destroy();
      this.updateProjectiles(this.time.now);
      this.hitEnemy(shot,secondary);
    }else{
      const behaviorByKind:Record<string,string>={
        'grave-aftershock':'cleaving-arc','storm-lance':'chain-lightning','ember-burst':'chain-lightning',
        'frost-ring':'orbiting-blades','venom-trail':'area-seed','spirit-chain':'spirit-seeker',
        'blood-thread':'life-tether','storm-arc':'fan-volley','ward-pulse':'defensive-pulse',
        'magma-rift':'delayed-mortar','curse-sigil':'delayed-sigil','crown-sigil':'delayed-sigil',
        'spirit-splinter':'spirit-seeker'
      };
      this.executeWeapon(weapon,behaviorByKind[synergy.kind]??weapon.behavior,12,2,Math.max(weapon.range,180),primary,weaponLevelStats(this.build.weapons[0]!,weapon,this.unlockedWeaponVariantIds));
      const shot=this.shots.getChildren().find(child=>child.active&&child.getData('weaponId')===weaponId) as Phaser.Physics.Arcade.Sprite|undefined;
      if(shot)this.hitEnemy(shot,primary);
    }
    const targetHealth=targets.map(enemy=>Number(enemy.getData('health')??0));
    return {activeSynergyIds:active.map(item=>item.id),primaryHealth:targetHealth[0]??0,secondaryHealth:targetHealth[1]??0,secondaryDamage:(this.browserSynergyInitialHealth[1]??0)-(targetHealth[1]??0),synergyKind:synergy.kind};
  }

  browserTestSynergyDiagnostics():{
    targetDamageCount:number;targetHealth:number[];secondaryDamage:number;playerHealthBefore:number;playerHealthAfter:number;
    passiveZoneCount:number;guardActive:boolean;curseStacks:number;runFinished:boolean;scenePaused:boolean;clockPaused:boolean;sceneActive:boolean;sceneTimeNow:number;activeEnemyCount:number;playerHealth:number;
  } {
    this.assertBrowserTestMode();
    const health=this.browserSynergyTestTargets.map(enemy=>Number(enemy.getData('health')??0));
    const state=this.browserSynergyTestTargets[0]?.getData('isBoss')?this.bossElementState:(this.browserSynergyTestTargets[0]?this.elementStates.get(this.browserSynergyTestTargets[0])??{}:{});
    return {
      targetDamageCount:health.filter((value,index)=>value<this.browserSynergyInitialHealth[index]!).length,
      targetHealth:health,
      secondaryDamage:(this.browserSynergyInitialHealth[1]??0)-(health[1]??0),
      playerHealthBefore:this.browserSynergyPlayerHealthBefore,
      playerHealthAfter:this.state.health,
      passiveZoneCount:this.passiveZones.length,
      guardActive:this.time.now<this.weaponSynergyGuardUntil,
      curseStacks:state.dark?.stacks??0,
      runFinished:this.runFinished,scenePaused:this.paused,clockPaused:this.time.paused,sceneActive:this.sys.isActive(),sceneTimeNow:this.time.now,
      activeEnemyCount:this.enemies.countActive(true),playerHealth:this.state.health
    };
  }


  browserTestPermanentUpgradeProbe():{weaponDamage:number;healthBefore:number;healthAfter:number;moveSpeed:number} {
    this.assertBrowserTestMode();
    for(const child of [...this.enemies.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    const weaponProgress=this.build.weapons[0];
    const weapon=weaponProgress?WEAPONS.find(item=>item.id===weaponProgress.weaponId):undefined;
    const definition=ENEMIES.find(item=>item.id===this.region.enemyIds[0]);
    if(!weapon||!weaponProgress||!definition)throw new Error('Permanent upgrade combat probe needs a starting weapon and enemy.');
    const target=this.createEnemy(this.player.x+60,this.player.y,definition,1);
    (target.body as Phaser.Physics.Arcade.Body).enable=false;
    this.weaponReady[weapon.id]=0;
    this.fireWeapons(this.time.now+10_000);
    const shot=this.shots.getChildren().find(child=>child.active&&child.getData('weaponId')===weapon.id) as Phaser.Physics.Arcade.Sprite|undefined;
    const weaponDamage=Number(shot?.getData('damage')??0);
    const healthBefore=this.state.health;
    this.receiveCombatDamage(100);
    return {weaponDamage,healthBefore,healthAfter:this.state.health,moveSpeed:this.state.moveSpeed};
  }

  browserTestSpawnXpOrb(xp:number):void {
    this.assertBrowserTestMode();
    if(!Number.isFinite(xp)||xp<=0)throw new Error('Test XP must be a positive finite number.');
    const orb=this.orbs.create(this.player.x,this.player.y,'orb') as Phaser.Physics.Arcade.Sprite;
    orb.setCircle(6).setData('xp',xp);
  }

  browserTestAdvanceElapsed(milliseconds:number,skipTimedSystems=false):void {
    this.assertBrowserTestMode();
    if(!Number.isFinite(milliseconds)||milliseconds<0)throw new Error('Test time must be a non-negative finite number.');
    const nextElapsed=this.state.elapsedMs+milliseconds;
    this.state={...this.state,elapsedMs:getGameModeRules(this.gameMode).survivalTimeLimitEnabled?Math.min(RUN_MS,nextElapsed):nextElapsed};
    this.updateEnvironment();
    if(getGameModeRules(this.gameMode).timedEventsEnabled){
      if(skipTimedSystems){this.runEventState={...this.runEventState,nextEventIndex:3,activeEvent:null};this.eventSetupPending=false;if(this.gameMode!=='endless')this.waveDirector={...this.waveDirector,nextSpawnAtMs:Number.POSITIVE_INFINITY,nextEliteAtMs:Number.POSITIVE_INFINITY};}
      else this.updateRunEvent(this.time.now);
    }
    if(getGameModeRules(this.gameMode).survivalTimeLimitEnabled&&!this.bossSpawned&&this.state.elapsedMs>=BOSS_START_MS)this.spawnBoss();
    if(this.gameMode==='endless'&&shouldSpawnEndlessBoss(this.endlessState,this.state.elapsedMs,this.bossSpawned,this.bossVictoryPending))this.spawnBoss();
    this.refreshHud();
  }

  browserTestElementReactionProbe(first:ElementId,second:ElementId):{enemyReaction:string;bossReaction:string;enemyIceFrozen:boolean;bossIceFrozen:boolean} {
    this.assertBrowserTestMode();
    const definition=ENEMIES.find(enemy=>enemy.id===this.region.enemyIds[0]);
    if(!definition)throw new Error('The active region has no enemy for the element probe.');
    const enemy=this.createEnemy(this.player.x+36,this.player.y,definition,100);
    (enemy.body as Phaser.Physics.Arcade.Body).enable=false;
    this.lastElementReactionId='';
    for(let i=0;i<7;i++)this.damageEnemy(enemy,1,first);
    for(let i=0;i<7;i++)this.damageEnemy(enemy,1,second);
    const enemyReaction=this.lastElementReactionId;
    const enemyIceFrozen=(this.elementStates.get(enemy)?.ice?.frozenUntil??0)>this.time.now;
    this.spawnBoss();
    if(!this.bossSprite)throw new Error('The active region has no boss for the element probe.');
    this.lastElementReactionId='';
    for(let i=0;i<7;i++)this.damageBossTarget(this.bossSprite,1,first);
    for(let i=0;i<7;i++)this.damageBossTarget(this.bossSprite,1,second);
    return {
      enemyReaction,
      bossReaction:this.lastElementReactionId,
      enemyIceFrozen,
      bossIceFrozen:(this.bossElementState.ice?.frozenUntil??0)>this.time.now
    };
  }

  browserTestSpawnAndDefeatEnemy(enemyId:string):void {
    this.assertBrowserTestMode();
    const definition=ENEMIES.find(enemy=>enemy.id===enemyId);
    if(!definition)throw new Error('Unknown test enemy: '+enemyId);
    const enemy=this.createEnemy(this.player.x+30,this.player.y,definition,1);
    this.damageEnemy(enemy,Number(enemy.getData('health'))*100);
  }

  browserTestEnemySupportProbe():{hexSpeedMultiplier:number;webEnemySlowMultiplier:number;webPlayerSlowMultiplier:number} {
    this.assertBrowserTestMode();
    this.waveDirector={...this.waveDirector,nextSpawnAtMs:Number.POSITIVE_INFINITY,nextEliteAtMs:Number.POSITIVE_INFINITY};
    for(const child of [...this.enemies.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    this.enemyZones.forEach(zone=>zone.marker.destroy());this.enemyZones=[];
    const witch=ENEMIES.find(enemy=>enemy.behavior==='hex-caster');
    const husk=ENEMIES.find(enemy=>enemy.behavior==='pursue');
    if(!witch||!husk)throw new Error('Hex support probe requires its authored enemy definitions.');
    const caster=this.createEnemy(this.player.x+240,this.player.y,witch,1);
    const ally=this.createEnemy(this.player.x+270,this.player.y,husk,1);
    this.applyEnemySpecial(caster,witch,{kind:'hex',targetX:caster.x,targetY:caster.y,radius:145,durationMs:4200,amount:.15,count:0});
    this.moveEnemies(this.time.now+16);
    const hexSpeedMultiplier=(ally.body as Phaser.Physics.Arcade.Body).velocity.length()/husk.speed;

    for(const child of [...this.enemies.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    this.enemyZones.forEach(zone=>zone.marker.destroy());this.enemyZones=[];
    const webAlly=this.createEnemy(this.player.x+80,this.player.y,husk,1);
    this.createEnemyZone(this.player.x+40,this.player.y,155,2600,0,0x83c6c9,.5,true);
    const zoneTime=this.time.now+32;
    this.updateEnemyZones(zoneTime);
    this.moveEnemies(zoneTime+16);
    const webEnemySlowMultiplier=(webAlly.body as Phaser.Physics.Arcade.Body).velocity.length()/husk.speed;
    return {hexSpeedMultiplier,webEnemySlowMultiplier,webPlayerSlowMultiplier:this.playerSlowMultiplier};
  }

  browserTestSoulSnipeFadeProbe():Promise<{before:number;after:number;alpha:number}> {
    this.assertBrowserTestMode();
    for(const child of [...this.enemies.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    const wispDefinition=ENEMIES.find(enemy=>enemy.behavior==='soul-snipe');
    if(!wispDefinition)throw new Error('Soul-snipe probe requires its authored enemy definition.');
    const wisp=this.createEnemy(this.player.x-120,this.player.y,wispDefinition,1);
    (wisp.body as Phaser.Physics.Arcade.Body).enable=false;
    const before=Number(wisp.getData('untargetableUntil')??0);
    this.telegraphAttack(wisp,wispDefinition,this.player.x+120,this.player.y,1,0,'line',46);
    return new Promise(resolve=>this.time.delayedCall(100,()=>resolve({
      before,
      after:Number(wisp.getData('untargetableUntil')??0),
      alpha:wisp.alpha
    })));
  }

  browserTestPreparePassiveSpecial(passiveId:string):void {
    this.assertBrowserTestMode();
    const passive=PASSIVES.find(item=>item.id===passiveId);
    if(!passive)throw new Error('Unknown test passive: '+passiveId);
    this.build={weapons:[],passives:[{passiveId:passive.id,level:5,special:false}]};
    this.queuedLevels=1;this.showLevelUp();
    if(!this.currentLevelChoices.some(choice=>choice.kind==='passive-special'&&choice.contentId===passiveId))throw new Error('Expected special upgrade choice for '+passiveId+'.');
  }

  browserTestReceiveDamage(amount:number):void {
    this.assertBrowserTestMode();
    this.receiveCombatDamage(amount);
  }

  browserTestPrepareWeaponBranch(weaponId:string):void {
    this.assertBrowserTestMode();
    const weapon=WEAPONS.find(item=>item.id===weaponId);
    if(!weapon)throw new Error('Unknown test weapon: '+weaponId);
    this.build={weapons:[{weaponId:weapon.id,level:3,evolved:false}],passives:[]};
    this.queuedLevels=1;
    this.pauseRunWorld();
    this.showLevelUp();
    if(this.currentLevelChoices.filter(choice=>choice.kind==='weapon-branch'&&choice.contentId===weapon.id).length!==2)throw new Error('Expected exactly two branch choices for '+weapon.id+'.');
  }

  browserTestRelicDamageProbe():{baseDamage:number;shotDamage:number;relicMultiplier:number} {
    this.assertBrowserTestMode();
    const weapon=WEAPONS.find(item=>item.id==='veil-bolt');
    if(!weapon)throw new Error('The relic damage probe weapon is missing.');
    for(const child of [...this.shots.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    this.build={weapons:[{weaponId:weapon.id,level:1,evolved:false}],passives:[]};
    this.refreshBuildStats();
    const definition=ENEMIES.find(item=>item.id===this.region.enemyIds[0]);
    if(!definition)throw new Error('The active region has no test enemy.');
    this.createEnemy(this.player.x+60,this.player.y,definition,100);
    this.weaponReady[weapon.id]=0;
    const weaponStats=weaponLevelStats(this.build.weapons[0]!,weapon);
    const baseDamage=weaponStats.damage*this.currentBuildStats().damageMultiplier*this.character.stats.damageMultiplier*this.permanentUpgradeEffects.damageMultiplier;
    this.fireWeapons(this.time.now+10_000);
    const shot=this.shots.getChildren().find(child=>child.active&&child.getData('weaponId')===weapon.id) as Phaser.Physics.Arcade.Sprite|undefined;
    return {
      baseDamage,
      shotDamage:Number(shot?.getData('damage')??0),
      relicMultiplier:this.relicStats.damageMultiplier*getRelicDamageMultiplier(this.equippedRelicIds,this.character.id,weapon.element)
    };
  }

  browserTestFireSelectedWeapon():{shotCount:number;damages:number[]} {
    this.assertBrowserTestMode();
    const progress=this.build.weapons[0];
    const weapon=progress?WEAPONS.find(item=>item.id===progress.weaponId):undefined;
    const targetDefinition=ENEMIES.find(item=>item.id===this.region.enemyIds[0]);
    if(!progress||!weapon||!targetDefinition||!progress.branchId)throw new Error('A branched weapon is required before firing the test attack.');
    for(const child of [...this.shots.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    this.createEnemy(this.player.x+50,this.player.y,targetDefinition,1);
    this.weaponReady[weapon.id]=0;
    this.fireWeapons(this.time.now+10_000);
    const shots=this.shots.getChildren().filter(child=>child.active&&child.getData('weaponId')===weapon.id) as Phaser.Physics.Arcade.Sprite[];
    return {shotCount:shots.length,damages:shots.map(shot=>Number(shot.getData('damage')))};
  }

  browserTestEvolvedWeaponPath(weaponId:string,branchId:string):{
    weaponId:string;branchId:string;evolved:boolean;evolutionName:string|undefined;behavior:string;executedBehavior:string|null;projectileCount:number;damagedTargetCount:number
  } {
    this.assertBrowserTestMode();
    const weapon=WEAPONS.find(item=>item.id===weaponId);
    const passive=weapon?PASSIVES.find(item=>item.id===weapon.evolution.requiredPassiveId):undefined;
    if(!weapon||!passive||!weapon.evolution.branchPaths.some(path=>path.branchId===branchId))throw new Error('Unknown weapon evolution path: '+weaponId+'/'+branchId);
    const targetDefinition=ENEMIES.find(item=>item.id===this.region.enemyIds[0]);
    if(!targetDefinition)throw new Error('The active region has no enemy for the evolution probe.');
    for(const child of [...this.enemies.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    for(const child of [...this.shots.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    this.waveDirector={...this.waveDirector,nextSpawnAtMs:Number.POSITIVE_INFINITY,nextEliteAtMs:Number.POSITIVE_INFINITY};
    this.build={
      weapons:[{weaponId:weapon.id,level:weapon.maxLevel,branchId,evolved:false}],
      passives:[{passiveId:passive.id,level:5,special:false}]
    };
    this.build=evolveWeapon(this.build,weapon);
    this.refreshBuildStats();
    const targets=Array.from({length:3},(_,index)=>{
      const enemy=this.createEnemy(this.player.x+30+index*18,this.player.y, targetDefinition,1);
      (enemy.body as Phaser.Physics.Arcade.Body).enable=false;
      enemy.setData('health',10_000);
      return enemy;
    });
    const before=targets.map(enemy=>Number(enemy.getData('health')));
    this.lastWeaponExecution=undefined;
    this.weaponReady[weapon.id]=0;
    this.fireWeapons(this.time.now+10_000);
    this.weaponReady[weapon.id]=Number.POSITIVE_INFINITY;
    const progress=this.build.weapons[0]!;
    const stats=weaponLevelStats(progress,weapon,this.unlockedWeaponVariantIds);
    const after=targets.map(enemy=>Number(enemy.getData('health')));
    const execution=this.lastWeaponExecution as {weaponId:string;behavior:string}|undefined;
    return {
      weaponId,branchId,evolved:progress.evolved,evolutionName:stats.evolutionName,behavior:stats.behavior,
      executedBehavior:execution?.weaponId===weaponId?execution.behavior:null,
      projectileCount:this.shots.getChildren().filter(child=>child.active&&child.getData('weaponId')===weaponId).length,
      damagedTargetCount:after.filter((health,index)=>health<before[index]!).length
    };
  }

  browserTestPrepareBossChestEvolution():void {
    this.assertBrowserTestMode();
    const weapon=WEAPONS[0]!;
    const passive=PASSIVES.find(item=>item.id===weapon.evolution.requiredPassiveId);
    if(!passive)throw new Error('The test weapon evolution passive is missing.');
    this.build={weapons:[{weaponId:weapon.id,level:weapon.maxLevel,evolved:false}],passives:[{passiveId:passive.id,level:5,special:false}]};
    this.refreshBuildStats();
  }

  browserTestSpawnBossForRegion(regionId:RegionId,encounterIds:string[]=[]):void {
    this.assertBrowserTestMode();
    const region=REGIONS.find(item=>item.id===regionId);
    if(!region)throw new Error('Unknown test boss region: '+regionId);
    for(const child of [...this.enemies.getChildren()])(child as Phaser.Physics.Arcade.Sprite).destroy();
    this.bossArenaObjects.clear(true,true);this.bossArenaState=undefined;
    this.region=region;this.bossEncounterIdsAtRegionEntry=[...encounterIds];this.activeBossVariantId=null;this.bossSpawned=false;this.bossDefinition=undefined;this.bossState=undefined;this.bossSprite=undefined;
    this.spawnBoss();
    if(!this.bossSprite||!this.bossArenaState)throw new Error('Boss arena failed to spawn for '+regionId);
    const definition=BOSSES.find(item=>item.id===region.bossId);
    const encounter=this.bossState as BossEncounterState|undefined;
    if(!definition||!encounter)throw new Error('Boss encounter state failed to initialize for '+regionId);
    this.bossState={...encounter,attackReadyAt:Object.fromEntries(definition.phases.flatMap(phase=>phase.attacks.map(attack=>[attack.id,Number.POSITIVE_INFINITY])))};
  }

  browserTestNewGamePlusProbe():{
    level:number;
    enemy:{health:number;maxHealth:number;speed:number;contactDamage:number;attackDamage:number};
    boss:{health:number;maxHealth:number;contactDamage:number;attackDamage:number;movementMultiplier:number};
  } {
    this.assertBrowserTestMode();
    const baseEnemy=ENEMIES.find(enemy=>enemy.id===this.region.enemyIds[0]);
    if(!baseEnemy)throw new Error('New Game+ probe requires a regional enemy.');
    const enemy=this.createEnemy(this.player.x+220,this.player.y,baseEnemy,1);
    const scaledEnemy=this.scaledEnemyDefinitions.get(baseEnemy.id)??baseEnemy;
    this.spawnBoss();
    if(!this.bossDefinition||!this.bossState)throw new Error('New Game+ probe could not spawn the regional boss.');
    const phase=this.bossDefinition.phases[0]!;
    return {
      level:this.newGamePlusLevel,
      enemy:{health:Number(enemy.getData('health')),maxHealth:Number(enemy.getData('maxHealth')),speed:scaledEnemy.speed,contactDamage:scaledEnemy.contactDamage,attackDamage:scaledEnemy.attack.damage},
      boss:{health:this.bossState.health,maxHealth:this.bossState.maxHealth,contactDamage:this.bossDefinition.contactDamage,attackDamage:phase.attacks[0]!.damage,movementMultiplier:phase.movementMultiplier??1}
    };
  }

  browserTestAdvanceBossPhase():{phaseIndex:number;spawnedSupportEnemyIds:string[]} {
    this.assertBrowserTestMode();
    if(!this.bossSprite||!this.bossDefinition||!this.bossState)throw new Error('No boss encounter is active.');
    this.damageBossTarget(this.bossSprite,this.bossDefinition.health*.55);
    return {phaseIndex:this.bossState.phaseIndex,spawnedSupportEnemyIds:this.enemies.getChildren().filter(child=>child.active&&!child.getData('isBoss')).map(child=>String(child.getData('enemyType')))};
  }

  browserTestArenaSnapshot():{
    bossId:string;bossVariantId:string|null;phaseIndex:number;phaseName:string;phaseAttackIds:string[];phaseAttackShapes:string[];phaseAddEnemyIds:string[];phaseDamageMultiplier:number;phaseMovementMultiplier:number;bossHealth:number;bossMaxHealth:number;bossDamageMultiplier:number;playerPoisonStacks:number;timeNow:number;
    objects:{id:string;kind:string;health:number;active:boolean;disabledUntil:number;revealed:boolean;isTrue:boolean;safe:boolean}[];
    traces:{id:string;motif:string;name:string}[];
  } {
    this.assertBrowserTestMode();
    if(!this.bossArenaState||!this.bossState)throw new Error('No boss arena is active.');
    const phase=this.bossDefinition?.phases[this.bossState.phaseIndex];
     return {bossId:this.bossArenaState.bossId,bossVariantId:this.activeBossVariantId,phaseIndex:this.bossArenaState.phaseIndex,phaseName:phase?.name??'',phaseAttackIds:phase?.attacks.map(attack=>attack.id)??[],phaseAttackShapes:phase?.attacks.map(attack=>attack.telegraph.shape)??[],phaseAddEnemyIds:phase?[...phase.addEnemyIds]:[],phaseDamageMultiplier:phase?.bossDamageMultiplier??1,phaseMovementMultiplier:phase?.movementMultiplier??1,bossHealth:this.bossState.health,bossMaxHealth:this.bossState.maxHealth,bossDamageMultiplier:getBossArenaDamageMultiplier(this.bossArenaState,this.time.now),playerPoisonStacks:this.playerPoisonStacks,timeNow:this.time.now,
      objects:this.bossArenaState.objects.map(({id,kind,health,active,disabledUntil,revealed,isTrue,safe})=>({id,kind,health,active,disabledUntil,revealed,isTrue,safe})),
      traces:this.bossTraceObjects.getChildren().map(child=>({id:String(child.getData('bossTraceId')??''),motif:String(child.getData('bossTraceMotif')??''),name:String(child.getData('bossTraceName')??'')}))};
  }

  browserTestHitArenaObject(objectId:string,element:ElementId):void {
    this.assertBrowserTestMode();
    const target=this.bossArenaObjects.getChildren().find(child=>child.getData('arenaObjectId')===objectId) as Phaser.Physics.Arcade.Sprite|undefined;
    if(!target?.active)throw new Error('Active arena object not found: '+objectId);
    const shot=this.shots.create(target.x,target.y,'shot') as Phaser.Physics.Arcade.Sprite;
    shot.setCircle(5).setData('damage',100).setData('element',element).setData('weaponId','browser-test').setData('expires',this.time.now+500);
    shot.setVelocity(0,0);
  }

  browserTestTouchArenaObject(objectId:string):void {
    this.assertBrowserTestMode();
    const target=this.bossArenaObjects.getChildren().find(child=>child.getData('arenaObjectId')===objectId) as Phaser.Physics.Arcade.Sprite|undefined;
    if(!target?.active)throw new Error('Active arena object not found: '+objectId);
    this.player.setPosition(target.x,target.y).setVelocity(0,0);
  }

  browserTestApplyBossPoison():void {
    this.assertBrowserTestMode();
    this.playerPoisonStacks=4;this.playerPoisonExpiresAt=this.time.now+10_000;this.playerPoisonNextTickAt=this.time.now+60;
  }

  browserTestDamageBoss(amount:number):void {
    this.assertBrowserTestMode();
    if(!this.bossSprite?.active)throw new Error('No active boss to damage.');
    const random=Math.random;Math.random=()=>.999999;
    try{this.damageBossTarget(this.bossSprite,amount);}finally{Math.random=random;}
  }

  browserTestDefeatQuestEnemy():void {
    this.assertBrowserTestMode();
    const definition=ENEMIES.find(enemy=>enemy.id===this.region.enemyIds[0]);
    if(!definition)throw new Error('The current region has no test enemy.');
    const enemy=this.createEnemy(this.player.x+40,this.player.y,definition,1);
    this.damageEnemy(enemy,Number(enemy.getData('health'))*100);
  }

  browserTestCompleteQuestObjectives(questId:string):void {
    this.assertBrowserTestMode();
    const quest=QUEST_BY_ID.get(questId);
    if(!quest||quest.regionId!==this.region.id||!this.questSaveData)throw new Error('The requested active-region quest is unavailable: '+questId);
    for(const objective of quest.objectives){
      this.questSaveData=recordQuestEvent(this.questSaveData,this.region.id,{type:objective.event,filter:objective.eventFilter,amount:objective.target});
    }
    this.refreshHud();this.showPendingQuestChoice();
  }

  browserTestDefeatBoss():void {
    this.assertBrowserTestMode();
    this.spawnBoss();
    if(!this.bossSprite||!this.bossDefinition)throw new Error('The current region has no test boss.');
    this.damageBossTarget(this.bossSprite,this.bossDefinition.health*3);
  }

  browserTestMoveToExplorationPoint(kind:'lore'|'secret'):void {
    this.assertBrowserTestMode();
    const type=kind==='lore'?'exploration-lore':'exploration-secret';
    const point=this.eventObjects.getChildren().find(object=>object.getData('eventObjectType')===type) as Phaser.GameObjects.GameObject&{x:number;y:number}|undefined;
    if(!point)throw new Error('The requested undiscovered exploration point is not present.');
    this.player.setPosition(point.x,point.y).setVelocity(0,0);
  }

  browserTestMoveToStoryPath(pathId:string):void {
    this.assertBrowserTestMode();
    const gate=this.eventObjects.getChildren().find(object=>object.getData('eventObjectType')==='story-path-gate'&&object.getData('storyPathId')===pathId) as Phaser.GameObjects.GameObject&{x:number;y:number}|undefined;
    if(!gate)throw new Error('The requested unlocked story path is not present: '+pathId);
    this.player.setPosition(gate.x,gate.y);
    (this.player.body as Phaser.Physics.Arcade.Body).reset(gate.x,gate.y);
  }

  browserTestMoveToBossChest():void {
    this.assertBrowserTestMode();
    const chest=this.eventObjects.getChildren().find(object=>object.getData('eventObjectType')==='boss-chest') as Phaser.GameObjects.GameObject&{x:number;y:number}|undefined;
    if(!chest)throw new Error('The boss chest has not spawned.');
    this.player.setPosition(chest.x,chest.y).setVelocity(0,0);
  }

  browserTestCompleteActiveEvent():void {
    this.assertBrowserTestMode();
    const active=this.runEventState.activeEvent;
    if(!active||active.status!=='active')throw new Error('There is no active run event to complete.');
    if(active.kind==='elite-invasion'){
      for(const child of [...this.enemies.getChildren()]){const enemy=child as Phaser.Physics.Arcade.Sprite;if(enemy.active&&enemy.getData('runEventKind')===active.kind)this.damageEnemy(enemy,Number(enemy.getData('health'))*100);}
    }else if(active.kind==='spirit-storm'){
      const pickups=this.eventObjects.getChildren().filter(child=>child.getData('eventObjectType')==='spirit-fragment').slice(0,4);
      pickups.forEach(pickup=>this.collectRunEventObject(pickup));
    }else if(active.kind==='treasure-hunt'){
      const chest=this.eventObjects.getChildren().find(child=>child.getData('eventObjectType')==='treasure-chest');
      if(chest)this.collectRunEventObject(chest);
    }else if(active.kind==='hunter-trial'){
      const def=ENEMIES.find(enemy=>enemy.id===this.region.enemyIds[0]);
      if(def)for(let i=0;i<6&&this.runEventState.activeEvent?.status==='active';i++){const enemy=this.createEnemy(this.player.x+30+i*2,this.player.y,def,1);this.damageEnemy(enemy,Number(enemy.getData('health'))*100);}
    }else{
      for(let safety=0;safety<3&&this.runEventState.activeEvent?.status==='active';safety++){
        let tagged=this.enemies.getChildren().map(child=>child as Phaser.Physics.Arcade.Sprite).filter(enemy=>enemy.active&&enemy.getData('runEventKind')===active.kind);
        if(!tagged.length){this.spawnCursedWaveStage(this.runEventState.activeEvent.stage);tagged=this.enemies.getChildren().map(child=>child as Phaser.Physics.Arcade.Sprite).filter(enemy=>enemy.active&&enemy.getData('runEventKind')===active.kind);}
        if(!tagged.length)break;
        tagged.forEach(enemy=>this.damageEnemy(enemy,Number(enemy.getData('health'))*100));
      }
    }
    if(this.runEventState.activeEvent?.status==='active')throw new Error('Browser test could not complete the active run event within its safety limit.');
  }

  browserTestCompleteTreasureHunt():void {
    this.assertBrowserTestMode();
    this.runEventState={...this.runEventState,activeEvent:{kind:'treasure-hunt',startedAtMs:0,deadlineAtMs:40_000,progress:0,stage:1,status:'active'}};
    const chest=this.add.rectangle(this.player.x+20,this.player.y,28,24,0x9a7041).setStrokeStyle(3,0xe6c77f).setDepth(5);
    this.eventObjects.add(chest);chest.setData('eventObjectType','treasure-chest');this.collectRunEventObject(chest);
    if(this.runEventState.activeEvent?.status!=='completed')throw new Error('Treasure chest interaction did not complete the event.');
  }

  browserTestClearEnemies():void {
    this.assertBrowserTestMode();
    for(const child of [...this.enemies.getChildren()]){
      const enemy=child as Phaser.Physics.Arcade.Sprite;
      (enemy.getData('eliteMarker') as Phaser.GameObjects.GameObject|undefined)?.destroy();
      enemy.destroy();
    }
  }

  browserTestFinishRun():void {
    this.assertBrowserTestMode();
    this.finishRun(false);
  }

  init(data:{characterId?:string;regionId?:RegionId;gameMode?:unknown;challengeId?:unknown}):void {
    this.questJournalOpen=false;
    this.character=CHARACTERS.find(c=>c.id===data?.characterId)??STARTING_CHARACTER;
    this.region=REGIONS.find(r=>r.id===data?.regionId)??REGIONS[0]!;
    const requestedMode=resolveGameMode(data?.gameMode);
    this.challengeId=requestedMode==='challenge'?resolveChallengeId(data?.challengeId):null;
    this.gameMode=requestedMode==='challenge'&&!this.challengeId?'survival':requestedMode;
    this.runDiscoveredEnemyIds=[];
    this.runDiscoveredWeaponIds=[];
    this.newGamePlusLevel=0;
    this.scaledEnemyDefinitions.clear();
  }

  create():void {
    this.time.paused=false;this.physics.world.resume();
    const saveManager=this.registry.get('saveManager') as SaveManager|undefined;
    const loadedSave=saveManager?.load();
    this.newGamePlusLevel=loadedSave&&'data' in loadedSave?loadedSave.data.progression.newGamePlusLevel:0;
    this.scaledEnemyDefinitions=new Map(ENEMIES.map(enemy=>[enemy.id,scaleNewGamePlusEnemy(enemy,this.newGamePlusLevel)]));
    this.questSaveData=getGameModeRules(this.gameMode).storyQuestsEnabled&&loadedSave&&'data' in loadedSave?startAvailableQuests(loadedSave.data,this.region.id):undefined;
    this.pendingQuestChoiceId=null;this.questChoiceErrorText=undefined;
     this.bossEncounterIdsAtRegionEntry=loadedSave&&'data' in loadedSave?[...loadedSave.data.story.bossEncounterIds]:[];
     this.activeBossVariantId=null;
    this.permanentUpgradeEffects=derivePermanentUpgradeEffects(loadedSave&&'data' in loadedSave?loadedSave.data.progression.permanentUpgrades:undefined);
    const activeEquipmentProfile=loadedSave&&'data' in loadedSave?getActiveEquipmentProfile(loadedSave.data.progression,this.character.id):null;
    this.equippedRelicIds=activeEquipmentProfile?[...activeEquipmentProfile.relicIds]:loadedSave&&'data' in loadedSave?[...loadedSave.data.progression.equippedRelicIds]:[];
    this.unlockedWeaponVariantIds=loadedSave&&'data' in loadedSave?[...loadedSave.data.collections.unlockedWeaponVariantIds]:[];
    this.relicStats=deriveRelicStats(this.equippedRelicIds,this.character.id);
    const baseMaxHealth=this.character.health+this.permanentUpgradeEffects.maxHealthBonus+this.relicStats.maxHealthBonus;
    const maxHealth=Math.max(1,Math.floor(baseMaxHealth*getChallengeModifiers(this.challengeId).maxHealthMultiplier));
    this.state={...createRunState(),health:maxHealth,maxHealth,moveSpeed:this.character.moveSpeed*this.permanentUpgradeEffects.moveSpeedMultiplier*this.relicStats.moveSpeedMultiplier,damage:18*this.character.stats.damageMultiplier*this.permanentUpgradeEffects.damageMultiplier,attackIntervalMs:720};
    this.build=EMPTY_BUILD;
    const startingWeapon=WEAPONS.find(w=>w.id===(activeEquipmentProfile?.startingWeaponId??this.character.startingWeaponId))??WEAPONS[0]!;
    const startingPassive=PASSIVES.find(p=>p.id===(activeEquipmentProfile?.startingPassiveId??this.character.startingPassiveId))??PASSIVES[0]!;
    this.build=addWeapon(this.build,startingWeapon);this.build=addPassive(this.build,startingPassive);
    this.runDiscoveredWeaponIds=[startingWeapon.id];
    this.paused=false;this.queuedLevels=0;this.levelUpControls=createLevelUpControlState(this.permanentUpgradeEffects.extraRerolls);this.currentLevelChoices=[];this.banishMode=false;this.nextDamage=0;this.dashReady=0;this.dashUntil=0;this.abilityReady=0;this.abilityGuardUntil=0;this.abilityGuardDamageMultiplier=.35;this.abilityLastEffect='';this.abilityLastDamage=0;this.abilityLastHealing=0;
    this.previousGamepadFrame=EMPTY_GAMEPAD_FRAME;this.gamepadMoveX=0;this.gamepadMoveY=0;this.clearOverlay();
    const requestedSeed=this.registry.get('runSeed');
    this.runSeed=typeof requestedSeed==='number'&&Number.isFinite(requestedSeed)?requestedSeed>>>0:((Date.now()^Math.floor(Math.random()*0xffffffff))>>>0);
    if(this.runSeed===0)this.runSeed=1;
    this.waveDirector=createWaveDirector(this.runSeed);this.endlessState=createEndlessRuntimeState();this.runEventState=createRunEventState(this.runSeed);this.eventSetupPending=false;this.pendingCursedStage=1;this.weaponReady={};this.bossDefinition=undefined;this.bossState=undefined;this.bossSprite=undefined;
    this.bossElementState={};this.bossArenaState=undefined;this.playerPoisonStacks=0;this.playerPoisonExpiresAt=0;this.playerPoisonNextTickAt=0;this.arenaInteractionReadyAt=0;this.lastBossArenaVisualsAt=0;this.enemyStates=new WeakMap();this.elementStates=new WeakMap();
    this.basePowerBonus=0;this.baseMagnetBonus=0;this.baseHasteMultiplier=1;this.playerSlowUntil=0;this.playerSlowMultiplier=1;this.enemyZones=[];this.passiveZones.forEach(zone=>zone.marker.destroy());this.passiveZones=[];this.passiveSpecialState=createPassiveSpecialRuntimeState();this.passiveSpecialFeedback?.destroy();this.passiveSpecialFeedback=undefined;this.weaponSynergyGuardUntil=0;this.weaponSynergyGuardReduction=.28;this.weaponSynergyTriggers=[];
    this.hazardCycle=createHazardCycle(this.time.now);this.activeHazardId='';this.hazardHasHit=false;this.hazardTargetForced=false;this.hazardPoisonStacks=0;this.hazardPoisonExpiresAt=0;this.hazardPoisonNextTickAt=0;this.hazardLastEffectId='';this.hazardLastDamage=0;this.bossSpawned=false;this.bossVictoryPending=false;this.bossChestOverlapCount=0;this.bossChestLastOverlapAtMs=null;this.bossChestCollectCount=0;this.bossChestLastCollectAtMs=null;this.bossChestLastCollectObjectActive=null;this.bossChestLastCollectPending=null;this.bossChestCollectOutcome='none';this.bossChestOpenedAtMs=null;this.bossChestFinishScheduledAtMs=null;this.bossChestFinishCallbackAtMs=null;this.bossChestFinishTimer=undefined;this.runFinished=false;this.runSoulEssence=0;this.runRelicIds=[];this.runDiscoveredLoreIds=[];this.runDiscoveredPathIds=[];this.activeStoryPaths=[];this.lastTraversedStoryPathId=null;this.activeStoryWorldState=null;this.storyWorldObjectCount=0;this.bossChestOpened=false;this.completedTreasureHunt=false;this.runCraftingMaterials={};this.lastRunSaved=null;
    const resolvedMap=resolveRegionMap(this.region.id);this.mapLayout=resolvedMap.layout;this.mapBoundaryCount=resolvedMap.boundary.length;this.mapConnected=resolvedMap.connected;
    this.makeTextures();
    this.physics.world.setBounds(0,0,WORLD_W,WORLD_H);
    this.mapWalls=this.physics.add.staticGroup();
    for(const point of resolvedMap.boundary){const wall=this.mapWalls.create(point.x,point.y,'map-wall') as Phaser.Physics.Arcade.Image;wall.setDepth(-3);(wall.body as Phaser.Physics.Arcade.StaticBody).setCircle(20);}
    const mapDrawing=this.add.graphics().setDepth(-4);mapDrawing.lineStyle(7,0x756653,.38);
    for(const room of this.mapLayout.rooms){mapDrawing.strokeEllipse(room.x,room.y,room.radiusX*2,room.radiusY*2);}
    mapDrawing.lineStyle(9,0x756653,.24);
    for(const corridor of this.mapLayout.corridors){const from=this.mapLayout.rooms.find(room=>room.id===corridor.from)!;const to=this.mapLayout.rooms.find(room=>room.id===corridor.to)!;mapDrawing.beginPath();mapDrawing.moveTo(from.x,from.y);for(let step=1;step<=24;step++){const t=step/24,u=1-t;mapDrawing.lineTo(u*u*from.x+2*u*t*corridor.controlX+t*t*to.x,u*u*from.y+2*u*t*corridor.controlY+t*t*to.y);}mapDrawing.strokePath();}
    this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H).setBackgroundColor(this.region.palette[0]??'#15131a');
    const floor=this.add.graphics();floor.fillStyle(0x19171d,1);floor.fillRect(0,0,WORLD_W,WORLD_H);
    floor.lineStyle(1,0x3a3337,0.12);
    for(let i=0;i<28;i++){const x=Phaser.Math.Between(80,WORLD_W-80),y=Phaser.Math.Between(80,WORLD_H-80);floor.lineStyle(2,0x8a795d,0.08);floor.strokeCircle(x,y,Phaser.Math.Between(18,64));}
    floor.setDepth(-10);
    this.enemies=this.physics.add.group();this.shots=this.physics.add.group({maxSize:100});this.orbs=this.physics.add.group({maxSize:80});this.eventObjects=this.physics.add.group();this.bossArenaObjects=this.physics.add.group();this.bossTraceObjects=this.add.group();
    const start=resolveRegionMapPosition(this.mapLayout,WORLD_W/2,WORLD_H/2,24);
    this.player=this.physics.add.sprite(start.x,start.y,'hunter').setCircle(12).setCollideWorldBounds(true).setDepth(3);
    this.physics.add.collider(this.player,this.mapWalls);
    this.physics.add.collider(this.enemies,this.mapWalls);
    this.cameras.main.startFollow(this.player,true,0.08,0.08);
    this.cursors=this.input.keyboard!.createCursorKeys();
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,SPACE,E,ESC,ENTER') as Record<string,Phaser.Input.Keyboard.Key>;
    this.physics.add.overlap(this.shots,this.enemies,(a,b)=>this.hitEnemy(a as Phaser.Physics.Arcade.Sprite,b as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.shots,this.bossArenaObjects,(a,b)=>this.hitBossArenaObject(a as Phaser.Physics.Arcade.Sprite,b as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player,this.bossArenaObjects,(_p,o)=>this.touchBossArenaObject(o as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player,this.enemies,(_p,e)=>this.contactDamage(e as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player,this.orbs,(_p,o)=>this.collectOrb(o as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player,this.eventObjects,(_p,o)=>this.handleRunEventObjectOverlap(o as Phaser.GameObjects.GameObject));
    if(getGameModeRules(this.gameMode).explorationEnabled){
      this.spawnExplorationPoints(loadedSave&&'data' in loadedSave?loadedSave.data:undefined);
      this.spawnUnlockedStoryPaths(loadedSave&&'data' in loadedSave?loadedSave.data:undefined);
      this.spawnStoryWorldState(loadedSave&&'data' in loadedSave?loadedSave.data:undefined);
    }
    this.environmentState=resolveEnvironment(this.region.id,this.state.elapsedMs);
    this.createHud();this.createTouchControls();this.refreshBuildStats();
    if(getGameModeRules(this.gameMode).regularWavesEnabled){
      this.spawnEnemy();
      this.waveDirector={...this.waveDirector,spawnIndex:1,nextSpawnAtMs:1500};
    }else{
      this.waveDirector={...this.waveDirector,nextSpawnAtMs:Number.POSITIVE_INFINITY,nextEliteAtMs:Number.POSITIVE_INFINITY};
      if(getGameModeRules(this.gameMode).startsBossImmediately)this.spawnBoss();
    }
  }

  private makeTextures():void {
    const make=(key:string,color:number,r:number):void=>{
      if(this.textures.exists(key))return;
      const g=this.add.graphics();g.fillStyle(color,1);g.fillCircle(r+3,r+3,r);g.lineStyle(2,0xe8d7b6,.75);g.strokeCircle(r+3,r+3,r);
      g.generateTexture(key,(r+3)*2,(r+3)*2);g.destroy();
    };
    make('hunter',0xc2a36d,13);make('shot',0xe8c77a,5);make('orb',0x69b7a5,5);make('map-wall',0x51483e,20);
    for(const boss of BOSSES)make('boss-'+boss.id,0x8e4567,31);
    make('arena-root-pillar',0x78964a,22);make('arena-grave-marker',0x9b8a75,22);make('arena-gear',0xb57b43,22);make('arena-water-island',0x4b9d9a,28);make('arena-seal',0x8062a6,22);
    if(!this.textures.exists('boss-chest')){
      const chest=this.add.graphics();
      chest.fillStyle(0x593b26,1);chest.fillRoundedRect(4,12,40,25,4);
      chest.lineStyle(3,0xe5bd68,1);chest.strokeRoundedRect(4,12,40,25,4);
      chest.fillStyle(0xb9863e,1);chest.fillRect(5,8,38,9);
      chest.lineStyle(2,0xffe5a0,1);chest.strokeRect(5,8,38,9);
      chest.fillStyle(0xd8ad55,1);chest.fillRoundedRect(20,17,8,13,2);
      chest.fillCircle(24,20,2);chest.generateTexture('boss-chest',48,42);chest.destroy();
    }
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
    this.eventHud=this.add.text(w/2,122,'',{fontSize:'13px',color:'#d9c69d',backgroundColor:'#211b20',padding:{x:8,y:4},align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(112).setVisible(false);
    this.questHudPanel=this.add.rectangle(198,160,352,82,0x171319,.86).setStrokeStyle(1,0x756653,.7).setScrollFactor(0).setDepth(98).setVisible(false);
    this.questHud=this.add.text(34,123,'',{fontFamily:'Arial',fontSize:'12px',color:'#e7dccb',lineSpacing:4,wordWrap:{width:326}}).setScrollFactor(0).setDepth(99).setVisible(false);
    this.environmentHud=this.add.text(w/2+118,22,'',{fontFamily:'Arial',fontSize:'12px',color:'#c9d2d6',align:'left'}).setOrigin(0,.5).setScrollFactor(0).setDepth(100);
    this.environmentOverlay=this.add.rectangle(w/2,this.scale.height/2,w,this.scale.height,0xffffff,0).setScrollFactor(0).setDepth(90).setOrigin(.5);
    this.environmentPhaseOverlay=this.add.rectangle(w/2,this.scale.height/2,w,this.scale.height,0xffffff,0).setScrollFactor(0).setDepth(89).setOrigin(.5);
    this.updateEnvironment(true);
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
    if(this.questJournalOpen)return;
    const frame=this.readGamepadFrame();
    const gamepad=resolveGamepadInput(frame,this.previousGamepadFrame);
    this.previousGamepadFrame=frame;
    this.gamepadMoveX=gamepad.moveX;this.gamepadMoveY=gamepad.moveY;
    if(this.paused){this.handleOverlayInput(gamepad);return;}
    if(this.runFinished)return;
    if(gamepad.southPressed)this.tryDash();
    if(gamepad.westPressed)this.useAbility();
    if(gamepad.startPressed){this.openPause();return;}
    this.state=advanceRun(this.state,delta);this.updateEnvironment();
    if(getGameModeRules(this.gameMode).timedEventsEnabled)this.updateRunEvent(time);
    this.move(time);if(this.paused)return;this.moveEnemies(time);this.updateEnemyZones(time);this.updatePassiveZones(time);this.spawnDirector(time);this.fireWeapons(time);this.updateProjectiles(time);
    this.expireShots(time);this.magnetize();this.updateElementStatuses(time);this.updateRegionHazard(time);this.updateBossArena(time);
    if(this.gameMode==='survival'&&!this.bossSpawned&&this.state.elapsedMs>=BOSS_START_MS)this.spawnBoss();
    if(this.gameMode==='endless'&&shouldSpawnEndlessBoss(this.endlessState,this.state.elapsedMs,this.bossSpawned,this.bossVictoryPending))this.spawnBoss();
    if(getGameModeRules(this.gameMode).survivalTimeLimitEnabled&&this.state.elapsedMs>=RUN_MS&&!this.bossState&&!this.bossSpawned)this.spawnBoss();
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
    const stats=this.currentBuildStats();const speed=this.character.moveSpeed*stats.moveSpeedMultiplier*this.permanentUpgradeEffects.moveSpeedMultiplier*this.relicStats.moveSpeedMultiplier*(time<this.playerSlowUntil?this.playerSlowMultiplier:1);
    if(time>=this.dashUntil)this.player.setVelocity(dir.x*speed,dir.y*speed);
    else if(dir.length()>0)this.player.setVelocity(dir.x*speed*2.6,dir.y*speed*2.6);
  }

  private tryDash():void {
    if(this.time.now<this.dashReady||this.paused)return;
    const velocity=(this.player.body as Phaser.Physics.Arcade.Body).velocity.clone();
    const dir=velocity.length()?velocity.normalize():new Phaser.Math.Vector2(1,0);
    const ghostStep=PASSIVES.find(item=>item.specialUpgrade.mechanic.kind==='ghost-step')?.specialUpgrade.mechanic;
    this.dashUntil=this.time.now+190+(isPassiveSpecialActive(this.build,'hunters-greaves')&&ghostStep?.kind==='ghost-step'?ghostStep.immunityMs:0);this.dashReady=this.time.now+1150;
    this.player.setVelocity(dir.x*this.state.moveSpeed*2.8,dir.y*this.state.moveSpeed*2.8);this.cameras.main.shake(75,.0018);
  }

  private useAbility():void {
    if(this.time.now<this.abilityReady||this.paused||this.runFinished)return;
    const stats=this.currentBuildStats(),definition=this.character.ability,element=this.character.elementSynergies[0];
    const targets=this.activeTargets(),velocity=(this.player.body as Phaser.Physics.Arcade.Body).velocity;
    const resolution=resolveCharacterAbility(definition.effect,{origin:{x:this.player.x,y:this.player.y},targets:targets.map((target,index)=>({id:String(index),x:target.x,y:target.y})),range:definition.range,maxHealth:this.state.maxHealth,currentHealth:this.state.health,aim:{x:velocity.x,y:velocity.y}});
    this.abilityReady=this.time.now+definition.cooldownMs*stats.abilityCooldownMultiplier*this.relicStats.abilityCooldownMultiplier;
    this.abilityLastEffect=definition.effect;this.abilityLastDamage=0;this.abilityLastHealing=0;this.abilityDelayedZoneFired=false;this.abilityDelayedZoneCandidateCount=0;this.abilityDelayedZoneInRangeCount=0;this.abilityDelayedZoneRunFinished=false;this.abilityDelayedZoneDamage=0;
    const damage=this.state.damage*definition.damageMultiplier*stats.damageMultiplier*this.character.stats.damageMultiplier*this.relicStats.damageMultiplier*getRelicDamageMultiplier(this.equippedRelicIds,this.character.id,element);
    if(resolution.effect==='radial-knockback'){
      resolution.targetIndexes.forEach((index,slot)=>{const target=targets[index];if(!target?.active)return;this.abilityLastDamage+=this.damageEnemy(target,damage,element);const impulse=resolution.knockback[slot];if(impulse)target.setVelocity(impulse.x,impulse.y);});
      this.cameras.main.shake(130,.004);
    }else if(resolution.effect==='guard-and-stagger'){
      this.abilityGuardUntil=this.time.now+resolution.guardDurationMs;this.abilityGuardDamageMultiplier=resolution.guardDamageMultiplier;
      for(const index of resolution.targetIndexes){const target=targets[index];if(!target?.active)continue;this.abilityLastDamage+=this.damageEnemy(target,damage*.7,element);target.setData('abilityStaggeredUntil',this.time.now+resolution.staggerDurationMs).setVelocity(0,0);}
      this.showAbilityFeedback('KARA SİPER  •  HASAR AZALTILDI');this.cameras.main.shake(160,.005);
    }else if(resolution.effect==='delayed-spirit-zone'&&resolution.delayedZone){
      const zone=resolution.delayedZone,marker=this.add.circle(zone.x,zone.y,zone.radius,0x73d7c8,.16).setStrokeStyle(3,0x9be8dc,.9).setDepth(4);
      this.tweens.add({targets:marker,alpha:.38,scale:.92,duration:zone.delayMs,yoyo:true,repeat:0});
      this.abilityDelayedZoneTimer=this.time.delayedCall(zone.delayMs,()=>{this.abilityDelayedZoneFired=true;if(this.runFinished){this.abilityDelayedZoneRunFinished=true;marker.destroy();return;}const candidates=this.activeTargets();const targetsInRange=candidates.filter(target=>Phaser.Math.Distance.Between(zone.x,zone.y,target.x,target.y)<=zone.radius);this.abilityDelayedZoneCandidateCount=candidates.length;this.abilityDelayedZoneInRangeCount=targetsInRange.length;for(const target of targetsInRange){const dealt=this.damageEnemy(target,damage,element);this.abilityDelayedZoneDamage+=dealt;this.abilityLastDamage+=dealt;}marker.setFillStyle(0x73d7c8,.3).setStrokeStyle(4,0xb8fff2,1);this.cameras.main.flash(120,70,170,160);this.time.delayedCall(zone.visualDurationMs,()=>marker.destroy());});
      this.cameras.main.shake(70,.0015);
    }else if(resolution.effect==='blink-and-mark'){
      const destination=resolution.blinkDestination!,safe=resolveRegionMapPosition(this.mapLayout,destination.x,destination.y,30);
      this.player.setPosition(safe.x,safe.y);(this.player.body as Phaser.Physics.Arcade.Body).reset(safe.x,safe.y);this.player.setVelocity(0,0);
      const marked=resolution.markedTargetIndex===null?undefined:targets[resolution.markedTargetIndex];
      if(marked?.active){marked.setData('abilityMarkedUntil',this.time.now+resolution.markDurationMs).setTint(0x9b78c8);this.abilityLastDamage+=this.damageEnemy(marked,damage*.45,element);this.cameras.main.flash(100,110,75,160);}
      this.cameras.main.shake(90,.0025);
    }else if(resolution.effect==='health-sacrifice-lifesteal'){
      this.state={...this.state,health:Math.max(1,this.state.health-resolution.healthCost)};
      let dealt=0;for(const index of resolution.targetIndexes){const target=targets[index];if(target?.active)dealt+=this.damageEnemy(target,damage,element);}
      const before=this.state.health;this.healPlayer(dealt*resolution.lifestealRatio);this.abilityLastDamage=dealt;this.abilityLastHealing=this.state.health-before;
      this.cameras.main.flash(150,190,35,65);this.cameras.main.shake(140,.004);
    }
    this.refreshHud();
  }

  private showAbilityFeedback(message:string):void {
    const label=this.add.text(this.scale.width/2,this.scale.height*.28,message,{fontFamily:'Arial',fontSize:'15px',color:'#e6d3a9',backgroundColor:'#241d22',padding:{x:10,y:6}}).setOrigin(.5).setScrollFactor(0).setDepth(125);
    this.time.delayedCall(950,()=>label.destroy());
  }

  private moveEnemies(time:number):void {
    for(const child of this.enemies.getChildren()){
      const enemy=child as Phaser.Physics.Arcade.Sprite;if(!enemy.active)continue;
      // Ability probe dummies stay fixed so delayed area effects are tested against a stable hit area.
      if(enemy.getData('abilityProbeTarget')===true){enemy.setVelocity(0,0);continue;}
      if(enemy.getData('isBoss')){this.moveBoss(enemy,time);continue;}
      const baseDef=this.enemyDefinition(enemy);if(!baseDef)continue;
      const def=this.scaledEnemyDefinitions.get(baseDef.id)??baseDef;
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
      const isElite=Boolean(enemy.getData('isElite'));
      if(isElite){
        const marker=enemy.getData('eliteMarker') as Phaser.GameObjects.Arc|undefined;marker?.setPosition(enemy.x,enemy.y);
        const health=Number(enemy.getData('health')),maximum=Number(enemy.getData('maxHealth'));
        if(!enemy.getData('eliteEnraged')&&health<=maximum*.5){enemy.setData('eliteEnraged',true).setTint(0xf2a85c);}
        if(time>=Number(enemy.getData('eliteAttackReady')??0)){
          const shape:Record<RegionId,string>={'cursed-forest':'circle','forgotten-graveyard':'cross','deep-dungeon':'line','rotten-swamp':'zone','cursed-castle':'cone'};
          const radius=this.region.id==='cursed-castle'?82:this.region.id==='deep-dungeon'?118:76;
          this.telegraphAttack(enemy,def,this.player.x,this.player.y,def.attack.damage*1.55,720,shape[this.region.id],radius);
          enemy.setData('eliteAttackReady',time+6200);
        }
      }
      const status=this.elementStates.get(enemy)??{};
      const effects=tickElementStatuses(status,time);this.elementStates.set(enemy,effects.state);
      const slow=effects.slowed?.55:1;
      const nightHunter=['pursue','flank','surge','swarm','ambush','phase-stalk','frost-hunt','wraith'].includes(def.behavior);
      const nightBoost=this.environmentState.timeOfDay==='night'&&nightHunter?this.environmentState.enemyMoveSpeedMultiplier:1;
      let vx=intent.velocityX*slow*nightBoost,vy=intent.velocityY*slow*nightBoost;
      const challengeSpeed=getChallengeModifiers(this.challengeId).enemyMoveSpeedMultiplier;
      if(isElite){const boost=enemy.getData('eliteEnraged')?1.32:1.12;vx*=boost;vy*=boost;}
      if(Number(enemy.getData('pounceUntil')??0)>time){vx=Number(enemy.getData('pounceX'))*def.speed*3.1;vy=Number(enemy.getData('pounceY'))*def.speed*3.1;}
      if(def.behavior==='swarm'){
        const pack=this.activeTargets().filter(other=>other!==enemy&&this.enemyDefinition(other)?.behavior==='swarm'&&Phaser.Math.Distance.Between(enemy.x,enemy.y,other.x,other.y)<115).length;
        const packBoost=1+Math.min(.45,pack*.12);vx*=packBoost;vy*=packBoost;
      }
      const enemySlow=Number(enemy.getData('enemySlowUntil')??0)>time?Number(enemy.getData('enemySlowMultiplier')??1):1;
      const moveBuff=Number(enemy.getData('moveSpeedBuffUntil')??0)>time?Number(enemy.getData('moveSpeedBuff')??1):1;
      const endlessSpeed=this.gameMode==='endless'?getEndlessRuleModifiers(this.state.elapsedMs).enemyMoveSpeedMultiplier:1;
      vx*=enemySlow*moveBuff*challengeSpeed*endlessSpeed;vy*=enemySlow*moveBuff*challengeSpeed*endlessSpeed;
      const abilityStaggered=Number(enemy.getData('abilityStaggeredUntil')??0)>time;
      enemy.setVelocity(effects.stunned||effects.frozen||abilityStaggered?0:vx,effects.stunned||effects.frozen||abilityStaggered?0:vy);
      if(effects.damage>0)this.damageEnemy(enemy,effects.damage);
      const concealed=intent.state.burrowed||Number(enemy.getData('untargetableUntil')??0)>time;
      enemy.setAlpha(concealed?.28:1);
      if(intent.attack&&intent.special?.kind!=='pounce'){
        const empowered=def.behavior==='ambush'&&(intent.state.attackCount??0)===1&&!enemy.getData('ambushSpent');
        if(empowered)enemy.setData('ambushSpent',true);
        const buffed=Number(enemy.getData('damageBuffUntil')??0)>time?Number(enemy.getData('damageBuff')??1):1;
        const damage=intent.attack.damage*(empowered?1.8:1)*buffed*(isElite?1.35:1);
        if(def.behavior==='artillery'){
          const velocity=(this.player.body as Phaser.Physics.Arcade.Body).velocity;
          this.telegraphAttack(enemy,def,this.player.x+velocity.x*.7,this.player.y+velocity.y*.7,damage,intent.attack.telegraphMs,'circle',58);
        }else if(def.behavior==='wraith'){
          for(let strike=0;strike<3;strike++)this.time.delayedCall(strike*850,()=>{if(enemy.active)this.telegraphAttack(enemy,def,intent.attack!.targetX,intent.attack!.targetY,damage,Math.min(520,intent.attack!.telegraphMs),def.attack.telegraph.shape,46);});
          if((intent.state.attackCount??0)%3===0)this.enemyStates.set(enemy,{...intent.state,exposedUntil:time+1150});
        }else this.telegraphAttack(enemy,def,intent.attack.targetX,intent.attack.targetY,damage,intent.attack.telegraphMs,def.attack.telegraph.shape,46);
      }
    }
  }

  private moveBoss(boss:Phaser.Physics.Arcade.Sprite,time:number):void {
    if(!this.bossDefinition||!this.bossState)return;
    const lightning=this.bossElementState.lightning,ice=this.bossElementState.ice;
    if((lightning?.stunnedUntil??0)>time||(ice?.frozenUntil??0)>time){boss.setVelocity(0,0);return;}
    const dx=this.player.x-boss.x,dy=this.player.y-boss.y,dist=Math.hypot(dx,dy)||1;
    const phase=this.bossDefinition.phases[this.bossState.phaseIndex]!;
     const challengeSpeed=getChallengeModifiers(this.challengeId).enemyMoveSpeedMultiplier;
     const endlessSpeed=this.gameMode==='endless'?getEndlessRuleModifiers(this.state.elapsedMs).enemyMoveSpeedMultiplier:1;
     const baseBossHealth=BOSSES.find(item=>item.id===this.bossDefinition!.id)?.health??this.bossDefinition.health;
     if(dist>145)boss.setVelocity(dx/dist*baseBossHealth*.006*(phase.movementMultiplier??1)*challengeSpeed*endlessSpeed,dy/dist*baseBossHealth*.006*(phase.movementMultiplier??1)*challengeSpeed*endlessSpeed);else boss.setVelocity(0,0);
     const attack=getBossAttack(this.bossState,phase,time);this.bossState=attack.state;
     if(attack.attack)this.telegraphAttack(boss,undefined,this.player.x,this.player.y,attack.attack.damage*(phase.bossDamageMultiplier??1),attack.attack.telegraph.warningMs,attack.attack.telegraph.shape,100);
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
      if(def?.behavior==='soul-snipe')source.setData('untargetableUntil',this.time.now+520);
      marker.clear();marker.lineStyle(2,0xe65d63,.95);marker.fillStyle(0xe65d63,.22);
      if(shape==='line'){marker.lineBetween(source.x,source.y,x,y);}
      else if(shape==='cross'){marker.lineBetween(x-radius,y,x+radius,y);marker.lineBetween(x,y-radius,x,y+radius);}
      else if(shape==='cone'){const angle=Phaser.Math.Angle.Between(source.x,source.y,x,y);marker.fillTriangle(source.x,source.y,source.x+Math.cos(angle-.48)*radius*2,source.y+Math.sin(angle-.48)*radius*2,source.x+Math.cos(angle+.48)*radius*2,source.y+Math.sin(angle+.48)*radius*2);}
      else{marker.strokeCircle(x,y,radius);marker.fillCircle(x,y,radius);}
      if(this.isInsideTelegraph(shape,source,x,y,radius)){
        const weaken=Number(source.getData('weakenedUntil')??0)>this.time.now?Number(source.getData('weakenedMultiplier')??1):1;
        this.receiveCombatDamage(damage*weaken);
        if(source.getData('isBoss')&&this.bossDefinition?.id==='mire-oracle'&&!this.runFinished){
          this.playerPoisonStacks=Math.min(5,this.playerPoisonStacks+1);this.playerPoisonExpiresAt=this.time.now+8_000;
          if(this.playerPoisonNextTickAt<=this.time.now)this.playerPoisonNextTickAt=this.time.now+1_000;
          this.eventHud?.setText('BATAKLIK ZEHRI  •  GÜVENLİ SU ADASINA ULAŞ').setVisible(true);
        }
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

  private spawnDirector(_time:number):void {
    if(!getGameModeRules(this.gameMode).regularWavesEnabled)return;
    const regionPool=this.region.enemyIds.map(id=>ENEMIES.find(enemy=>enemy.id===id)).filter((enemy):enemy is EnemyDefinition=>Boolean(enemy));
    const pool=this.state.elapsedMs<180000?regionPool.slice(0,3):regionPool;
    if(!pool.length)return;
    const children=this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const activeEliteCount=children.filter(enemy=>enemy.active&&Boolean(enemy.getData('isElite'))).length;
    const plan=stepWaveDirector(this.waveDirector,this.state.elapsedMs,this.enemies.countActive(true),activeEliteCount,42,pool.length,this.gameMode==='endless');
    if(plan.spawnCount===0)return;
    const previousIndex=this.waveDirector.spawnIndex;
    this.waveDirector=plan.state;
    const scale=1+Math.min(2.5,this.state.elapsedMs/360000);
    for(let i=0;i<plan.spawnCount;i++){
      const sequence=previousIndex+i;
      const angle=waveRandom(this.runSeed,sequence,21)*Math.PI*2;
      const distance=390+waveRandom(this.runSeed,sequence,22)*180;
      const x=Phaser.Math.Clamp(this.player.x+Math.cos(angle)*distance,35,WORLD_W-35);
      const y=Phaser.Math.Clamp(this.player.y+Math.sin(angle)*distance,35,WORLD_H-35);
      const definition=pool[plan.enemyIndices[i]??0]!;
      const spawn=resolveRegionMapPosition(this.mapLayout,x,y,definition.radius+24);
      this.createEnemy(spawn.x,spawn.y,definition,scale,plan.eliteDue&&i===0);
    }
  }

  private spawnEnemy():void {
    const pool=this.region.enemyIds.map(id=>ENEMIES.find(enemy=>enemy.id===id)).filter((enemy):enemy is EnemyDefinition=>Boolean(enemy));
    if(!pool.length)return;
    const def=pool[0]!;
    const angle=waveRandom(this.runSeed,0,31)*Math.PI*2;
    const distance=390+waveRandom(this.runSeed,0,32)*180;
    const x=Phaser.Math.Clamp(this.player.x+Math.cos(angle)*distance,35,WORLD_W-35);
    const y=Phaser.Math.Clamp(this.player.y+Math.sin(angle)*distance,35,WORLD_H-35);
    const spawn=resolveRegionMapPosition(this.mapLayout,x,y,def.radius+24);
    this.createEnemy(spawn.x,spawn.y,def,1);
  }

  private createEnemy(x:number,y:number,def:EnemyDefinition,scale:number,isElite=false):Phaser.Physics.Arcade.Sprite {
    const endlessModifiers=this.gameMode==='endless'?getEndlessRuleModifiers(this.state.elapsedMs):getEndlessRuleModifiers(0);
    const newGamePlusModifiers=getNewGamePlusModifiers(this.newGamePlusLevel);
    const healthScale=scale*(isElite?2.4:1)*endlessModifiers.enemyHealthMultiplier*newGamePlusModifiers.enemyHealthMultiplier;
    const maxHealth=Math.round(def.health*healthScale);
    const experience=Math.round(def.experience*(isElite?3:1)*endlessModifiers.experienceMultiplier);
    const safe=resolveRegionMapPosition(this.mapLayout,x,y,def.radius+24);
    const enemy=this.enemies.create(safe.x,safe.y,'enemy-'+def.id) as Phaser.Physics.Arcade.Sprite;
    enemy.setDepth(2).setCircle(def.radius).setData('enemyType',def.id).setData('health',maxHealth).setData('maxHealth',maxHealth).setData('experience',experience);
    if(isElite){
      const marker=this.add.circle(safe.x,safe.y,def.radius+8,0xd9ad5c,.12).setStrokeStyle(3,0xe8c77a,.95).setDepth(1);
      enemy.setTint(0xd9ad5c).setData('isElite',true) .setData('eliteId',this.region.elite.id).setData('eliteName',this.region.elite.name).setData('eliteBehavior',this.region.elite.behavior).setData('eliteReward',this.region.elite.reward).setData('eliteMarker',marker).setData('eliteAttackReady',this.time.now+2400).setData('eliteEnraged',false);
    }
    if(def.behavior==='mimic'&&!isElite){enemy.setAlpha(.2).setTint(0xd5bd8b).setData('mimicRevealed',false);}
    this.enemyStates.set(enemy,{x:safe.x,y:safe.y,health:maxHealth,nextAttackAt:0,stateUntil:0,facingX:1,facingY:0,exposedUntil:0,burrowed:false,nextSpecialAt:this.time.now+1800,attackCount:0});
    return enemy;
  }

  private bossArenaHint():string {
    switch(this.bossDefinition?.id){
      case 'thorn-matriarch':return 'KÖK SÜTUNLARI  •  ATEŞLE KIR, BOSS SAVUNMASINI AZALT';
      case 'ossuary-king':return 'MEZAR TAŞLARI  •  YILDIRIMLA KIR, İYİLEŞMEYİ DURDUR';
      case 'furnace-colossus':return 'DÖRT DİŞLİ  •  BUZLA DURDUR, ÇEKİRDEĞİ AÇ';
      case 'mire-oracle':return 'TEMİZ SU ADASI  •  ZEHİRİ TEMİZLE, FAZ DEĞİŞİMİNDE YER DEĞİŞTİRİR';
      case 'unwritten-regent':return 'MÜHÜRLER  •  KARANLIK GERÇEĞİ GÖSTERİR, RUH/KAN KIRAR';
      default:return '';
    }
  }

  private spawnBossArenaObjects(centerX:number,centerY:number):void {
    if(!this.bossArenaState)return;
    const offsets:Record<BossArenaObjectKind,{x:number;y:number}[]> = {
      'root-pillar':[{x:-112,y:-58},{x:112,y:-58},{x:0,y:118}],
      'grave-marker':[{x:-112,y:-100},{x:112,y:-100},{x:-112,y:100},{x:112,y:100}],
      gear:[{x:-118,y:-92},{x:118,y:-92},{x:-118,y:92},{x:118,y:92}],
      'water-island':[{x:-112,y:0},{x:0,y:112},{x:112,y:0}],
      seal:[{x:-108,y:-108},{x:108,y:-108},{x:-108,y:108},{x:108,y:108}]
    };
    for(const [index,object] of this.bossArenaState.objects.entries()){
      const point=offsets[object.kind][index]!;
      const sprite=this.physics.add.sprite(centerX+point.x,centerY+point.y,'arena-'+object.kind).setDepth(2).setCircle(object.kind==='water-island'?28:19).setImmovable(true);
      (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      sprite.setData('arenaObjectId',object.id).setData('arenaObjectKind',object.kind);
      this.bossArenaObjects.add(sprite);
    }
    this.updateBossArenaVisuals();
  }

  private spawnBossTraces(centerX:number,centerY:number):void {
    this.bossTraceObjects.clear(true,true);
    if(!this.bossDefinition)return;
    for(const trace of getBossTraces(this.bossDefinition.id)){
      const container=this.add.container(centerX+trace.offset.x,centerY+trace.offset.y)
        .setDepth(1.5)
        .setData('bossTraceId',trace.id)
        .setData('bossTraceMotif',trace.motif)
        .setData('bossTraceName',trace.name);
      const mark=this.add.graphics();
      mark.lineStyle(2,trace.primaryColor,.86);
      mark.fillStyle(trace.primaryColor,.14);
      if(trace.motif==='root-shrine'){
        mark.strokeCircle(0,0,28);
        mark.lineBetween(0,-25,0,19);
        mark.lineBetween(0,-4,-17,-19);
        mark.lineBetween(0,2,18,-16);
        mark.lineBetween(0,14,-24,28);
        mark.lineBetween(0,14,24,28);
        mark.fillCircle(0,-25,4);
        mark.lineStyle(2,trace.accentColor,.95);
        mark.strokeCircle(0,0,10);
      }else if(trace.motif==='grave-epitaph'){
        mark.fillRoundedRect(-19,-27,38,54,8);
        mark.strokeRoundedRect(-19,-27,38,54,8);
        mark.lineStyle(2,trace.accentColor,.9);
        mark.lineBetween(-9,-10,9,-10);
        mark.lineBetween(-9,-2,9,-2);
        mark.lineBetween(-9,6,5,6);
        mark.strokeCircle(0,-18,4);
      }else if(trace.motif==='forge-mark'){
        mark.strokeCircle(0,0,27);
        mark.strokeCircle(0,0,11);
        for(let i=0;i<8;i++){
          const angle=(Math.PI*2*i)/8;
          mark.lineBetween(Math.cos(angle)*14,Math.sin(angle)*14,Math.cos(angle)*34,Math.sin(angle)*34);
        }
        mark.lineStyle(2,trace.accentColor,.95);
        mark.strokeCircle(0,0,5);
      }else if(trace.motif==='oracle-rings'){
        mark.strokeEllipse(0,0,64,28);
        mark.strokeEllipse(0,0,46,20);
        mark.strokeEllipse(0,0,25,11);
        mark.fillCircle(0,0,5);
        mark.lineStyle(2,trace.accentColor,.95);
        mark.lineBetween(-34,0,34,0);
      }else{
        mark.strokeCircle(0,0,28);
        mark.beginPath();
        mark.moveTo(-16,-28);mark.lineTo(-5,-10);mark.lineTo(-13,2);mark.lineTo(5,11);mark.lineTo(-2,28);
        mark.moveTo(16,-28);mark.lineTo(7,-13);mark.lineTo(17,-2);mark.lineTo(4,9);mark.lineTo(14,27);
        mark.strokePath();
        mark.lineStyle(2,trace.accentColor,.95);
        mark.lineBetween(-7,-20,7,-20);
        mark.lineBetween(-8,20,8,20);
      }
      const caption=this.add.text(0,43,trace.name,{fontFamily:'Georgia',fontSize:'9px',color:'#e5d7bd',align:'center',stroke:'#17131b',strokeThickness:2})
        .setOrigin(.5,0);
      container.add([mark,caption]);
      this.bossTraceObjects.add(container);
    }
  }

  private updateBossArenaVisuals():void {
    if(!this.bossArenaState)return;
    for(const child of this.bossArenaObjects.getChildren()){
      const sprite=child as Phaser.Physics.Arcade.Sprite;
      const object=this.bossArenaState.objects.find(item=>item.id===sprite.getData('arenaObjectId'));
      if(!object?.active){sprite.destroy();continue;}
      if(object.kind==='gear'){
        if(object.disabledUntil>this.time.now)sprite.setTint(0x8fdcff).setAlpha(.48);
        else sprite.clearTint().setAlpha(1);
      }else if(object.kind==='seal'){
        sprite.setTint(object.revealed?0xffd47a:0x8062a6).setAlpha(object.revealed?1:.82);
        sprite.setScale(object.revealed?1.18:1);
      }else if(object.kind==='water-island'){
        sprite.setTint(object.safe?0x70e4d3:0x536c70).setAlpha(object.safe?1:.55);
      }else sprite.setAlpha(1);
    }
  }

  private hitBossArenaObject(shot:Phaser.Physics.Arcade.Sprite,target:Phaser.Physics.Arcade.Sprite):void {
    if(!shot.active||!target.active||this.runFinished||!this.bossArenaState)return;
    const id=String(target.getData('arenaObjectId')??'');
    const element=shot.getData('element') as ElementId|undefined;
    const result=damageBossArenaObject(this.bossArenaState,id,Number(shot.getData('damage')??0),element,this.time.now);
    this.bossArenaState=result.state;shot.destroy();
    if(result.revealedObjectId)this.eventHud?.setText('GERÇEK MÜHÜR ORTAYA ÇIKTI  •  RUH VEYA KANLA KIR').setVisible(true);
    else if(result.disabledUntil)this.eventHud?.setText('DİŞLİ DURDURULDU  •  '+Math.ceil((result.disabledUntil-this.time.now)/1000)+' SN').setVisible(true);
    else if(result.destroyed)this.eventHud?.setText('ARENA MEKANİĞİ KIRILDI').setVisible(true);
    else if(result.resisted)this.eventHud?.setText(this.bossArenaHint()).setVisible(true);
    this.updateBossArenaVisuals();
    if(result.changed)this.cameras.main.shake(80,.0012);
  }

  private touchBossArenaObject(object:Phaser.Physics.Arcade.Sprite):void {
    if(!object.active||this.runFinished||!this.bossArenaState||this.time.now<this.arenaInteractionReadyAt)return;
    const safe=getSafeBossArenaObject(this.bossArenaState);
    if(!safe||safe.id!==String(object.getData('arenaObjectId')??'')||this.playerPoisonStacks<=0)return;
    this.playerPoisonStacks=0;this.playerPoisonExpiresAt=0;this.playerPoisonNextTickAt=0;
    this.playerSlowUntil=0;this.playerSlowMultiplier=1;this.arenaInteractionReadyAt=this.time.now+1_300;
    this.healPlayer(this.state.maxHealth*.015);
    this.eventHud?.setText('TEMİZ SU  •  ZEHİR TEMİZLENDİ').setVisible(true);
  }

  private updateBossArena(time:number):void {
    if(!this.bossArenaState)return;
    if(this.bossSprite?.active&&this.bossState&&!this.bossState.defeated){
      const tick=stepBossArena(this.bossArenaState,time,this.bossState.maxHealth);
      this.bossArenaState=tick.state;
      if(tick.healing>0){
        const health=Math.min(this.bossState.maxHealth,this.bossState.health+tick.healing);
        this.bossState={...this.bossState,health};this.bossSprite.setData('health',health);
        this.bossHealth?.setSize(300*Phaser.Math.Clamp(health/this.bossState.maxHealth,0,1),5);
      }
    }
    if(this.playerPoisonStacks>0){
      if(time>=this.playerPoisonExpiresAt){this.playerPoisonStacks=0;this.playerPoisonNextTickAt=0;}
      else if(time>=this.playerPoisonNextTickAt){this.playerPoisonNextTickAt=time+1_000;this.receiveCombatDamage(this.playerPoisonStacks*1.5);}
    }
    if(time-this.lastBossArenaVisualsAt>=160){this.updateBossArenaVisuals();this.lastBossArenaVisualsAt=time;}
  }

  private spawnBoss():void {
    const active=this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const eliteAlive=active.some(enemy=>enemy.active&&Boolean(enemy.getData('isElite')));
    if(this.bossSpawned||this.enemies.countActive(true)>=42||eliteAlive)return;
    const baseBoss=BOSSES.find(b=>b.id===this.region.bossId);
     if(!baseBoss)return;
     const resolution=resolveBossVariant(baseBoss,this.bossEncounterIdsAtRegionEntry);
     const newGamePlusBoss=scaleNewGamePlusBoss(resolution.boss,this.newGamePlusLevel);
     const scaledBoss=this.gameMode==='endless'?scaleEndlessBoss(newGamePlusBoss,this.endlessState.bossCyclesCompleted):newGamePlusBoss;
      const endlessHealth=this.gameMode==='endless'?getEndlessRuleModifiers(this.state.elapsedMs).enemyHealthMultiplier:1;
      this.bossDefinition=endlessHealth===1?scaledBoss:{...scaledBoss,health:Math.round(scaledBoss.health*endlessHealth)};this.activeBossVariantId=resolution.variantId;
     this.bossState=createBossEncounter(this.bossDefinition);
    const boss=this.enemies.create(this.player.x+330,this.player.y,'boss-'+this.bossDefinition.id) as Phaser.Physics.Arcade.Sprite;
    boss.setDepth(4).setCircle(32).setData('isBoss',true).setData('health',this.bossDefinition.health).setData('experience',80);
    this.bossSprite=boss;this.bossSpawned=true;this.bossHud?.setText(this.bossDefinition.name).setVisible(true);this.bossHealth?.setVisible(true);this.bossPhaseText?.setText(this.bossDefinition.phases[0]!.name).setVisible(true);
    this.bossArenaState=createBossArena(this.bossDefinition.id,this.runSeed);this.spawnBossArenaObjects(boss.x,boss.y);this.spawnBossTraces(boss.x,boss.y);
    this.eventHud?.setText(this.bossArenaHint()).setVisible(true);
    this.cameras.main.flash(450,70,25,40);
  }

  private fireWeapons(time:number):void {
    const targets=this.activeTargets();if(!targets.length)return;
    for(const progress of this.build.weapons){
      const weapon=WEAPONS.find(w=>w.id===progress.weaponId);if(!weapon)continue;
      const stats=weaponLevelStats(progress,weapon,this.unlockedWeaponVariantIds),ready=this.weaponReady[weapon.id]??0;
      if(time<ready)continue;
      const guided=getActiveWeaponSynergies(weapon.id,this.build.passives.map(passive=>passive.passiveId)).some(item=>item.kind==='crown-guidance');
      const weakened=guided?targets.filter(enemy=>Number(enemy.getData('weakenedUntil')??0)>time):[];
      const target=findNearestTarget(this.player,weakened.length?weakened:targets);if(!target)continue;
      const distance=Phaser.Math.Distance.Between(this.player.x,this.player.y,target.x,target.y);
      if(distance>stats.range)continue;
      this.weaponReady[weapon.id]=time+stats.intervalMs/(this.currentBuildStats().attackSpeedMultiplier*this.relicStats.attackSpeedMultiplier*this.baseHasteMultiplier);
      const damage=stats.damage*this.currentBuildStats().damageMultiplier*this.character.stats.damageMultiplier*this.permanentUpgradeEffects.damageMultiplier*this.relicStats.damageMultiplier*getRelicDamageMultiplier(this.equippedRelicIds,this.character.id,weapon.element);
      const behavior=stats.behavior;
      this.executeWeapon(weapon,behavior,damage,stats.projectiles,stats.range,target,stats);
    }
  }

  private executeWeapon(weapon:WeaponDefinition,behavior:string,damage:number,projectiles:number,range:number,target:Phaser.Physics.Arcade.Sprite,stats:ReturnType<typeof weaponLevelStats>):void {
    this.lastWeaponExecution={weaponId:weapon.id,behavior};
    const targets=this.activeTargets(),element=weapon.element;
    const passiveIds=this.build.passives.map(passive=>passive.passiveId);
    const synergies=getActiveWeaponSynergies(weapon.id,passiveIds);
    const synergy=(kind:string)=>synergies.find(item=>item.kind===kind);
    const angle=Phaser.Math.Angle.Between(this.player.x,this.player.y,target.x,target.y);
    if(behavior==='cleaving-arc'||behavior==='defensive-pulse'||behavior==='orbiting-blades'){
      const baseRadius=behavior==='cleaving-arc'?Math.min(150,range):behavior==='orbiting-blades'?Math.min(105,range):Math.min(135,range);
      const radius=Math.min(190,baseRadius*stats.areaMultiplier);
      for(const enemy of targets){const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,enemy.x,enemy.y);if(d>radius)continue;
        if(behavior==='cleaving-arc'){const a=Phaser.Math.Angle.Between(this.player.x,this.player.y,enemy.x,enemy.y);if(Math.abs(Phaser.Math.Angle.Wrap(a-angle))>1.15)continue;}
        this.damageEnemy(enemy,damage,element);
      }
      const aftershock=synergy('grave-aftershock');
      if((behavior==='cleaving-arc'||behavior==='orbiting-blades')&&aftershock){
        this.recordWeaponSynergy(aftershock.id);
        const radius=aftershock.radius??92;
        const pulse=this.add.circle(this.player.x,this.player.y,radius,0xb6a17b,.14).setDepth(6);
        this.time.delayedCall(140,()=>pulse.destroy());
        this.damageTargetsInRadius(this.player.x,this.player.y,radius,damage*(aftershock.damageMultiplier??.42),element);
      }
      const ward=synergy('ward-pulse');
      if((behavior==='defensive-pulse'||behavior==='cleaving-arc'||behavior==='orbiting-blades')&&ward){
        this.recordWeaponSynergy(ward.id);
        this.weaponSynergyGuardUntil=Math.max(this.weaponSynergyGuardUntil,this.time.now+(ward.durationMs??700));
        this.weaponSynergyGuardReduction=ward.damageReduction??.28;
        this.showPassiveSpecialFeedback('MUHAFIZ ÇEMBERİ');
      }
      const frost=synergy('frost-ring');
      if((behavior==='orbiting-blades'||behavior==='cleaving-arc'||behavior==='defensive-pulse')&&frost){
        const state=target.getData('isBoss')?this.bossElementState:(this.elementStates.get(target)??{});
        if(isFrozenTarget(state.ice?.expiresAt,this.time.now)){
          this.recordWeaponSynergy(frost.id);
          this.damageTargetsInRadius(target.x,target.y,frost.radius??82,damage*(frost.damageMultiplier??.35),'ice');
        }
      }
      this.cameras.main.shake(45,.001);return;
    }
    if(behavior==='chain-lightning'){
      let current=target;const hit=new Set<Phaser.Physics.Arcade.Sprite>();
      const maxTargets=Math.min(5,Math.min(3,projectiles+1)+stats.chainTargetBonus+getWeaponSynergyChainBonus(weapon.id,passiveIds));
      let lastTarget=current;
      for(let i=0;i<maxTargets;i++){if(hit.has(current))break;hit.add(current);lastTarget=current;this.damageEnemy(current,damage*(1-i*.16),element);
        const next=targets.filter(t=>!hit.has(t)).sort((a,b)=>Phaser.Math.Distance.Between(current.x,current.y,a.x,a.y)-Phaser.Math.Distance.Between(current.x,current.y,b.x,b.y))[0];if(!next||Phaser.Math.Distance.Between(current.x,current.y,next.x,next.y)>170)break;current=next;}
      const ember=synergy('ember-burst');
      if(ember&&hit.size>0){this.recordWeaponSynergy(ember.id);this.damageTargetsInRadius(lastTarget.x,lastTarget.y,ember.radius??72,damage*(ember.damageMultiplier??.45),'fire');}
      const storm=synergy('storm-lance');
      if(storm)this.recordWeaponSynergy(storm.id);
      const blood=synergy('blood-thread');
      if(blood){this.recordWeaponSynergy(blood.id);this.healPlayer(damage*(this.currentBuildStats().lifesteal+this.relicStats.lifestealBonus+(blood.damageMultiplier??.06)));}
      return;
    }
    if(behavior==='life-tether'){
      this.damageEnemy(target,damage,element);
      if(stats.chainTargetBonus>0){const secondary=targets.filter(item=>item!==target).sort((a,b)=>Phaser.Math.Distance.Between(target.x,target.y,a.x,a.y)-Phaser.Math.Distance.Between(target.x,target.y,b.x,b.y))[0];if(secondary&&Phaser.Math.Distance.Between(target.x,target.y,secondary.x,secondary.y)<=170)this.damageEnemy(secondary,damage*.65,element);}
      const blood=synergy('blood-thread');
      if(blood)this.recordWeaponSynergy(blood.id);
      this.healPlayer(damage*(this.currentBuildStats().lifesteal+this.relicStats.lifestealBonus+(blood?.damageMultiplier??0)));return;
    }
    if(behavior==='delayed-mortar'||behavior==='delayed-sigil'||behavior==='area-seed'){
      const marker=this.add.graphics().setDepth(7);marker.lineStyle(2,elementTint[element],.9);marker.strokeCircle(target.x,target.y,Math.min(72,range*.28)*stats.areaMultiplier);
      this.time.delayedCall(behavior==='area-seed'?450:650,()=>{
        if(!this.runFinished){
          const impactRadius=Math.min(78,range*.3)*stats.areaMultiplier;
          this.damageTargetsInRadius(target.x,target.y,impactRadius,damage,element,weapon.id);
          const venom=synergy('venom-trail');
          if((behavior==='area-seed'||behavior==='delayed-mortar')&&venom){this.recordWeaponSynergy(venom.id);this.spawnWeaponSynergyZone(target.x,target.y,venom.radius??84,venom.durationMs??1800,venom.tickMs??600,venom.damageMultiplier??.025,'poison');}
          const magma=synergy('magma-rift');
          if((behavior==='delayed-mortar'||behavior==='area-seed'||behavior==='delayed-sigil')&&magma){this.recordWeaponSynergy(magma.id);this.spawnWeaponSynergyZone(target.x,target.y,magma.radius??92,magma.durationMs??1800,magma.tickMs??600,magma.damageMultiplier??.025,'fire');}
          const curse=synergy('curse-sigil');
          if((behavior==='delayed-sigil'||behavior==='delayed-mortar'||behavior==='area-seed')&&curse){this.recordWeaponSynergy(curse.id);this.applyWeaponSynergyCurse(target.x,target.y,curse.radius??78,curse.stacks??1);}
        }
        marker.destroy();
      });return;
    }
    const count=behavior==='fan-volley'?Math.max(3,stats.baseProjectiles)+stats.projectileBonus:projectiles;
    for(let i=0;i<count;i++){
      const spread=count>1?(i-(count-1)/2)*.22:0;
      this.createProjectile(weapon,damage,element,angle+spread,behavior==='homing-projectile'||behavior==='spirit-seeker',stats.pierce,target,stats.areaMultiplier);
    }
  }

  private createProjectile(weapon:WeaponDefinition,damage:number,element:ElementId,angle:number,homing:boolean,pierce:number,target:Phaser.Physics.Arcade.Sprite,areaMultiplier=1):void {
    const shot=this.shots.create(this.player.x,this.player.y,'shot') as Phaser.Physics.Arcade.Sprite;
    shot.setDepth(5).setCircle(5).setTint(elementTint[element]).setData('damage',damage).setData('element',element).setData('expires',this.time.now+1900)
      .setData('weaponId',weapon.id).setData('homing',homing).setData('target',target).setData('pierce',pierce).setData('area',weapon.behavior==='area-seed'?70*areaMultiplier:0);
    shot.setVelocity(Math.cos(angle)*Math.max(180,weapon.projectileSpeed),Math.sin(angle)*Math.max(180,weapon.projectileSpeed));
  }

  private updateProjectiles(_time:number):void {
    for(const child of this.shots.getChildren()){
      const shot=child as Phaser.Physics.Arcade.Sprite;if(!shot.active||!shot.getData('homing'))continue;
      let target=shot.getData('target') as Phaser.Physics.Arcade.Sprite|undefined;
      if(!target?.active){
        const candidates=this.activeTargets();
        const guided=getActiveWeaponSynergies(String(shot.getData('weaponId')??''),this.build.passives.map(passive=>passive.passiveId)).some(item=>item.kind==='crown-guidance');
        const weakened=guided?candidates.filter(enemy=>Number(enemy.getData('weakenedUntil')??0)>this.time.now):[];
        target=findNearestTarget(shot,weakened.length?weakened:candidates);if(target){shot.setData('target',target);if(guided&&weakened.includes(target))this.recordWeaponSynergy('soul-lantern-hollow-crown');}
      }
      if(target?.active){const angle=Phaser.Math.Angle.Between(shot.x,shot.y,target.x,target.y);shot.setVelocity(Math.cos(angle)*330,Math.sin(angle)*330);}
    }
  }

  private expireShots(time:number):void {
    for(const child of this.shots.getChildren()){const shot=child as Phaser.Physics.Arcade.Sprite;if(shot.active&&time>Number(shot.getData('expires')))shot.destroy();}
  }

  private hitEnemy(shot:Phaser.Physics.Arcade.Sprite,enemy:Phaser.Physics.Arcade.Sprite):void {
    if(!shot.active||!enemy.active)return;
    const area=Number(shot.getData('area')??0),element=shot.getData('element') as ElementId|undefined;
    const weaponId=String(shot.getData('weaponId')??'');
    const damage=this.weaponSynergyDamage(weaponId,enemy,Number(shot.getData('damage')));
    this.damageEnemy(enemy,damage,element);
    if(area>0)this.damageTargetsInRadius(enemy.x,enemy.y,area,damage*.55,element,weaponId);
    const synergies=getActiveWeaponSynergies(weaponId,this.build.passives.map(passive=>passive.passiveId));
    const splinter=synergies.find(item=>item.kind==='spirit-splinter');
    if(splinter){this.recordWeaponSynergy(splinter.id);this.damageTargetsInRadius(enemy.x,enemy.y,splinter.radius??82,damage*(splinter.damageMultiplier??.32),'spirit');}
    const spiritChain=synergies.find(item=>item.kind==='spirit-chain');
    if(spiritChain){
      const secondary=this.activeTargets().filter(item=>item!==enemy).sort((a,b)=>Phaser.Math.Distance.Between(enemy.x,enemy.y,a.x,a.y)-Phaser.Math.Distance.Between(enemy.x,enemy.y,b.x,b.y))[0];
      if(secondary&&Phaser.Math.Distance.Between(enemy.x,enemy.y,secondary.x,secondary.y)<=(spiritChain.radius??180)){this.recordWeaponSynergy(spiritChain.id);this.damageEnemy(secondary,damage*(spiritChain.damageMultiplier??.55),'spirit');}
    }
    const stormArc=synergies.find(item=>item.kind==='storm-arc');
    if(stormArc){
      const nearby=this.activeTargets().filter(item=>item!==enemy).sort((a,b)=>Phaser.Math.Distance.Between(enemy.x,enemy.y,a.x,a.y)-Phaser.Math.Distance.Between(enemy.x,enemy.y,b.x,b.y));
      let chained=0;
      for(const secondary of nearby){
        if(chained>=(stormArc.chainTargets??2)||Phaser.Math.Distance.Between(enemy.x,enemy.y,secondary.x,secondary.y)>(stormArc.radius??180))break;
        chained++;this.recordWeaponSynergy(stormArc.id);this.damageEnemy(secondary,damage*(stormArc.damageMultiplier??.42),'lightning');
      }
    }
    const aftershock=synergies.find(item=>item.kind==='grave-aftershock');
    if(aftershock){this.recordWeaponSynergy(aftershock.id);this.damageTargetsInRadius(enemy.x,enemy.y,aftershock.radius??92,damage*(aftershock.damageMultiplier??.42),element);}
    const stormLance=synergies.find(item=>item.kind==='storm-lance');
    if(stormLance){
      const nearby=this.activeTargets().filter(item=>item!==enemy).sort((a,b)=>Phaser.Math.Distance.Between(enemy.x,enemy.y,a.x,a.y)-Phaser.Math.Distance.Between(enemy.x,enemy.y,b.x,b.y));
      let chained=0;
      for(const secondary of nearby){
        if(chained>=(stormLance.chainTargets??2)||Phaser.Math.Distance.Between(enemy.x,enemy.y,secondary.x,secondary.y)>190)break;
        chained++;this.recordWeaponSynergy(stormLance.id);this.damageEnemy(secondary,damage*(1-chained*.16),'lightning');
      }
    }
    const ember=synergies.find(item=>item.kind==='ember-burst');
    if(ember){this.recordWeaponSynergy(ember.id);this.damageTargetsInRadius(enemy.x,enemy.y,ember.radius??72,damage*(ember.damageMultiplier??.45),'fire');}
    const venom=synergies.find(item=>item.kind==='venom-trail');
    if(venom){this.recordWeaponSynergy(venom.id);this.spawnWeaponSynergyZone(enemy.x,enemy.y,venom.radius??84,venom.durationMs??1800,venom.tickMs??600,venom.damageMultiplier??.025,'poison');}
    const blood=synergies.find(item=>item.kind==='blood-thread');
    if(blood){this.recordWeaponSynergy(blood.id);this.healPlayer(damage*(this.currentBuildStats().lifesteal+this.relicStats.lifestealBonus+(blood.damageMultiplier??.06)));}
    const pierce=Number(shot.getData('pierce')??1)-1;
    if(pierce>0)shot.setData('pierce',pierce);else shot.destroy();
  }

  private damageTargetsInRadius(x:number,y:number,radius:number,damage:number,element?:ElementId,weaponId?:string):void {
    for(const target of this.activeTargets())if(Phaser.Math.Distance.Between(x,y,target.x,target.y)<=radius){
      this.damageEnemy(target,weaponId?this.weaponSynergyDamage(weaponId,target,damage):damage,element);
    }
  }

  private damageEnemy(enemy:Phaser.Physics.Arcade.Sprite,baseDamage:number,element?:ElementId):number {
    if(!enemy.active||this.runFinished||Number(enemy.getData('untargetableUntil')??0)>this.time.now)return 0;
    if(enemy.getData('isBoss'))return this.damageBossTarget(enemy,baseDamage,element);
    const def=this.enemyDefinition(enemy);if(!def)return 0;
    const actor=this.enemyStates.get(enemy);
    if(actor?.burrowed||(!enemy.getData('mimicRevealed')&&def.behavior==='mimic'))return 0;
    const existing=this.elementStates.get(enemy)??{};
    const curse=existing.dark&&existing.dark.expiresAt>this.time.now?existing.dark.stacks:0;
    const poison=existing.poison&&existing.poison.expiresAt>this.time.now?existing.poison.stacks:0;
    let damage=baseDamage*(1+curse*.06+poison*.025);
    if(actor&&def.behavior!=='mimic'&&actor.exposedUntil>this.time.now)damage*=1.25;
    if(Number(enemy.getData('abilityMarkedUntil')??0)>this.time.now)damage*=1.3;
    const armorBroken=Number(enemy.getData('armorBrokenUntil')??0)>this.time.now;
    if((def.behavior==='shield-advance'||def.behavior==='rune-guardian')&&!armorBroken&&element!=='lightning'&&this.isEnemyFacingPlayer(enemy,actor))damage*=.35;
    if(def.behavior==='rune-guardian'&&element==='lightning')enemy.setData('armorBrokenUntil',this.time.now+5200);
    if(def.behavior==='pursue'&&this.isEnemyFacingPlayer(enemy,actor)&&!element)damage*=.8;
    if(def.behavior==='duelist'&&Number(enemy.getData('parryUntil')??0)>this.time.now&&element!=='lightning')damage*=.35;
    if(def.behavior==='duelist'&&element==='lightning')enemy.setData('parryUntil',0);
    if(def.behavior==='burrow'&&actor?.burrowed)return 0;
    const anchor=this.activeTargets().find(other=>other!==enemy&&this.enemyDefinition(other)?.behavior==='soul-anchor'&&Phaser.Math.Distance.Between(other.x,other.y,enemy.x,enemy.y)<200);
    if(anchor)damage*=.88;
    if(element){
      const elementDef=ELEMENTS.find(e=>e.id===element)!;
      const tuned={...elementDef,buildupPerHit:elementDef.buildupPerHit*this.currentBuildStats().elementalBuildupMultiplier*this.relicStats.elementalBuildupMultiplier};
      const hit=applyElementHit(existing,tuned,damage,def.resistances[element]??0,this.time.now,ELEMENTS,getElementWeatherMultiplier(this.environmentState,element));
      this.elementStates.set(enemy,hit.state);damage=hit.damage+(hit.reaction?.damage??0);if(hit.reaction){this.lastElementReactionId=hit.reaction.id;this.resolveElementReaction(enemy,hit.reaction);}
      if(isPassiveSpecialActive(this.build,'venom-vial')&&isPoisonBloomReady(hit.state.poison?.stacks??0,5)){const bloom=PASSIVES.find(item=>item.id==='venom-vial')!.specialUpgrade.mechanic;if(bloom.kind==='poison-spores'){const ready=tryPassiveCooldown(this.passiveSpecialState,'toxic-bloom',this.time.now,bloom.cooldownMs);this.passiveSpecialState=ready.state;if(ready.triggered)this.spawnPassiveZone(enemy.x,enemy.y,bloom);}}
      if(hit.triggered&&element==='spirit')this.healPlayer(Math.max(1,this.state.maxHealth*.025));
      if(hit.triggered&&element==='blood'){const sacrament=PASSIVES.find(item=>item.id==='blood-reliquary')!.specialUpgrade.mechanic;const bonus=sacrament.kind==='low-health-lifesteal'&&isPassiveSpecialActive(this.build,'blood-reliquary')?getLowHealthLifestealBonus(this.state.health,this.state.maxHealth,sacrament):0;this.healPlayer(damage*(.03+this.currentBuildStats().lifesteal+this.relicStats.lifestealBonus+bonus));}
      if(hit.triggered&&element==='lightning')this.chainLightningFrom(enemy,damage*.4);
    }
    const nightThread=PASSIVES.find(item=>item.id==='veil-thread')!.specialUpgrade.mechanic;
    const criticalMultiplier=nightThread.kind==='critical-curse'&&isPassiveSpecialActive(this.build,'veil-thread')?nightThread.criticalMultiplier:1.5;
    const crit=resolveCriticalHit(damage,this.currentBuildStats().criticalChance+this.relicStats.criticalChanceBonus,Math.random(),criticalMultiplier);damage=crit.damage;
    if(crit.critical&&nightThread.kind==='critical-curse'&&isPassiveSpecialActive(this.build,'veil-thread')){const curseStatus=this.elementStates.get(enemy)??{};const current=curseStatus.dark;const darkDef=ELEMENTS.find(item=>item.id==='dark')!;this.elementStates.set(enemy,{...curseStatus,dark:{buildup:0,stacks:addCurseStack(current&&current.expiresAt>this.time.now?current.stacks:0,nightThread.bonusStacks),expiresAt:this.time.now+darkDef.durationMs,nextTickAt:this.time.now+1000}});}
    if(element==='fire'&&isPassiveSpecialActive(this.build,'ashen-heart')){const fire=PASSIVES.find(item=>item.id==='ashen-heart')!.specialUpgrade.mechanic;if(fire.kind==='fire-explosion'){const ready=tryPassiveCooldown(this.passiveSpecialState,'ember-core',this.time.now,fire.cooldownMs);this.passiveSpecialState=ready.state;if(ready.triggered)for(const nearby of this.activeTargets()){if(nearby!==enemy&&Phaser.Math.Distance.Between(enemy.x,enemy.y,nearby.x,nearby.y)<=fire.radius)this.damageEnemy(nearby,damage*fire.damageMultiplier);}}}
    const ice=PASSIVES.find(item=>item.id==='frostbound-sigil')!.specialUpgrade.mechanic;
    if(ice.kind==='ice-shatter'&&isPassiveSpecialActive(this.build,'frostbound-sigil')&&baseDamage>=ice.minimumHitDamage&&isFrozenTarget(existing.ice?.expiresAt,this.time.now)&&Number(enemy.getData('iceShatteredUntil')??0)<(existing.ice?.expiresAt??0)){damage+=baseDamage*ice.damageMultiplier;enemy.setData('iceShatteredUntil',existing.ice!.expiresAt);}
    const previousHealth=Number(enemy.getData('health'));const hp=previousHealth-damage;enemy.setData('health',hp).setTint(element?elementTint[element]:0xffffff);
    this.time.delayedCall(70,()=>{if(enemy.active){if(enemy.getData('isElite'))enemy.setTint(enemy.getData('eliteEnraged')?0xf2a85c:0xd9ad5c);else enemy.clearTint();}});
    if(hp>0)return Math.min(previousHealth,damage);
    if(def.behavior==='volatile-bomber'){
      const radius=enemy.getData('primed')?112:58;const blast=this.add.circle(enemy.x,enemy.y,radius,0xe3a64e,.22).setDepth(7);
      if(Phaser.Math.Distance.Between(this.player.x,this.player.y,enemy.x,enemy.y)<radius+18)this.receiveCombatDamage(def.attack.damage*(enemy.getData('primed')?1:.5));
      this.time.delayedCall(260,()=>blast.destroy());
    }
    const experience=Number(enemy.getData('experience'));
    if(!this.runDiscoveredEnemyIds.includes(def.id))this.runDiscoveredEnemyIds.push(def.id);
    this.recordRunEventEnemyDefeat(enemy);
    this.recordQuestGameplayEvent('enemy-kill');
    if(enemy.getData('isElite'))this.recordQuestGameplayEvent('elite-kill');
    if(this.gameMode==='survival'||this.gameMode==='endless')this.runSoulEssence+=Math.floor(Math.max(0,experience)/2)+(enemy.getData('isElite')?35:0);
    if(enemy.getData('isElite')&&isPassiveSpecialActive(this.build,'hollow-crown'))this.applyCrownOfAshes(enemy);
    const eliteMarker=enemy.getData('eliteMarker') as Phaser.GameObjects.GameObject|undefined;eliteMarker?.destroy();
    this.dropExperience(enemy,experience);this.state=recordKill(this.state);enemy.destroy();
    return Math.max(0,Math.min(previousHealth,damage));
  }

  private resolveElementReaction(source:Phaser.Physics.Arcade.Sprite,reaction:import('../../core/types/content.js').ElementReactionDefinition&{damage:number}):void {
    if(reaction.healFraction)this.healPlayer(reaction.damage*reaction.healFraction);
    if(reaction.spreadRadius){
      const targets=this.activeTargets().filter(target=>target!==source&&Phaser.Math.Distance.Between(source.x,source.y,target.x,target.y)<=reaction.spreadRadius!);
      for(const target of targets)this.damageEnemy(target,reaction.damage*.35,'fire');
    }
    if(reaction.chainTargets){
      let current=source;const hit=new Set<Phaser.Physics.Arcade.Sprite>([source]);
      for(let i=0;i<reaction.chainTargets;i++){
        const next=this.activeTargets().filter(target=>!hit.has(target))
          .sort((a,b)=>Phaser.Math.Distance.Between(current.x,current.y,a.x,a.y)-Phaser.Math.Distance.Between(current.x,current.y,b.x,b.y))[0];
        if(!next||Phaser.Math.Distance.Between(current.x,current.y,next.x,next.y)>190)break;
        hit.add(next);current=next;this.damageEnemy(next,reaction.damage*.35);
      }
    }
  }

  private chainLightningFrom(source:Phaser.Physics.Arcade.Sprite,damage:number):void {
    const field=PASSIVES.find(item=>item.specialUpgrade.mechanic.kind==='lightning-field')?.specialUpgrade.mechanic;
    if(field?.kind==='lightning-field'&&isPassiveSpecialActive(this.build,'storm-conductor'))this.spawnPassiveZone(source.x,source.y,field);
    const next=this.activeTargets().filter(target=>target!==source)
      .sort((a,b)=>Phaser.Math.Distance.Between(source.x,source.y,a.x,a.y)-Phaser.Math.Distance.Between(source.x,source.y,b.x,b.y))[0];
    if(next&&Phaser.Math.Distance.Between(source.x,source.y,next.x,next.y)<=190)this.damageEnemy(next,damage);
  }

  private damageBossTarget(boss:Phaser.Physics.Arcade.Sprite,baseDamage:number,element?:ElementId):number {
    if(!this.bossDefinition||!this.bossState||this.bossState.defeated)return 0;
    const curse=this.bossElementState.dark&&this.bossElementState.dark.expiresAt>this.time.now?this.bossElementState.dark.stacks:0;
    const poison=this.bossElementState.poison&&this.bossElementState.poison.expiresAt>this.time.now?this.bossElementState.poison.stacks:0;
    let damage=baseDamage*(1+curse*.06+poison*.025);
    if(Number(boss.getData('abilityMarkedUntil')??0)>this.time.now)damage*=1.3;
    if(element){
      const elementDef=ELEMENTS.find(e=>e.id===element)!;
      const tuned={...elementDef,buildupPerHit:elementDef.buildupPerHit*this.currentBuildStats().elementalBuildupMultiplier*this.relicStats.elementalBuildupMultiplier};
      const hit=applyElementHit(this.bossElementState,tuned,damage,this.bossDefinition.resistance[element]??0,this.time.now,ELEMENTS,getElementWeatherMultiplier(this.environmentState,element));
      this.bossElementState=hit.state;damage=hit.damage+(hit.reaction?.damage??0);if(hit.reaction){this.lastElementReactionId=hit.reaction.id;this.resolveElementReaction(boss,hit.reaction);}
      if(isPassiveSpecialActive(this.build,'venom-vial')&&isPoisonBloomReady(hit.state.poison?.stacks??0,5)){const bloom=PASSIVES.find(item=>item.id==='venom-vial')!.specialUpgrade.mechanic;if(bloom.kind==='poison-spores'){const ready=tryPassiveCooldown(this.passiveSpecialState,'toxic-bloom',this.time.now,bloom.cooldownMs);this.passiveSpecialState=ready.state;if(ready.triggered)this.spawnPassiveZone(boss.x,boss.y,bloom);}}
      if(hit.triggered&&element==='spirit')this.healPlayer(Math.max(1,this.state.maxHealth*.025));
      if(hit.triggered&&element==='blood'){const sacrament=PASSIVES.find(item=>item.id==='blood-reliquary')!.specialUpgrade.mechanic;const bonus=sacrament.kind==='low-health-lifesteal'&&isPassiveSpecialActive(this.build,'blood-reliquary')?getLowHealthLifestealBonus(this.state.health,this.state.maxHealth,sacrament):0;this.healPlayer(damage*(.03+this.currentBuildStats().lifesteal+bonus));}
      if(hit.triggered&&element==='lightning')this.chainLightningFrom(boss,damage*.4);
    }
    const nightThread=PASSIVES.find(item=>item.id==='veil-thread')!.specialUpgrade.mechanic;
    const criticalMultiplier=nightThread.kind==='critical-curse'&&isPassiveSpecialActive(this.build,'veil-thread')?nightThread.criticalMultiplier:1.5;
    const crit=resolveCriticalHit(damage,this.currentBuildStats().criticalChance+this.relicStats.criticalChanceBonus,Math.random(),criticalMultiplier);damage=crit.damage;
    if(crit.critical&&nightThread.kind==='critical-curse'&&isPassiveSpecialActive(this.build,'veil-thread')){const current=this.bossElementState.dark;const darkDef=ELEMENTS.find(item=>item.id==='dark')!;this.bossElementState={...this.bossElementState,dark:{buildup:0,stacks:addCurseStack(current&&current.expiresAt>this.time.now?current.stacks:0,nightThread.bonusStacks),expiresAt:this.time.now+darkDef.durationMs,nextTickAt:this.time.now+1000}};}
    if(element==='fire'&&isPassiveSpecialActive(this.build,'ashen-heart')){const fire=PASSIVES.find(item=>item.id==='ashen-heart')!.specialUpgrade.mechanic;if(fire.kind==='fire-explosion'){const ready=tryPassiveCooldown(this.passiveSpecialState,'ember-core',this.time.now,fire.cooldownMs);this.passiveSpecialState=ready.state;if(ready.triggered)for(const nearby of this.activeTargets()){if(nearby!==boss&&Phaser.Math.Distance.Between(boss.x,boss.y,nearby.x,nearby.y)<=fire.radius)this.damageEnemy(nearby,damage*fire.damageMultiplier);}}}
    const ice=PASSIVES.find(item=>item.id==='frostbound-sigil')!.specialUpgrade.mechanic;
    if(ice.kind==='ice-shatter'&&isPassiveSpecialActive(this.build,'frostbound-sigil')&&baseDamage>=ice.minimumHitDamage&&isFrozenTarget(this.bossElementState.ice?.expiresAt,this.time.now)&&Number(boss.getData('iceShatteredUntil')??0)<(this.bossElementState.ice?.expiresAt??0)){damage+=baseDamage*ice.damageMultiplier;boss.setData('iceShatteredUntil',this.bossElementState.ice!.expiresAt);}
    if(element&&this.bossDefinition.weakness.includes(element))damage*=1.3;
    damage*=getBossArenaDamageMultiplier(this.bossArenaState,this.time.now);
    const previousHealth=this.bossState.health;const transition=damageBoss(this.bossState,this.bossDefinition,damage,this.time.now);this.bossState=transition.state;
    boss.setData('health',transition.state.health).setTint(element?elementTint[element]:0xffffff);
    this.time.delayedCall(70,()=>{if(boss.active)boss.clearTint();});
    if(transition.changed&&!transition.state.defeated){this.bossPhaseText?.setText(transition.current.name);this.bossArenaState=this.bossArenaState?transitionBossArenaPhase(this.bossArenaState,transition.state.phaseIndex):undefined;this.updateBossArenaVisuals();this.eventHud?.setText(this.bossArenaHint()).setVisible(true);this.cameras.main.flash(320,90,38,55);
      for(const id of transition.current.addEnemyIds){if(this.enemies.countActive(true)>=42)break;const def=ENEMIES.find(e=>e.id===id);if(def)this.createEnemy(boss.x+Phaser.Math.Between(-90,90),boss.y+Phaser.Math.Between(-90,90),def,1.2);}}
    this.bossHealth?.setSize(300*Phaser.Math.Clamp(transition.state.health/transition.state.maxHealth,0,1),5);
    if(transition.state.defeated)this.defeatBoss(boss);
    return Math.max(0,previousHealth-transition.state.health);
  }

  private defeatBoss(boss:Phaser.Physics.Arcade.Sprite):void {
    this.recordQuestGameplayEvent('boss-defeat');
    this.dropExperience(boss,80);this.runSoulEssence+=this.bossDefinition?.reward.soulEssence??0;
    const vessel=PASSIVES.find(item=>item.specialUpgrade.mechanic.kind==='boss-essence')?.specialUpgrade.mechanic;
    if((this.gameMode==='survival'||this.gameMode==='endless')&&vessel?.kind==='boss-essence'&&isPassiveSpecialActive(this.build,'soul-vessel'))for(let i=0;i<vessel.fragmentCount;i++){const angle=(Math.PI*2*i)/vessel.fragmentCount;this.createRunEventObject(boss.x+Math.cos(angle)*48,boss.y+Math.sin(angle)*48,'essence-fragment',vessel.essencePerFragment);}
    this.bossVictoryPending=true;this.createRunEventObject(boss.x,boss.y,'boss-chest');
    this.bossArenaObjects.clear(true,true);this.bossArenaState=undefined;
    boss.destroy();this.bossSprite=undefined;this.bossHud?.setText('BOSS YENİLDİ');this.bossPhaseText?.setText('Boss sandığına ulaş ve aç');
    this.eventHud?.setText('BOSS SANDIĞI  •  YAKLAŞARAK AÇ').setVisible(true);
    this.cameras.main.flash(500,175,135,72);
  }

  private startNextEndlessBossCycle():void {
    this.endlessState=completeEndlessBossCycle(this.endlessState,this.state.elapsedMs);
    this.bossSpawned=false;this.bossState=undefined;this.bossDefinition=undefined;this.bossSprite=undefined;
    this.activeBossVariantId=null;this.bossElementState={};this.bossArenaState=undefined;
    this.bossArenaObjects.clear(true,true);this.bossTraceObjects.clear(true,true);
    this.bossHud?.setText('SONSUZ BOSS DÖNGÜSÜ  •  '+this.endlessState.bossCyclesCompleted).setVisible(true);
    this.bossHealth?.setVisible(false);this.bossPhaseText?.setText('Sonraki boss için hazırlık').setVisible(true);
    const minutes=Math.ceil((this.endlessState.nextBossAtMs-this.state.elapsedMs)/60_000);
    this.eventHud?.setText('BOSS DÖNGÜSÜ '+this.endlessState.bossCyclesCompleted+' TAMAMLANDI  •  YENİ BOSS '+minutes+' DK SONRA').setVisible(true);
    this.refreshHud();
  }

  private applyCrownOfAshes(source:Phaser.Physics.Arcade.Sprite):void {
    const mechanic=PASSIVES.find(item=>item.id==='hollow-crown')!.specialUpgrade.mechanic;
    if(mechanic.kind!=='crown-weaken')return;
    for(const target of this.activeTargets()){
      if(target===source||Phaser.Math.Distance.Between(source.x,source.y,target.x,target.y)>mechanic.radius)continue;
      target.setData('weakenedUntil',this.time.now+mechanic.durationMs).setData('weakenedMultiplier',mechanic.damageMultiplier).setTint(0x9b78c8);
      this.time.delayedCall(mechanic.durationMs,()=>{if(target.active&&Number(target.getData('weakenedUntil')??0)<=this.time.now)target.clearTint();});
    }
    this.showPassiveSpecialFeedback('KÜL TACI  •  DÜŞMANLAR ZAYIFLADI');
  }

  private recordRunEventEnemyDefeat(enemy:Phaser.Physics.Arcade.Sprite):void {
    const active=this.runEventState.activeEvent;
    if(!active||active.status!=='active'||enemy.getData('isBoss'))return;
    const tagged=enemy.getData('runEventKind')===active.kind;
    if(active.kind==='hunter-trial'||(active.kind==='elite-invasion'&&tagged)||(active.kind==='cursed-wave'&&tagged)){
      const beforeStage=active.stage;
      this.applyRunEventAction('kill');
      const next=this.runEventState.activeEvent;
      if(active.kind==='cursed-wave'&&next?.status==='active'&&next.stage>beforeStage)this.spawnCursedWaveStage(next.stage);
    }
  }

  private applyRunEventAction(action:RunEventAction,amount=1):void {
    const before=this.runEventState.activeEvent;
    this.runEventState=recordRunEventAction(this.runEventState,action,amount);
    const after=this.runEventState.activeEvent;
    if(before?.status==='active'&&after?.status==='completed')this.completeRunEvent(before.kind);
  }

  private updateRunEvent(_time:number):void {
    if(this.runFinished||!getGameModeRules(this.gameMode).timedEventsEnabled)return;
    const before=this.runEventState.activeEvent;
    this.runEventState=advanceRunEvent(this.runEventState,this.state.elapsedMs);
    const afterTimeout=this.runEventState.activeEvent;
    if(before?.status==='active'&&afterTimeout?.status==='failed')this.failRunEvent(before.kind);
    const previousIndex=this.runEventState.nextEventIndex;
    this.runEventState=startDueRunEvent(this.runEventState,this.state.elapsedMs);
    if(this.runEventState.nextEventIndex>previousIndex){this.eventSetupPending=true;this.setupRunEvent();}
    if(this.eventSetupPending)this.setupRunEvent();
    const active=this.runEventState.activeEvent;
    if(active?.status==='active'&&this.eventHud){
      const remaining=Math.max(0,Math.ceil((active.deadlineAtMs-this.state.elapsedMs)/1000));
      this.eventHud.setText(getRunEventName(active.kind)+'  •  '+getRunEventObjective(active)+'  •  '+remaining+' sn').setVisible(true);
    }
  }

  private setupRunEvent():void {
    const active=this.runEventState.activeEvent;
    if(!active||active.status!=='active'||!this.eventSetupPending)return;
    const available=42-this.enemies.countActive(true);
    if(active.kind==='elite-invasion'){
      if(available<2)return;
      const pool=this.region.enemyIds.map(id=>ENEMIES.find(enemy=>enemy.id===id)).filter((enemy):enemy is EnemyDefinition=>Boolean(enemy));
      for(let i=0;i<2;i++){
        const def=pool[Math.floor(waveRandom(this.runSeed,active.startedAtMs+i,71)*pool.length)]??pool[0];
        if(!def)continue;
        const angle=(i/2)*Math.PI*2+Math.PI/4;
        const elite=this.createEnemy(this.player.x+Math.cos(angle)*260,this.player.y+Math.sin(angle)*260,def,1.15,true);
        elite.setData('runEventKind',active.kind);
      }
    }else if(active.kind==='spirit-storm'){
      for(let i=0;i<6;i++){
        const angle=(i/6)*Math.PI*2;
        this.createRunEventObject(this.player.x+Math.cos(angle)*220,this.player.y+Math.sin(angle)*220,'spirit-fragment');
      }
    }else if(active.kind==='treasure-hunt'){
      const angle=waveRandom(this.runSeed,active.startedAtMs,73)*Math.PI*2;
      this.createRunEventObject(this.player.x+Math.cos(angle)*285,this.player.y+Math.sin(angle)*285,'treasure-chest');
    }else if(active.kind==='cursed-wave'){
      if(available<3)return;
      this.spawnCursedWaveStage(this.pendingCursedStage);
    }
    this.eventSetupPending=false;
    this.eventHud?.setText(getRunEventName(active.kind)+' başladı').setVisible(true);
  }

  private spawnExplorationPoints(save?:SaveData):void {
    const knownLore=new Set(save?.collections.discoveredLoreIds??[]);
    const knownPaths=new Set(save?.story.unlockedPathIds??[]);
    const [lore,secret]=this.region.explorationPoints;
    const loreLandmark=getEnvironmentalLoreLandmark(this.region.id,'lore');
    const secretLandmark=getEnvironmentalLoreLandmark(this.region.id,'secret');
    if(lore&&loreLandmark&&!knownLore.has(lore.id))this.createExplorationPoint(WORLD_W/2-330,WORLD_H/2-220,'exploration-lore',lore.id,loreLandmark);
    if(secret&&secretLandmark&&!knownPaths.has(secret.id))this.createExplorationPoint(WORLD_W/2+330,WORLD_H/2+220,'exploration-secret',secret.id,secretLandmark);
  }

  private spawnUnlockedStoryPaths(save?:SaveData):void {
    this.activeStoryPaths=resolveUnlockedRegionPaths(this.region.id,save?.story.unlockedPathIds??[]);
    for(const path of this.activeStoryPaths)this.createStoryPathGate(path);
  }

  private spawnStoryWorldState(save?:SaveData):void {
    const resolved=resolveStoryWorldState(this.region.id,save?.story);
    this.activeStoryWorldState=resolved;
    this.storyWorldObjectCount=0;
    const npc=resolved.npc;
    if(npc){
      const {x,y}=npc.definition.position;
      const halo=this.add.circle(x,y,29,npc.fate.color,.12).setStrokeStyle(2,npc.fate.outlineColor,.42).setDepth(1);
      halo.setData('storyWorldObject',true);this.storyWorldObjectCount++;
      const marker=this.add.circle(x,y,15,npc.fate.color,npc.fate.alpha).setStrokeStyle(3,npc.fate.outlineColor,.95).setScale(npc.fate.scale).setDepth(4);
      marker.setData('storyWorldObject',true).setData('storyNpcId',npc.definition.id).setData('storyNpcFateId',npc.fateId);this.storyWorldObjectCount++;
      const name=this.add.text(x,y-42,npc.definition.name.toLocaleUpperCase('tr-TR'),{fontFamily:'Georgia',fontSize:'13px',fontStyle:'bold',color:'#f0dfbd',stroke:'#17131a',strokeThickness:4,align:'center'}).setOrigin(.5).setDepth(8);
      name.setData('storyWorldObject',true);this.storyWorldObjectCount++;
      const fate=this.add.text(x,y+32,npc.fate.label,{fontSize:'10px',fontStyle:'bold',color:'#e5d7c2',stroke:'#17131a',strokeThickness:3,align:'center'}).setOrigin(.5).setDepth(8);
      fate.setData('storyWorldObject',true);this.storyWorldObjectCount++;
    }
    const atmosphere=resolved.atmosphere;
    if(atmosphere){
      const x=WORLD_W/2,y=WORLD_H/2+350;
      const aura=this.add.circle(x,y,150,atmosphere.auraColor,.09).setStrokeStyle(5,atmosphere.accentColor,.55).setDepth(-2);
      aura.setData('storyWorldObject',true);this.storyWorldObjectCount++;
      const core=this.add.circle(x,y,74,atmosphere.auraColor,.08).setStrokeStyle(2,atmosphere.accentColor,.32).setDepth(-1);
      core.setData('storyWorldObject',true);this.storyWorldObjectCount++;
      const title=this.add.text(x,y+178,atmosphere.name.toLocaleUpperCase('tr-TR'),{fontFamily:'Georgia',fontSize:'14px',fontStyle:'bold',color:'#f0dfbd',stroke:'#17131a',strokeThickness:4,align:'center'}).setOrigin(.5).setDepth(8);
      title.setData('storyWorldObject',true);this.storyWorldObjectCount++;
      const description=this.add.text(x,y+202,atmosphere.description,{fontSize:'11px',color:'#d1c5b5',stroke:'#17131a',strokeThickness:3,align:'center',wordWrap:{width:330}}).setOrigin(.5).setDepth(8);
      description.setData('storyWorldObject',true);this.storyWorldObjectCount++;
    }
  }

  private createStoryPathGate(path:RegionPathDefinition):void {
    const entry=resolveRegionMapPosition(this.mapLayout,path.entry.x,path.entry.y,28);
    const destination=resolveRegionMapPosition(this.mapLayout,path.destination.x,path.destination.y,28);
    const marker=this.add.circle(entry.x,entry.y,20,0x7651a0,.92).setStrokeStyle(4,0xd7b8ff,.95).setDepth(5);
    this.physics.add.existing(marker);
    const body=marker.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);body.setImmovable(true);body.setCircle(22);
    marker.setData('eventObjectType','story-path-gate').setData('storyPathId',path.id);
    const label=this.add.text(entry.x,entry.y-34,path.name.toLocaleUpperCase('tr-TR'),{fontSize:'11px',fontStyle:'bold',color:'#ead8ff',stroke:'#17131a',strokeThickness:3}).setOrigin(.5).setDepth(7);
    marker.setData('eventObjectLabel',label);
    this.eventObjects.add(marker);
    this.add.circle(destination.x,destination.y,28,0x7651a0,.2).setStrokeStyle(3,0xd7b8ff,.72).setDepth(1);
    this.add.text(destination.x,destination.y-38,'GEÇİT SONU',{fontSize:'10px',fontStyle:'bold',color:'#d7c1ef',stroke:'#17131a',strokeThickness:3}).setOrigin(.5).setDepth(2);
  }

  private createExplorationPoint(x:number,y:number,type:'exploration-lore'|'exploration-secret',pointId:string,landmark:EnvironmentalLoreLandmark):void {
    const secret=type==='exploration-secret';
    const decoration=this.add.graphics().setPosition(x,y).setDepth(2);
    const primary=landmark.primaryColor,accent=landmark.accentColor;
    decoration.lineStyle(4,primary,.9);
    if(landmark.motif==='forest-camp'){
      decoration.lineBetween(-34,18,-34,-14);decoration.lineBetween(-34,-14,0,-35);decoration.lineBetween(0,-35,34,-14);decoration.lineBetween(34,-14,34,18);
      decoration.lineBetween(-34,-14,0,18);decoration.lineBetween(34,-14,0,18);decoration.strokeCircle(0,28,9);
      decoration.fillStyle(accent,.9);decoration.fillCircle(0,28,5);
      decoration.lineStyle(3,accent,.75);decoration.lineBetween(-46,27,-30,21);decoration.lineBetween(30,21,46,27);
    }else if(landmark.motif==='grave-etching'){
      decoration.strokeRoundedRect(-22,-31,44,62,8);decoration.lineStyle(3,accent,.95);
      decoration.lineBetween(-12,-9,12,-9);decoration.lineBetween(-12,1,12,1);decoration.lineBetween(-9,12,9,12);
      decoration.strokeCircle(0,-19,5);decoration.lineBetween(-35,35,35,35);
    }else if(landmark.motif==='dungeon-workshop'){
      decoration.strokeCircle(0,0,25);decoration.strokeCircle(0,0,11);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;decoration.lineBetween(Math.cos(a)*13,Math.sin(a)*13,Math.cos(a)*34,Math.sin(a)*34);}
      decoration.lineStyle(4,accent,.9);decoration.strokeRect(-39,26,78,13);decoration.lineBetween(-25,26,-25,40);decoration.lineBetween(25,26,25,40);
    }else if(landmark.motif==='swamp-altar'){
      decoration.strokeCircle(0,0,34);decoration.strokeCircle(0,0,23);decoration.fillStyle(primary,.3);decoration.fillRoundedRect(-16,-19,32,40,5);
      decoration.lineStyle(3,accent,.95);decoration.lineBetween(0,-15,0,15);decoration.lineBetween(-10,0,10,0);
      decoration.strokeCircle(-38,27,8);decoration.strokeCircle(38,27,8);
    }else{
      decoration.strokeCircle(0,0,36);decoration.strokeCircle(0,0,24);decoration.strokeCircle(0,0,10);
      decoration.lineStyle(4,accent,.95);decoration.lineBetween(0,-42,0,-18);decoration.lineBetween(0,18,0,42);
      decoration.lineBetween(-42,0,-18,0);decoration.lineBetween(18,0,42,0);
      decoration.strokeRect(-14,-14,28,28);
    }
    const marker=this.add.circle(x,y,secret?17:15,primary,.08).setStrokeStyle(2,accent,.8).setDepth(5);
    this.physics.add.existing(marker);
    const body=marker.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);body.setImmovable(true);body.setCircle(secret?18:16);
    marker.setData('eventObjectType',type).setData('explorationPointId',pointId)
      .setData('explorationMotif',landmark.motif).setData('explorationName',landmark.name)
      .setData('explorationDescription',landmark.description).setData('eventObjectDecoration',decoration);
    const label=this.add.text(x,y-54,landmark.name.toLocaleUpperCase('tr-TR'),{fontFamily:'Georgia',fontSize:'11px',fontStyle:'bold',color:'#f0dfbd',stroke:'#17131a',strokeThickness:4,align:'center',wordWrap:{width:220}}).setOrigin(.5).setDepth(7);
    const description=this.add.text(x,y+48,landmark.description,{fontSize:'10px',color:'#d1c5b5',stroke:'#17131a',strokeThickness:3,align:'center',wordWrap:{width:250}}).setOrigin(.5).setDepth(7);
    marker.setData('eventObjectLabel',label).setData('eventObjectDescription',description);
    this.eventObjects.add(marker);
  }

  private createRunEventObject(x:number,y:number,type:'spirit-fragment'|'treasure-chest'|'boss-chest'|'essence-fragment',essenceValue=0):void {
    const bossChest=type==='boss-chest';
    const essence=type==='essence-fragment';
    const chest=type==='treasure-chest'||bossChest;
    const object=bossChest
      ?this.physics.add.sprite(x,y,'boss-chest').setDepth(5)
      :chest
        ?this.add.rectangle(x,y,28,24,0x9a7041).setStrokeStyle(3,0xe6c77f).setDepth(5)
        :this.add.circle(x,y,essence?8:10,essence?0xe4c16c:0x74d9cf).setStrokeStyle(3,essence?0xffedb1:0xd8fff1).setDepth(5);
    this.eventObjects.add(object);
    const body=object.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);body.setImmovable(true);body.setSize(bossChest?40:chest?30:22,bossChest?34:chest?26:22);
    object.setData('eventObjectType',type).setData('essenceValue',essenceValue);
    if(bossChest){
      const label=this.add.text(x,y-30,'BOSS SANDIĞI',{fontSize:'12px',fontStyle:'bold',color:'#ffe7a8',stroke:'#21170b',strokeThickness:3}).setOrigin(.5).setDepth(7);
      object.setData('eventObjectLabel',label);
    }
  }

  private handleRunEventObjectOverlap(object:Phaser.GameObjects.GameObject):void {
    if(object.getData('eventObjectType')==='boss-chest'){
      this.bossChestOverlapCount++;
      this.bossChestLastOverlapAtMs=this.time.now;
    }
    this.collectRunEventObject(object);
  }

  private collectRunEventObject(object:Phaser.GameObjects.GameObject):void {
    const type=object.getData('eventObjectType');
    if(type==='story-path-gate'){
      const pathId=String(object.getData('storyPathId')??'');
      const path=this.activeStoryPaths.find(item=>item.id===pathId);
      if(!path||this.lastTraversedStoryPathId===path.id)return;
      this.lastTraversedStoryPathId=path.id;
      (object.getData('eventObjectLabel') as Phaser.GameObjects.GameObject|undefined)?.destroy();
      object.destroy();
      const destination=resolveRegionMapPosition(this.mapLayout,path.destination.x,path.destination.y,28);
      this.player.setPosition(destination.x,destination.y);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(destination.x,destination.y);
      this.eventHud?.setText('HİKÂYE YOLU AÇILDI  •  '+path.name.toLocaleUpperCase('tr-TR')).setVisible(true);
      return;
    }
    if(type==='exploration-lore'||type==='exploration-secret'){
      const pointId=String(object.getData('explorationPointId')??'');
      const label=object.getData('eventObjectLabel') as Phaser.GameObjects.GameObject|undefined;
      const description=object.getData('eventObjectDescription') as Phaser.GameObjects.GameObject|undefined;
      const decoration=object.getData('eventObjectDecoration') as Phaser.GameObjects.GameObject|undefined;
      if(type==='exploration-lore'&&!this.runDiscoveredLoreIds.includes(pointId)){
        this.runDiscoveredLoreIds.push(pointId);label?.destroy();description?.destroy();decoration?.destroy();object.destroy();
        this.eventHud?.setText('HİKÂYE ARŞİVİ KEŞFEDİLDİ').setVisible(true);
      }else if(type==='exploration-secret'&&!this.runDiscoveredPathIds.includes(pointId)){
        this.runDiscoveredPathIds.push(pointId);label?.destroy();description?.destroy();decoration?.destroy();object.destroy();
        this.eventHud?.setText('GİZLİ GEÇİT KEŞFEDİLDİ').setVisible(true);
      }
      return;
    }
    if(type==='boss-chest'){
      this.bossChestCollectCount++;
      this.bossChestLastCollectAtMs=this.time.now;
      this.bossChestLastCollectObjectActive=object.active;
      this.bossChestLastCollectPending=this.bossVictoryPending;
      this.bossChestCollectOutcome='entered';
      if(!object.active){this.bossChestCollectOutcome='inactive';return;}
    }else if(!object.active)return;
    if(type==='boss-chest'&&this.bossVictoryPending){
      this.bossChestCollectOutcome='opened';
      this.bossChestOpened=true;
      this.bossChestOpenedAtMs=this.time.now;
      const bossRelic=this.bossDefinition?RELICS.find(relic=>relic.id===this.bossDefinition!.reward.relicId):undefined;
      if(bossRelic&&!this.runRelicIds.includes(bossRelic.id))this.runRelicIds.push(bossRelic.id);
      const label=object.getData('eventObjectLabel') as Phaser.GameObjects.GameObject|undefined;
      label?.destroy();object.destroy();this.bossVictoryPending=false;
      let evolvedCount=0;
      for(const progress of [...this.build.weapons]){
        const weapon=WEAPONS.find(item=>item.id===progress.weaponId);
        if(!weapon)continue;
        const next=evolveWeapon(this.build,weapon);
        if(next.weapons.some(item=>item.weaponId===weapon.id&&item.evolved&&!progress.evolved))evolvedCount++;
        this.build=next;
      }
      this.refreshBuildStats();
      this.bossPhaseText?.setText(evolvedCount>0?'SİLAH EVRİLDİ':'SANDIK AÇILDI');
      this.eventHud?.setText(evolvedCount>0?'SANDIK AÇILDI  •  '+evolvedCount+' SİLAH EVRİLDİ':'SANDIK AÇILDI  •  EVRİM KOŞULU YOK').setVisible(true);
      this.cameras.main.flash(420,210,170,90);
      this.bossChestFinishScheduledAtMs=this.time.now;
      this.bossChestFinishTimer=this.time.delayedCall(500,()=>{this.bossChestFinishCallbackAtMs=this.time.now;if(this.gameMode==='endless')this.startNextEndlessBossCycle();else this.finishRun(true);});
      return;
    }
    if(type==='boss-chest')this.bossChestCollectOutcome='not-pending';
    const active=this.runEventState.activeEvent;
    if(type==='essence-fragment'){const value=Number(object.getData('essenceValue')??0);this.runSoulEssence+=value;object.destroy();this.eventHud?.setText('RUH ÖZÜ  •  +'+value).setVisible(true);return;}
    if(!active||active.status!=='active')return;
    if(type==='spirit-fragment'&&active.kind==='spirit-storm'){
      object.destroy();this.applyRunEventAction('collect');
    }else if(type==='treasure-chest'&&active.kind==='treasure-hunt'){
      object.destroy();this.applyRunEventAction('treasure');
    }
  }

  private spawnCursedWaveStage(stage:number):void {
    const active=this.runEventState.activeEvent;
    if(!active||active.kind!=='cursed-wave'||active.status!=='active')return;
    const pool=this.region.enemyIds.map(id=>ENEMIES.find(enemy=>enemy.id===id)).filter((enemy):enemy is EnemyDefinition=>Boolean(enemy));
    this.pendingCursedStage=stage;
    const available=42-this.enemies.countActive(true);
    if(available<3){this.eventSetupPending=true;return;}
    for(let i=0;i<3;i++){
      const def=pool[Math.floor(waveRandom(this.runSeed,stage*10+i,79)*pool.length)]??pool[0];
      if(!def)continue;
      const angle=(i/3)*Math.PI*2;
      const enemy=this.createEnemy(this.player.x+Math.cos(angle)*235,this.player.y+Math.sin(angle)*235,def,1.1);
      enemy.setTint(0x9b78c8).setData('runEventKind','cursed-wave').setData('cursedWaveStage',stage);
    }
    this.eventSetupPending=false;
  }

  private completeRunEvent(kind:RunEventKind):void {
    this.recordQuestGameplayEvent('run-event-complete',kind);
    const reward=getRunEventReward(kind);this.runSoulEssence+=reward;this.clearRunEventObjects();this.eventSetupPending=false;
    const relic=kind==='treasure-hunt'?RELICS.find(item=>item.regionId===this.region.id&&item.source==='exploration'):undefined;
    if(kind==='treasure-hunt')this.completedTreasureHunt=true;
    if(relic&&!this.runRelicIds.includes(relic.id))this.runRelicIds.push(relic.id);
    const material=kind==='treasure-hunt'?CRAFTING_MATERIALS.find(item=>item.regionId===this.region.id):undefined;
    if(material)this.runCraftingMaterials[material.id]=(this.runCraftingMaterials[material.id]??0)+1;
    this.eventHud?.setText(getRunEventName(kind)+' tamamlandı  •  +'+reward+' Ruh Özü'+(relic?'  •  '+relic.name:'')+(material?'  •  +1 '+material.name:'')).setVisible(true);
  }

  private recordQuestGameplayEvent(type:'enemy-kill'|'elite-kill'|'boss-defeat'|'run-event-complete',filter?:string):void {
    if(!this.questSaveData)return;
    this.questSaveData=recordQuestEvent(this.questSaveData,this.region.id,{type,filter});
    this.refreshQuestHud();this.showPendingQuestChoice();
  }

  private failRunEvent(kind:RunEventKind):void {
    this.clearRunEventObjects();this.eventSetupPending=false;
    this.eventHud?.setText(getRunEventName(kind)+' başarısız').setVisible(true);
  }

  private clearRunEventObjects():void {
    for(const child of [...this.eventObjects.getChildren()]){
      const label=child.getData('eventObjectLabel') as Phaser.GameObjects.GameObject|undefined;
      label?.destroy();child.destroy();
    }
  }

  private dropExperience(source:Phaser.Physics.Arcade.Sprite,xp:number):void {
    const orb=this.orbs.create(source.x,source.y,'orb') as Phaser.Physics.Arcade.Sprite;
    orb.setDepth(2).setCircle(6).setData('xp',xp);
  }

  private contactDamage(enemy:Phaser.Physics.Arcade.Sprite):void {
    if(this.time.now<this.nextDamage||this.time.now<this.dashUntil||!enemy.active)return;
    const baseDef=this.enemyDefinition(enemy);const def=baseDef?this.scaledEnemyDefinitions.get(baseDef.id)??baseDef:undefined;const actor=this.enemyStates.get(enemy);if(actor?.burrowed||Number(enemy.getData('untargetableUntil')??0)>this.time.now)return;
    const base=enemy.getData('isBoss')?(this.bossDefinition?.contactDamage??24):(def?.contactDamage??9)*(enemy.getData('isElite')?1.4:1);
    const damage=base*getWeakenedDamageMultiplier(Number(enemy.getData('weakenedUntil')??0),this.time.now,Number(enemy.getData('weakenedMultiplier')??1));
    this.nextDamage=this.time.now+650;this.receiveCombatDamage(damage);
  }

  private receiveCombatDamage(amount:number):void {
    const sealed=PASSIVES.find(item=>item.specialUpgrade.mechanic.kind==='sealed-plate')?.specialUpgrade.mechanic;
    if(sealed?.kind==='sealed-plate'){
      const result=resolveSealedPlate(this.passiveSpecialState,this.state.elapsedMs,isPassiveSpecialActive(this.build,'graveplate'),sealed.intervalMs);
      this.passiveSpecialState=result.state;
      if(result.blocked){this.showPassiveSpecialFeedback('MÜHÜRLÜ PLAKA  •  HASAR ENGELLENDİ');return;}
    }
    if(this.gameMode==='endless')amount*=getEndlessRuleModifiers(this.state.elapsedMs).incomingDamageMultiplier;
    if(this.time.now<this.abilityGuardUntil)amount*=this.abilityGuardDamageMultiplier;
    if(this.time.now<this.weaponSynergyGuardUntil)amount*=1-this.weaponSynergyGuardReduction;
    const armor=this.currentBuildStats().armor+this.character.stats.armor+this.permanentUpgradeEffects.armorBonus+this.relicStats.armorBonus;
    const reduced=Math.max(1,amount*(1-armor/(armor+100)));
    const ward=PASSIVES.find(item=>item.specialUpgrade.mechanic.kind==='last-ward')?.specialUpgrade.mechanic;
    const protectedHit=resolveLastWard(this.state.health,reduced,this.passiveSpecialState.used.includes('last-ward'),isPassiveSpecialActive(this.build,'wardens-knot'),ward?.kind==='last-ward'?ward.healthRemaining:1);
    if(protectedHit.triggered)this.passiveSpecialState={...this.passiveSpecialState,used:[...this.passiveSpecialState.used,'last-ward']};
    this.state={...this.state,health:protectedHit.health};this.cameras.main.shake(90,.002);this.refreshHud();
    if(this.state.health<=0)this.finishRun(false);
  }

  private healPlayer(amount:number):void {this.state={...this.state,health:Math.min(this.state.maxHealth,this.state.health+Math.max(0,amount))};}

  private showPassiveSpecialFeedback(message:string):void {
    this.passiveSpecialFeedback?.destroy();
    this.passiveSpecialFeedback=this.add.text(this.scale.width/2,this.scale.height*.22,message,{fontFamily:'Georgia',fontSize:'17px',color:'#f2d69a',stroke:'#201820',strokeThickness:4,backgroundColor:'#241b20',padding:{x:10,y:6}}).setOrigin(.5).setScrollFactor(0).setDepth(230);
    this.time.delayedCall(1050,()=>{this.passiveSpecialFeedback?.destroy();this.passiveSpecialFeedback=undefined;});
  }

  private spawnPassiveZone(x:number,y:number,mechanic:Extract<PassiveSpecialMechanic,{kind:'poison-spores'|'lightning-field'}>):void {
    const marker=this.add.graphics().setDepth(6);
    const poison=mechanic.kind==='poison-spores';
    marker.lineStyle(3,poison?0x9ac65d:0xf4dc74,.9);marker.fillStyle(poison?0x9ac65d:0xf4dc74,.13);marker.strokeCircle(x,y,mechanic.radius);marker.fillCircle(x,y,mechanic.radius);
    this.passiveZones.push({x,y,radius:mechanic.radius,expiresAt:this.time.now+mechanic.durationMs,nextTickAt:this.time.now+mechanic.tickMs,damage:mechanic.damageMultiplier,tickMs:mechanic.tickMs,marker});
  }

  private weaponSynergyDamage(weaponId:string,target:Phaser.Physics.Arcade.Sprite,damage:number):number {
    const weakened=Number(target.getData('weakenedUntil')??0)>this.time.now;
    const multiplier=getWeaponSynergyDamageMultiplier(weaponId,this.build.passives.map(passive=>passive.passiveId),weakened);
    if(weakened&&multiplier>1&&getActiveWeaponSynergies(weaponId,this.build.passives.map(passive=>passive.passiveId)).some(item=>item.kind==='crown-sigil'||item.kind==='crown-guidance')){
      const synergy=getActiveWeaponSynergies(weaponId,this.build.passives.map(passive=>passive.passiveId)).find(item=>item.kind==='crown-sigil'||item.kind==='crown-guidance');
      if(synergy)this.recordWeaponSynergy(synergy.id);
    }
    return damage*multiplier;
  }

  private recordWeaponSynergy(id:string):void {if(!this.weaponSynergyTriggers.includes(id))this.weaponSynergyTriggers=[...this.weaponSynergyTriggers.slice(-13),id];}

  private spawnWeaponSynergyZone(x:number,y:number,radius:number,durationMs:number,tickMs:number,damage:number,element:ElementId):void {
    const marker=this.add.graphics().setDepth(6);
    marker.lineStyle(2,elementTint[element],.85);marker.fillStyle(elementTint[element],.12);marker.strokeCircle(x,y,radius);marker.fillCircle(x,y,radius);
    this.passiveZones.push({x,y,radius,expiresAt:this.time.now+durationMs,nextTickAt:this.time.now+tickMs,damage,tickMs,marker});
  }

  private applyWeaponSynergyCurse(x:number,y:number,radius:number,stacks:number):void {
    const dark=ELEMENTS.find(item=>item.id==='dark')!;
    for(const enemy of this.activeTargets()){
      if(Phaser.Math.Distance.Between(x,y,enemy.x,enemy.y)>radius)continue;
      const state=enemy.getData('isBoss')?this.bossElementState:(this.elementStates.get(enemy)??{});
      const current=state.dark;
      const next={...state,dark:{buildup:0,stacks:addCurseStack(current&&current.expiresAt>this.time.now?current.stacks:0,stacks),expiresAt:this.time.now+dark.durationMs,nextTickAt:this.time.now+1000}};
      if(enemy.getData('isBoss'))this.bossElementState=next;else this.elementStates.set(enemy,next);
    }
  }

  private updatePassiveZones(time:number):void {
    this.passiveZones=this.passiveZones.filter(zone=>{
      if(time>=zone.expiresAt){zone.marker.destroy();return false;}
      if(time>=zone.nextTickAt){
        const targets=this.activeTargets().filter(enemy=>Phaser.Math.Distance.Between(zone.x,zone.y,enemy.x,enemy.y)<=zone.radius);
        for(const enemy of targets){const definition=this.enemyDefinition(enemy);const baseHealth=enemy.getData('isBoss')?(this.bossDefinition?.health??100):definition?.health??100;this.damageEnemy(enemy,Math.max(1,baseHealth*zone.damage));}
        zone.nextTickAt=time+zone.tickMs;
      }
      return true;
    });
  }

  private updateElementStatuses(time:number):void {
    for(const child of this.enemies.getChildren()){
      const enemy=child as Phaser.Physics.Arcade.Sprite;if(!enemy.active)continue;
      const status=this.elementStates.get(enemy);if(!status)continue;
      const tick=tickElementStatuses(status,time);this.elementStates.set(enemy,tick.state);
      if(tick.damage>0)this.damageEnemy(enemy,tick.damage);
      const concealed=Boolean(this.enemyStates.get(enemy)?.burrowed)||Number(enemy.getData('untargetableUntil')??0)>time;
      enemy.setAlpha(concealed ? .28 : (tick.slowed||tick.frozen) ? .58 : 1);
    }
    if(this.bossState&&this.bossSprite?.active){const tick=tickElementStatuses(this.bossElementState,time);this.bossElementState=tick.state;if(tick.damage>0)this.damageBossTarget(this.bossSprite,tick.damage);}
  }

  private updateRegionHazard(time:number):void {
    if(this.hazardPoisonStacks>0){
      if(time>=this.hazardPoisonExpiresAt){this.hazardPoisonStacks=0;this.hazardPoisonNextTickAt=0;}
      else if(time>=this.hazardPoisonNextTickAt){this.hazardPoisonNextTickAt=time+1_000;this.receiveCombatDamage(this.hazardPoisonStacks*1.25);}
    }
    const result=stepRegionHazard(this.region,this.hazardCycle,time);this.hazardCycle=result.cycle;
    const event:HazardEvent=result.event;
    if(event.phase==='idle'){
      this.hazardMarker?.destroy();this.hazardMarker=undefined;this.hazardLabel?.destroy();this.hazardLabel=undefined;
      this.hazardCounterLabel?.destroy();this.hazardCounterLabel=undefined;this.activeHazardId='';this.hazardHasHit=false;return;
    }
    const mechanic=getRegionHazardMechanic(event.hazard.id);
    if(!mechanic)return;
    if(this.activeHazardId!==event.hazard.id){
      this.activeHazardId=event.hazard.id;this.hazardHasHit=false;
      if(!this.hazardTargetForced){
        const angle=Math.random()*Math.PI*2;
        this.hazardTarget={x:Phaser.Math.Clamp(this.player.x+Math.cos(angle)*150,50,WORLD_W-50),y:Phaser.Math.Clamp(this.player.y+Math.sin(angle)*150,50,WORLD_H-50)};
      }
      this.hazardTargetForced=false;
      const angle=Phaser.Math.Angle.Between(this.hazardTarget.x,this.hazardTarget.y,this.player.x,this.player.y);
      this.hazardDirection={x:Math.cos(angle),y:Math.sin(angle)};
      this.hazardMarker?.destroy();this.hazardMarker=this.add.graphics().setDepth(6);
      this.hazardLabel?.destroy();this.hazardLabel=this.add.text(this.hazardTarget.x,this.hazardTarget.y-58,event.hazard.name,{fontSize:'12px',color:'#f1d59b',backgroundColor:'#251d20',padding:{x:5,y:3}}).setOrigin(.5).setDepth(7);
      this.hazardCounterLabel?.destroy();this.hazardCounterLabel=this.add.text(this.hazardTarget.x,this.hazardTarget.y+mechanic.radius+18,event.hazard.counter,{fontSize:'10px',color:'#d8c8a8',backgroundColor:'#211b20',padding:{x:4,y:2},align:'center',wordWrap:{width:250}}).setOrigin(.5).setDepth(7);
    }
    const active=event.phase==='active';
    if(this.hazardMarker){
      const marker=this.hazardMarker;marker.clear();marker.lineStyle(3,active?0xe55d54:0xd7b568,.95);marker.fillStyle(active?0xd84f4f:0xd7b568,active?.2:.08);
      const {x,y}=this.hazardTarget,{x:dx,y:dy}=this.hazardDirection,r=mechanic.radius;
      if(mechanic.shape==='line'){
        marker.lineBetween(x-dx*r,y-dy*r,x+dx*r,y+dy*r);
        marker.lineBetween(x-dx*r-dy*16,y-dy*r+dx*16,x+dx*r-dy*16,y+dy*r+dx*16);
        marker.lineBetween(x-dx*r+dy*16,y-dy*r-dx*16,x+dx*r+dy*16,y+dy*r-dx*16);
      }else if(mechanic.shape==='cross'){
        marker.lineBetween(x-r,y,x+r,y);marker.lineBetween(x,y-r,x,y+r);
      }else{
        marker.strokeCircle(x,y,r);
        if(mechanic.shape==='ring')marker.strokeCircle(x,y,r*.72);
        marker.fillCircle(x,y,r);
      }
    }
    if(active&&!this.hazardHasHit&&(this.isPlayerInsideRegionHazard(mechanic)||Boolean(mechanic.summonCount)))this.resolveRegionHazard(event.hazard.id,mechanic);
  }

  private isPlayerInsideRegionHazard(mechanic:RegionHazardMechanic):boolean {
    const dx=this.player.x-this.hazardTarget.x,dy=this.player.y-this.hazardTarget.y,distance=Math.hypot(dx,dy),r=mechanic.radius;
    if(mechanic.shape==='circle'||mechanic.shape==='ring')return distance<=r+18;
    const along=dx*this.hazardDirection.x+dy*this.hazardDirection.y;
    const across=Math.abs(dx*this.hazardDirection.y-dy*this.hazardDirection.x);
    if(mechanic.shape==='line')return Math.abs(along)<=r&&across<=30;
    return (Math.abs(dx)<=28&&Math.abs(dy)<=r)||(Math.abs(dy)<=28&&Math.abs(dx)<=r);
  }

  private resolveRegionHazard(hazardId:string,mechanic:RegionHazardMechanic):void {
    this.hazardHasHit=true;this.hazardLastEffectId=hazardId;this.hazardLastDamage=mechanic.damage;
    if(mechanic.damage>0)this.receiveCombatDamage(mechanic.damage);
    if(mechanic.slowMultiplier&&mechanic.slowDurationMs){
      const currentSlow=this.time.now<this.playerSlowUntil?this.playerSlowMultiplier:1;
      this.playerSlowUntil=Math.max(this.playerSlowUntil,this.time.now+mechanic.slowDurationMs);
      this.playerSlowMultiplier=Math.min(currentSlow,mechanic.slowMultiplier);
    }
    if(mechanic.poisonStacks){
      this.hazardPoisonStacks=Math.min(4,this.hazardPoisonStacks+mechanic.poisonStacks);
      this.hazardPoisonExpiresAt=this.time.now+(mechanic.poisonDurationMs??4_000);
      if(this.hazardPoisonNextTickAt<=this.time.now)this.hazardPoisonNextTickAt=this.time.now+1_000;
    }
    if(mechanic.pushForce){
      const angle=Phaser.Math.Angle.Between(this.hazardTarget.x,this.hazardTarget.y,this.player.x,this.player.y);
      this.player.setVelocity(Math.cos(angle)*mechanic.pushForce,Math.sin(angle)*mechanic.pushForce);
    }
    if(mechanic.summonEnemyId&&mechanic.summonCount){
      const definition=ENEMIES.find(enemy=>enemy.id===mechanic.summonEnemyId);
      if(definition&&this.enemies.countActive(true)<42){
        for(let index=0;index<mechanic.summonCount&&this.enemies.countActive(true)<42;index++){
          const angle=Math.PI*2*index/mechanic.summonCount;
          const enemy=this.createEnemy(this.hazardTarget.x+Math.cos(angle)*42,this.hazardTarget.y+Math.sin(angle)*42,definition,.72);
          enemy.setData('experience',0).setData('summonedByHazard',hazardId);
        }
      }
    }
    this.eventHud?.setText('ÇEVRESEL TEHLİKE  •  '+hazardId.toUpperCase()).setVisible(true);
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
        if(Phaser.Math.Distance.Between(enemy.x,enemy.y,ally.x,ally.y)<=special.radius)ally.setData('moveSpeedBuffUntil',this.time.now+special.durationMs).setData('moveSpeedBuff',1+special.amount);
      }
      this.createEnemyZone(special.targetX,special.targetY,special.radius,special.durationMs,0,0x9b78c8,0);
      return;
    }
    if(special.kind==='trap'||special.kind==='web'||special.kind==='spore-cloud'){
      const damage=special.kind==='trap'?special.amount:special.kind==='spore-cloud'?special.amount:0;
      const slow=special.kind==='web'?.5:0;
      const color=special.kind==='web'?0x83c6c9:0x9ac65d;
      const warning=this.add.graphics().setDepth(6);warning.lineStyle(3,color,.9);warning.strokeCircle(special.targetX,special.targetY,special.radius);warning.fillStyle(color,.12);warning.fillCircle(special.targetX,special.targetY,special.radius);
      this.time.delayedCall(680,()=>{warning.destroy();if(!this.runFinished)this.createEnemyZone(special.targetX,special.targetY,special.radius,special.durationMs,damage,color,slow,special.kind==='web');});
      return;
    }
    if(special.kind==='frost-trail'){
      this.createEnemyZone(enemy.x,enemy.y,special.radius,special.durationMs,0,0x8fdcff,special.amount);
    }
  }

  private createEnemyZone(x:number,y:number,radius:number,durationMs:number,damage:number,color:number,slow:number,affectsEnemies=false):void {
    const marker=this.add.graphics().setDepth(6);
    marker.fillStyle(color,.2);marker.lineStyle(2,color,.8);marker.fillCircle(x,y,radius);marker.strokeCircle(x,y,radius);
    this.enemyZones.push({x,y,radius,expiresAt:this.time.now+durationMs,nextTickAt:this.time.now+350,damage,slow,affectsEnemies,marker});
  }

  private updateEnemyZones(time:number):void {
    this.enemyZones=this.enemyZones.filter(zone=>{
      if(time>=zone.expiresAt){zone.marker.destroy();return false;}
      const inside=Phaser.Math.Distance.Between(this.player.x,this.player.y,zone.x,zone.y)<=zone.radius+12;
      if(inside&&zone.slow>0){this.playerSlowUntil=time+220;this.playerSlowMultiplier=zone.slow;}
      if(zone.affectsEnemies&&zone.slow>0){
        for(const child of this.enemies.getChildren()){
          const enemy=child as Phaser.Physics.Arcade.Sprite;
          if(!enemy.active||enemy.getData('isBoss'))continue;
          const def=this.enemyDefinition(enemy);
          if(Phaser.Math.Distance.Between(enemy.x,enemy.y,zone.x,zone.y)>zone.radius+(def?.radius??12))continue;
          const previousUntil=Number(enemy.getData('enemySlowUntil')??0);
          const previousMultiplier=previousUntil>time?Number(enemy.getData('enemySlowMultiplier')??1):1;
          enemy.setData('enemySlowUntil',time+100).setData('enemySlowMultiplier',Math.min(previousMultiplier,zone.slow));
        }
      }
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
    const stats=this.currentBuildStats();this.state={...this.state,moveSpeed:this.character.moveSpeed*stats.moveSpeedMultiplier*this.permanentUpgradeEffects.moveSpeedMultiplier*this.relicStats.moveSpeedMultiplier,
      damage:18+this.basePowerBonus,magnetRadius:112+this.baseMagnetBonus+stats.magnetRadiusBonus+this.relicStats.magnetRadiusBonus};
  }

  private magnetize():void {
    const radius=this.state.magnetRadius;
    for(const child of this.orbs.getChildren()){const orb=child as Phaser.Physics.Arcade.Sprite;if(!orb.active)continue;
      const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,orb.x,orb.y);
      if(d<=radius){const a=Phaser.Math.Angle.Between(orb.x,orb.y,this.player.x,this.player.y);orb.setVelocity(Math.cos(a)*250,Math.sin(a)*250);}else orb.setVelocity(0,0);
    }
    for(const object of this.eventObjects.getChildren()){
      if(object.getData('eventObjectType')!=='essence-fragment'||!object.active)continue;
      const fragment=object as Phaser.GameObjects.GameObject&{x:number;y:number;body?:Phaser.Physics.Arcade.Body};
      const body=fragment.body;if(!body)continue;
      const distance=Phaser.Math.Distance.Between(this.player.x,this.player.y,fragment.x,fragment.y);
      if(distance<=radius){const angle=Phaser.Math.Angle.Between(fragment.x,fragment.y,this.player.x,this.player.y);body.setVelocity(Math.cos(angle)*270,Math.sin(angle)*270);}else body.setVelocity(0,0);
    }
  }

  private collectOrb(orb:Phaser.Physics.Arcade.Sprite):void {
    if(!orb.active||this.paused)return;
    const gain=Number(orb.getData('xp'))*this.currentBuildStats().xpGainMultiplier*this.permanentUpgradeEffects.xpGainMultiplier;
    const result=gainExperience(this.state,gain);this.state=result.state;this.queuedLevels+=result.levelsGained;orb.destroy();
    if(this.queuedLevels>0)this.showLevelUp();
  }

  private buildChoices():LevelChoice[] {
    const choices:LevelChoice[]=BASE_CHOICES.map(c=>({...c,kind:'base'}));
    for(const weapon of WEAPONS){
      const owned=this.build.weapons.find(w=>w.weaponId===weapon.id);
      if(owned){
        if(owned.level<weapon.maxLevel)choices.push({id:'weapon-up:'+weapon.id,title:weapon.name+' +',detail:'Silah seviyesi '+(owned.level+1),kind:'weapon-up',contentId:weapon.id});
        if(owned.level>=3&&!owned.branchId)for(const branch of weapon.branches)choices.push({id:'weapon-branch:'+weapon.id+':'+branch.id,title:weapon.name+' — '+branch.name,detail:branch.effect,kind:'weapon-branch',contentId:weapon.id,branchId:branch.id});
      }else if(canAddChallengeWeapon(this.challengeId,this.build.weapons.length))choices.push({id:'weapon-add:'+weapon.id,title:weapon.name,detail:weapon.category+' silahını kuşan',kind:'weapon-add',contentId:weapon.id});
    }
    for(const passive of PASSIVES){
      const owned=this.build.passives.find(p=>p.passiveId===passive.id);
      if(owned&&owned.level<passive.maxLevel)choices.push({id:'passive-up:'+passive.id,title:passive.name+' +',detail:'Pasif seviyesi '+(owned.level+1),kind:'passive-up',contentId:passive.id});
      else if(owned&&owned.level>=passive.maxLevel&&!owned.special)choices.push({id:'passive-special:'+passive.id,title:passive.name+' — '+passive.specialUpgrade.name,detail:passive.specialUpgrade.effect,kind:'passive-special',contentId:passive.id});
      else if(!owned&&this.build.passives.length<6)choices.push({id:'passive-add:'+passive.id,title:passive.name,detail:passive.category+' pasifini kuşan',kind:'passive-add',contentId:passive.id});
    }
    return choices;
  }

  private drawLevelUpChoices(excludedIds:readonly string[]=[],controlState:LevelUpControlState=this.levelUpControls):LevelChoice[] {
    const pool=this.buildChoices();
    const unavailable=new Set([...excludedIds,...controlState.bannedChoiceIds]);
    const specialChoice=pool.find(choice=>choice.kind==='passive-special'&&!unavailable.has(choice.id));
    if(specialChoice){const regularPool=pool.filter(choice=>choice.kind!=='passive-special'&&choice.kind!=='weapon-branch');const fillers=drawChoicesFromPool(regularPool,controlState,()=>Phaser.Math.RND.frac(),excludedIds);return [specialChoice,...fillers.slice(0,3)];}
    const branchWeaponIds=[...new Set(pool.filter(choice=>choice.kind==='weapon-branch').map(choice=>choice.contentId).filter((id):id is string=>Boolean(id)))];
    for(const weaponId of branchWeaponIds){
      const pair=pool.filter(choice=>choice.kind==='weapon-branch'&&choice.contentId===weaponId&&!unavailable.has(choice.id));
      if(pair.length!==2)continue;
      const regularPool=pool.filter(choice=>choice.kind!=='weapon-branch');
      const fillers=drawChoicesFromPool(regularPool,controlState,()=>Phaser.Math.RND.frac(),excludedIds);
      return [...pair,...fillers.slice(0,2)];
    }
    return drawChoicesFromPool(pool.filter(choice=>choice.kind!=='weapon-branch'),controlState,()=>Phaser.Math.RND.frac(),excludedIds);
  }

  private showLevelUp():void {
    this.pauseRunWorld();
    this.currentLevelChoices=this.drawLevelUpChoices();
    this.banishMode=false;
    this.renderLevelUpChoices();
  }

  private renderLevelUpChoices():void {
    this.clearOverlay();const w=this.scale.width,h=this.scale.height;
    this.overlay.push(this.add.rectangle(w/2,h/2,w,h,0x08070b,.88).setScrollFactor(0).setDepth(200));
    this.overlay.push(this.add.text(w/2,h*.19,'GÜÇLENME SEÇİMİ',{fontFamily:'Georgia',fontSize:'30px',color:'#e8d6ad'}).setOrigin(.5).setScrollFactor(0).setDepth(201));
    const instruction=this.banishMode?'MÜHÜRLEME: ÇIKARMAK İSTEDİĞİN KARTI SEÇ':'Bir gelişim seç. Her seçim koşunu değiştirir.';
    this.overlay.push(this.add.text(w/2,h*.27,instruction,{fontSize:'15px',color:this.banishMode?'#e59a8c':'#aaa0a0'}).setOrigin(.5).setScrollFactor(0).setDepth(201));
    this.currentLevelChoices.forEach((choice,i)=>{
      const x=w/2+(i-1.5)*220;
      const card=this.add.rectangle(x,h*.53,196,170,0x28212a,.98).setStrokeStyle(2,this.banishMode?0xc65d62:0x9b8059).setScrollFactor(0).setDepth(201).setInteractive({useHandCursor:true});
      const name=this.add.text(x,h*.48,choice.title,{fontFamily:'Georgia',fontSize:'17px',color:'#e8d6ad',align:'center',wordWrap:{width:170}}).setOrigin(.5).setScrollFactor(0).setDepth(202);
      const detail=this.add.text(x,h*.59,choice.detail,{fontSize:'12px',color:'#b9b0ae',align:'center',wordWrap:{width:165}}).setOrigin(.5).setScrollFactor(0).setDepth(202);
      this.overlay.push(card,name,detail);
      this.registerOverlayOption(card,()=>this.banishMode?this.banishLevelChoice(choice):this.chooseUpgrade(choice));
    });
    const freeReroll=isPassiveSpecialActive(this.build,'scribes-lens')&&!this.passiveSpecialState.freeRerollUsed;
    const status='Yenile: '+this.levelUpControls.rerollsRemaining+(freeReroll?' + ÜCRETSİZ':'')+'   •   Mühürle: '+this.levelUpControls.banishesRemaining+'   •   Geç: '+this.levelUpControls.skipsRemaining;
    this.overlay.push(this.add.text(w/2,h*.68,status,{fontSize:'14px',color:'#c9bda9'}).setOrigin(.5).setScrollFactor(0).setDepth(202));
    this.createOverlayButton(w*.32,h*.79,190,48,freeReroll?'YENİLE (ÜCRETSİZ)':'YENİLE ('+this.levelUpControls.rerollsRemaining+')',()=>this.rerollLevelChoices());
    this.createOverlayButton(w*.5,h*.79,190,48,this.banishMode?'VAZGEÇ ('+this.levelUpControls.banishesRemaining+')':'MÜHÜRLE ('+this.levelUpControls.banishesRemaining+')',()=>this.toggleBanishMode());
    this.createOverlayButton(w*.68,h*.79,190,48,'GEÇ ('+this.levelUpControls.skipsRemaining+')',()=>this.skipLevelChoice());
  }

  private rerollLevelChoices():void {
    const free=grantFreeReroll(this.passiveSpecialState,isPassiveSpecialActive(this.build,'scribes-lens'));
    const nextState=free.free?this.levelUpControls:spendLevelUpReroll(this.levelUpControls);
    if(!nextState)return;
    const visibleIds=this.currentLevelChoices.map(choice=>choice.id);
    const nextChoices=this.drawLevelUpChoices(visibleIds,nextState);
    if(nextChoices.length===0)return;
    this.levelUpControls=nextState;this.passiveSpecialState=free.state;this.currentLevelChoices=nextChoices;this.banishMode=false;
    this.renderLevelUpChoices();
  }

  private toggleBanishMode():void {
    if(this.levelUpControls.banishesRemaining<=0)return;
    this.banishMode=!this.banishMode;
    this.renderLevelUpChoices();
  }

  private banishLevelChoice(choice:LevelChoice):void {
    const nextState=spendLevelUpBanish(this.levelUpControls,choice.id);
    if(!nextState)return;
    const remainingIds=this.currentLevelChoices.filter(item=>item.id!==choice.id).map(item=>item.id);
    const nextChoices=this.drawLevelUpChoices(remainingIds,nextState);
    this.levelUpControls=nextState;this.currentLevelChoices=nextChoices;this.banishMode=false;
    this.renderLevelUpChoices();
  }

  private skipLevelChoice():void {
    const nextState=spendLevelUpSkip(this.levelUpControls);
    if(!nextState)return;
    this.levelUpControls=nextState;this.queuedLevels=Math.max(0,this.queuedLevels-1);
    this.clearOverlay();
    if(this.queuedLevels>0)this.showLevelUp();else this.resumeRunWorld();
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

  private chooseUpgrade(choice:LevelChoice):void {
    this.banishMode=false;
    if(choice.kind==='base'){
      if(choice.id==='power'){this.basePowerBonus+=6;this.refreshBuildStats();}
      else if(choice.id==='haste'){this.baseHasteMultiplier=Math.min(1.65,this.baseHasteMultiplier*1.1);}
      else if(choice.id==='magnet'){this.baseMagnetBonus+=65;this.refreshBuildStats();}
      else if(choice.id==='vitality'&&this.challengeId){
        const gain=Math.max(1,Math.round(20*getChallengeModifiers(this.challengeId).maxHealthMultiplier));
        const maxHealth=this.state.maxHealth+gain;
        this.state={...this.state,maxHealth,health:Math.min(maxHealth,this.state.health+gain)};
      }else this.state=applyUpgrade(this.state,choice.id as UpgradeId);
    }
    if(choice.kind==='weapon-add'){const def=WEAPONS.find(w=>w.id===choice.contentId);if(def){this.build=addWeapon(this.build,def);if(!this.runDiscoveredWeaponIds.includes(def.id))this.runDiscoveredWeaponIds.push(def.id);}}
    if(choice.kind==='weapon-up'){const def=WEAPONS.find(w=>w.id===choice.contentId);if(def)this.build=upgradeWeapon(this.build,def);}
    if(choice.kind==='weapon-branch'){const def=WEAPONS.find(w=>w.id===choice.contentId);if(def&&choice.branchId)this.build=chooseWeaponBranch(this.build,def,choice.branchId);}
    if(choice.kind==='passive-add'){const def=PASSIVES.find(p=>p.id===choice.contentId);if(def)this.build=addPassive(this.build,def);}
    if(choice.kind==='passive-up'){const def=PASSIVES.find(p=>p.id===choice.contentId);if(def)this.build=upgradePassive(this.build,def);}
    if(choice.kind==='passive-special'){const def=PASSIVES.find(p=>p.id===choice.contentId);if(def){this.build=choosePassiveSpecial(this.build,def);this.showPassiveSpecialFeedback(def.specialUpgrade.name+' AKTİF');}}
    this.refreshBuildStats();this.queuedLevels=Math.max(0,this.queuedLevels-1);this.clearOverlay();this.refreshHud();
    if(this.queuedLevels>0)this.showLevelUp();else this.resumeRunWorld();
  }

  private showPendingQuestChoice():void {
    if(!this.questSaveData||this.paused||this.runFinished||this.pendingQuestChoiceId)return;
    const quest=QUESTS.find(item=>item.regionId===this.region.id&&this.questSaveData?.story.quests[item.id]?.status==='active'&&areQuestObjectivesComplete(item.id,this.questSaveData?.story.quests[item.id]));
    if(!quest)return;
    this.pendingQuestChoiceId=quest.id;this.pauseRunWorld();this.clearOverlay();
    const w=this.scale.width,h=this.scale.height;
    this.overlay.push(this.add.rectangle(w/2,h/2,w,h,0x08070b,.9).setScrollFactor(0).setDepth(200));
    this.overlay.push(this.add.text(w/2,h*.23,'HİKÂYE KARARI',{fontFamily:'Georgia',fontSize:'32px',color:'#e8d6ad'}).setOrigin(.5).setScrollFactor(0).setDepth(201));
    this.overlay.push(this.add.text(w/2,h*.32,quest.title,{fontFamily:'Georgia',fontSize:'22px',color:'#f0d9ad'}).setOrigin(.5).setScrollFactor(0).setDepth(201));
    this.overlay.push(this.add.text(w/2,h*.405,quest.description,{fontSize:'15px',color:'#c9bda9',align:'center',wordWrap:{width:Math.min(720,w*.72)}}).setOrigin(.5).setScrollFactor(0).setDepth(201));
    const cardWidth=Math.min(420,w*.42),cardHeight=Math.min(190,h*.29),cardY=h*.63;
    quest.choices.forEach((choice,index)=>{
      const x=w/2+(index===0?-1:1)*(cardWidth/2+24);
      const card=this.add.rectangle(x,cardY,cardWidth,cardHeight,0x28212a,.98).setStrokeStyle(2,0x9b8059).setScrollFactor(0).setDepth(201).setInteractive({useHandCursor:true});
      const label=this.add.text(x,cardY-35,choice.label,{fontFamily:'Georgia',fontSize:'19px',color:'#f0d9ad',align:'center',wordWrap:{width:cardWidth-34}}).setOrigin(.5).setScrollFactor(0).setDepth(202);
      const description=this.add.text(x,cardY+28,choice.description,{fontSize:'14px',color:'#c9bda9',align:'center',wordWrap:{width:cardWidth-38}}).setOrigin(.5).setScrollFactor(0).setDepth(202);
      this.overlay.push(card,label,description);this.registerOverlayOption(card,()=>this.commitQuestBranch(quest.id,choice.id));
    });
    this.questChoiceErrorText=this.add.text(w/2,h*.83,'',{fontSize:'13px',color:'#e29a8d',align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(203).setVisible(false);
    this.overlay.push(this.questChoiceErrorText);this.overlayBackIndex=null;
  }

  private commitQuestBranch(questId:string,choiceId:string):void {
    if(!this.questSaveData||this.pendingQuestChoiceId!==questId)return;
    const branched=chooseQuestBranch(this.questSaveData,questId,choiceId);
    if(!branched)return;
    const next=startAvailableQuests(branched,this.region.id);
    const manager=this.registry.get('saveManager') as SaveManager|undefined;
    try{
      const loaded=manager?.load();
      if(!manager||!loaded||!('data' in loaded))throw new Error('A valid local profile is not available.');
      manager.save({...loaded.data,progression:next.progression,collections:next.collections,story:next.story});
    }catch{
      this.questChoiceErrorText?.setText('KAYIT BAŞARISIZ — seçim korunmadı. Yeniden dene.').setVisible(true);
      return;
    }
    this.questSaveData=next;this.pendingQuestChoiceId=null;this.questChoiceErrorText=undefined;
    this.clearOverlay();this.refreshHud();this.resumeRunWorld();
  }

  private openPause():void {
    if(this.paused)return;this.pauseRunWorld();this.clearOverlay();const w=this.scale.width,h=this.scale.height;
    const shade=this.add.rectangle(w/2,h/2,w,h,0x08070b,.84).setScrollFactor(0).setDepth(200);
    const title=this.add.text(w/2,h*.36,'DURAKLATILDI',{fontFamily:'Georgia',fontSize:'34px',color:'#e8d6ad'}).setOrigin(.5).setScrollFactor(0).setDepth(201);
    this.overlay.push(shade,title);
    this.createOverlayButton(w/2,h*.48,260,54,'DEVAM ET',()=>{this.clearOverlay();this.resumeRunWorld();});
    this.createOverlayButton(w/2,h*.62,260,54,'HİKÂYE DEFTERİ',()=>this.openQuestJournal());
    this.createOverlayButton(w/2,h*.76,260,54,'ANA MENÜ',()=>this.scene.start('main-menu'));
    this.overlayBackIndex=0;
  }

  private openQuestJournal():void {
    if(!this.paused||this.runFinished||this.questJournalOpen)return;
    this.questJournalOpen=true;
    this.events.once('quest-journal-closed',()=>{this.previousGamepadFrame=this.readGamepadFrame();this.questJournalOpen=false;});
    this.scene.launch('quest-journal',{returnScene:'run'});
  }

  private finishRun(won:boolean):void {
    if(this.runFinished)return;this.runFinished=true;
    if(this.gameMode==='endless'&&!won)this.runSoulEssence+=getEndlessSurvivalReward(this.state.elapsedMs,this.endlessState.bossCyclesCompleted);
    this.pauseRunWorld();this.clearOverlay();const w=this.scale.width,h=this.scale.height;
    const saved=this.persistRunResult(won);this.lastRunSaved=saved;
    const shade=this.add.rectangle(w/2,h/2,w,h,0x08070b,.9).setScrollFactor(0).setDepth(200);
    const title=this.add.text(w/2,h*.29,won?(this.gameMode==='boss-hunt'?'BOSS HUNT TAMAMLANDI':this.gameMode==='challenge'?'MEYDAN OKUMA TAMAMLANDI':'KOŞU TAMAMLANDI'):'AVCI DÜŞTÜ',{fontFamily:'Georgia',fontSize:'36px',color:'#e8d6ad'}).setOrigin(.5).setScrollFactor(0).setDepth(201);
    const challengeBonus=this.gameMode==='challenge'&&won&&this.bossChestOpened?getChallengeVictoryBonus(this.challengeId,won,this.bossChestOpened):0;
    const summary=this.add.text(w/2,h*.43,'Seviye '+this.state.level+'   •   '+this.state.kills+' düşman\n+'+(this.runSoulEssence+challengeBonus)+' RUH ÖZÜ'+(challengeBonus?'\nMEYDAN OKUMA ÖDÜLÜ +'+challengeBonus:'')+'\n'+(saved?'İLERLEME KAYDEDİLDİ':'KAYIT BAŞARISIZ — İLERLEME KORUNAMADI'),{fontSize:'16px',color:saved?'#c0b5a8':'#e29a8d',align:'center',lineSpacing:7}).setOrigin(.5).setScrollFactor(0).setDepth(201);
    this.overlay.push(shade,title,summary);
    this.createOverlayButton(w/2,h*.62,260,54,'YENİ KOŞU',()=>this.scene.restart({characterId:this.character.id,regionId:this.region.id,gameMode:this.gameMode,challengeId:this.challengeId??undefined}));
    this.createOverlayButton(w/2,h*.73,260,54,'ANA MENÜ',()=>this.scene.start('main-menu'));
    this.overlayBackIndex=1;
  }

  private persistRunResult(won:boolean):boolean {
    const manager=this.registry.get('saveManager') as SaveManager|undefined;
    if(!manager)return false;
    try {
      const loaded=manager.load();
      if(!('data' in loaded))return false;
      if(this.gameMode==='boss-hunt'){
        manager.save(applyBossHuntResult(loaded.data,{regionId:this.region.id,won,bossChestOpened:this.bossChestOpened,soulEssenceEarned:this.runSoulEssence,relicIdsEarned:this.runRelicIds}));
        return true;
      }
      const runResult=applyRunResult(loaded.data,{regionId:this.region.id,won,soulEssenceEarned:this.runSoulEssence,relicIdsEarned:this.runRelicIds,bossChestOpened:this.bossChestOpened,completedTreasureHunt:this.completedTreasureHunt,craftingMaterialsEarned:this.runCraftingMaterials,characterId:this.character.id,kills:this.state.kills,explorationEventsCompleted:this.runEventState.completedEvents.length,enemyIdsEarned:this.runDiscoveredEnemyIds,weaponIdsEarned:this.runDiscoveredWeaponIds,loreIdsEarned:this.runDiscoveredLoreIds,discoveredPathIdsEarned:this.runDiscoveredPathIds,challengeId:this.gameMode==='challenge'?this.challengeId??undefined:undefined});
      const questStory=this.questSaveData?.story;
      const mergedSave={...runResult,story:{...runResult.story,...(questStory??{}),unlockedPathIds:[...new Set([...runResult.story.unlockedPathIds,...(questStory?.unlockedPathIds??[])])],completedEndingId:runResult.story.completedEndingId??questStory?.completedEndingId??null}};
      const completedSave=completeEnding(mergedSave,{regionId:this.region.id,bossId:this.bossDefinition?.id??'',victory:won&&this.bossChestOpened});
      manager.save(recordCompletedEnding(completedSave));
      return true;
    } catch {
      return false;
    }
  }

  private clearOverlay():void {this.overlay.forEach(o=>o.destroy());this.overlay=[];this.overlayButtons=[];this.overlayActions=[];this.overlaySelectionIndex=0;this.overlayBackIndex=null;}

  private updateEnvironment(force=false):void {
    const next=resolveEnvironment(this.region.id,this.state.elapsedMs);
    const key=next.timeOfDay+':'+next.weather;
    this.environmentState=next;
    if(!force&&key===this.environmentKey)return;
    this.environmentKey=key;
    const visual:Record<string,{color:number;alpha:number}> = {
      clear:{color:0x000000,alpha:0},rain:{color:0x40566f,alpha:.025},fog:{color:0xb9c4c8,alpha:.035},
      storm:{color:0x34465c,alpha:.035},drizzle:{color:0x607080,alpha:.02},dry:{color:0x9a7952,alpha:.018},
      ashfall:{color:0x82756d,alpha:.04},steam:{color:0xb8b4a6,alpha:.035},snow:{color:0xb8d4e6,alpha:.03},
      'dense-fog':{color:0xc3c9c6,alpha:.045}
    };
    const tint=visual[next.weather]??visual.clear!;
    const phase:Record<string,{color:number;alpha:number}>={dawn:{color:0xb78b65,alpha:.018},day:{color:0xffffff,alpha:0},sunset:{color:0x9c6048,alpha:.025},night:{color:0x29234a,alpha:.045}};
    const phaseTint=phase[next.timeOfDay]!;
    this.environmentOverlay?.setFillStyle(tint.color,tint.alpha);
    this.environmentPhaseOverlay?.setFillStyle(phaseTint.color,phaseTint.alpha);
    this.environmentHud?.setText(getEnvironmentLabel(next)).setColor(next.timeOfDay==='night'?'#c8b8df':'#c9d2d6');
  }

  private refreshQuestHud():void {
    const quest=QUESTS.find(item=>item.regionId===this.region.id&&this.questSaveData?.story.quests[item.id]?.status==='active');
    if(!quest){this.questHud?.setVisible(false);this.questHudPanel?.setVisible(false);return;}
    const progress=this.questSaveData?.story.quests[quest.id];
    if(!progress){this.questHud?.setVisible(false);this.questHudPanel?.setVisible(false);return;}
    const ready=areQuestObjectivesComplete(quest.id,progress);
    const objectives=quest.objectives.map(objective=>{
      const count=Math.min(objective.target,progress.objectiveProgress[objective.id]??0);
      return (count>=objective.target?'✓ ':'• ')+objective.description+'  '+count+'/'+objective.target;
    });
    this.questHud?.setText('GÖREV  •  '+quest.title+'\n'+objectives.join('\n')+(ready?'\nKARAR BEKLİYOR':'' )).setVisible(true);
    this.questHudPanel?.setVisible(true);
  }

  private refreshHud():void {
    if(!this.hud||!this.clock||!this.health)return;
    const seconds=Math.floor(this.state.elapsedMs/1000);
    this.clock.setText(String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'));
    const abilityRemaining=Math.max(0,this.abilityReady-this.time.now);
    const modeLabel=(this.gameMode==='boss-hunt'?'BOSS HUNT':this.gameMode==='challenge'?'MEYDAN OKUMA':this.gameMode==='endless'?'SONSUZ':'SURVIVAL')+(this.newGamePlusLevel>0?'  •  NG+'+this.newGamePlusLevel:'');
    const endlessRule=this.gameMode==='endless'?getEndlessRule(this.state.elapsedMs):null;
    this.hud.setText(this.character.name+'  •  '+modeLabel+(endlessRule?'  •  '+endlessRule.name:'')+'  •  LV '+this.state.level+'\nXP '+Math.floor(this.state.experience)+' / '+this.state.experienceToNext+'  •  Düşman '+this.state.kills+'\n'+this.region.name+'  •  Silah '+this.build.weapons.length+'/6  •  Pasif '+this.build.passives.length+'/6\nE: '+this.character.activeAbility+'  •  '+(abilityRemaining>0?(abilityRemaining/1000).toFixed(1)+'s':'HAZIR'));
    this.health.setSize(160*Phaser.Math.Clamp(this.state.health/this.state.maxHealth,0,1),8);
    this.refreshQuestHud();
    if(this.bossState){this.bossHud?.setVisible(true);this.bossHealth?.setVisible(true);this.bossHealth?.setSize(300*Phaser.Math.Clamp(this.bossState.health/this.bossState.maxHealth,0,1),5);}
  }
}
