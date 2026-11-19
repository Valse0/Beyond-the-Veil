import type { BossEncounterVariantDefinition, BossPhase, Attack } from '../core/types/content.js';

type AttackSpec = [name:string,kind:string,damage:number,shape:Attack['telegraph']['shape'],cooldownMs:number,warningMs:number,cue:string,counter:string];
type PhaseSpec = {name:string;arenaChange:string;phaseRule:string;addEnemyIds:string[];bossDamageMultiplier:number;movementMultiplier:number;attacks:[AttackSpec,AttackSpec]};
function attack(id:string,s:AttackSpec):Attack {
  return {id,name:s[0],kind:s[1],damage:s[2],range:420,cooldownMs:s[4],telegraph:{shape:s[3],warningMs:s[5],cue:s[6]},counter:s[7]};
}
function phases(prefix:string,specs:[PhaseSpec,PhaseSpec,PhaseSpec]):BossPhase[] {
  return specs.map((s,i)=>({id:prefix+'-phase-'+(i+1),name:s.name,healthThreshold:[1,.66,.3][i]!,arenaChange:s.arenaChange,phaseRule:s.phaseRule,addEnemyIds:[...s.addEnemyIds],bossDamageMultiplier:s.bossDamageMultiplier,movementMultiplier:s.movementMultiplier,attacks:[attack(prefix+'-'+(i+1)+'-a',s.attacks[0]),attack(prefix+'-'+(i+1)+'-b',s.attacks[1])]}));
}
const v=(id:string,bossId:string,name:string,description:string,specs:[PhaseSpec,PhaseSpec,PhaseSpec]):BossEncounterVariantDefinition=>({id,bossId,name,description,phases:phases(id,specs)});
const p=(name:string,arenaChange:string,phaseRule:string,adds:string[],damage:number,speed:number,a:AttackSpec,b:AttackSpec):PhaseSpec=>({name,arenaChange,phaseRule,addEnemyIds:adds,bossDamageMultiplier:damage,movementMultiplier:speed,attacks:[a,b]});

export const BOSS_VARIANTS:readonly BossEncounterVariantDefinition[]=[
  v('thorn-matriarch-awakened','thorn-matriarch','Köklerin Uyanışı','Bekçinin bağışlanması kökleri sakinleştirir; Diken Ana savunma yerine kontrollü, hedefli saldırılar ve kök muhafızları kullanır.',[
    p('Uyanan Tohum','Güvenli açıklıklar genişler.','Daha yavaş ama daha isabetli saldırılar; boss hasarı ×0.92, hareket ×0.9.',['thorn-pouncer'],.92,.9,
      ['Kök Mızrağı','aimed-root-lance',20,'line',5900,1050,'Kökler oyuncunun bulunduğu noktaya doğru hizalanır.','Son anda yana dash at.'],
      ['Yaprak Halkası','falling-leaf-rings',16,'ring',6800,1250,'Yaprak halkaları iki eş merkezli iz bırakır.','Halkaların arasındaki boşlukta kal.']),
    p('Muhafız Çemberi','Kök sütunları arasında geçit açılır.','Muhafızlar oyuncuyu çevreler; boss hareketi artar.',['thorn-pouncer','briarback-charger'],1.02,1.12,
      ['Kapanan Kökler','closing-root-cross',24,'cross',5200,900,'Dört kök çizgisi merkezde kesişir.','Kesişim noktasından uzaklaş.'],
      ['Dikenli Takip','tracking-thorn-field',19,'circle',6100,1050,'Oyuncunun konumunda gecikmeli bir diken alanı belirir.','İşaret çıktıktan sonra alanın dışına çık.']),
    p('Orman Yemini','Merkez kalp çevresinde güvenli bir halka oluşur.','Diken Ana kısa aralıklarla saldırır fakat hasarı düşüktür.',['briarback-charger'],.88,1.05,
      ['Kalp Kalkanı','heartwood-ring',27,'ring',4700,850,'Kalp çevresindeki halka daralarak kapanır.','Halkanın dışına zamanında çık.'],
      ['Kök Yağmuru','root-rain',22,'cone',5600,1000,'Kökler oyuncunun yönüne doğru yayılır.','Saldırı konisinin yanına geç.'])
  ]),
  v('thorn-matriarch-corrupted','thorn-matriarch','Çürümüş Kalp','Kalp odununun alınması Diken Ana’yı saldırgan bir çürüme odağına dönüştürür; zehirli alanlar ve hızlı kök baskısı kullanır.',[
    p('Çürüme Sızıntısı','Zehirli kök çatlakları açılır.','Daha yüksek hasarlı alan saldırıları; boss hasarı ×1.08.',['spore-spitter'],1.08,1.02,
      ['Spor Patlaması','corrupt-spore-burst',23,'circle',4800,850,'Zehirli sporlar oyuncunun çevresinde toplanır.','Patlamadan önce geniş alana kaç.'],
      ['Çatlak Kök','rupture-line',19,'line',5500,900,'Zeminde uzayan kırmızı kök çatlağı belirir.','Çatlağın doğrultusunu terk et.']),
    p('Yozlaşmış Kafes','Arena zehirli koridorlara bölünür.','Destek yaratıkları alanları kapatırken boss hızlanır.',['spore-spitter','gravebloom-nest'],1.14,1.18,
      ['Zehirli Haç','toxic-cross',27,'cross',4400,800,'Dört zehirli koridor aynı anda parlar.','Kesişimin dışındaki boşluğu kullan.'],
      ['Çürüme Halkası','rot-ring',24,'ring',5200,900,'Dıştan içe daralan çürüme halkası belirir.','Halkanın içine veya dışına dash at.']),
    p('Açık Yara','Merkez kalp açılır, dış alan tehlikeli kalır.','Son fazda saldırılar çok sıklaşır; hareket ×1.22.',['briarback-charger','spore-spitter'],1.2,1.22,
      ['Kalp Yarığı','heart-rift',33,'cone',3900,700,'Kalpten çıkan geniş yarık oyuncuya döner.','Koninin arkasına geç.'],
      ['Spor Çöküşü','spore-collapse',29,'circle',4600,750,'Oyuncunun çevresine ardışık patlama alanları çizilir.','İlk işaretten sonra hareket etmeyi sürdür.'])
  ]),
  v('ossuary-king-reckoning','ossuary-king','Son Hesap','Ruhların serbest bırakılması kralın saldırılarını daha ritmik ve okunabilir kılar; ruh muhafızları cezalandırıcı darbeler indirir.',[
    p('Sessiz Mahkeme','Mezar halkaları sırayla açılır.','Yavaş, geniş ve yüksek uyarı süreli saldırılar; hasar ×0.9.',['wailing-wisp'],.9,.88,
      ['Ruh Hükmü','soul-verdict',18,'cone',6200,1250,'Ruh korosu geniş bir yelpaze oluşturur.','Yelpazenin arkasına geç.'],
      ['Mezar Çemberi','grave-circle',15,'ring',7000,1400,'Mezar taşları çevresinde bir halka parlar.','Halkanın içindeki güvenli boşluğu bul.']),
    p('İsimlerin Yankısı','Mezar taşları çiftler halinde etkinleşir.','Ruhlar oyuncunun kaçış yönünü keser.',['bone-skitter','wailing-wisp'],1,1.02,
      ['Çapraz Ağıt','cross-lament',23,'cross',5400,950,'İki ruh çizgisi çapraz biçimde kapanır.','Çizgilerden birini geçmeden önce boşluğu seç.'],
      ['Ruh Oku','wisp-volley',20,'line',5900,1050,'Kral oyuncuya uzanan dar bir ruh hattı işaretler.','Hattın dikine hareket et.']),
    p('Nihai Hüküm','Güvenli mezar halkaları daha sık yer değiştirir.','Kısa aralıklarla iki destek dalgası gelir.',['crypt-leaper','wailing-wisp'],1.08,1.08,
      ['Taş Yağmuru','stonefall-ring',30,'ring',4800,850,'Üç halka sırayla zemine çöker.','Halkalar arasındaki aralıkta kal.'],
      ['Ruh Kapanı','spirit-cage',26,'cone',5300,900,'Ruhlar ön tarafta kapanan bir kafes kurar.','Kafesin açık kenarından çık.'])
  ]),
  v('ossuary-king-warhost','ossuary-king','Kemik Savaş Alayı','Ruh korosunun bağlanması kralı bir komutana dönüştürür; daha hızlı saldırılar ve kalabalık destek dalgaları kullanır.',[
    p('Bağlı Koro','Mezar kapıları dar geçitlere dönüşür.','Hızlı, kısa uyarılı saldırılar; boss hareketi ×1.12.',['mourner-acolyte','bone-skitter'],1.04,1.12,
      ['Koro Mızrakları','choir-spears',20,'line',4700,760,'Ruh mızrakları oyuncunun hattına dizilir.','Hattı çapraz geç.'],
      ['Tabut Darbesi','coffin-impact',18,'circle',5200,820,'Tabut gölgesi oyuncunun altında belirir.','İşaretin dışına çık.']),
    p('Savaş Alayı','Tabut hatları çapraz hareket eder.','İki destek türü aynı anda baskı kurar.',['mourner-acolyte','crypt-leaper'],1.12,1.16,
      ['Alay Haçı','procession-cross',27,'cross',4300,700,'Tabutlar çapraz iki hat oluşturur.','Merkezden uzaklaşıp boş koridora geç.'],
      ['Kemik Mızrağı','bone-lance',24,'cone',4900,760,'Kral önündeki geniş alanı biçer.','Arkasına dolan.']),
    p('Savaşın Sonu','Arena merkezinde dar bir güvenli alan kalır.','Son fazda destekler yenilenir ve boss hasarı artar.',['crypt-leaper','wailing-wisp','bone-skitter'],1.2,1.2,
      ['Taht Çarpması','throne-crash',34,'circle',3800,650,'Merkezden dışarı yayılan darbe halkası oluşur.','Darbe halkasının üzerinden dash at.'],
      ['Koro Hücumu','choir-surge',30,'cone',4400,700,'Ruh korosu geniş bir koni halinde saldırır.','Koni sınırının dışına çık.'])
  ]),
  v('furnace-colossus-dormant','furnace-colossus','Sönmüş Ocak','Ocağın durdurulması devi ağır ve savunmacı yapar; daha uzun uyarılarla karşılık verilebilir, ancak piston destekleri alanı daraltır.',[
    p('Soğuk Basınç','Lav kanalları kapanır.','Boss daha yavaş hareket eder; saldırılar daha ağırdır.',['brass-sentinel'],.92,.78,
      ['Piston İnişi','dormant-piston',22,'circle',6500,1350,'Tavan pistonu zeminde geniş gölge bırakır.','Gölgenin dışına çık.'],
      ['Soğuk Hat','cold-forge-line',18,'line',7200,1450,'Zeminde tek bir uzun hat donar.','Hattın yanına geç.']),
    p('Duran Dişliler','Dişli platformları aralıklı çalışır.','Destekler oyuncuyu dar geçitlere yönlendirir.',['brass-sentinel','rune-sapper'],1, .92,
      ['Dişli Kesişi','gear-cross',26,'cross',5600,1050,'Dört dişli hattı kesişir.','Kesişimin dışına hareket et.'],
      ['Basınç Halkası','pressure-ring',22,'ring',6200,1200,'Basınç dalgası dış halkada belirir.','Halkayı geçerek güvenli iç bölgeye ulaş.']),
    p('Çekirdek Nöbeti','Çekirdek açılır, pistonlar ritmik iner.','Boss yavaş kalır fakat destekler artar.',['chain-duelist','brass-sentinel'],1.06,.88,
      ['Çekirdek Işını','core-beam',31,'line',5000,950,'Çekirdekten oyuncuya uzanan ışın çizgisi belirir.','Işının yanına dash at.'],
      ['Döküm Çöküşü','forge-collapse',28,'circle',5700,1000,'Ağır döküm alanı oyuncunun altında işaretlenir.','İşaretlenen bölgeden çık.'])
  ]),
  v('furnace-colossus-overheated','furnace-colossus','Aşırı Isınmış Ocak','Ocağın yeniden yakılması devi saldırganlaştırır; kısa aralıklı lav çizgileri ve patlayıcı destekler baskı kurar.',[
    p('Alev Basıncı','Lav kanalları sürekli parlar.','Hızlı saldırı temposu; boss hasarı ×1.08.',['ember-mortar'],1.08,1.08,
      ['Lav Yarığı','lava-rift',24,'line',4300,720,'Lav tek bir çizgide yüzeye çıkar.','Çizginin dışına hızla geç.'],
      ['Kor Patlaması','ember-burst',22,'circle',4900,780,'Kor parçacıkları oyuncunun çevresinde toplanır.','Patlama alanını terk et.']),
    p('Kızgın Dişliler','Dişli yolları çapraz lav akışına dönüşür.','İki patlayıcı destek dalgası çağrılır.',['ember-mortar','rune-sapper'],1.14,1.16,
      ['Erimiş Haç','molten-cross',29,'cross',3900,650,'Dört lav kolu aynı anda yükselir.','Kollar arasındaki boşluğa geç.'],
      ['Alev Konisi','furnace-cone',26,'cone',4500,700,'Ocak ağzı oyuncuya doğru alev püskürtür.','Koninin dışına çık.']),
    p('Açık Çekirdek','Merkez çekirdek sürekli ısı yayar.','Son faz en hızlı fazdır; hasar ve hareket artar.',['ember-mortar','chain-duelist','brass-sentinel'],1.22,1.22,
      ['Güneş Halkası','solar-ring',36,'ring',3400,600,'Çekirdekten dışarı genişleyen halka çıkar.','Halkanın iç/dış güvenli tarafını seç.'],
      ['Ocak Çöküşü','furnace-fall',32,'circle',4100,650,'Tavan alevli enkazı oyuncunun konumuna indirir.','İşaretin dışına çık.'])
  ]),
  v('mire-oracle-awakened','mire-oracle','Arınmış Kehanet','Kâhinin özgür bırakılması saldırılarını daha kontrollü yapar; güvenli su adaları ve temizleme fırsatları korunur.',[
    p('Uyanan Su','Su akıntıları daha geniş aralıklarla döner.','Düşük hasarlı ama alan kontrolü yüksek saldırılar.',['mire-lurker'],.9,.92,
      ['Arınma Dalgası','cleansing-wave',17,'line',6100,1200,'Su geri çekilip tek bir dalga hattı çizer.','Dalgaya dik hareket et.'],
      ['Saf Su Halkası','pure-water-ring',14,'ring',6900,1350,'Temiz su halkası belirir.','Halkanın güvenli boşluğuna yerleş.']),
    p('Kehanetin Koruyucuları','Su adaları arasında temiz geçitler açılır.','Destekler oyuncuyu zehirli alanlardan uzak tutar.',['mire-witch','mire-lurker'],.98,1,
      ['Sarmaşık Akıntısı','vining-current',23,'cone',5300,950,'Akıntı geniş bir koni boyunca ilerler.','Akıntının yan kenarından geç.'],
      ['Ada Kapanı','island-cross',19,'cross',5900,1050,'Dört su yolu aynı anda yükselir.','Kesişimin dışına çık.']),
    p('Son Arınma','Güvenli ada son fazda daha sık değişir.','Oyuncuya kısa temizlenme pencereleri bırakılır.',['bog-leech','mire-lurker'],1.04,1.04,
      ['Arınma Çemberi','purity-ring',29,'circle',4700,850,'Su çemberi oyuncunun konumunda yükselir.','Çemberin dışına dash at.'],
      ['Son Dalga','last-tide',25,'line',5200,900,'Ardışık iki dalga çizgisi belirir.','İlk dalgadan sonra yön değiştir.'])
  ]),
  v('mire-oracle-usurper','mire-oracle','Bataklık Gasıbı','Kâhinin yerini almak bataklığı saldırgan bir hükümdara dönüştürür; ağlar, zehirli destekler ve dar alanlar kullanır.',[
    p('Tahtın Zehri','Güvenli su adaları daralır.','Zehirli baskı ve daha hızlı takip.',['gas-sac','mire-lurker'],1.06,1.08,
      ['Zehir Hattı','venom-line',23,'line',4700,760,'Zehirli su oyuncunun rotasını keser.','Hattı çapraz geç.'],
      ['Bataklık Kapanı','marsh-snare',20,'circle',5200,820,'Çamur oyuncunun altında aniden kabarır.','Alan kapanmadan çık.']),
    p('Ağ Tahtı','Sis ağları geçitleri daraltır.','Ağ örücü ve cadı aynı anda destek verir.',['web-weaver','mire-witch'],1.12,1.14,
      ['Ağ Haçı','web-cross',28,'cross',4200,680,'Ağ çizgileri çapraz biçimde kapanır.','Açık köşeye yönel.'],
      ['Veba Konisi','plague-cone',25,'cone',4700,720,'Kâhin önündeki alanı zehirli sisle kaplar.','Koni dışına çık.']),
    p('Gasp Edilmiş Kehanet','Merkez bataklıkta tek bir güvenli cep kalır.','Son fazda boss ve destekler hızlı saldırır.',['bog-leech','web-weaver','gas-sac'],1.2,1.2,
      ['Kara Girdap','black-maelstrom',34,'ring',3600,600,'Girdap halkası daralarak kapanır.','Halkanın ters yönüne dash at.'],
      ['Çamur Patlaması','mire-eruption',30,'circle',4200,650,'Çamur oyuncunun çevresinde patlar.','İşaretin dışına çık.'])
  ]),
  v('unwritten-regent-sealed','unwritten-regent','Mühürlenmiş Hükümdar','Perdenin onarılması hükümdarın gücünü sınırlar; mühür dizileri daha yavaş fakat dikkat isteyen saldırılar üretir.',[
    p('Mühür Nöbeti','Mühür taşları sırayla ışıldar.','Daha uzun uyarı ve daha düşük boss hasarı.',['soul-anchor'],.86,.88,
      ['Mühür Halkası','seal-ring',17,'ring',6500,1350,'Mühür halkası zeminde iki sınır çizer.','Halkaların arasındaki güvenli şeritte kal.'],
      ['Hüküm Çizgisi','edict-line',15,'line',7100,1450,'Tek bir mühür çizgisi oyuncuya uzanır.','Çizgiyi dikine geç.']),
    p('Sarayın Son Duvarı','Geçitler güvenli rotayı açıkça gösterir.','Ruh muhafızları aralıklarla yolu keser.',['soul-anchor','dusk-revenant'],.94,.96,
      ['Kraliyet Haçı','royal-cross',24,'cross',5600,1050,'Dört mühür çizgisi merkezde birleşir.','Kesişimden uzaklaş.'],
      ['Gölge Konisi','shadow-cone',20,'cone',6200,1150,'Hükümdar önünde geniş bir gölge yayar.','Arkasına geç.']),
    p('Perdeyi Kapat','Tahtın çevresinde tek güvenli geçit kalır.','Boss yavaşlar; destekler son savunmayı kurar.',['veil-stalker','soul-anchor'],1,.9,
      ['Son Mühür','final-seal-ring',29,'ring',4800,900,'Son mühür halkası daralarak kapanır.','Halkayı geçerek güvenli geçide ulaş.'],
      ['Perde Çizgisi','veil-line',25,'line',5400,950,'Perde çizgisi arena boyunca kesilir.','Çizgiyi çapraz geç.'])
  ]),
  v('unwritten-regent-unbound','unwritten-regent','Serbest İrade','Perdenin yırtılması hükümdarı sınırsız bırakır; saldırılar daha yoğun, destekler daha çeşitli ve hareket çok daha hızlıdır.',[
    p('Öte Dünya Sızıntısı','Arena katmanları üst üste biner.','Hızlı çapraz saldırılar; boss hasarı ×1.08.',['mirror-mimic','soul-anchor'],1.08,1.1,
      ['Katman Çarpması','layer-cross',24,'cross',4400,720,'İki katmanın sınırı çapraz biçimde parlar.','Çizgilerin kesişiminden uzaklaş.'],
      ['Yankı Patlaması','echo-burst',21,'circle',4900,780,'Yankı oyuncunun çevresinde patlar.','İşaretin dışına çık.']),
    p('Açık Perde','Geçitler sürekli yer değiştirir.','Ayna kopyaları ve ruh ankrajları aynı anda belirir.',['mirror-mimic','dusk-revenant'],1.16,1.18,
      ['Ayna Konisi','mirror-cone',30,'cone',3900,650,'Sahte kopyalar geniş bir koni oluşturur.','Gerçek saldırı hattının dışına çık.'],
      ['Ruh Halkası','soul-ring',27,'ring',4400,700,'Ruh halkası arena merkezinden yayılır.','Halkanın iç/dış güvenli tarafını seç.']),
    p('Yazılmamış Son','Arena iki katmana ayrılır.','En hızlı faz; üç farklı destek türü saldırıyı tamamlar.',['soul-anchor','dusk-revenant','veil-stalker'],1.24,1.24,
      ['Üçlü Mühür','triple-seal',38,'ring',3300,560,'Üç halka art arda kapanır.','Her halkadan sonra güvenli boşluğa ilerle.'],
      ['Perde Yarığı','veil-collapse',34,'line',3900,620,'Uzun yarık oyuncunun son konumuna kilitlenir.','İşaret kilitlenince yana dash at.'])
  ])
];
