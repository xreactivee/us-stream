# Elle test listesi

Baştan sona, bir kere. Sıra önemli — sonraki adımlar öncekilerin bıraktığı veriye
dayanıyor.

Her maddede **⚙︎** işareti benim bu oturumda otomatik doğruladığım, **👤** işareti
ancak senin (ya da iki gerçek cihazın) doğrulayabileceği anlamına geliyor. İşaretsiz
olanlar hızlıca göz gezdirmen yeterli olanlar.

## Hazırlık

```bash
pnpm install
pnpm db:check      # MONGODB_URI gerçekten bir cluster'a ulaşıyor mu
pnpm db:indexes    # index'leri şemayla eşitle
```

Sonra iki terminal:

```bash
pnpm --filter realtime dev
```

```bash
pnpm --filter web dev
```

`http://localhost:3001/health` → `{"status":"ok",...}` dönmeli.

**Not:** İki kişilik testler için tarayıcının **normal** ve **gizli** penceresini
kullan. Aynı profilde iki sekme aynı oturumu paylaşır ve iki ayrı kişi gibi
davranmaz.

---

## 1. Hesap ve dil

- ⚙︎ `/sign-up` → ad, e-posta, şifre ile kayıt → `/dashboard`'a düşüyor
- 👤 **Google ile devam et** → Google hesabınla giriş, `/dashboard`'a dönüyor
- ⚙︎ Alt bardan dili **English** yap → tüm arayüz İngilizce
- ⚙︎ Temayı açık/koyu/sistem arasında değiştir → anında değişiyor, sayfa
  yenilenince kalıyor
- `/privacy` ve `/terms` açılıyor ve seçtiğin dilde
- 👤 Klavyeyle `Tab`'a bas → sol üstte **İçeriğe atla** bağlantısı çıkıyor,
  `Enter` içeriğe atlıyor
- ⚙︎ Çıkış yap → giriş yap → oturum dönüyor

## 2. Odalar

- ⚙︎ **Yeni oda** → ad ver, **şifre gir**, kalıcı açık → oda açılıyor ve
  `/r/<slug>` adresine gidiyor
- ⚙︎ **Hemen başlat** → tek kullanımlık oda açıp doğrudan içine giriyor
- Dashboard'da rozetler doğru: `KALICI` / `TEK KULLANIMLIK`, `ŞİFRELİ`
- ⚙︎ **Bağlantıyı kopyala** → panoya `http://localhost:3000/r/<slug>` geliyor
- Ana sayfadaki **Kodla katıl** kutusuna hem `<slug>` hem tam URL yapıştır →
  ikisi de odaya götürüyor
- ⚙︎ Odayı sil → oda ve tüm içeriği gidiyor

## 3. Lobi ve katılım

- 👤 Kamera önizlemesi geliyor ve **aynalı** (kendini aynadaki gibi görüyorsun)
- 👤 Konuş → mikrofon seviye çubuğu hareket ediyor
- 👤 Kamera/mikrofon seçicilerinden başka cihaz seç → önizleme değişiyor
- Sayfayı yenile → seçtiğin cihazlar hatırlanıyor
- ⚙︎ İzin vermezsen açıklayıcı kutu çıkıyor ve yine de izleyici olarak
  girebiliyorsun
- ⚙︎ **Arka planı bulanıklaştır** kutusu var ve "önizlemede görünmez" diyor

**Şifreli odaya misafir olarak** (gizli pencere):

- ⚙︎ Şifresiz katıl → *"Bu oda şifreli"*
- ⚙︎ Yanlış şifre → *"Şifre yanlış"*
- ⚙︎ İsim girmeden → isim isteniyor
- ⚙︎ Doğru şifre + isim → giriyor, rolü **Misafir**
- ⚙︎ Odanın sahibi olarak sen şifre sorulmadan giriyorsun

## 4. Görüşme — asıl test, iki pencere gerekiyor

Normal pencerede sahip olarak, gizli pencerede misafir olarak aynı odaya gir.

- 👤 **Birbirinizi görüyor ve duyuyor musunuz** — bu testlerin en önemlisi
- 👤 Konuşan kişinin kutusunda kehribar halka çıkıyor
- 👤 Mikrofonu kapat → karşıda mikrofon-kapalı simgesi görünüyor
- 👤 **Ekranı paylaş** → karşı taraf ekranını görüyor, paylaşım otomatik sahneyi
  alıyor. Sesli bir video paylaş → sesi de gidiyor
- 👤 **Arka planı bulanıklaştır** → arkan bulanıklaşıyor, karşı taraf da öyle
  görüyor. Tekrar bas → düzeliyor
- 👤 **Küçük pencereye al** (Chrome/Edge) → görüşme ayrı küçük pencerede devam
  ediyor, başka sekmeye geçince kayboluyor. Kapatınca sayfaya dönüyor
- 👤 Firefox veya Safari'de bu düğme **hiç görünmemeli**
- 👤 Bir katılımcıyı sabitle → o kişi sahneyi alıyor
- 👤 Kısayollar: `M` mikrofon, `V` kamera, `S` ekran, `C` sohbet, `P` katılımcılar
- 👤 **Boşluğu basılı tut** → mikrofon kapalıyken açılıyor, bırakınca kapanıyor.
  Mikrofon zaten açıkken boşluğa basıp bırakmak seni **susturmamalı**
- 👤 Ağını kes (Wi-Fi kapat) → *"Yeniden bağlanılıyor"*, geri açınca toparlıyor

**Host kontrolleri** (sahip penceresinden):

- 👤 Misafirin kutusundaki menüden **Mikrofonunu kapat** → misafirin mikrofonu
  kapanıyor. **Misafir kendisi geri açabilmeli**, sen açamamalısın
- 👤 **Herkesi sustur**
- 👤 **Odadan çıkar** → misafir odadan düşüyor
- Misafir penceresinde bu menüler **hiç görünmemeli**

## 5. Sohbet, tepkiler, el kaldırma

- 👤 İki pencere arasında mesajlaşın → anında gidiyor
- ⚙︎ Sayfayı yenile → geçmiş mesajlar geri geliyor
- 👤 Birine özel mesaj at → sadece o kişi görüyor
- 👤 Emoji tepkisi → ekranda yükselen animasyon, karşıda da görünüyor
- 👤 El kaldır → üst barda sıra kuyruğunda ismin çıkıyor
- Sohbet kapalıyken mesaj gelince düğmede okunmamış rozeti çıkıyor

## 6. Beyaz tahta ve notlar

- ⚙︎ **Beyaz tahta** sekmesi → tahta yükleniyor
- 👤 İki pencereden aynı anda çiz → **birbirinizin çizimini anlık görüyorsunuz**
- 👤 Karşı tarafın imleci renkli nokta + isim olarak görünüyor
- Kalem, çizgi, dikdörtgen, elips, metin, silgi, kaydır — hepsi çalışıyor
- Fare tekerleğiyle yakınlaş/uzaklaş → imlecin olduğu noktaya doğru
- 👤 **Geri al** → sadece **kendi** çizimini geri alıyor, karşınınkini değil
- ⚙︎ Sayfayı tamamen yenile → çizimler geri geliyor
- ⚙︎ **Notlar** sekmesi → yaz, kalın/italik/liste çalışıyor
- 👤 İki pencereden aynı anda yaz → metin çakışmadan birleşiyor, karşının imleci
  görünüyor

## 7. Alt odalar — üç kişi gerekiyor

Sahip + iki misafir (normal + gizli + başka bir tarayıcı).

- ⚙︎ Katılımcılar panelinin altından **Alt odaları aç**, 2 oda, 1 dakika
- 👤 İki misafir ayrı alt odalara dağılıyor, üst barda *"Alt oda 1/2"* ve geri
  sayım çıkıyor. **Sen ana odada kalıyorsun**
- 👤 **Tüm odalara duyuru** yaz → alt odalardaki sohbette görünüyor
- ⚙︎ Süre dolunca **kimse bir şey yapmadan** herkes ana odaya dönüyor
- 👤 Tekrar aç ve **Herkesi geri çağır** → hemen dönüyorlar
- 👤 Alt odaya girmişken mikrofon durumun aynı kalıyor (kapalıysan kapalı)

## 8. Anket ve soru-cevap

- ⚙︎ **Anketler** panelinden yeni anket: soru + en az iki seçenek
- 👤 İki pencereden farklı seçeneklere oy ver → sayılar ve çubuklar güncelleniyor
- ⚙︎ Aynı kişi tekrar oy verirse **oyu değişiyor, eklenmiyor**
- ⚙︎ **Anketi kapat** → oy verilemiyor
- ⚙︎ Soru sor, **destekle** → sayaç artıyor; tekrar bas → geri alınıyor
- ⚙︎ Host **cevaplandı** işaretliyor → soru soluyor ve aşağı iniyor
- Misafir penceresinde anket oluşturma ve cevaplandı işaretleme **görünmemeli**

## 9. Telefon

Gerçek telefondan `http://<bilgisayarının-yerel-ip>:3000` adresine gir
(`pnpm --filter web dev` çıktısında **Network** satırında yazıyor).

- ⚙︎ 375px genişlikte kontrol çubuğu tek satır: mikrofon, kamera, **⋯**, ayrıl
- 👤 **⋯** menüsü açılıyor ve içinde ekran, sohbet, anket, katılımcılar, tepki,
  el kaldır var — *(bunu ben açtıramadım, menü bileşeni sentetik tıklamayla
  açılmıyor; senin dokunuşunla test etmen gerekiyor)*
- 👤 Yan paneller tam ekran açılıyor
- 👤 Beyaz tahtaya parmakla çizebiliyorsun
- 👤 Lobi tek kolona iniyor

## 10. Toplantı sonrası

Bir görüşmeyi bitir ve **beş dakika bekle** — LiveKit boş odayı hemen kapatmıyor,
`emptyTimeout` süresi var. Sonra:

- ⚙︎ `/history` → kapanmış toplantı listede, süresi ve katılımcı sayısı doğru
- ⚙︎ Toplantıya tıkla → katılımcılar giriş/çıkış saatleriyle
- 👤 **Konuşma dağılımı** → çok konuşan üstte, yüzdeler makul
- ⚙︎ Sohbet dökümü o toplantının mesajlarını gösteriyor
- ⚙︎ Beyaz tahta görüntüsü çiziliyor ve üstünde *"odaya bağlıdır, toplantıya
  değil"* uyarısı var
- 👤 Odaya üye olmayan başka bir hesapla `/m/<id>` aç → **404 almalı**

## 11. Planlanmış toplantılar

- ⚙︎ Dashboard'dan **Toplantı planla** → oda, başlık, tarih-saat, süre
- ⚙︎ Liste altta çıkıyor, saat **senin saat diliminde** görünüyor
- ⚙︎ **Takvime ekle** → `.ics` iniyor
- 👤 Dosyayı Google Takvim / Outlook / Apple Takvim'e ekle → **saat doğru**,
  açıklamada oda bağlantısı var
- ⚙︎ **Planı iptal et** → listeden gidiyor

---

## Bilinen sınırlar

Bunlar hata değil, bilinçli kararlar:

- **Kayıt yok.** Faz 3'te kapsam dışı bırakıldı.
- **Uçtan uca şifreleme yok.** Faz 7'de sonraya bırakıldı; anahtar paylaşımı için
  ayrı bir akış ve iki gerçek istemciyle test gerekiyor.
- **PWA yok.** Telefonda düzgün çalışıyor ama ana ekrana eklenemiyor.
- **Beyaz tahta ve notlar odaya bağlı**, toplantıya değil. Geçmiş sayfasında
  gördüğün, o toplantıdaki hâli değil şu anki hâli.
- **Realtime servisi tek replika çalışmalı.** Yjs belgeleri süreç belleğinde
  tutuluyor; ikinci bir replika Redis olmadan aynı tahtayı ayrı ayrı tutar ve
  sessizce ayrışır.
- **Konuşma süresi istemci bildirimi.** Değiştirilmiş bir istemci kendi süresini
  şişirebilir; bu bir grafik, bir yetki değil.
- **Webhook'lar deploy edilmeden çalışmaz.** LiveKit'in bu servise ulaşabilmesi
  gerekiyor. Toplantılar yine de kapanıyor — servis LiveKit'e hangi odaların
  yaşadığını kendisi soruyor — sadece birkaç saniye daha geç.
