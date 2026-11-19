export type BossTraceMotif = 'root-shrine' | 'grave-epitaph' | 'forge-mark' | 'oracle-rings' | 'veil-fracture';

export interface BossTraceDefinition {
  id: string;
  bossId: string;
  name: string;
  motif: BossTraceMotif;
  offset: { x: number; y: number };
  primaryColor: number;
  accentColor: number;
}

const traces: readonly BossTraceDefinition[] = [
  { id: 'matriarch-trace-root-oath', bossId: 'thorn-matriarch', name: 'Kök Yemini', motif: 'root-shrine', offset: { x: -218, y: -158 }, primaryColor: 0x718b4d, accentColor: 0xd0b878 },
  { id: 'matriarch-trace-hunter-mark', bossId: 'thorn-matriarch', name: 'Avcıların Son İşareti', motif: 'root-shrine', offset: { x: 218, y: -158 }, primaryColor: 0x718b4d, accentColor: 0xd0b878 },
  { id: 'matriarch-trace-heart-seal', bossId: 'thorn-matriarch', name: 'Kalp Mührü', motif: 'root-shrine', offset: { x: 0, y: 218 }, primaryColor: 0x718b4d, accentColor: 0xd0b878 },

  { id: 'ossuary-trace-erased-names', bossId: 'ossuary-king', name: 'Silinmiş İsimler', motif: 'grave-epitaph', offset: { x: -218, y: -158 }, primaryColor: 0x99919a, accentColor: 0x9bd4d0 },
  { id: 'ossuary-trace-last-prayer', bossId: 'ossuary-king', name: 'Son Dua', motif: 'grave-epitaph', offset: { x: 218, y: -158 }, primaryColor: 0x99919a, accentColor: 0x9bd4d0 },
  { id: 'ossuary-trace-bone-vow', bossId: 'ossuary-king', name: 'Kemik Yemini', motif: 'grave-epitaph', offset: { x: 0, y: 218 }, primaryColor: 0x99919a, accentColor: 0x9bd4d0 },

  { id: 'furnace-trace-forgemaster', bossId: 'furnace-colossus', name: 'Ustanın Damgası', motif: 'forge-mark', offset: { x: -218, y: -158 }, primaryColor: 0xa87945, accentColor: 0xf0cf88 },
  { id: 'furnace-trace-broken-drive', bossId: 'furnace-colossus', name: 'Kırık Tahrik', motif: 'forge-mark', offset: { x: 218, y: -158 }, primaryColor: 0xa87945, accentColor: 0xf0cf88 },
  { id: 'furnace-trace-core-script', bossId: 'furnace-colossus', name: 'Çekirdek Yazıtı', motif: 'forge-mark', offset: { x: 0, y: 218 }, primaryColor: 0xa87945, accentColor: 0xf0cf88 },

  { id: 'oracle-trace-drowned-vow', bossId: 'mire-oracle', name: 'Boğulmuş Yemin', motif: 'oracle-rings', offset: { x: -218, y: -158 }, primaryColor: 0x648f7b, accentColor: 0xb8d58b },
  { id: 'oracle-trace-seeing-eye', bossId: 'mire-oracle', name: 'Gören Göz', motif: 'oracle-rings', offset: { x: 218, y: -158 }, primaryColor: 0x648f7b, accentColor: 0xb8d58b },
  { id: 'oracle-trace-sunken-altar', bossId: 'mire-oracle', name: 'Batık Sunak', motif: 'oracle-rings', offset: { x: 0, y: 218 }, primaryColor: 0x648f7b, accentColor: 0xb8d58b },

  { id: 'regent-trace-first-script', bossId: 'unwritten-regent', name: 'İlk Yazı', motif: 'veil-fracture', offset: { x: -218, y: -158 }, primaryColor: 0x8062a6, accentColor: 0xe3ce9c },
  { id: 'regent-trace-broken-veil', bossId: 'unwritten-regent', name: 'Yırtık Perde', motif: 'veil-fracture', offset: { x: 218, y: -158 }, primaryColor: 0x8062a6, accentColor: 0xe3ce9c },
  { id: 'regent-trace-empty-crown', bossId: 'unwritten-regent', name: 'Boş Taç', motif: 'veil-fracture', offset: { x: 0, y: 218 }, primaryColor: 0x8062a6, accentColor: 0xe3ce9c }
];

export const BOSS_TRACES = traces;

export function getBossTraces(bossId: string): readonly BossTraceDefinition[] {
  return traces.filter(trace => trace.bossId === bossId);
}
