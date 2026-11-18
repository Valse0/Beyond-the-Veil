import type {PassiveDefinition} from '../core/types/content.js';
const specs=[
['ashen-heart','Kül Kalbi','Saldırı / Ateş','fire','fireDamage',8,'ember-core','Kor Çekirdeği','Ateş evrimleri ikincil patlama üretir.',['ember-chains','rune-mortar'],['black-knight','blood-priestess']],
['frostbound-sigil','Buz Bağı Mührü','Element / Buz','ice','iceBuildup',10,'absolute-zero-focus','Mutlak Sıfır Odağı','Donmuş hedefe ilk ağır vuruş parçalama ek hasarı verir.',['winter-orbit'],['spirit-mage']],
['venom-vial','Zehir Şişesi','Element / Zehir','poison','poisonBuildup',12,'toxic-bloom','Zehirli Çiçek','Maksimum zehir katmanında spor bulutu oluşur.',['briar-seed'],[]],
['veil-thread','Perde İpliği','Kritik / Karanlık','dark','criticalChance',2,'night-thread','Gece İpliği','Kritik vuruş lanet katmanını artırır.',['eclipse-sigil'],['shadow-assassin']],
['soul-vessel','Ruh Kabı','XP / Ruh','spirit','magnetRadius',15,'open-vessel','Açık Kap','Boss XP ek Ruh Özü parçası üretir.',['veil-bolt','soul-lantern'],['cursed-hunter','spirit-mage']],
['storm-conductor','Fırtına İletkeni','Element / Yıldırım','lightning','lightningDamage',8,'living-storm','Canlı Fırtına','Zincir yıldırım kısa elektrik alanı bırakır.',['oath-pike','stormglass'],['shadow-assassin']],
['blood-reliquary','Kan Emaneti','İyileşme / Kan','blood','lifesteal',2,'red-sacrament','Kızıl Sakrament','Düşük candayken yaşam çalma artar.',['blood-loom'],['blood-priestess']],
['graveplate','Mezar Zırhı','Savunma',null,'armor',3,'sealed-plate','Mühürlü Plaka','Her 30 saniyede bir sonraki teması engeller.',['gravecleaver'],['black-knight']],
['hunters-greaves','Avcı Çizmeleri','Hareket',null,'moveSpeed',5,'ghost-step','Hayalet Adım','Dash sonunda kısa temas bağışıklığı sağlar.',[],['shadow-assassin']],
['scribes-lens','Kâtibin Merceği','XP / Gelişim',null,'xpGain',5,'clear-script','Temiz Yazım','Her koşuda ilk reroll ücretsizdir.',[],[]],
['wardens-knot','Muhafız Düğümü','Savunma / Cooldown',null,'abilityCooldown',-5,'last-ward','Son Siper','Ölümcül darbede koşuda bir kez 1 canla kalır.',['iron-bell'],['black-knight']],
['hollow-crown','Boş Taç','Özel mekanik / Lanet','dark','statusDuration',8,'crown-of-ashes','Kül Tacı','Elit öldürmek yakındakileri zayıflatır.',['eclipse-sigil','soul-lantern'],['spirit-mage']]
] as const;
export const PASSIVES:readonly PassiveDefinition[]=specs.map(s=>({id:s[0],name:s[1],category:s[2],description:s[1]+' beş seviyede gelişen kalıcı koşu etkisi sağlar.',element:(s[3]||undefined) as PassiveDefinition['element'],maxLevel:5,effects:Array.from({length:5},(_,i)=>({level:i+1,stat:s[4],value:s[5]*(i+1),unit:'%'})),specialUpgrade:{id:s[6],name:s[7],effect:s[8]},transformsWeaponIds:[...s[9]],transformsCharacterIds:[...s[10]],assetId:'passive.'+s[0]}));
