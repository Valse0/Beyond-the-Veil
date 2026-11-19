import type {WeaponBranchVariant,WeaponDefinition,WeaponEvolutionPath} from '../core/types/content.js';
const specs=[
 ['veil-bolt','Eşik Kıvılcımı','Takipli mermi','homing-projectile','spirit',18,720,430,430,'soul-vessel','Perde Yıldızı','Mermi üç ruh kıvılcımına ayrılır.'],
 ['gravecleaver','Mezar Yarıcı','Ağır fiziksel','cleaving-arc','dark',30,1150,105,0,'graveplate','Kral Kıran','Son kesit şok dalgası üretir.'],
 ['oath-pike','Yemin Mızrağı','Yönlü menzilli','piercing-thrust','lightning',22,880,240,0,'storm-conductor','Gök Yemini','Mızrak hedefler arasında yıldırım zinciri kurar.'],
 ['ember-chains','Kor Zincirleri','Zincirleme','chain-lightning','fire',15,980,210,0,'ashen-heart','Cehennem Ağı','Son hedefte ateş alanı patlar.'],
 ['winter-orbit','Kış Halkaları','Yakın savunma','orbiting-blades','ice',12,560,82,0,'frostbound-sigil','Mutlak Sıfır','Tam turda dondurma halkası oluşturur.'],
 ['briar-seed','Diken Tohumu','Alan hasarı','area-seed','poison',24,1600,260,180,'venom-vial','Veba Bahçesi','Patlamalar zehir çemberi bırakır.'],
 ['soul-lantern','Ruh Feneri','Ruh büyüsü','spirit-seeker','spirit',26,1300,360,260,'soul-vessel','Kayıpların Feneri','Küre ruh zinciri açar.'],
 ['blood-loom','Kan Tezgâhı','Yaşam çalma','life-tether','blood',13,900,155,0,'blood-reliquary','Kızıl Tezgâh','İplikler hedefler arasında dolaşır.'],
 ['stormglass','Fırtına Camı','Menzilli yelpaze','fan-volley','lightning',14,840,330,520,'storm-conductor','Fırtına Prizması','Çarpışmada zincir yıldırım alanı açar.'],
 ['iron-bell','Demir Çan','Savunma','defensive-pulse','dark',17,1800,125,0,'wardens-knot','Son Çan','Her üçüncü titreşim mermileri yok eder.'],
 ['rune-mortar','Rün Havanı','Ağır alan topçusu','delayed-mortar','fire',38,2100,420,210,'ashen-heart','Felaket Havanı','İkinci gecikmeli magma yarığı açar.'],
 ['eclipse-sigil','Tutulma Mührü','Gecikmeli alan','delayed-sigil','dark',29,1750,230,0,'veil-thread','Kara Güneş','Patlama kısa çekim alanı oluşturur.']
] as const;
const branchVariants:Record<string,WeaponBranchVariant>={
 'briar-seed':{id:'briar-seed-verdant-variant',name:'Yeşil Veba',description:'Yayılım dalında alan etkisini ve hasarı artırır.',modifiers:{damageMultiplier:1.08,areaMultiplier:1.12}},
 'gravecleaver':{id:'gravecleaver-ossuary-variant',name:'Kemik Kasırgası',description:'Yayılım dalında kesiş gücünü ve delmeyi artırır.',modifiers:{damageMultiplier:1.1,pierceBonus:1}},
 'rune-mortar':{id:'rune-mortar-forge-variant',name:'Ocak Felaketi',description:'Yayılım dalında patlama alanını ve hasarı artırır.',modifiers:{damageMultiplier:1.1,areaMultiplier:1.1}},
 'blood-loom':{id:'blood-loom-mire-variant',name:'Bataklık Ağı',description:'Yayılım dalında zincir hedeflerini ve hasarı artırır.',modifiers:{damageMultiplier:1.08,chainTargetBonus:1}},
 'eclipse-sigil':{id:'eclipse-sigil-veil-variant',name:'Perde Yarığı',description:'Yayılım dalında mühür menzilini ve hasarı artırır.',modifiers:{damageMultiplier:1.08,rangeMultiplier:1.1}}
};
const defaultEvolutionBehaviors:Record<string,string>={
 'veil-bolt':'fan-volley','gravecleaver':'cleaving-arc','oath-pike':'chain-lightning',
 'ember-chains':'chain-lightning','winter-orbit':'orbiting-blades','briar-seed':'area-seed',
 'soul-lantern':'spirit-seeker','blood-loom':'life-tether','stormglass':'fan-volley',
 'iron-bell':'defensive-pulse','rune-mortar':'delayed-mortar','eclipse-sigil':'delayed-sigil'
};
const branchEvolutionPaths:Record<string,WeaponEvolutionPath[]>={
 'veil-bolt':[
  {id:'veil-bolt-focus-evolution',branchId:'veil-bolt-branch-focus',name:'Ruh Mızrağı',description:'Odak dalı, tek hedefi delen yoğun bir ruh atışına dönüşür.',behaviorChange:'piercing-thrust'},
  {id:'veil-bolt-spread-evolution',branchId:'veil-bolt-branch-spread',name:'Ruh Fırtınası',description:'Yayılım dalı, hedefler arasında sıçrayan ruh yıldırımlarına dönüşür.',behaviorChange:'chain-lightning'}
 ],
 'gravecleaver':[
  {id:'gravecleaver-focus-evolution',branchId:'gravecleaver-branch-focus',name:'Mezar Hükmü',description:'Odak dalı, ileri hatta yoğunlaştırılmış delici bir kesişe dönüşür.',behaviorChange:'piercing-thrust'},
  {id:'gravecleaver-spread-evolution',branchId:'gravecleaver-branch-spread',name:'Kemik Kasırgası',description:'Yayılım dalı, avcının çevresini biçen dönen kemik bıçaklarına dönüşür.',behaviorChange:'orbiting-blades'}
 ],
 'oath-pike':[
  {id:'oath-pike-focus-evolution',branchId:'oath-pike-branch-focus',name:'Gök Mızrağı',description:'Odak dalı, hedefini izleyen tekil bir yıldırım mızrağına dönüşür.',behaviorChange:'homing-projectile'},
  {id:'oath-pike-spread-evolution',branchId:'oath-pike-branch-spread',name:'Fırtına Salvosu',description:'Yayılım dalı, geniş açıya yayılan yıldırım mızrakları fırlatır.',behaviorChange:'fan-volley'}
 ],
 'ember-chains':[
  {id:'ember-chains-focus-evolution',branchId:'ember-chains-branch-focus',name:'Kor Delgisi',description:'Odak dalı, düşman hattını delen yoğun bir kor mızrağına dönüşür.',behaviorChange:'piercing-thrust'},
  {id:'ember-chains-spread-evolution',branchId:'ember-chains-branch-spread',name:'Cehennem Ağı',description:'Yayılım dalı, gecikmeli patlayan geniş bir ateş mührü kurar.',behaviorChange:'delayed-sigil'}
 ],
 'winter-orbit':[
  {id:'winter-orbit-focus-evolution',branchId:'winter-orbit-branch-focus',name:'Buz Hükmü',description:'Odak dalı, hedef yönünde keskin bir buz yayı oluşturur.',behaviorChange:'cleaving-arc'},
  {id:'winter-orbit-spread-evolution',branchId:'winter-orbit-branch-spread',name:'Mutlak Siper',description:'Yayılım dalı, çevresindeki düşmanları durduran savunma titreşimine dönüşür.',behaviorChange:'defensive-pulse'}
 ],
 'briar-seed':[
  {id:'briar-seed-focus-evolution',branchId:'briar-seed-branch-focus',name:'Veba Havanı',description:'Odak dalı, işaretli noktaya ağır ve gecikmeli bir zehir darbesi indirir.',behaviorChange:'delayed-mortar'},
  {id:'briar-seed-spread-evolution',branchId:'briar-seed-branch-spread',name:'Diken Yağmuru',description:'Yayılım dalı, geniş bir yelpazeye çoklu zehir tohumları saçar.',behaviorChange:'fan-volley'}
 ],
 'soul-lantern':[
  {id:'soul-lantern-focus-evolution',branchId:'soul-lantern-branch-focus',name:'Kayıp Avcısı',description:'Odak dalı, en uzak ruh izini takip eden güdümlü bir küreye dönüşür.',behaviorChange:'homing-projectile'},
  {id:'soul-lantern-spread-evolution',branchId:'soul-lantern-branch-spread',name:'Ruh Zinciri',description:'Yayılım dalı, hedefler arasında sıçrayan bir ruh zinciri açar.',behaviorChange:'chain-lightning'}
 ],
 'blood-loom':[
  {id:'blood-loom-focus-evolution',branchId:'blood-loom-branch-focus',name:'Kızıl İğne',description:'Odak dalı, tek hedefi delen yoğun bir kan iğnesine dönüşür.',behaviorChange:'piercing-thrust'},
  {id:'blood-loom-spread-evolution',branchId:'blood-loom-branch-spread',name:'Kan Ağı',description:'Yayılım dalı, yakındaki düşmanlara yayılan kan zinciri kurar.',behaviorChange:'chain-lightning'}
 ],
 'stormglass':[
  {id:'stormglass-focus-evolution',branchId:'stormglass-branch-focus',name:'Fırtına Mızrağı',description:'Odak dalı, düşman hattını delen tekil yıldırım atışına dönüşür.',behaviorChange:'piercing-thrust'},
  {id:'stormglass-spread-evolution',branchId:'stormglass-branch-spread',name:'Gök Gürültüsü',description:'Yayılım dalı, ilk hedeften çevresine yıldırım zinciri sıçratır.',behaviorChange:'chain-lightning'}
 ],
 'iron-bell':[
  {id:'iron-bell-focus-evolution',branchId:'iron-bell-branch-focus',name:'Çan Hükmü',description:'Odak dalı, önündeki düşmanları biçen ağır bir ses yayı oluşturur.',behaviorChange:'cleaving-arc'},
  {id:'iron-bell-spread-evolution',branchId:'iron-bell-branch-spread',name:'Muhafız Halkası',description:'Yayılım dalı, çevrede dönen savunma halkalarına dönüşür.',behaviorChange:'orbiting-blades'}
 ],
 'rune-mortar':[
  {id:'rune-mortar-focus-evolution',branchId:'rune-mortar-branch-focus',name:'Kara Mühür Havanı',description:'Odak dalı, işaretli noktada gecikmeli karanlık patlaması açar.',behaviorChange:'delayed-sigil'},
  {id:'rune-mortar-spread-evolution',branchId:'rune-mortar-branch-spread',name:'Magma Çiçeği',description:'Yayılım dalı, hedefte genişleyen gecikmeli magma alanı oluşturur.',behaviorChange:'area-seed'}
 ],
 'eclipse-sigil':[
  {id:'eclipse-sigil-focus-evolution',branchId:'eclipse-sigil-branch-focus',name:'Tutulma Havanı',description:'Odak dalı, işaretli noktaya ağır bir gecikmeli patlama indirir.',behaviorChange:'delayed-mortar'},
  {id:'eclipse-sigil-spread-evolution',branchId:'eclipse-sigil-branch-spread',name:'Kara Güneş Çiçeği',description:'Yayılım dalı, daha geniş alana yayılan gecikmeli mühürler bırakır.',behaviorChange:'area-seed'}
 ]
};
export const WEAPONS:readonly WeaponDefinition[]=specs.map((s)=>({
 id:s[0],name:s[1],category:s[2],description:s[1]+' özgün otomatik saldırı biçimiyle alanı kontrol eder.',behavior:s[3],element:s[4],
 baseDamage:s[5],intervalMs:s[6],range:s[7],projectileSpeed:s[8],maxLevel:5,
 levels:Array.from({length:5},(_,i)=>({level:i+1,damage:Math.round(s[5]*(1+i*.22)),intervalMs:Math.round(s[6]*(1-i*.035)),range:Math.round(s[7]*(1+i*.045)),projectiles:1+Math.floor(i/2),upgrade:['Temel saldırı','Hasar artışı','Menzil ve hız','Ek saldırı','Ustalık etkisi'][i]})),
 branches:[{id:s[0]+'-branch-focus',name:'Odak',effect:'Hasar, saldırı temposu, menzil ve delme gücü artar.',modifiers:{damageMultiplier:1.2,intervalMultiplier:.92,rangeMultiplier:1.12,projectileBonus:0,pierceBonus:1,areaMultiplier:1,chainTargetBonus:0}},{id:s[0]+'-branch-spread',name:'Yayılım',effect:'Ek mermi, daha geniş etki alanı ve ek zincir hedefi kazanır.',modifiers:{damageMultiplier:1,intervalMultiplier:1,rangeMultiplier:1.05,projectileBonus:1,pierceBonus:0,areaMultiplier:1.25,chainTargetBonus:1},...(branchVariants[s[0]]?{variant:branchVariants[s[0]]}:{})}],
 evolution:{id:s[0]+'-evolved',name:s[10],requiredPassiveId:s[9],behaviorChange:s[11],defaultBehavior:defaultEvolutionBehaviors[s[0]]??s[3],branchPaths:branchEvolutionPaths[s[0]]??[]},
 characterSynergies:[],assetId:'weapon.'+s[0]
}));
export const STARTING_WEAPON=WEAPONS[0];
