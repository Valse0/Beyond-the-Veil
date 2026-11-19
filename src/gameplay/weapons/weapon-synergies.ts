export type WeaponSynergyKind =
  | 'spirit-splinter' | 'grave-aftershock' | 'storm-lance' | 'ember-burst'
  | 'frost-ring' | 'venom-trail' | 'spirit-chain' | 'blood-thread'
  | 'storm-arc' | 'ward-pulse' | 'magma-rift' | 'curse-sigil'
  | 'crown-sigil' | 'crown-guidance';

export interface WeaponSynergyDefinition {
  id:string; weaponId:string; passiveId:string; name:string; description:string; trigger:string;
  kind:WeaponSynergyKind; radius?:number; damageMultiplier?:number; chainTargets?:number;
  durationMs?:number; tickMs?:number; damageReduction?:number; stacks?:number;
}

/** Distinct combat-changing links from the passive catalog's transformsWeaponIds. */
export const WEAPON_SYNERGIES:readonly WeaponSynergyDefinition[]=[
  {id:'veil-bolt-soul-vessel',weaponId:'veil-bolt',passiveId:'soul-vessel',name:'Ruh Kıymığı',description:'Ruh mermisi çarpışınca yakındaki düşmanlara ruh kıymıkları saçar.',trigger:'Takipli ruh mermisi isabet ettiğinde',kind:'spirit-splinter',radius:82,damageMultiplier:.32},
  {id:'gravecleaver-graveplate',weaponId:'gravecleaver',passiveId:'graveplate',name:'Mezar Sarsıntısı',description:'Ağır kesiş, avcının çevresinde ikinci bir şok dalgası oluşturur.',trigger:'Ağır kesiş tamamlandığında',kind:'grave-aftershock',radius:92,damageMultiplier:.42},
  {id:'oath-pike-storm-conductor',weaponId:'oath-pike',passiveId:'storm-conductor',name:'Gök Zinciri',description:'Yemin Mızrağı yıldırım zincirine iki ek hedef bağlar.',trigger:'Mızrağın zincir saldırısı başladığında',kind:'storm-lance',chainTargets:2},
  {id:'ember-chains-ashen-heart',weaponId:'ember-chains',passiveId:'ashen-heart',name:'Kor Patlaması',description:'Ateş zincirinin son hedefi çevresine kor patlaması yayar.',trigger:'Ateş zincirinin son hedefi vurulduğunda',kind:'ember-burst',radius:72,damageMultiplier:.45},
  {id:'winter-orbit-frostbound-sigil',weaponId:'winter-orbit',passiveId:'frostbound-sigil',name:'Kırağı Halkası',description:'Donmuş hedefe temas eden savunma halkası çevresine buz dalgası gönderir.',trigger:'Halka saldırısı donmuş hedefe ulaştığında',kind:'frost-ring',radius:82,damageMultiplier:.35},
  {id:'briar-seed-venom-vial',weaponId:'briar-seed',passiveId:'venom-vial',name:'Zehirli Kök',description:'Tohum patlaması kısa ömürlü, tekrar hasar veren bir zehir alanı bırakır.',trigger:'Tohum alanı patladığında',kind:'venom-trail',radius:84,damageMultiplier:.025,durationMs:1800,tickMs:600},
  {id:'soul-lantern-soul-vessel',weaponId:'soul-lantern',passiveId:'soul-vessel',name:'Ruh Yankısı',description:'Ruh fenerinin arayıcı küresi yakındaki ikinci bir hedefe sıçrar.',trigger:'Arayıcı küre bir düşmana çarptığında',kind:'spirit-chain',radius:180,damageMultiplier:.55},
  {id:'blood-loom-blood-reliquary',weaponId:'blood-loom',passiveId:'blood-reliquary',name:'Kızıl Bağ',description:'Kan ipliği, verdiği hasarın ek bir bölümünü avcıya geri taşır.',trigger:'Kan Tezgâhı yaşam bağı hasar verdiğinde',kind:'blood-thread',damageMultiplier:.06},
  {id:'stormglass-storm-conductor',weaponId:'stormglass',passiveId:'storm-conductor',name:'Fırtına Kıvılcımı',description:'Fırtına Camı mermisi çarpışınca iki hedefe daha yıldırım sıçratır.',trigger:'Yelpaze mermisi hedefe çarptığında',kind:'storm-arc',radius:180,damageMultiplier:.42,chainTargets:2},
  {id:'iron-bell-wardens-knot',weaponId:'iron-bell',passiveId:'wardens-knot',name:'Muhafız Çemberi',description:'Demir Çan titreşimi kısa süreli hasar azaltan bir koruma çemberi açar.',trigger:'Savunma titreşimi yayıldığında',kind:'ward-pulse',durationMs:700,damageReduction:.28},
  {id:'rune-mortar-ashen-heart',weaponId:'rune-mortar',passiveId:'ashen-heart',name:'Magma Yarığı',description:'Havan patlaması zeminde kısa süreli magma yarığı bırakır.',trigger:'Gecikmeli havan patladığında',kind:'magma-rift',radius:92,damageMultiplier:.025,durationMs:1800,tickMs:600},
  {id:'eclipse-sigil-veil-thread',weaponId:'eclipse-sigil',passiveId:'veil-thread',name:'Lanet Mührü',description:'Tutulma alanına yakalanan düşmanlara karanlık laneti işler.',trigger:'Gecikmeli mühür patladığında',kind:'curse-sigil',radius:78,stacks:1},
  {id:'eclipse-sigil-hollow-crown',weaponId:'eclipse-sigil',passiveId:'hollow-crown',name:'Kül Avı',description:'Tutulma Mührü, Kül Tacı tarafından zayıflatılmış hedeflere daha ağır vurur.',trigger:'Zayıflatılmış hedef mühür patlamasına yakalandığında',kind:'crown-sigil',damageMultiplier:1.25},
  {id:'soul-lantern-hollow-crown',weaponId:'soul-lantern',passiveId:'hollow-crown',name:'Taç Rehberi',description:'Ruh Feneri zayıflatılmış hedefleri önceler ve onlara daha güçlü vurur.',trigger:'Arayıcı küre hedef seçerken veya isabet ettiğinde',kind:'crown-guidance',damageMultiplier:1.2}
];

export function getActiveWeaponSynergies(weaponId:string,ownedPassiveIds:readonly string[]):WeaponSynergyDefinition[]{
  const owned=new Set(ownedPassiveIds);
  return WEAPON_SYNERGIES.filter(item=>item.weaponId===weaponId&&owned.has(item.passiveId));
}
export function getWeaponSynergyDamageMultiplier(weaponId:string,ownedPassiveIds:readonly string[],targetWeakened:boolean):number{
  if(!targetWeakened)return 1;
  return getActiveWeaponSynergies(weaponId,ownedPassiveIds)
    .filter(item=>item.kind==='crown-sigil'||item.kind==='crown-guidance')
    .reduce((value,item)=>value*(item.damageMultiplier??1),1);
}
export function getWeaponSynergyChainBonus(weaponId:string,ownedPassiveIds:readonly string[]):number{
  return getActiveWeaponSynergies(weaponId,ownedPassiveIds)
    .filter(item=>item.kind==='storm-lance'||item.kind==='storm-arc')
    .reduce((value,item)=>value+(item.chainTargets??0),0);
}
