import type { RegionId } from '../core/types/content.js';

export type EnvironmentalLoreMotif = 'forest-camp' | 'grave-etching' | 'dungeon-workshop' | 'swamp-altar' | 'castle-seal';
export type EnvironmentalLoreKind = 'lore' | 'secret';

export interface EnvironmentalLoreLandmark {
  id: string;
  regionId: RegionId;
  kind: EnvironmentalLoreKind;
  name: string;
  description: string;
  motif: EnvironmentalLoreMotif;
  primaryColor: number;
  accentColor: number;
}

const landmarks: readonly EnvironmentalLoreLandmark[] = [
  { id: 'cursed-forest-lore', regionId: 'cursed-forest', kind: 'lore', name: 'Terk Edilmiş Avcı Kampı', description: 'Kül olmuş ateşin yanında, köklere çizilmiş eski bir mühür haritası duruyor.', motif: 'forest-camp', primaryColor: 0x8caa70, accentColor: 0xe3bd72 },
  { id: 'cursed-forest-secret', regionId: 'cursed-forest', kind: 'secret', name: 'Köklerin Arasındaki Yarık', description: 'Kara kökler, yalnızca dikkatle bakıldığında görülen dar bir geçidi saklıyor.', motif: 'forest-camp', primaryColor: 0x8062a6, accentColor: 0xc7a8ed },
  { id: 'forgotten-graveyard-lore', regionId: 'forgotten-graveyard', kind: 'lore', name: 'Silinmiş Mezar Taşları', description: 'İsimleri kazınmış taşlarda, Kemik Kral’ın son emrinden kalan izler var.', motif: 'grave-etching', primaryColor: 0xaaa1a5, accentColor: 0x83d5d0 },
  { id: 'forgotten-graveyard-secret', regionId: 'forgotten-graveyard', kind: 'secret', name: 'Kayıp Ruhların İzi', description: 'Soluk ruh ışıkları, unutulmuş bir mezarın altındaki gizli boşluğu işaret ediyor.', motif: 'grave-etching', primaryColor: 0x8062a6, accentColor: 0xbba0e5 },
  { id: 'deep-dungeon-lore', regionId: 'deep-dungeon', kind: 'lore', name: 'Terk Edilmiş Mühür Atölyesi', description: 'Yarım kalmış dişliler ve rün plakaları, mühür makinelerinin nasıl çalıştığını anlatıyor.', motif: 'dungeon-workshop', primaryColor: 0xb58b59, accentColor: 0xf0d18b },
  { id: 'deep-dungeon-secret', regionId: 'deep-dungeon', kind: 'secret', name: 'Bakım Şaftı', description: 'Duvarın arkasındaki dar servis yolu, eski atölyenin saklı bölümüne açılıyor.', motif: 'dungeon-workshop', primaryColor: 0x8062a6, accentColor: 0xd0b5f1 },
  { id: 'rotten-swamp-lore', regionId: 'rotten-swamp', kind: 'lore', name: 'Batık Yemin Sunağı', description: 'Su altında kalan sunakta, Bataklık Kâhini’nin kendini mühürlediği yeminin izleri var.', motif: 'swamp-altar', primaryColor: 0x709b82, accentColor: 0xb8d58b },
  { id: 'rotten-swamp-secret', regionId: 'rotten-swamp', kind: 'secret', name: 'Sazlıkların Altındaki İz', description: 'Çürümüş taşlar ve su halkaları, sazlıkların altında saklı bir geçidi gösteriyor.', motif: 'swamp-altar', primaryColor: 0x8062a6, accentColor: 0xb9a0df },
  { id: 'cursed-castle-lore', regionId: 'cursed-castle', kind: 'lore', name: 'Hükümdarın Mühür Arşivi', description: 'Kırık mühür levhaları, Perde’nin ardındaki ilk iradeye dair parçalar taşıyor.', motif: 'castle-seal', primaryColor: 0xa88cbd, accentColor: 0xe8d39b },
  { id: 'cursed-castle-secret', regionId: 'cursed-castle', kind: 'secret', name: 'Tahtın Ardındaki Yarık', description: 'Taş kemerin içindeki soluk işaret, görünmeyen bir geçidin yerini belli ediyor.', motif: 'castle-seal', primaryColor: 0x8062a6, accentColor: 0xd0b5f1 }
];

export const ENVIRONMENTAL_LORE_LANDMARKS = landmarks;

export function getEnvironmentalLoreLandmark(regionId: RegionId, kind: EnvironmentalLoreKind): EnvironmentalLoreLandmark | undefined {
  return landmarks.find(landmark => landmark.regionId === regionId && landmark.kind === kind);
}
