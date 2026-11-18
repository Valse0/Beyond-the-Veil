import Phaser from 'phaser';
import type { RunState, UpgradeId } from '../../core/types/game.js';
import { STARTING_CHARACTER } from '../../data/characters.js';
import { STARTING_ENEMIES, type EnemyDefinition } from '../../data/enemies.js';
import { STARTING_WEAPON } from '../../data/weapons.js';
import { calculateDamage, findNearestTarget } from '../../gameplay/combat/combat-rules.js';
import { advanceRun, applyUpgrade, createRunState, gainExperience, receiveDamage, recordKill } from '../../gameplay/run/run-model.js';

const RUN_MS = 900000;
const WORLD_W = 2400;
const WORLD_H = 1800;
const CHOICES: { id: UpgradeId; title: string; detail: string }[] = [
  { id: 'power', title: 'Keskin Ruh', detail: 'Hasar +6' },
  { id: 'haste', title: 'Hızlı Akış', detail: 'Saldırı hızı artar' },
  { id: 'vitality', title: 'Kara Yaşam', detail: 'Azami can +20' },
  { id: 'magnet', title: 'Ruh Mıknatısı', detail: 'XP alanı +65' }
];

export class RunScene extends Phaser.Scene {
  private state: RunState = createRunState();
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private shots!: Phaser.Physics.Arcade.Group;
  private orbs!: Phaser.Physics.Arcade.Group;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hud!: Phaser.GameObjects.Text;
  private clock!: Phaser.GameObjects.Text;
  private health!: Phaser.GameObjects.Rectangle;
  private joystick!: Phaser.GameObjects.Arc;
  private thumb!: Phaser.GameObjects.Arc;
  private touchStart?: Phaser.Math.Vector2;
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private paused = false;
  private queuedLevels = 0;
  private lastShot = 0;
  private lastSpawn = 0;
  private nextDamage = 0;
  private dashReady = 0;
  private dashUntil = 0;
  private abilityReady = 0;
  private lastHud = 0;

  constructor() { super('run'); }

  create(): void {
    this.state = { ...createRunState(), health: STARTING_CHARACTER.health, maxHealth: STARTING_CHARACTER.health,
      moveSpeed: STARTING_CHARACTER.moveSpeed, damage: STARTING_WEAPON.baseDamage, attackIntervalMs: STARTING_WEAPON.intervalMs };
    this.paused = false; this.queuedLevels = 0; this.lastShot = this.time.now; this.lastSpawn = this.time.now;
    this.nextDamage = 0; this.dashReady = 0; this.dashUntil = 0; this.abilityReady = 0;
    this.makeTextures();
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H).setBackgroundColor('#15131a');
    const floor = this.add.graphics();
    floor.fillStyle(0x19171d, 1); floor.fillRect(0, 0, WORLD_W, WORLD_H);
    floor.lineStyle(1, 0x3a3337, 0.17);
    for (let x = 0; x <= WORLD_W; x += 96) floor.lineBetween(x, 0, x, WORLD_H);
    for (let y = 0; y <= WORLD_H; y += 96) floor.lineBetween(0, y, WORLD_W, y);
    floor.setDepth(-10);
    this.enemies = this.physics.add.group(); this.shots = this.physics.add.group(); this.orbs = this.physics.add.group();
    this.player = this.physics.add.sprite(WORLD_W / 2, WORLD_H / 2, 'hunter').setCircle(12).setCollideWorldBounds(true).setDepth(3);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,E,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    this.physics.add.overlap(this.shots, this.enemies, (a, b) => this.hitEnemy(a as Phaser.Physics.Arcade.Sprite, b as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.enemies, () => this.contactDamage());
    this.physics.add.overlap(this.player, this.orbs, (_p, orb) => this.collectOrb(orb as Phaser.Physics.Arcade.Sprite));
    this.createHud(); this.createTouchControls(); this.spawnEnemy();
  }

  private makeTextures(): void {
    const make = (key: string, color: number, r: number): void => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1); g.fillCircle(r + 3, r + 3, r);
      g.lineStyle(2, 0xe8d7b6, 0.75); g.strokeCircle(r + 3, r + 3, r);
      g.generateTexture(key, (r + 3) * 2, (r + 3) * 2); g.destroy();
    };
    make('hunter', 0xc2a36d, 13); make('shot', 0xe8c77a, 5); make('orb', 0x69b7a5, 5);
    STARTING_ENEMIES.forEach(e => make('enemy-' + e.id, e.color, e.radius));
  }

  private createHud(): void {
    const w = this.scale.width; const h = this.scale.height;
    this.hud = this.add.text(22, 18, '', { fontFamily: 'Arial', fontSize: '15px', color: '#eee5d6', lineSpacing: 6 }).setScrollFactor(0).setDepth(100);
    this.clock = this.add.text(w / 2, 18, '00:00', { fontFamily: 'Georgia', fontSize: '23px', color: '#d4b777' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
    this.add.rectangle(w - 130, 32, 180, 12, 0x352d32).setScrollFactor(0).setDepth(100);
    this.health = this.add.rectangle(w - 220, 32, 160, 8, 0xb95d62).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    const pause = this.add.text(w - 34, 68, 'Ⅱ', { fontSize: '25px', color: '#d6c8b3' }).setOrigin(0.5).setScrollFactor(0).setDepth(110).setInteractive();
    pause.on('pointerup', () => this.openPause()); this.refreshHud();
  }

  private createTouchControls(): void {
    const h = this.scale.height; const w = this.scale.width;
    this.joystick = this.add.circle(88, h - 90, 47, 0xd9c7a7, 0.12).setStrokeStyle(2, 0xd9c7a7, 0.35).setScrollFactor(0).setDepth(105);
    this.thumb = this.add.circle(88, h - 90, 19, 0xd9c7a7, 0.28).setScrollFactor(0).setDepth(106);
    const button = (x: number, label: string, color: number, fn: () => void): void => {
      const c = this.add.circle(x, h - 86, 34, color, 0.75).setStrokeStyle(2, 0xe5d6ba, 0.6).setScrollFactor(0).setDepth(105).setInteractive();
      this.add.text(x, h - 86, label, { fontSize: '12px', color: '#fff2df', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(106);
      c.on('pointerdown', fn);
    };
    button(w - 130, 'DASH', 0x73534c, () => this.tryDash()); button(w - 52, 'E', 0x586f69, () => this.useAbility());
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.x < w * 0.48 && p.y > h * 0.48) this.touchStart = new Phaser.Math.Vector2(p.x, p.y);
    });
    this.input.on('pointerup', () => { this.touchStart = undefined; this.thumb.setPosition(this.joystick.x, this.joystick.y); });
  }

  update(time: number, delta: number): void {
    if (this.paused) return;
    this.state = advanceRun(this.state, delta);
    if (this.state.elapsedMs >= RUN_MS) { this.finishRun(true); return; }
    this.move(time); this.moveEnemies(time); this.spawnDirector(time); this.fireAutomatically(time);
    this.expireShots(time); this.magnetize();
    if (time - this.lastHud > 120) { this.refreshHud(); this.lastHud = time; }
  }

  private move(time: number): void {
    let x = (this.keys.D.isDown || this.cursors.right.isDown ? 1 : 0) - (this.keys.A.isDown || this.cursors.left.isDown ? 1 : 0);
    let y = (this.keys.S.isDown || this.cursors.down.isDown ? 1 : 0) - (this.keys.W.isDown || this.cursors.up.isDown ? 1 : 0);
    if (this.touchStart && this.input.activePointer.isDown) {
      const p = this.input.activePointer; const dx = p.x - this.touchStart.x; const dy = p.y - this.touchStart.y;
      const length = Math.max(1, Math.hypot(dx, dy)); x = dx / length; y = dy / length;
      this.thumb.setPosition(this.joystick.x + Phaser.Math.Clamp(dx, -27, 27), this.joystick.y + Phaser.Math.Clamp(dy, -27, 27));
    }
    const dir = new Phaser.Math.Vector2(x, y); if (dir.length() > 1) dir.normalize();
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.tryDash();
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.useAbility();
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.openPause();
    if (time >= this.dashUntil) this.player.setVelocity(dir.x * this.state.moveSpeed, dir.y * this.state.moveSpeed);
    else if (dir.length() > 0) this.player.setVelocity(dir.x * this.state.moveSpeed * 2.6, dir.y * this.state.moveSpeed * 2.6);
  }

  private tryDash(): void {
    if (this.time.now < this.dashReady || this.paused) return;
    const velocity = (this.player.body as Phaser.Physics.Arcade.Body).velocity.clone();
    const dir = velocity.length() ? velocity.normalize() : new Phaser.Math.Vector2(1, 0);
    this.dashUntil = this.time.now + 190; this.dashReady = this.time.now + 1150;
    this.player.setVelocity(dir.x * this.state.moveSpeed * 2.8, dir.y * this.state.moveSpeed * 2.8);
    this.cameras.main.shake(75, 0.0018);
  }

  private useAbility(): void {
    if (this.time.now < this.abilityReady || this.paused) return;
    this.abilityReady = this.time.now + 8500;
    for (const child of this.enemies.getChildren()) {
      const e = child as Phaser.Physics.Arcade.Sprite;
      if (!e.active || Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) > 190) continue;
      this.damageEnemy(e, calculateDamage(this.state.damage * 1.8));
      const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.x, e.y);
      e.setVelocity(Math.cos(a) * 150, Math.sin(a) * 150);
    }
    this.cameras.main.shake(110, 0.003);
  }

  private moveEnemies(time: number): void {
    for (const child of this.enemies.getChildren()) {
      const e = child as Phaser.Physics.Arcade.Sprite; if (!e.active) continue;
      const d = STARTING_ENEMIES.find(item => item.id === e.getData('enemyType'))!;
      const a = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
      let vx = Math.cos(a); let vy = Math.sin(a);
      if (d.behavior === 'orbit') { vx = vx * 0.72 - Math.sin(a) * 0.55; vy = vy * 0.72 + Math.cos(a) * 0.55; }
      const surge = d.behavior === 'surge' && Math.floor(time / 1600) % 3 === 0 ? 1.45 : 1;
      e.setVelocity(vx * d.speed * surge, vy * d.speed * surge);
    }
  }

  private spawnDirector(time: number): void {
    if (time - this.lastSpawn < Math.max(420, 1450 - this.state.elapsedMs / 850) || this.enemies.countActive(true) >= 42) return;
    this.lastSpawn = time; this.spawnEnemy();
    if (this.state.elapsedMs > 90000 && Math.random() < 0.25) this.spawnEnemy();
  }

  private spawnEnemy(): void {
    const a = Math.random() * Math.PI * 2; const d = Phaser.Math.Between(390, 570);
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(a) * d, 35, WORLD_W - 35);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(a) * d, 35, WORLD_H - 35);
    const pool = this.state.elapsedMs > 180000 ? STARTING_ENEMIES : STARTING_ENEMIES.slice(0, 2);
    const def = pool[Phaser.Math.Between(0, pool.length - 1)];
    this.createEnemy(x, y, def, 1 + Math.min(2.5, this.state.elapsedMs / 360000));
  }

  private createEnemy(x: number, y: number, def: EnemyDefinition, scale: number): void {
    const e = this.enemies.create(x, y, 'enemy-' + def.id) as Phaser.Physics.Arcade.Sprite;
    e.setDepth(2).setCircle(def.radius).setData('enemyType', def.id).setData('health', Math.round(def.health * scale)).setData('experience', def.experience);
  }

  private fireAutomatically(time: number): void {
    if (time - this.lastShot < this.state.attackIntervalMs) return;
    const targets = this.enemies.getChildren().filter(c => c.active) as Phaser.Physics.Arcade.Sprite[];
    const target = findNearestTarget(this.player, targets); if (!target) return;
    this.lastShot = time;
    const shot = this.shots.create(this.player.x, this.player.y, 'shot') as Phaser.Physics.Arcade.Sprite;
    shot.setDepth(4).setCircle(5).setData('damage', this.state.damage).setData('expires', time + 1700);
    const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    shot.setVelocity(Math.cos(a) * STARTING_WEAPON.projectileSpeed, Math.sin(a) * STARTING_WEAPON.projectileSpeed);
  }

  private expireShots(time: number): void {
    for (const child of this.shots.getChildren()) {
      const shot = child as Phaser.Physics.Arcade.Sprite;
      if (shot.active && time > Number(shot.getData('expires'))) shot.destroy();
    }
  }

  private hitEnemy(shot: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!shot.active || !enemy.active) return;
    this.damageEnemy(enemy, Number(shot.getData('damage'))); shot.destroy();
  }

  private damageEnemy(enemy: Phaser.Physics.Arcade.Sprite, damage: number): void {
    const hp = Number(enemy.getData('health')) - damage; enemy.setData('health', hp).setTint(0xffffff);
    this.time.delayedCall(65, () => { if (enemy.active) enemy.clearTint(); });
    if (hp > 0) return;
    const orb = this.orbs.create(enemy.x, enemy.y, 'orb') as Phaser.Physics.Arcade.Sprite;
    orb.setDepth(2).setCircle(6).setData('xp', Number(enemy.getData('experience')));
    this.state = recordKill(this.state); enemy.destroy();
  }

  private contactDamage(): void {
    if (this.time.now < this.nextDamage || this.time.now < this.dashUntil) return;
    this.nextDamage = this.time.now + 650; this.state = receiveDamage(this.state, 9);
    this.cameras.main.shake(90, 0.002); this.refreshHud();
    if (this.state.health <= 0) this.finishRun(false);
  }

  private magnetize(): void {
    for (const child of this.orbs.getChildren()) {
      const orb = child as Phaser.Physics.Arcade.Sprite; if (!orb.active) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, orb.x, orb.y);
      if (d <= this.state.magnetRadius) {
        const a = Phaser.Math.Angle.Between(orb.x, orb.y, this.player.x, this.player.y);
        orb.setVelocity(Math.cos(a) * 250, Math.sin(a) * 250);
      } else orb.setVelocity(0, 0);
    }
  }

  private collectOrb(orb: Phaser.Physics.Arcade.Sprite): void {
    if (!orb.active || this.paused) return;
    const result = gainExperience(this.state, Number(orb.getData('xp')));
    this.state = result.state; this.queuedLevels += result.levelsGained; orb.destroy();
    if (this.queuedLevels > 0) this.showLevelUp();
  }

  private showLevelUp(): void {
    this.paused = true; this.clearOverlay();
    const w = this.scale.width; const h = this.scale.height;
    this.overlay.push(this.add.rectangle(w/2,h/2,w,h,0x08070b,0.86).setScrollFactor(0).setDepth(200));
    this.overlay.push(this.add.text(w/2,h*0.23,'GÜÇLENME SEÇİMİ',{fontFamily:'Georgia',fontSize:'30px',color:'#e8d6ad'}).setOrigin(0.5).setScrollFactor(0).setDepth(201));
    this.overlay.push(this.add.text(w/2,h*0.31,'Bir gelişim seç. Her seçim koşunu değiştirir.',{fontSize:'15px',color:'#aaa0a0'}).setOrigin(0.5).setScrollFactor(0).setDepth(201));
    CHOICES.forEach((c,i)=>{
      const x=w/2+(i-1.5)*220;
      const card=this.add.rectangle(x,h*0.55,196,170,0x28212a,0.98).setStrokeStyle(2,0x9b8059).setScrollFactor(0).setDepth(201).setInteractive({useHandCursor:true});
      const name=this.add.text(x,h*0.5,c.title,{fontFamily:'Georgia',fontSize:'19px',color:'#e8d6ad',align:'center',wordWrap:{width:170}}).setOrigin(0.5).setScrollFactor(0).setDepth(202);
      const detail=this.add.text(x,h*0.61,c.detail,{fontSize:'13px',color:'#b9b0ae',align:'center',wordWrap:{width:165}}).setOrigin(0.5).setScrollFactor(0).setDepth(202);
      card.on('pointerover',()=>card.setFillStyle(0x463344,1)); card.on('pointerout',()=>card.setFillStyle(0x28212a,0.98));
      card.on('pointerup',()=>this.chooseUpgrade(c.id)); this.overlay.push(card,name,detail);
    });
  }

  private chooseUpgrade(id: UpgradeId): void {
    this.state=applyUpgrade(this.state,id); this.queuedLevels=Math.max(0,this.queuedLevels-1); this.clearOverlay(); this.refreshHud();
    if(this.queuedLevels>0)this.showLevelUp(); else this.paused=false;
  }

  private openPause(): void {
    if(this.paused)return; this.paused=true; this.clearOverlay();
    const w=this.scale.width,h=this.scale.height;
    const shade=this.add.rectangle(w/2,h/2,w,h,0x08070b,0.84).setScrollFactor(0).setDepth(200);
    const title=this.add.text(w/2,h*0.36,'DURAKLATILDI',{fontFamily:'Georgia',fontSize:'34px',color:'#e8d6ad'}).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    const resume=this.add.text(w/2,h*0.52,'DEVAM ET',{fontSize:'20px',color:'#fff',backgroundColor:'#5b3d32',padding:{x:24,y:12}}).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive();
    const menu=this.add.text(w/2,h*0.64,'ANA MENÜ',{fontSize:'16px',color:'#c9bda9'}).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive();
    resume.on('pointerup',()=>{this.clearOverlay();this.paused=false;}); menu.on('pointerup',()=>this.scene.start('main-menu'));
    this.overlay.push(shade,title,resume,menu);
  }

  private finishRun(won: boolean): void {
    if(this.paused && this.overlay.length>0)return; this.paused=true; this.clearOverlay();
    const w=this.scale.width,h=this.scale.height;
    const shade=this.add.rectangle(w/2,h/2,w,h,0x08070b,0.9).setScrollFactor(0).setDepth(200);
    const title=this.add.text(w/2,h*0.32,won?'AV TAMAMLANDI':'AVCI DÜŞTÜ',{fontFamily:'Georgia',fontSize:'36px',color:'#e8d6ad'}).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    const summary=this.add.text(w/2,h*0.45,'Seviye '+this.state.level+'   •   '+this.state.kills+' düşman',{fontSize:'18px',color:'#c0b5a8'}).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    const retry=this.add.text(w/2,h*0.59,'YENİ KOŞU',{fontSize:'20px',color:'#fff',backgroundColor:'#5b3d32',padding:{x:24,y:12}}).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive();
    const menu=this.add.text(w/2,h*0.7,'ANA MENÜ',{fontSize:'16px',color:'#c9bda9'}).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive();
    retry.on('pointerup',()=>this.scene.restart()); menu.on('pointerup',()=>this.scene.start('main-menu'));
    this.overlay.push(shade,title,summary,retry,menu);
  }

  private clearOverlay(): void { this.overlay.forEach(o=>o.destroy()); this.overlay=[]; }

  private refreshHud(): void {
    if(!this.hud||!this.clock||!this.health)return;
    const seconds=Math.floor(this.state.elapsedMs/1000);
    this.clock.setText(String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'));
    this.hud.setText(STARTING_CHARACTER.name+'  •  LV '+this.state.level+'\nXP '+this.state.experience+' / '+this.state.experienceToNext+'  •  Düşman '+this.state.kills);
    this.health.setSize(160*Phaser.Math.Clamp(this.state.health/this.state.maxHealth,0,1),8);
  }
}
