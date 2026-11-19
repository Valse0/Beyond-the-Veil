import type {WeaponDefinition} from '../core/types/content.js';
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
export const WEAPONS:readonly WeaponDefinition[]=specs.map((s)=>({id:s[0],name:s[1],category:s[2],description:s[1]+' özgün otomatik saldırı biçimiyle alanı kontrol eder.',behavior:s[3],element:s[4],baseDamage:s[5],intervalMs:s[6],range:s[7],projectileSpeed:s[8],maxLevel:5,levels:Array.from({length:5},(_,i)=>({level:i+1,damage:Math.round(s[5]*(1+i*.22)),intervalMs:Math.round(s[6]*(1-i*.035)),range:Math.round(s[7]*(1+i*.045)),projectiles:1+Math.floor(i/2),upgrade:['Temel saldırı','Hasar artışı','Menzil ve hız','Ek saldırı','Ustalık etkisi'][i]})),branches:[{id:s[0]+'-branch-focus',name:'Odak',effect:'Hasar, saldırı temposu, menzil ve delme gücü artar.',modifiers:{damageMultiplier:1.2,intervalMultiplier:.92,rangeMultiplier:1.12,projectileBonus:0,pierceBonus:1,areaMultiplier:1,chainTargetBonus:0}},{id:s[0]+'-branch-spread',name:'Yayılım',effect:'Ek mermi, daha geniş etki alanı ve ek zincir hedefi kazanır.',modifiers:{damageMultiplier:1,intervalMultiplier:1,rangeMultiplier:1.05,projectileBonus:1,pierceBonus:0,areaMultiplier:1.25,chainTargetBonus:1}}],evolution:{id:s[0]+'-evolved',name:s[10],requiredPassiveId:s[9],behaviorChange:s[11]},characterSynergies:[],assetId:'weapon.'+s[0]}));
export const STARTING_WEAPON=WEAPONS[0];
