BEYOND THE VEIL

Game Design Document (GDD)

Sürüm: 1.0 — Ana Tasarım Belgesi
Tür: Dark Fantasy Roguelite / Survivors-like Action
Platform: Web, Android, PC (web sürümü üzerinden)
Oyun motoru: Phaser 3 + TypeScript
Görsel stil: High-Detail Dark Fantasy Pixel Art
Kamera: 3/4 Top-Down
Oyun modu: Tek oyunculu, çevrimdışı öncelikli
Ekran yönü: Yatay

⸻

1. OYUNUN VİZYONU

Beyond the Veil, oyuncunun karanlık fantastik bir dünyada lanetli yaratıklarla savaştığı, sürekli güçlendiği ve her koşuda farklı bir savaş stratejisi geliştirdiği aksiyon odaklı bir roguelite oyunudur.

Oyun, Vampire Survivors tarzı otomatik saldırı ve düşman dalgaları temelini kullanır. Ancak kendi karakterleri, silahları, element sistemi, boss mekanikleri, keşif alanları ve hikâyesiyle bağımsız bir kimlik oluşturur.

Oyuncu bir Lanetli Avcıdır. Görevi yalnızca hayatta kalmak değil, dünyanın çökmesine neden olan kadim tehdidin kaynağını araştırmak ve ölümün ötesinden gelen varlıkları durdurmaktır.

Temel tasarım ilkeleri

1. Kolay öğrenilen, ustalaşması zor savaş: Kontroller basit, build oluşturma derin olmalı.
2. Her koşuda farklı deneyim: Silahlar, elementler, pasifler, lanetler ve kutsamalar farklı kombinasyonlar oluşturmalı.
3. Gerçek içerik çeşitliliği: Düşmanlar yalnızca farklı renkte sprite olmamalı; davranışları, saldırıları ve animasyonları farklı olmalı.
4. Güçlü görsel kimlik: Detaylı Pixel Art, karanlık atmosfer ve okunabilir savaş efektleri.
5. Adil zorluk: Oyuncu tehlikeyi anlayabilmeli ve karşılık verebilmeli.
6. Uzun vadeli ilerleme: Ölüm, oyuncunun kalıcı ilerlemesini yok etmemeli.
7. Çevrimdışı özgürlük: Temel oyun internet veya hesap gerektirmemeli.
8. Kaliteli mobil deneyim: Web ve Android aynı temel kod tabanını kullanmalı.

⸻

2. TEMEL OYUN DÖNGÜSÜ

Oyunun ana döngüsü:

1. Avcı seç.
2. Bölge ve zorluk seç.
3. Koşu öncesi ekipman ve hazırlık yap.
4. Arenaya gir.
5. Düşmanları otomatik saldırılarla alt et.
6. XP kristalleri topla.
7. Seviye atlayarak silah ve pasif geliştirmeleri seç.
8. Elit düşmanları, özel olayları ve boss’ları yen.
9. Sandıklar, keşif noktaları ve görevlerle ödüller kazan.
10. Koşuyu tamamla veya öl.
11. Ruh Özü ve kalıcı ödüllerle avcı merkezini geliştir.
12. Yeni içerik aç ve daha güçlü bir koşuya hazırlan.

Önemli: Oyuncu öldüğünde yalnızca o koşuda edinilen geçici güçler kaybolur. Kazanılmış kalıcı kaynaklar, açılımlar, koleksiyonlar ve ustalık ilerlemesi korunur.

⸻

3. DÜNYA VE HİKÂYE

3.1 Ana hikâye

Yaşam ile ölüm arasındaki dengeyi koruyan kadim mühürler bozulmaya başlamıştır.

Ölümün ötesinden gelen bilinmeyen bir varlık, dünyanın doğal düzenini parçalamaktadır. Ölüler yeniden uyanır, ormanlar çürür, ruhlar bozulur ve insanlar yaratıklara dönüşür.

Oyuncu, bu felaketin izlerini araştıran Lanetli Avcıdır.

Avcı, beş farklı bölgedeki kadim mühürleri ve onları koruyan yaratıkları araştırarak büyük tehdidin kaynağına ulaşmaya çalışır.

3.2 Hikâye anlatımı

Uzun diyaloglar ve zorunlu ara sahneler kullanılmaz.

Hikâye şu yollarla anlatılır:

* Terk edilmiş kamplar
* Eski mezarlar
* Duvar yazıları
* Kadim mühürler
* Kayıp ruhlar
* Bölgeye özgü NPC’ler
* Boss arenalarındaki izler
* Silah ve kalıntı açıklamaları
* Koleksiyon parçaları
* Gizli karşılaşmalar

Oyuncu isterse hikâyeyi takip eder, isterse doğrudan savaşa devam eder.

3.3 Hikâye seçimleri

Bazı görevler ve karşılaşmalar oyuncunun kararlarına göre değişir.

Kararlar şunları etkileyebilir:

* NPC’lerin kaderi
* Bölge atmosferi
* Gizli yollar
* Boss karşılaşmaları
* Ödüller
* Alternatif görevler
* Hikâyenin farklı sonları

Ana hikâye tutarlı kalırken oyuncuya farklı keşif yolları sunulur.

3.4 Hikâye arşivi

Oyuncunun keşfettiği bütün hikâye parçaları merkezi bir arşivde saklanır.

Arşivde:

* Dünya kronolojisi
* Karakter biyografileri
* Boss geçmişleri
* Kadim mühürler
* Keşfedilen sırlar
* Karakter bağlantıları
* Tamamlanmamış gizemler

bulunur.

⸻

4. BÖLGELER

İlk oyun sürümünde beş ana bölge bulunur.

Her bölgenin kendine özgü:

* Görsel atmosferi
* Düşman havuzu
* Elit yaratıkları
* Boss’u
* Müzik teması
* Çevresel tehlikeleri
* Keşif noktaları
* Özel ödülleri
* Hikâye parçaları

olmalıdır.

4.1 Lanetli Orman

Çürümüş ağaçlar, zehirli bitkiler, karanlık kökler ve sisli yollar.

Çevresel tehlikeler:

* Zehirli bitkiler
* Dikenli kökler
* Gizli yaratık yuvaları
* Elementle tetiklenebilen bitkiler

4.2 Unutulmuş Mezarlık

Ölülerin huzur bulamadığı, mezarların açıldığı ve ruhların dolaştığı bölge.

Çevresel tehlikeler:

* Lanetli mezarlar
* Ruh patlamaları
* Geçici ruh portalları
* Yeniden uyanan mezar yaratıkları

4.3 Derin Zindan

Kadim uygarlığın kalıntıları, tuzaklar ve yeraltı yaratıkları.

Çevresel tehlikeler:

* Ateş tuzakları
* Dikenli zeminler
* Hareketli mekanizmalar
* Gizli geçitler

4.4 Çürümüş Bataklık

Zehirli sular, çürüyen bitkiler ve ağır sisle kaplı alan.

Çevresel tehlikeler:

* Zehirli su
* Yavaşlatan çamur
* Çürüyen zemin
* Gizlenen düşmanlar

4.5 Lanetli Kale

Kadim mühürlerin ve ölümün ötesinden gelen gücün izlerini taşıyan son bölge.

Çevresel tehlikeler:

* Lanetli mühürler
* Ateş ve karanlık enerji
* Değişen geçitler
* Boss fazlarıyla değişen arena

4.6 Harita sistemi

Haritalar geniş, organik ve keşfe açık olmalıdır.

* Belirgin kareli tile görünümü olmayacak.
* Teknik tarafta grid tabanlı sistem kullanılabilir.
* Önemli noktalar el yapımı tasarlanacak.
* Düşman yuvaları, yollar ve bazı keşif alanları kontrollü prosedürel yerleşecek.
* Gizli geçitler ve alt bölgeler bulunacak.
* Haritalar boş dolaşma hissi vermemeli.

Bölge açılımları hikâye ve ilerleme koşullarına bağlıdır. Açılmış bölgelere tekrar girilebilir.

⸻

5. OYNANABİLİR KARAKTERLER

İlk sürümde beş oynanabilir avcı bulunur.

Karakter	Savaş kimliği
Lanetli Avcı	Dengeli, başlangıç karakteri
Kara Şövalye	Ağır silahlar ve savunma
Ruh Büyücüsü	Alan hasarı ve ruh büyüleri
Gölge Suikastçı	Hız, kritik ve hareket
Kan Rahibesi	Can tüketen büyüler ve yaşam çalma

Her karakterin kendine özgü:

* Başlangıç silahı
* Başlangıç pasifi
* Temel statları
* Aktif yeteneği
* Silah sinerjileri
* Element etkileşimleri
* Gelişim yolları
* Ustalık görevleri
* Kostümleri
* Hikâye parçaları

olmalıdır.

5.1 Karakter aktif yetenekleri

Aktif yetenekler normal silah saldırılarından ayrıdır.

Oyuncu istediği zaman uygun cooldown koşuluyla yeteneği kullanabilir.

Yetenekler:

* Geliştirilebilir.
* Alternatif biçimlere dönüşebilir.
* Karaktere özgü sinerjiler kazanabilir.
* Bazı özel geliştirmelerle otomatik tetiklenebilir.

5.2 Karakter ustalığı

Her karakterle oynandıkça ustalık seviyesi ilerler.

Ustalık ödülleri:

* Kostümler
* Alternatif yetenekler
* Pasif geliştirmeler
* Özel unvanlar
* Hikâye parçaları
* Başarımlar
* Kozmetik efektler

Kostümler oynanış avantajı sağlamaz.

⸻

6. SAVAŞ VE HAREKET SİSTEMİ

6.1 Temel savaş

Normal silah saldırıları tamamen otomatiktir.

Oyuncu:

* Hareket eder.
* Dash kullanır.
* Aktif yeteneğini tetikler.
* XP ve ödülleri toplar.
* Konumlandırma ve kaçınma kararları verir.

Silahlar hedeflerine göre akıllı davranır:

* Takipli mermiler uygun hedefi bulur.
* Kılıç ve mızrak yönlü saldırılar yapar.
* Alan silahları çevredeki düşmanlara etki eder.
* Zincirleme saldırılar birden fazla düşmana sıçrar.
* Savunma silahları yakın tehditlere tepki verir.

6.2 Hareket

Her karakter normal hareket ve dash kullanabilir.

Dash:

* Kısa mesafe hareket sağlar.
* Cooldown’a sahiptir.
* Kısa süreli hasar bağışıklığı verir.
* Bazı karakterlerde özel etkiler kazanabilir.

6.3 Kontroller

Mobil:

* Sol tarafta sanal joystick
* Sağ tarafta dash butonu
* Aktif yetenek butonu
* Özelleştirilebilir buton boyutu, konumu ve şeffaflığı

PC:

* WASD veya yön tuşları
* Dash ve aktif yetenek tuşları
* Tuş atama
* Gamepad desteği

Gamepad hem oyun hem menü kullanımını desteklemelidir.

⸻

7. KOŞU SİSTEMİ

7.1 Standart koşu

Normal koşu hedef süresi 15 dakikadır.

Süre	Oyun temposu
00:00–03:00	Temel düşmanlar ve başlangıç gelişimi
03:00–07:00	Yeni düşman türleri ve yoğunluk
07:00–11:00	Elitler, özel dalgalar ve çevresel tehditler
11:00–14:00	İleri tehditler ve yoğun savaş
14:00–15:00	Final boss karşılaşması

Bu zaman çizelgesi ilk denge hedefidir. Oynanış testleriyle ayarlanabilir.

7.2 Zorluk seviyeleri

* Normal: Başlangıç zorluğu.
* Hard: Normal tamamlandıktan sonra açılır.
* Nightmare: Hard tamamlandıktan sonra açılır.

Zorluk yalnızca can ve hasar değerlerini artırmamalıdır. Yeni saldırı kombinasyonları, davranışlar ve boss mekanikleri de kullanılmalıdır.

7.3 Özel oyun modları

* Ana Survival modu
* Boss Avı
* Lanetli Meydan Okumalar
* Sonsuz Mod
* New Game+
* Haftalık özel koşular

7.4 Koşu etkinlikleri

Her standart koşuda beş etkinlik havuzundan üç farklı etkinlik, koşu seed'ine bağlı olarak tekrarsız seçilir. Etkinlik başlangıç pencereleri 03:30, 07:30 ve 11:30'dur. Aynı anda yalnızca bir etkinlik çalışır; açılışın ilk üç dakikası ve 14:00 final boss başlangıcı etkinliklerden etkilenmez. Etkinlikler tamamlanırsa Ruh Özü verir; süre dolarsa ödül verilmeden başarısız olur.

İlk denge hedefleri:

| Etkinlik | Amaç ve süre | Ödül |
|---|---|---:|
| Elit İstilası | Bölgeye özgü iki eliti 70 saniye içinde yen. | 100 Ruh Özü |
| Ruh Fırtınası | Altı ruh parçasından en az dördünü 55 saniyede topla. | 70 Ruh Özü |
| Hazine Avı | Haritada beliren sandığa 40 saniyede ulaş. | 90 Ruh Özü |
| Avcı Sınavı | 50 saniyede altı düşman yen. | 110 Ruh Özü |
| Lanetli Dalga | Her biri üç düşmandan oluşan üç dalgayı toplam 75 saniyede temizle. | 85 Ruh Özü |

Etkinlik seçimi ve zamanlaması deterministiktir; aynı seed aynı üç etkinliği ve sırayı üretir. Etkinlik düşmanları normal aktif düşman sınırına uyar. Bu süre ve ödüller ilk uygulama değerleridir; oynanış ve denge testleriyle ayarlanabilir. Etkinlikler oyuncuyu ödüllendirirken savaş temposunu bozmamalıdır.

⸻

8. DÜŞMAN SİSTEMİ

İlk sürüm hedefi 25 özgün temel düşmandır.

Her bölgede yaklaşık beş temel düşman türü bulunur.

Düşman sınıfları:

* Normal
* Hızlı
* Ağır
* Menzilli
* Destek
* Çağırıcı
* Zehirleyici
* Patlayıcı
* Özel elit

Düşmanlar farklı davranışlara sahip olmalıdır:

* Doğrudan takip
* Çevreleme
* Uzaktan saldırı
* Pusu
* Hareket tahmini
* Birlikte saldırı
* Destek ve iyileştirme

8.1 Elitler

Elitler normal düşmanların yalnızca güçlendirilmiş renk varyantları olmamalıdır.

Özel tasarım, saldırı deseni, giriş animasyonu, ödül ve davranışlara sahip olmalıdırlar.

8.2 Düşman mutasyonları

Bazı düşmanlar koşu sırasında özel özellikler kazanabilir:

* Zehirli
* Patlayıcı
* Zırhlı
* Hızlı
* Vampirik
* Lanetli

Mutasyonlar görsel ve mekanik olarak ayırt edilmelidir.

8.3 Adaptif düşman davranışı

Bazı düşmanlar oyuncunun build’ine göre geçici savunma veya taktik değişikliği gösterebilir.

Ancak hiçbir düşman oyuncunun bütün build’ini etkisiz hale getirmemelidir.

⸻

9. BOSS SİSTEMİ

İlk sürümde beş ana boss bulunur.

Her boss:

* Kendine özgü tasarıma
* Özel arenaya
* Çok aşamalı savaş sistemine
* Farklı saldırı desenlerine
* Yardımcı düşmanlara
* Element etkileşimlerine
* Özel müziğe
* Nadir ödüllere
* Hikâye bağlantısına

sahip olmalıdır.

9.1 Boss savaşları

Boss’lar ortalama 3–5 dakika sürecek şekilde dengelenir.

Faz geçişlerinde:

* Boss dönüşümü
* Arena değişimi
* Müzik geçişi
* Yeni saldırı desenleri

birlikte kullanılabilir.

9.2 Saldırı uyarıları

Her önemli boss saldırısında iki aşamalı uyarı bulunur:

1. Hazırlık animasyonu ve ses.
2. Zeminde Pixel Art tehlike alanı.

Daire, çizgi, koni veya geniş alan gibi farklı uyarı şekilleri kullanılabilir.

9.3 Boss zayıflıkları

Zayıflıklar animasyon, ses, çevre ve isteğe bağlı arayüz göstergeleriyle anlaşılır.

Bazı boss mekanikleri:

* Element etkileşimi
* Arena nesneleri
* Savunma kırma
* Fazlara özel zayıflıklar
* Yardımcı yaratıkları kontrol etme

üzerinden çözülür.

Boss savaşları yalnızca yüksek cana sahip düşmanlarla mücadele etmekten ibaret olmamalıdır.

⸻

10. SİLAH SİSTEMİ

İlk sürüm hedefi 12 temel silahtır.

Silah sınıfları:

* Yakın dövüş
* Ağır fiziksel
* Menzilli
* Takipli mermi
* Alan hasarı
* Ruh büyüsü
* Savunma
* Zincirleme saldırı

Her silahın:

* Özgün saldırı davranışı
* Görsel efekti
* Saldırı sesi
* Gelişim seviyeleri
* Özel gelişim seçimi
* En az bir evrim formu

olmalıdır.

10.1 Silah yuvaları

Koşu başına altı silah yuvası bulunur.

10.2 Silah geliştirme

Silahlar seviye aldıkça:

* Hasar
* Saldırı hızı
* Menzil
* Mermi sayısı
* Saldırı biçimi

değişebilir.

Bazı seviyelerde oyuncuya özel gelişim dalları sunulur.

10.3 Silah evrimi

Evrim için temel koşullar:

1. Silahın maksimum seviyeye ulaşması.
2. Gerekli pasif eşyanın bulunması.
3. Boss sandığının açılması.

Evrim yalnızca hasarı artırmamalı; silahın davranışını veya saldırı biçimini de değiştirmelidir.

Alternatif evrim yolları, karakter sinerjileri ve element kombinasyonları desteklenir.

10.4 Silah–pasif sinerjileri

Sinerji, ilgili pasif eşya koşuda bulunduğu anda etkinleşir; pasifin beşinci seviye özel yükseltmesini seçme şartı yoktur. Sinerjiler silahın saldırı biçimini değiştirir ve altı pasif yuvası sınırını korur. Aynı silaha bağlı birden fazla pasif sinerjisi birlikte çalışabilir.

| Silah | Gerekli pasif | Sinerji | Gerçek savaş etkisi |
|---|---|---|---|
| Eşik Kıvılcımı | Ruh Kabı | Ruh Kıymığı | Mermi isabetinde 82 yarıçap içinde %32 hasarlı ruh sıçraması |
| Mezar Yarıcı | Mezar Zırhı | Mezar Sarsıntısı | Kesişten sonra 92 yarıçapta %42 hasarlı ikinci darbe |
| Yemin Mızrağı | Fırtına İletkeni | Gök Zinciri | Zincir saldırısına iki ek hedef |
| Kor Zincirleri | Kül Kalbi | Kor Patlaması | Son zincir hedefinde 72 yarıçapta %45 hasarlı ateş patlaması |
| Kış Halkaları | Buz Bağı Mührü | Kırağı Halkası | Donmuş hedefe temas edildiğinde 82 yarıçapta %35 hasarlı buz dalgası |
| Diken Tohumu | Zehir Şişesi | Zehirli Kök | Patlama noktasında 1,8 saniye süren, 600 ms aralıklı zehir alanı |
| Ruh Feneri | Ruh Kabı | Ruh Yankısı | Arayıcı küre 180 menzil içinde ikinci hedefe %55 hasarla sıçrar |
| Kan Tezgâhı | Kan Emaneti | Kızıl Bağ | Yaşam bağı hasarının %6'sı ek iyileştirme sağlar |
| Fırtına Camı | Fırtına İletkeni | Fırtına Kıvılcımı | Mermi isabetinde 180 menzil içinde iki hedefe %42 hasarlı yıldırım sıçrar |
| Demir Çan | Muhafız Düğümü | Muhafız Çemberi | Savunma titreşiminden sonra 700 ms boyunca alınan hasar %28 azalır |
| Rün Havanı | Kül Kalbi | Magma Yarığı | Patlama noktasında 1,8 saniye süren, 600 ms aralıklı magma alanı |
| Tutulma Mührü | Perde İpliği | Lanet Mührü | Mühür patlamasına yakalanan hedeflere bir karanlık katmanı eklenir |
| Tutulma Mührü | Boş Taç | Kül Avı | Zayıflatılmış hedeflere %25 ek hasar |
| Ruh Feneri | Boş Taç | Taç Rehberi | Zayıflatılmış hedefler öncelik kazanır ve %20 ek hasar alır |

Sinerjiler, özel yükseltmelerin yerine geçmez. Örneğin Kül Kalbi'nin Kor Çekirdeği ayrı bir seviye-5 özel yükseltmesidir; Kor Zincirleri ile Kül Kalbi arasındaki Kor Patlaması ise pasif edinildiği anda çalışan silah sinerjisidir.

Bilinen tarifler ansiklopedide gösterilir. Gizli evrimler keşif ve ipuçlarıyla açılabilir.

⸻

11. PASİF EŞYA SİSTEMİ

İlk sürüm hedefi 12 pasif eşyadır.

Pasif kategorileri:

* Saldırı
* Kritik
* Hareket hızı
* XP
* Savunma
* İyileşme
* Alan etkisi
* Element sinerjileri
* Özel mekanikler

Koşu başına altı pasif eşya yuvası bulunur. Her pasif beş normal seviyeye sahiptir. Beşinci seviyeye ulaşıldığında ayrı bir özel yükseltme kartı açılır; bu kart seçilmeden özel mekanik etkinleşmez. Özel yükseltme her pasif için koşu başına yalnızca bir kez seçilebilir.

Özel yükseltme mekanikleri:

| Pasif | Özel yükseltme | Oyun içi davranış |
|---|---|---|
| Kül Kalbi | Kor Çekirdeği | Ateş vuruşu, 88 birim yarıçapta 850 ms bekleme süresiyle ikincil patlama oluşturur; yakındaki düşmanlar vuruş hasarının %48'ini alır. |
| Buz Bağı Mührü | Mutlak Sıfır Odağı | Aktif buz etkisi altındaki hedefe en az 38 taban hasarlı ilk ağır vuruş, taban hasarın %70'i kadar parçalama hasarı ekler. Aynı donma penceresinde tekrar tetiklenmez. |
| Zehir Şişesi | Zehirli Çiçek | Zehir beş katmana ulaştığında 104 yarıçaplı spor alanı oluşturur. Alan 2,6 saniye sürer, 650 ms aralıklarla hedefin azami canının %7'si kadar hasar verir; yeniden oluşma beklemesi 5,2 saniyedir. |
| Perde İpliği | Gece İpliği | Kritik vuruş 1,5 çarpanıyla hasar verir ve hedefe bir ek karanlık/lanet katmanı ekler; lanet üç katmanla sınırlıdır. |
| Ruh Kabı | Açık Kap | Boss yenildiğinde her biri 10 Ruh Özü değerinde üç toplanabilir parça düşürür. |
| Fırtına İletkeni | Canlı Fırtına | Zincir yıldırımın çıktığı noktada 82 yarıçaplı, 2,2 saniyelik alan bırakır; 550 ms aralıklarla hedefin azami canının %6'sı kadar hasar verir. |
| Kan Emaneti | Kızıl Sakrament | Can %40 veya altındayken kan etkisinin tetiklediği yaşam çalma iyileştirmesine 15 yüzde puanı ekler. |
| Mezar Zırhı | Mühürlü Plaka | Koşunun 30. saniyesinden başlayarak her 30 saniyede bir alınacak ilk hasar temasını tamamen engeller. |
| Avcı Çizmeleri | Hayalet Adım | Dash'in normal 190 ms bağışıklık süresine 360 ms ekler. |
| Kâtibin Merceği | Temiz Yazım | Her koşuda ilk yeniden seçme ücretsizdir; normal yeniden seçme haklarını tüketmez. |
| Muhafız Düğümü | Son Siper | Ölümcül darbeyi koşu başına bir kez engeller ve avcıyı 1 canla bırakır. |
| Boş Taç | Kül Tacı | Elit öldüğünde 175 yarıçap içindeki düşmanları 5 saniyeliğine %30 daha az hasar verir hâle getirir. |

Alan hasarı, bekleme süreleri, tek kullanımlık savunma ve toplanabilir Ruh Özü parçaları veri odaklı tanımlanır. Özel yükseltmeler mevcut silah, element, XP, dash, düşman ve hasar akışlarına bağlanır; yalnızca açıklama metni olarak kalamaz.

Bazı pasifler belirli silahları veya karakter yeteneklerini dönüştürür. Silah–pasif sinerjileri §10.4'te tanımlanır; pasif edinildiğinde etkinleşir, özel yükseltmeden bağımsızdır ve altı pasif yuvası sınırını korur.

⸻

12. ELEMENT SİSTEMİ

Oyunda yedi element bulunur.

Element	Temel davranış
Ateş	Yakma, patlama, zamanla hasar
Buz	Yavaşlatma, dondurma, parçalama
Zehir	Birikim, zayıflatma, zamanla hasar
Karanlık	Lanet, savunma azaltma
Ruh	Enerji emilimi ve zincirleme etkiler
Yıldırım	Zincirleme hasar ve sersemletme
Kan	Yaşam çalma, kanama ve fedakârlık

12.1 Element etkileşimleri

Elementler birbirleriyle etkileşebilir.

Örneğin:

* Islak veya zehirli hedef üzerinde yıldırım farklı etki oluşturabilir.
* Donmuş hedefe ağır saldırı parçalama etkisi verebilir.
* Lanetli hedefe ruh saldırısı zincirleme etki sağlayabilir.
* Kan ve ateş kombinasyonu riskli, yüksek hasarlı saldırılar oluşturabilir.

Bu örnekler tasarım hedefidir; kesin kombinasyonlar denge ve test aşamasında tanımlanacaktır.

12.2 Birikim modelleri

Her elementin kendine özgü birikim sistemi olmalıdır.

* Zehir ve kan katman biriktirebilir.
* Buz belirli bir eşikte dondurabilir.
* Karanlık lanet katmanları oluşturabilir.
* Yıldırım zincirleme tetiklenmeler yapabilir.
* Ateş yanma ve patlama eşikleri oluşturabilir.

12.3 Dirençler

Düşman ve bölgelere bağlı element dirençleri bulunur.

Boss ve elitler ek direnç kazanabilir. Ancak hiçbir direnç oyuncunun build’ini tamamen geçersiz kılmamalıdır.

⸻

13. LEVEL-UP VE XP

Düşmanlar öldüğünde XP kristalleri düşürür.

* Normal düşman: Küçük XP
* Güçlü düşman: Büyük XP
* Elit: Değerli XP
* Boss: Özel XP ödülü

Yakındaki kristaller otomatik çekilir. Uzak kristaller için oyuncunun yaklaşması gerekir.

15 dakikalık standart koşu için yaklaşık 25–35 seviye hedeflenir.

Her level-up ekranında dört geliştirme seçeneği gösterilir.

Geliştirme nadirlikleri:

* Yaygın
* Nadir
* Destansı
* Efsanevi

Level-up sırasında oyun varsayılan olarak duraklar. İstenirse ayarlardan savaş devam ettirilebilir.

13.1 RNG kontrolü

Oyuncuya sınırlı haklarla:

* Reroll
* Banish
* Skip

imkânı verilir.

Bu haklar ustalık, başarımlar ve özel ödüllerle artırılabilir.

⸻

14. KALINTI, ÜRETİM VE EKİPMAN

14.1 Kalıntı sistemi

Kalıntılar sıradan stat bonuslarından daha fazlasını sunmalıdır.

* Build’i değiştiren pasif etkiler
* Element sinerjileri
* Karakter etkileşimleri
* Nadirlik seviyeleri
* Set bonusları
* Özel evrim tarifleri

14.2 Silah üretimi

Oyuncu silah kalıntıları, özel malzemeler ve keşif ödülleriyle:

* Silah üretebilir.
* Silah geliştirebilir.
* Özel varyant oluşturabilir.
* Alternatif evrim yolları açabilir.

14.3 Ekipman profilleri

Oyuncu:

* Karaktere özel build profilleri oluşturabilir.
* Profilleri isimlendirebilir.
* Build’leri karşılaştırabilir.
* Tek dokunuşla ekipman düzeni değiştirebilir.

14.4 Avcı merkezi

Kalıcı ilerleme merkezi zamanla gelişen bir alan olmalıdır.

İçerisinde:

* Demirci
* Simyacı
* Kalıntı ustası
* Özel tüccarlar

bulunur.

NPC’ler ve hizmetler ilerleme, görevler ve keşiflerle açılır.

⸻

15. EKONOMİ VE KALICI İLERLEME

15.1 Ana kaynak: Ruh Özü

Ruh Özü:

* Normal düşmanlardan
* Elitlerden
* Boss’lardan
* Görevlerden
* Keşiflerden
* Meydan okumalardan

kazanılır.

Koşu sırasında kazanılan kalıcı kaynak, ölümde kaybedilmez.

15.2 Kalıcı geliştirmeler

Ruh Özü ile:

* Karakter geliştirmeleri
* Yeni silahlar
* Pasif eşyalar
* Bölgeler
* Üretim tarifleri
* Özel içerikler

açılır.

Kalıcı stat geliştirmelerinin üst sınırı bulunur.

Gelişim dalları ve gerektiğinde kaynak karşılığı yeniden dağıtım sistemi vardır.

Önemli seçimler oyuncunun kalıcı ilerlemesini geri dönülmez şekilde bozmaz.

15.3 Koleksiyon

Koleksiyon sistemi:

* Yaratık ansiklopedisi
* Silah arşivi
* Kalıntı arşivi
* Hikâye arşivi
* Karakter biyografileri
* Kostümler
* Gizli eşyalar

içerir.

Koleksiyon tamamlamaları özel ödüller ve başarımlar açar.

⸻

16. GÖREVLER VE MEYDAN OKUMALAR

Görev çeşitleri:

* Günlük
* Haftalık
* Bölgesel
* Karaktere özel
* Silah ustalığı
* Gizli görevler
* Hikâye görevleri
* Koşu içi dinamik görevler

Görev zincirleri oyuncu kararlarına göre dallanabilir.

Özel meydan okumalar:

* Sınırlı silah yuvası
* Düşük can
* Hızlı düşmanlar
* Element kısıtlamaları
* Boss varyantları
* Özel düşman kombinasyonları

Ödüller:

* Ruh Özü
* Kostüm
* Unvan
* Kalıntı
* Silah varyantı
* Hikâye parçası
* Prestij kozmetiği

Haftalık içerikler ve sezonluk koleksiyonlar arşivlenebilir olmalıdır. Oyuncu kaçırdığı içerik nedeniyle cezalandırılmamalıdır.

⸻

17. NEW GAME+ VE ENDGAME

Endgame uzun vadeli oynanış sağlamalıdır.

İçerikler:

* New Game+
* Sonsuz zorluk
* Boss varyantları
* Özel evrimler
* Haftalık meydan okumalar
* Gizli sonlar
* Nadir koleksiyonlar
* Karakter ustalığı
* Silah ustalığı
* Prestij ödülleri

17.1 Sonsuz Mod

Sonsuz Mod:

* Dinamik düşman dalgaları
* Özel elitler
* Boss döngüleri
* Değişen kurallar
* Uzun süreli hayatta kalma ödülleri

içerir.

Zorluk yalnızca düşmanların canını artırarak oluşturulmamalıdır.

⸻

18. UI VE UX TASARIMI

18.1 Görsel kimlik

Modern Premium + Dark Fantasy.

Ana renkler:

* Kömür siyahı
* Füme
* Soluk altın
* Kontrollü element renkleri

UI modern ve okunabilir olmalı; gotik motifler ve Pixel Art ikonlar görsel kimliği desteklemelidir.

18.2 Ana menü

Ana menü düzeni:

* Sol: Ana navigasyon
* Merkez: Karakter ve yaşayan dünya sahnesi
* Sağ: Oyuncu ilerlemesi ve önemli bildirimler

Karakter ve bölge seçimine göre sahne değişebilir.

18.3 Ana menü bölümleri

* Devam Et / Hızlı Başla
* Yeni Koşu
* Karakterler
* Bölgeler
* Avcı Merkezi
* Koleksiyon
* Görevler
* Başarımlar
* Arşiv
* Ayarlar

18.4 Karakter galerisi

Animasyonlu Pixel Art karakter modeli, statlar, başlangıç silahı, aktif yetenek, ustalık, kostüm ve açılma koşulları gösterilir.

18.5 Bölge haritası

İnteraktif dünya haritasında:

* Bölge görseli
* Boss bilgisi
* Düşman havuzu
* Ödüller
* Zorluk
* Hikâye
* Açılma koşulları

gösterilir.

18.6 Savaş HUD

Sürekli görünür:

* Can
* XP
* Seviye
* Süre
* Aktif yetenek
* Boss canı ve fazı

Bağlama göre açılan:

* Silahlar
* Pasifler
* Görevler
* Element etkileri
* Mini harita
* Etkinlik bilgileri

18.7 Level-up ekranı

Dört geliştirme kartı gösterilir.

Kartlarda:

* İkon
* İsim
* Açıklama
* Nadirlik
* Mevcut ve yeni değer
* Sinerji bilgisi
* Karşılaştırma

bulunur.

18.8 Koşu sonu raporu

Rapor:

* Koşu süresi
* Öldürülen düşman
* Verilen/alınan hasar
* Kullanılan silahlar
* Pasif eşyalar
* Evrimler
* Ruh Özü
* Boss ve elit zaferleri
* Karakter ustalığı
* Keşif
* Açılımlar
* Başarımlar

gösterir.

⸻

19. GÖRSEL VE ANİMASYON STANDARTLARI

19.1 Sanat yönetimi

High-Detail Dark Fantasy Pixel Art.

Görsel stil:

* Özgün karakter tasarımları
* Detaylı düşman anatomisi
* Ayırt edilebilir siluetler
* Tutarlı renk paleti
* Pixel Art uyumlu ışık ve gölge
* Özgün efektler
* Bölgeye özel çevre tasarımı

Hazır asset paketleri oyunun kimliğinin yerine geçmemelidir.

19.2 Perspektif

3/4 Top-Down.

Karakterler ve çevre hacimli görünürken savaş alanı okunabilir kalmalıdır.

19.3 Animasyonlar

Karakterler:

* Idle
* Walk
* Run
* Dash
* Attack
* Special
* Hit
* Death
* Victory

animasyonlarına sahip olmalıdır.

Düşmanlar için:

* Hareket
* Saldırı hazırlığı
* Saldırı
* İsabet tepkisi
* Ölüm

animasyonları bulunmalıdır.

Karakterler ve uygun düşmanlar için sekiz yönlü animasyon hedeflenir.

19.4 Savaş efektleri

* Saldırı izleri
* Element patlamaları
* Parçacıklar
* Kritik vuruş
* Boss telegraph
* Düşman ölüm efektleri
* Silah evrimi
* Dash
* Hasar tepkileri

Efektler gösterişli ama kontrollü olmalıdır. Oyuncu, düşman ve tehlike alanları kaybolmamalıdır.

19.5 Animasyon ve efekt performansı

* Sprite atlasları
* Object pooling
* Parçacık limitleri
* Adaptif efekt yoğunluğu
* Gereksiz bellek tahsisinden kaçınma

kullanılmalıdır.

⸻

20. SES VE MÜZİK

Özgün Dark Fantasy müzik ve ses kimliği hedeflenir.

Müzik:

* Ana menü ambient
* Bölge temaları
* Savaş müziği
* Boss temaları
* Faz geçişleri
* Zafer ve ölüm müziği

Ses efektleri:

* Her silaha özel saldırı sesi
* Düşman sesleri
* Boss saldırıları
* Element efektleri
* UI etkileşimleri
* Level-up
* Sandık
* Evrim
* Dash
* Hasar

Önemli karakterler ve boss’lar için özgün seslendirme hedeflenir. Diğer hikâye içerikleri metin ve çevresel seslerle anlatılabilir.

Altyazı sistemi çok dilli olmalı. Ses kanalları ayrı ayrı ayarlanabilmeli ve aynı anda çok fazla ses çalınması engellenmelidir.

⸻

21. ERİŞİLEBİLİRLİK

Ayarlar:

* Efekt yoğunluğu
* Kamera sarsıntısı
* Hareket azaltma
* Flaş azaltma
* Renk körlüğü filtreleri
* Yazı boyutu
* Hasar sayıları
* Kontrol hassasiyeti
* Mobil buton düzeni
* Ses kanalları
* Otomatik yardım
* Level-up sırasında oyunun devam etmesi

Oyuncu deneyimini değiştiren seçenekler kolay bulunmalıdır.

⸻

22. TEKNİK MİMARİ

22.1 Teknoloji

* Phaser 3
* TypeScript
* Vite
* Web platformu
* Android için Capacitor hedefi
* Yerel kayıt sistemi

Tek kod tabanı web ve Android için kullanılmalıdır.

22.2 Mimari ilkeler

* Modüler sistemler
* Veri odaklı içerik
* Merkezi oyun verileri
* Test edilebilir servisler
* Kontrollü event bus
* Sorumlulukları ayrılmış oyun sistemleri
* İçerik eklemek için temel kodu değiştirme gereksinimini azaltan JSON yapılandırması

22.3 Önerilen sistem modülleri

* Game Core
* Player Controller
* Character System
* Weapon System
* Passive System
* Element System
* Enemy AI
* Boss System
* Spawn Director
* Wave Manager
* Experience System
* Level-up Manager
* Loot and Reward System
* Quest System
* Relic and Crafting System
* Economy and Progression
* Map and Exploration
* Save Manager
* Audio Manager
* UI Manager
* Localization
* Platform Adapter
* Analytics and Local Logging

22.4 Veri sistemi

Silah, düşman, karakter, pasif, boss, görev ve eşya verileri merkezi JSON yapılandırmalarında tutulmalıdır.

Veriler için:

* Şema doğrulama
* Eksik alan kontrolü
* Referans kontrolü
* Denge ayarları
* Geliştirme araçları

bulunmalıdır.

22.5 Kayıt sistemi

İlk sürümde hesap ve backend zorunlu değildir.

Yerel kayıtlar:

* Otomatik kaydedilir.
* Çoklu yedek tutulur.
* Sürüm uyumluluğu kontrol edilir.
* Bozuk kayıt kurtarma mekanizmasına sahip olur.
* Dışa ve içe aktarılabilir.

Gelecekte isteğe bağlı bulut senkronizasyonuna hazır olmalıdır.

22.6 Performans

Varsayılan hedef 60 FPS’tir.

Destekleyen cihazlarda 90/120 FPS; düşük güçlü cihazlarda 30 FPS profili hedeflenebilir.

Sistemler:

* Adaptif parçacık sayısı
* Düşman yoğunluğu kontrolü
* Sprite atlasları
* Object pooling
* Bellek optimizasyonu
* Isınma ve pil yönetimi
* Web ve Android profilleri

üzerinden çalışmalıdır.

22.7 Çevrimdışı çalışma

Ana oyun tamamen çevrimdışı çalışmalıdır.

İnternet yalnızca gelecekteki isteğe bağlı özellikler için kullanılabilir:

* Bulut kayıt
* Duyurular
* Liderlik tabloları
* Çevrimiçi etkinlikler

⸻

23. MONETİZASYON

Temel oyun ücretsiz olmalıdır.

Planlanan model:

* İsteğe bağlı ödüllü reklamlar
* Kozmetik satın alımlar
* Destek paketi

Kurallar:

* Savaş sırasında reklam gösterilmez.
* Pay-to-win uygulanmaz.
* Reklamla karakter, silah veya bölge doğrudan açılmaz.
* Reklam izlemek zorunlu değildir.
* İnternet veya reklam bulunmadığında oyun normal şekilde oynanır.
* Kozmetik satın alımlar stat avantajı sağlamaz.

İlk sürümde monetizasyon kapalı bırakılabilir. Öncelik oynanabilirlik ve kalite olmalıdır.

⸻

24. QA VE GELİŞTİRİCİ ARAÇLARI

24.1 QA

Test edilmesi gerekenler:

* Temel savaş döngüsü
* Silah saldırıları
* Silah evrimleri
* Element kombinasyonları
* Boss fazları
* Kayıt ve kurtarma
* Uzun süreli oynanış
* Performans
* Mobil kontroller
* Web/Android uyumu
* Görev ve ödül akışları

Kritik hata varsa yayın engellenmelidir.

24.2 Geliştirici paneli

Oyunculardan gizli geliştirici araçları:

* FPS ve bellek
* Düşman üretme
* Boss üretme
* Boss fazını değiştirme
* Kaynak verme
* Silah/pasif verme
* Hitbox gösterme
* Oyun hızını değiştirme
* Oyunu durdurma
* Veri inceleme
* Test senaryoları

Normal oyuncu sürümünde kapalı olmalıdır.

⸻

25. DİL DESTEĞİ

İlk hedef diller:

* İngilizce
* Türkçe
* İspanyolca

Bütün metinler merkezi yerelleştirme dosyalarında tutulmalıdır.

UI, görev, hikâye, karakter ve eşya açıklamaları çevrilebilir olmalıdır.

Tipografi:

* Dekoratif başlık fontu
* Okunaklı modern UI fontu
* Hasar sayıları için özel font

kullanabilir. Üç dilin karakterleri ve metin uzunlukları doğru görüntülenmelidir.

⸻

26. PLATFORM VE YAYIN

Web

* Vite tabanlı web sürümü
* Klavye ve gamepad desteği
* Tarayıcı performans optimizasyonu
* Yerel kayıt
* itch.io dağıtımı

Android

* Capacitor ile paketleme
* Yatay ekran
* Fullscreen
* Android geri tuşu yönetimi
* Yerel kayıt
* Haptics
* Uygulama arka plana geçtiğinde güvenli duraklatma
* Splash screen
* App icon
* Status/navigation bar yönetimi

Her iki platformda aynı oyun kuralları ve ilerleme sistemi korunmalıdır.

⸻

27. İLK SÜRÜMÜN İÇERİK HEDEFLERİ

İçerik	Hedef
Oynanabilir karakter	5
Ana bölge	5
Temel düşman	25
Ana boss	5
Temel silah	12
Pasif eşya	12
Element	7
Silah yuvası	6
Pasif yuvası	6
Level-up seçeneği	4
Standart koşu	15 dakika
Ana zorluk	3
İlk oyun dili	3

Bunlar tasarım hedefleridir. Her içerik türünün yalnızca listede bulunması yeterli değildir; oynanabilir, dengeli ve görsel olarak ayırt edilebilir olması gerekir.

⸻

28. ÜRETİM ÖNCELİKLERİ

Oyunun kapsamı geniştir. Kaliteyi korumak için geliştirme sırası önemlidir.

Aşama 1 — Oynanabilir temel

* Phaser altyapısı
* Karakter hareketi
* Dash
* Otomatik saldırı
* Düşman AI
* XP
* Level-up
* Silah ve pasif sistemi
* Temel HUD
* Yerel kayıt

Aşama 2 — Savaş derinliği

* Element sistemi
* Sinerjiler
* Silah evrimleri
* Elit düşmanlar
* Boss fazları
* Sandıklar
* Ödüller

Aşama 3 — İçerik

* Beş karakter
* Beş bölge
* 25 düşman
* Beş boss
* 12 silah
* 12 pasif
* Görevler
* Keşif
* Kalıntılar

Aşama 4 — Kalıcı ilerleme

* Avcı merkezi
* Üretim
* Ekonomi
* Ustalık
* Koleksiyon
* Başarımlar
* New Game+
* Sonsuz Mod

Aşama 5 — Sunum kalitesi

* Ana menü
* Karakter galerisi
* Bölge haritası
* Animasyonlar
* Ses ve müzik
* Hikâye arşivi
* Yerelleştirme
* Erişilebilirlik

Aşama 6 — Yayın ve QA

* Performans optimizasyonu
* Otomatik testler
* Web testleri
* Android testleri
* Kayıt güvenliği
* Hata raporları
* itch.io yayını
* APK hazırlığı

⸻

29. KALİTE KABUL KRİTERLERİ

Bir sistem tamamlandı kabul edilmeden önce:

1. Gerçekten çalışıyor olmalı.
2. Başka sistemlerle doğru etkileşmeli.
3. UI üzerinden kullanılabilmeli.
4. Kayıt gerekiyorsa doğru kaydedilmeli.
5. Mobil ve web kontrollerinde çalışmalı.
6. Hata durumlarında oyunu çökertmemeli.
7. Görsel ve işitsel kimlikle uyumlu olmalı.
8. Performans hedeflerini korumalı.
9. Test edilebilir olmalı.
10. Bilinen eksikleri belgelenmeli.

Özellikle düşman, silah, boss ve karakter çeşitliliği yalnızca isim veya renk değişikliğinden ibaret olmamalıdır.

⸻

30. PROJENİN BAŞARI TANIMI

Beyond the Veil’in başarılı bir ilk sürümü:

* Menüden oynanışa sorunsuz geçebilmeli.
* Bir koşu baştan sona tamamlanabilmeli.
* Oyuncu hareket, dash ve aktif yetenek kullanabilmeli.
* Otomatik silahlar doğru çalışmalı.
* Düşmanlar farklı davranışlar sergilemeli.
* XP ve level-up sistemi çalışmalı.
* Silah ve pasif kombinasyonları anlamlı olmalı.
* Boss savaşı tamamlanabilmeli.
* Koşu sonu ödülleri doğru hesaplanmalı.
* Kalıcı ilerleme kaydedilmeli.
* Oyun yeniden açıldığında ilerleme korunmalı.
* Web ve Android hedeflerine uygun mimari bulunmalı.

Temel kural: Çalışmayan çok sayıda özellik yerine, gerçekten çalışan ve kaliteli bir oyun deneyimi tercih edilir.

⸻

BEYOND THE VEIL — ANA TASARIM BELGESİ SONU

Bu belge, projenin tasarım referansıdır. Uygulama sırasında teknik kısıtlar nedeniyle değişiklik gerekirse önce oyun kimliği, temel oynanış ve kalite ilkeleri korunmalıdır.