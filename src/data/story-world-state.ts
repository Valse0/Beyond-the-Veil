import type { RegionId } from '../core/types/content.js';

export interface StoryNpcFateVisual {
  id: string;
  label: string;
  description: string;
  color: number;
  outlineColor: number;
  alpha: number;
  scale: number;
}

export interface StoryNpcDefinition {
  id: string;
  regionId: RegionId;
  name: string;
  position: { x: number; y: number };
  defaultState: StoryNpcFateVisual;
  fates: readonly StoryNpcFateVisual[];
}

export interface StoryRegionAtmosphereDefinition {
  id: string;
  regionId: RegionId;
  name: string;
  description: string;
  auraColor: number;
  accentColor: number;
}

export const STORY_WORLD_NPCS: readonly StoryNpcDefinition[] = [
  {
    id: 'briar-warden',
    regionId: 'cursed-forest',
    name: 'Diken Bekçisi',
    position: { x: 1200, y: 535 },
    defaultState: { id: 'unresolved', label: 'KADERİ BELİRSİZ', description: 'Köklerin arasında bekliyor.', color: 0x647b4d, outlineColor: 0xb6c98a, alpha: 0.92, scale: 1 },
    fates: [
      { id: 'spared', label: 'YAŞAMINA İZİN VERİLDİ', description: 'Bekçi kökleri korumaya devam ediyor.', color: 0x78a85e, outlineColor: 0xd0ed9e, alpha: 1, scale: 1.08 },
      { id: 'vanished', label: 'ORMANDA KAYBOLDU', description: 'Bekçiden geriye yalnızca bir yankı kaldı.', color: 0x82918a, outlineColor: 0xc0d2bd, alpha: 0.42, scale: 0.86 }
    ]
  },
  {
    id: 'mourner-acolyte',
    regionId: 'forgotten-graveyard',
    name: 'Ağıtçı Akolit',
    position: { x: 1200, y: 535 },
    defaultState: { id: 'unresolved', label: 'SON DİLEĞİNİ BEKLİYOR', description: 'Mezar isimlerinin yanında nöbet tutuyor.', color: 0x77727e, outlineColor: 0xc9c1d1, alpha: 0.92, scale: 1 },
    fates: [
      { id: 'redeemed', label: 'RUHLARLA BİRLİKTE ARINDI', description: 'Serbest kalan ruhlara eşlik ediyor.', color: 0x78b9b0, outlineColor: 0xc7fff0, alpha: 1, scale: 1.08 },
      { id: 'bound', label: 'RUH KOROSUNA BAĞLANDI', description: 'Zincirlenmiş ruhların arasında kaldı.', color: 0x80658f, outlineColor: 0xd4a8ec, alpha: 0.9, scale: 0.94 }
    ]
  },
  {
    id: 'gear-executioner',
    regionId: 'deep-dungeon',
    name: 'Dişli Celladı',
    position: { x: 1200, y: 535 },
    defaultState: { id: 'unresolved', label: 'MEKANİZMA BEKLİYOR', description: 'Ocağın son emrini yerine getirmeyi bekliyor.', color: 0x88745a, outlineColor: 0xd2b78a, alpha: 0.92, scale: 1 },
    fates: [
      { id: 'deactivated', label: 'MEKANİZMA DURDURULDU', description: 'Celladın dişlileri artık dönmüyor.', color: 0x718a91, outlineColor: 0xc0dce0, alpha: 0.58, scale: 0.9 },
      { id: 'reawakened', label: 'YENİDEN UYANDIRILDI', description: 'Kadim ocak celladı tekrar çalıştırdı.', color: 0xc77b43, outlineColor: 0xffd29a, alpha: 1, scale: 1.12 }
    ]
  },
  {
    id: 'mire-oracle',
    regionId: 'rotten-swamp',
    name: 'Bataklık Kâhini',
    position: { x: 1200, y: 535 },
    defaultState: { id: 'unresolved', label: 'YEMİNİNİ BEKLİYOR', description: 'Bataklık sunağında sessizce duruyor.', color: 0x587d68, outlineColor: 0xa6d0a5, alpha: 0.92, scale: 1 },
    fates: [
      { id: 'freed', label: 'YEMİNİNDEN ÖZGÜR', description: 'Kâhin bataklığın dışına çıkabilir.', color: 0x65b9a0, outlineColor: 0xb9f2d6, alpha: 1, scale: 1.08 },
      { id: 'replaced', label: 'YENİ HÂKİM OLDU', description: 'Kâhinin yemini artık avcıya bağlı.', color: 0x9b8b4d, outlineColor: 0xf0d98b, alpha: 1, scale: 1.12 }
    ]
  },
  {
    id: 'unwritten-regent',
    regionId: 'cursed-castle',
    name: 'Yazılmamış Hükümdar',
    position: { x: 1200, y: 535 },
    defaultState: { id: 'unresolved', label: 'SON KARARI BEKLİYOR', description: 'Taht salonundaki perde yankısı.', color: 0x765b83, outlineColor: 0xc4a5d8, alpha: 0.92, scale: 1 },
    fates: [
      { id: 'sealed', label: 'YENİDEN MÜHÜRLENDİ', description: 'Hükümdarın iradesi perdenin ardına kapatıldı.', color: 0x638d9b, outlineColor: 0xb6e3ed, alpha: 0.76, scale: 0.94 },
      { id: 'transcended', label: 'PERDENİN ÖTESİNE YÜKSELDİ', description: 'Hükümdar bilinmeyen güce dönüştü.', color: 0xa35d91, outlineColor: 0xf0b4db, alpha: 1, scale: 1.18 }
    ]
  }
];

export const STORY_REGION_ATMOSPHERES: readonly StoryRegionAtmosphereDefinition[] = [
  { id: 'quiet-growth', regionId: 'cursed-forest', name: 'Sessiz Büyüme', description: 'Kökler yeniden nefes alıyor.', auraColor: 0x527f4d, accentColor: 0xb2d987 },
  { id: 'withered', regionId: 'cursed-forest', name: 'Solmuş Orman', description: 'Kalp odununun ardından yaşam çekildi.', auraColor: 0x66533c, accentColor: 0xc39b65 },
  { id: 'renewed', regionId: 'cursed-forest', name: 'Arınmış Pınar', description: 'Köklerin altındaki su yeniden akıyor.', auraColor: 0x3f8d78, accentColor: 0xa7e9c5 },
  { id: 'sealed', regionId: 'cursed-forest', name: 'Mühürlü Pınar', description: 'Saklı suyun yolu kapatıldı.', auraColor: 0x596c79, accentColor: 0xb2c9d8 },
  { id: 'restful', regionId: 'forgotten-graveyard', name: 'Huzurlu Mezarlık', description: 'Ruhların fısıltısı yavaşça diner.', auraColor: 0x657e85, accentColor: 0xc3e5dc },
  { id: 'haunted', regionId: 'forgotten-graveyard', name: 'Perili Mezarlık', description: 'Bağlı ruhların uğultusu taşlara sinmiş.', auraColor: 0x654c82, accentColor: 0xc9a4e8 },
  { id: 'cold-forge', regionId: 'deep-dungeon', name: 'Sönmüş Ocak', description: 'Dişli tapınağı soğuk ve sessiz.', auraColor: 0x526a7b, accentColor: 0xb2d1e1 },
  { id: 'living-forge', regionId: 'deep-dungeon', name: 'Canlı Ocak', description: 'Kadim makine yeniden alev aldı.', auraColor: 0x9a5738, accentColor: 0xffc17a },
  { id: 'cleansed', regionId: 'rotten-swamp', name: 'Arınmış Bataklık', description: 'Zehirli sisin içinden temiz su yükseliyor.', auraColor: 0x3c8b79, accentColor: 0xb3efd4 },
  { id: 'crowned', regionId: 'rotten-swamp', name: 'Taçlanmış Bataklık', description: 'Bataklığın yemini yeni hâkimini tanıdı.', auraColor: 0x82763c, accentColor: 0xe5d48a },
  { id: 'recovering', regionId: 'rotten-swamp', name: 'İyileşen Bataklık', description: 'Yerleşime ulaşan su yaşamı geri getiriyor.', auraColor: 0x56805b, accentColor: 0xc2e39a },
  { id: 'restored', regionId: 'cursed-castle', name: 'Onarılmış Perde', description: 'Kalenin mühürleri yeniden dengede.', auraColor: 0x456f80, accentColor: 0xb3e1e9 },
  { id: 'eclipsed', regionId: 'cursed-castle', name: 'Tutulmuş Kale', description: 'Perdenin ötesindeki güç taş salonlara sızıyor.', auraColor: 0x68436f, accentColor: 0xe0a4d4 }
];
