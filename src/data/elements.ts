import type {ElementDefinition} from '../core/types/content.js';
const rows=[
['fire','Ateş','Yanma','Saniyede üç kez hasar; eşikte küçük patlama.','ice','Közlü Spor','Zehir bulutu patlar ve yanma yayar.'],
['ice','Buz','Donma','Hareketi yavaşlatır; eşikte kısa dondurma, ağır vuruşta parçalama.','lightning','Kırılma Arkı','Donmuş hedef parçalanır ve yıldırım iki hedefe sıçrar.'],
['poison','Zehir','Zehirlenme','Beş katmana kadar birikir ve savunmayı azaltan zamanla hasar verir.','fire','Közlü Spor','Zehir bulutu patlar ve yanma yayar.'],
['dark','Karanlık','Lanet','Üç katmana kadar hedef savunmasını azaltır.','spirit','Ruh Yarılması','Lanet katmanları tüketilir ve ruh zinciri açılır.'],
['spirit','Ruh','Ruh Emili','Enerji emer; tetikleme küçük kalkan ve yankı hasarı verir.','dark','Ruh Yarılması','Lanet katmanları tüketilir ve ruh zinciri açılır.'],
['lightning','Yıldırım','Sersemleme','Eşikte kısa sersemletme ve yakındaki hedeflere zincir hasar.','poison','İletken Veba','Zehirli hedefe zincir bir ek hedefe sıçrar.'],
['blood','Kan','Kanama','Dört katmana kadar kanama; sınırlı yaşam çalma sağlar.','fire','Kızıl Alev','Kanama katmanları patlama hasarına çevrilir.']
] as const;
export const ELEMENTS:readonly ElementDefinition[]=rows.map(r=>({id:r[0],name:r[1],statusName:r[2],buildupPerHit:16,threshold:100,durationMs:4500,resistanceCap:.6,statusEffect:r[3],reactions:[{id:r[0]+'-'+r[4],with:r[4],name:r[5],effect:r[6],damageMultiplier:1.35,durationMs:1600},{id:r[0]+'-spirit-link',with:r[0]==='spirit'?'blood':'spirit',name:'Ruh Yankısı',effect:'İkinci elementin durum süresi uzar ve küçük ek etki tetiklenir.',damageMultiplier:1.2,durationMs:1200}],assetId:'element.'+r[0]}));
