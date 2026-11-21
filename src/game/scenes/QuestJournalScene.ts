import Phaser from 'phaser';
import { drawUiBackdrop } from '../ui/dark-fantasy-theme.js';
import type { RegionId } from '../../core/types/content.js';
import { BOSS_VARIANTS } from '../../data/boss-variants.js';
import { QUESTS } from '../../data/quests.js';
import { REGIONS } from '../../data/regions.js';
import { REGION_PATHS } from '../../data/region-paths.js';
import { STORY_REGION_ATMOSPHERES, STORY_WORLD_NPCS } from '../../data/story-world-state.js';
import type { SaveData } from '../../systems/save/save-types.js';
import type { SaveManager } from '../../systems/save/save-manager.js';
import { resolveRemoteAction } from '../input/platform-input.js';

type JournalQuestStatus = 'completed' | 'active' | 'available' | 'story-locked' | 'prerequisite-locked' | 'region-locked';
type JournalQuestSnapshot = {
  id: string;
  title: string;
  status: JournalQuestStatus;
  objectiveProgress: { id: string; description: string; current: number; target: number }[];
  chosenChoiceLabel: string | null;
  outcomeSummary: string | null;
};
type JournalRegionSnapshot = {
  id: RegionId;
  unlocked: boolean;
  completedCount: number;
  questCount: number;
  quests: JournalQuestSnapshot[];
  npcName: string | null;
  npcFateLabel: string | null;
  npcFateDescription: string | null;
  atmosphereName: string | null;
  atmosphereDescription: string | null;
  bossVariantName: string | null;
  unlockedPathNames: string[];
  discoveredLoreIds: string[];
};

const STATUS_LABELS: Record<JournalQuestStatus, string> = {
  completed: 'TAMAMLANDI',
  active: 'DEVAM EDİYOR',
  available: 'HAZIR',
  'story-locked': 'HİKÂYE KİLİTLİ',
  'prerequisite-locked': 'ÖNCEKİ GÖREV GEREKLİ',
  'region-locked': 'BÖLGE KİLİTLİ'
};

const ENDING_LABELS: Record<string, string> = {
  'ending-mended-veil': 'Onarılan Perde',
  'ending-beyond-veil': 'Perdenin Ötesi'
};

export class QuestJournalScene extends Phaser.Scene {
  private returnSceneKey: 'main-menu' | 'run' = 'main-menu';
  private saveData: SaveData | null = null;
  private selectedRegionIndex = 0;
  private previousPadBack = false;
  private previousPadNavigation = '';
  private navKeys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('quest-journal');
  }

  init(data: { returnScene?: string } = {}): void {
    this.returnSceneKey = data.returnScene === 'run' ? 'run' : 'main-menu';
    this.selectedRegionIndex = 0;
    this.previousPadBack = false;
    this.previousPadNavigation = '';
  }

  create(): void {
    const manager = this.registry.get('saveManager') as SaveManager | undefined;
    const loaded = manager?.load();
    this.saveData = loaded && 'data' in loaded ? loaded.data : null;
    if (this.saveData) {
      const firstUnlocked = REGIONS.findIndex(region => this.saveData?.progression.unlockedRegionIds.includes(region.id));
      this.selectedRegionIndex = Math.max(0, firstUnlocked);
    }

    this.navKeys = this.input.keyboard?.addKeys('UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    this.input.keyboard?.on('keydown-ESC', this.closeJournal, this);
    this.input.keyboard?.on('keydown-BACKSPACE', this.closeJournal, this);
    const remoteKeyHandler = (event: KeyboardEvent): void => {
      const action = resolveRemoteAction(event);
      if (action !== 'back' && action !== 'red') return;
      event.preventDefault();
      this.closeJournal();
    };
    this.input.keyboard?.on('keydown', remoteKeyHandler);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-ESC', this.closeJournal, this);
      this.input.keyboard?.off('keydown-BACKSPACE', this.closeJournal, this);
      this.input.keyboard?.off('keydown', remoteKeyHandler);
    });
    this.drawJournal();
  }

  update(): void {
    if (this.navKeys) {
      if (Phaser.Input.Keyboard.JustDown(this.navKeys.LEFT!) || Phaser.Input.Keyboard.JustDown(this.navKeys.UP!)) this.selectRegion(this.selectedRegionIndex - 1);
      if (Phaser.Input.Keyboard.JustDown(this.navKeys.RIGHT!) || Phaser.Input.Keyboard.JustDown(this.navKeys.DOWN!)) this.selectRegion(this.selectedRegionIndex + 1);
    }

    const pad = this.input.gamepad?.getPad(0);
    if (!pad) {
      this.previousPadBack = false;
      this.previousPadNavigation = '';
      return;
    }
    const back = Boolean(pad.B);
    if (back && !this.previousPadBack) this.closeJournal();
    this.previousPadBack = back;

    const left = pad.left || pad.leftStick.x < -0.5;
    const right = pad.right || pad.leftStick.x > 0.5;
    const up = pad.up || pad.leftStick.y < -0.5;
    const down = pad.down || pad.leftStick.y > 0.5;
    const direction = left || up ? 'previous' : right || down ? 'next' : '';
    if (direction && direction !== this.previousPadNavigation) this.selectRegion(this.selectedRegionIndex + (direction === 'next' ? 1 : -1));
    this.previousPadNavigation = direction;
  }

  private selectRegion(index: number): void {
    const count = REGIONS.length;
    this.selectedRegionIndex = (index + count) % count;
    this.drawJournal();
  }

  private closeJournal(): void {
    if (!this.sys.isActive()) return;
    const returnScene = this.returnSceneKey;
    if (returnScene === 'run') this.scene.get('run').events.emit('quest-journal-closed');
    this.scene.stop();
    if (returnScene === 'main-menu') this.scene.resume(returnScene);
  }

  private getQuestStatus(questId: string, save: SaveData): JournalQuestStatus {
    const quest = QUESTS.find(item => item.id === questId);
    if (!quest) return 'prerequisite-locked';
    if (!save.progression.unlockedRegionIds.includes(quest.regionId)) return 'region-locked';
    const progress = save.story.quests[questId];
    if (progress?.status === 'completed') return 'completed';
    if (progress?.status === 'active') return 'active';
    if (quest.availability === 'story' && !save.story.unlockedAlternateQuestIds.includes(quest.id)) return 'story-locked';
    if (!quest.prerequisites.every(id => save.story.quests[id]?.status === 'completed')) return 'prerequisite-locked';
    return 'available';
  }

  private getRegionSnapshot(regionId: RegionId): JournalRegionSnapshot {
    const region = REGIONS.find(item => item.id === regionId)!;
    const save = this.saveData;
    const quests = QUESTS.filter(item => item.regionId === regionId);
    const questSnapshots: JournalQuestSnapshot[] = quests.map(quest => {
      const progress = save?.story.quests[quest.id];
      const choice = progress?.chosenChoiceId ? quest.choices.find(item => item.id === progress.chosenChoiceId) : undefined;
      return {
        id: quest.id,
        title: quest.title,
        status: save ? this.getQuestStatus(quest.id, save) : 'region-locked',
        objectiveProgress: quest.objectives.map(objective => ({
          id: objective.id,
          description: objective.description,
          current: Math.min(objective.target, progress?.objectiveProgress[objective.id] ?? 0),
          target: objective.target
        })),
        chosenChoiceLabel: choice?.label ?? null,
        outcomeSummary: choice?.outcome.summary ?? null
      };
    });
    const npc = STORY_WORLD_NPCS.find(item => item.regionId === regionId);
    const npcFateId = npc && save ? save.story.npcFates[npc.id] : undefined;
    const npcFate = npc?.fates.find(item => item.id === npcFateId) ?? npc?.defaultState;
    const atmosphereId = save?.story.regionAtmospheres[regionId];
    const atmosphere = STORY_REGION_ATMOSPHERES.find(item => item.regionId === regionId && item.id === atmosphereId);
    const bossVariant = save
      ? BOSS_VARIANTS.find(item => item.bossId === region.bossId && save.story.bossEncounterIds.includes(item.id))
      : undefined;
    const unlockedPathNames = save
      ? REGION_PATHS.filter(item => item.regionId === regionId && save.story.unlockedPathIds.includes(item.id)).map(item => item.name)
      : [];
    const discoveredLoreIds = save
      ? save.collections.discoveredLoreIds.filter(id => id.startsWith(regionId))
      : [];
    return {
      id: regionId,
      unlocked: Boolean(save?.progression.unlockedRegionIds.includes(regionId)),
      completedCount: questSnapshots.filter(item => item.status === 'completed').length,
      questCount: questSnapshots.length,
      quests: questSnapshots,
      npcName: npc?.name ?? null,
      npcFateLabel: npcFate?.label ?? null,
      npcFateDescription: npcFate?.description ?? null,
      atmosphereName: atmosphere?.name ?? null,
      atmosphereDescription: atmosphere?.description ?? null,
      bossVariantName: bossVariant?.name ?? null,
      unlockedPathNames,
      discoveredLoreIds
    };
  }

  private buildJournalSnapshot(): {
    selectedRegionId: RegionId;
    regions: { id: RegionId; unlocked: boolean; completedCount: number; questCount: number }[];
    selected: JournalRegionSnapshot;
    completedEndingIds: string[];
    completedEndingLabels: string[];
    discoveredLoreIds: string[];
    returnScene: string;
  } {
    const selectedRegionId = REGIONS[this.selectedRegionIndex]!.id;
    const regions = REGIONS.map(region => {
      const snapshot = this.getRegionSnapshot(region.id);
      return { id: region.id, unlocked: snapshot.unlocked, completedCount: snapshot.completedCount, questCount: snapshot.questCount };
    });
    const completedEndingIds = this.saveData?.progression.completedEndingIds ?? [];
    return {
      selectedRegionId,
      regions,
      selected: this.getRegionSnapshot(selectedRegionId),
      completedEndingIds: [...completedEndingIds],
      completedEndingLabels: completedEndingIds.map(id => ENDING_LABELS[id] ?? id),
      discoveredLoreIds: [...(this.saveData?.collections.discoveredLoreIds ?? [])],
      returnScene: this.returnSceneKey
    };
  }

  browserTestSnapshot(): ReturnType<QuestJournalScene['buildJournalSnapshot']> {
    if (this.registry.get('browserTestMode') !== true) throw new Error('Quest journal browser test mode is not enabled.');
    return this.buildJournalSnapshot();
  }

  private drawJournal(): void {
    this.children.removeAll(true);
    const width = this.scale.width;
    const height = this.scale.height;
    const snapshot = this.buildJournalSnapshot();
    const region = REGIONS[this.selectedRegionIndex]!;
    drawUiBackdrop(this, 'archive');
    this.add.text(48, 34, 'HİKÂYE DEFTERİ', {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(50, 78, 'Yolculuğun, kararların ve geride bıraktığın izler.', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#a99da0'
    });
    this.add.text(width - 50, 48,
      'SONLAR ' + snapshot.completedEndingIds.length + '/2   •   HİKÂYE İZİ ' + snapshot.discoveredLoreIds.length,
      { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#d4bd92' }
    ).setOrigin(1, 0);

    const close = this.add.text(width - 50, 84, 'ESC / B  •  GERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#d9c9aa',
      backgroundColor: '#30272a', padding: { x: 14, y: 9 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.closeJournal());

    this.add.rectangle(180, 392, 270, 500, 0x17131c, 0.9).setStrokeStyle(1, 0x756653, 0.65);
    REGIONS.forEach((item, index) => {
      const entry = snapshot.regions[index]!;
      const y = 178 + index * 88;
      const selected = index === this.selectedRegionIndex;
      const bg = this.add.rectangle(180, y, 238, 76, selected ? 0x463344 : 0x28212a, 0.98)
        .setStrokeStyle(selected ? 3 : 1, selected ? 0xf0d39a : 0x756653, 0.9)
        .setInteractive({ useHandCursor: true });
            bg.on('pointerup', () => this.selectRegion(index));
      this.add.text(82, y - 17, item.name, {
        fontFamily: 'Georgia, serif', fontSize: '17px', color: selected ? '#fff0ce' : '#ded2c2'
      });
      this.add.text(82, y + 8,
        entry.unlocked ? 'GÖREV ' + entry.completedCount + '/' + entry.questCount : 'BÖLGE KİLİTLİ',
        { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: entry.unlocked ? '#b9c59c' : '#9b8585' }
      );
    });

    this.add.rectangle(785, 392, 890, 500, 0x17131c, 0.9).setStrokeStyle(1, 0x756653, 0.65);
    this.add.text(365, 151, region.name, {
      fontFamily: 'Georgia, serif', fontSize: '27px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(366, 188, region.subtitle + '  •  ' + (snapshot.selected.unlocked ? region.atmosphere : 'Bölge henüz açılmadı'), {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#b7a99f',
      wordWrap: { width: 820 }
    });

    const selected = snapshot.selected;
    const npcLine = selected.unlocked
      ? (selected.npcName ?? 'Bölge sakini') + ': ' + (selected.npcFateLabel ?? 'KADERİ BELİRSİZ') + ' — ' + (selected.npcFateDescription ?? '')
      : 'Bu bölgenin hikâye kayıtları henüz erişilebilir değil.';
    const atmosphereLine = selected.unlocked
      ? 'Bölge durumu: ' + (selected.atmosphereName ?? 'Henüz değişmedi') + ' — ' + (selected.atmosphereDescription ?? '') +
        '   •   Boss: ' + (selected.bossVariantName ?? 'Temel karşılaşma')
      : 'Bölge açıldığında NPC kaderi, atmosfer ve boss kayıtları burada görünecek.';
    this.add.rectangle(785, 246, 850, 68, 0x211b24, 0.96).setStrokeStyle(1, 0x756653, 0.45);
    this.add.text(370, 226, npcLine, {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#e2d0ad',
      wordWrap: { width: 810 }
    });
    this.add.text(370, 254, atmosphereLine, {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#b9aaa0',
      wordWrap: { width: 810 }
    });
    const pathLine = selected.unlockedPathNames.length
      ? 'Açılan yollar: ' + selected.unlockedPathNames.join(' • ')
      : 'Açılan hikâye yolu: yok';
    const loreLine = selected.discoveredLoreIds.length
      ? 'Keşfedilen izler: ' + selected.discoveredLoreIds.join(', ')
      : 'Keşfedilen hikâye izi: yok';
    this.add.text(370, 286, pathLine + '   •   ' + loreLine, {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#9f9690',
      wordWrap: { width: 820 }
    });

    selected.quests.forEach((quest, index) => this.drawQuestCard(quest, 365, index === 0 ? 326 : 486));
    const endingLine = snapshot.completedEndingLabels.length
      ? 'Tamamlanan sonlar: ' + snapshot.completedEndingLabels.join('  •  ')
      : 'Henüz tamamlanmış bir son yok.';
    this.add.text(365, 652, endingLine, {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#c2ae8b',
      wordWrap: { width: 840 }
    });
    this.add.text(50, height - 28, 'OKLAR / D-PAD: BÖLGE SEÇ     •     ESC / B: GERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#8d8587'
    });
  }

  private drawQuestCard(quest: JournalQuestSnapshot, x: number, y: number): void {
    const statusColors: Record<JournalQuestStatus, string> = {
      completed: '#b9c99b',
      active: '#e4c58e',
      available: '#a9c6d0',
      'story-locked': '#a48b9a',
      'prerequisite-locked': '#9b9290',
      'region-locked': '#8e8585'
    };
    const statusColor = statusColors[quest.status];
    this.add.rectangle(x + 425, y + 72, 850, 148, 0x211b24, 0.96)
      .setStrokeStyle(1, quest.status === 'completed' ? 0x77865e : 0x756653, 0.55);
    this.add.text(x + 18, y + 10, quest.title, {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(x + 830, y + 14, STATUS_LABELS[quest.status], {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: statusColor
    }).setOrigin(1, 0);
    const description = QUESTS.find(item => item.id === quest.id)?.description ?? '';
    this.add.text(x + 18, y + 39, description, {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#b9aaa0',
      wordWrap: { width: 810 }
    });
    const objectiveLines = quest.objectiveProgress.map(objective =>
      (objective.current >= objective.target ? '✓ ' : '• ') +
      objective.description + '  ' + objective.current + '/' + objective.target
    );
    const branchLine = quest.chosenChoiceLabel && quest.outcomeSummary
      ? 'Karar: ' + quest.chosenChoiceLabel + ' — ' + quest.outcomeSummary
      : quest.status === 'available'
        ? 'Görev, ilgili bölgeye yeni koşuda girdiğinde başlayacak.'
        : quest.status === 'story-locked' || quest.status === 'prerequisite-locked'
          ? 'Önceki hikâye adımı tamamlandığında açılır.'
          : quest.status === 'region-locked'
            ? 'Bu bölge açılana kadar görev gizli kalır.'
            : 'Hedefleri tamamla; ardından hikâye kararını verebilirsin.';
    this.add.text(x + 18, y + 67, objectiveLines.join('\n') + '\n' + branchLine, {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#d1c6b9',
      lineSpacing: 3, wordWrap: { width: 810 }
    });
  }
}
