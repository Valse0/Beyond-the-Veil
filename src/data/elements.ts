import type { ElementDefinition, ElementReactionDefinition } from '../core/types/content.js';

const reactions:readonly (ElementReactionDefinition&{a:string;b:string})[]=[
  {id:'thermal-shock',a:'fire',b:'ice',with:'ice',name:'Termal Şok',effect:'Ateş ve buz birleşince yüksek ani hasar verir.',kind:'burst',damageMultiplier:1.8,durationMs:900},
  {id:'ignition-plague',a:'fire',b:'poison',with:'poison',name:'Alevli Veba',effect:'Zehirli hedefin çevresine ateş yayar.',kind:'spread',damageMultiplier:1.25,durationMs:1800,spreadRadius:104},
  {id:'shatter-arc',a:'ice',b:'lightning',with:'lightning',name:'Kırılma Arkı',effect:'Donmuş hedefi parçalar ve yakındaki hedefe sıçrar.',kind:'shatter',damageMultiplier:1.7,durationMs:700,chainTargets:1},
  {id:'soul-rupture',a:'dark',b:'spirit',with:'spirit',name:'Ruh Yarılması',effect:'Lanet katmanlarını tüketerek zincir hasarı ve küçük iyileşme sağlar.',kind:'soul-chain',damageMultiplier:1.35,durationMs:1400,chainTargets:2,healFraction:.025},
  {id:'conductive-plague',a:'lightning',b:'poison',with:'poison',name:'İletken Veba',effect:'Zehirli hedef üzerinden iki düşmana yıldırım sıçratır.',kind:'conductive-chain',damageMultiplier:1.25,durationMs:1200,chainTargets:2},
  {id:'crimson-ignition',a:'blood',b:'fire',with:'fire',name:'Kızıl Alev',effect:'Kanama katmanlarını patlama hasarına dönüştürür.',kind:'rupture',damageMultiplier:1.65,durationMs:900},
  {id:'blood-soul-siphon',a:'blood',b:'spirit',with:'spirit',name:'Ruh Kanı',effect:'Ruh enerjisini kana dönüştürerek avcıyı iyileştirir.',kind:'siphon',damageMultiplier:1.2,durationMs:1500,healFraction:.07}
];

const definitions=[
  {id:'fire',name:'Ateş',statusName:'Yanma',statusEffect:'Zamanla hasar verir; eşik patlaması yakındaki hedeflere yayılır.'},
  {id:'ice',name:'Buz',statusName:'Donma',statusEffect:'Hareketi yavaşlatır; eşikte kısa süreli dondurur.'},
  {id:'poison',name:'Zehir',statusName:'Zehirlenme',statusEffect:'Beş katmana kadar birikir, zamanla hasar verir ve alınan hasarı artırır.'},
  {id:'dark',name:'Karanlık',statusName:'Lanet',statusEffect:'Üç katmana kadar hedefin savunmasını düşürür.'},
  {id:'spirit',name:'Ruh',statusName:'Ruh Emili',statusEffect:'Eşik tetiklemesi avcıya küçük bir kalkan/iyileşme sağlar.'},
  {id:'lightning',name:'Yıldırım',statusName:'Sersemleme',statusEffect:'Aralıklı kısa sersemletmeler ve zincir hasar üretir.'},
  {id:'blood',name:'Kan',statusName:'Kanama',statusEffect:'Dört katmana kadar zamanla hasar verir; eşikte avcıyı iyileştirir.'}
] as const;

export const ELEMENTS:readonly ElementDefinition[]=definitions.map(definition=>({
  ...definition,
  buildupPerHit:16,
  threshold:100,
  durationMs:4500,
  resistanceCap:.6,
  reactions:reactions.filter(reaction=>reaction.a===definition.id||reaction.b===definition.id).map(reaction=>({
    ...reaction,
    with:reaction.a===definition.id?reaction.b as ElementReactionDefinition['with']:reaction.a as ElementReactionDefinition['with']
  })),
  assetId:'element.'+definition.id
}));
