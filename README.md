# crypto-tracking

🚀 Uygulamanın Amacı Ne?
Bu uygulama şunları yapar:

👤 Kullanıcı girişi / kayıt yapabilir (isim, şifre, telefon).

📈 Kripto para (örnek: BTC, ETH) için fiyat, miktar ve bildirim tercihleri girebilir.

📊 Fiyatlar bir dosyada saklanır ve ZeroMQ ile dağıtılır (yayıncı abone sistemi).

🔔 Fiyat belirli sınırların altına veya üstüne çıkarsa Twilio ile SMS gönderilir.

💻 Ayrıca terminalden fiyatları elle değiştirebilirsin.

🔧 Hangi Parçalar Var?
1. subscribers.json
Kullanıcı verilerini saklar: kullanıcı adı, şifre, telefon numarası, coin ayarları vs.

2. coins.json
Tüm coin'lerin en son fiyatlarını içerir.

3. publisher.js
Kripto fiyatlarını 5 saniyede bir otomatik günceller.

Ayrıca terminalden elle fiyat girerek coin güncelleyebilirsin.

Güncellenen fiyatları coins.json dosyasına yazar ve ZeroMQ ile yayar.

📦 Nasıl çalışıyor?

Terminalde:

`node publisher.js`

Örnek çıktı:
`Publisher bound to port 3001
Enter a crypto symbol (e.g., BTC, ETH) to update its price: BTC
Enter new price for BTC: 59000
Updated BTC price to: 59000
`

Eğer coin daha önce yoksa otomatik olarak eklenir:
`Coin symbol not recognized. Adding new coin...`

4. subscriber.js
ZeroMQ'dan gelen coin güncellemelerini dinler.

Her kullanıcı için isSmallerThan veya isBiggerThan kontrol eder.

Gerekirse Twilio ile SMS gönderir.


💡 Uygulama Nasıl Çalıştırılır?
Node.js yüklü olmalı.
→ İndirmek için: https://nodejs.org

Gerekli modülleri yükle:
`npm install zeromq fs readline`

(ve eğer Twilio kullanılacaksa: npm install twilio)

coins.json ve subscribers.json adında iki dosya oluştur.

publisher.js dosyasını başlat:
`node publisher.js`

Konsoldan coin sembolü girerek fiyatı değiştirebilirsin.

Otomatik olarak her 5 saniyede bir fiyatlar da güncellenir ve ZeroMQ ile yayınlanır.

📱 Ek Özellik: Twilio SMS
Sen abone sistemine bağlanan subscriber.js dosyası yazarsan, Twilio üzerinden SMS de gönderilebilir.

🎨 1. HTML Kullanıcı Arayüzü (Giriş, Kayıt, Coin Takibi)
📁 Dosya: client.html
Kullanıcının giriş yapabileceği, kayıt olabileceği ve kripto para takibi yapabileceği basit bir arayüz:

🧠 2. manualPublisher.js (Elle fiyat girme + otomatik ekleme)
📁 Dosya: manualPublisher.js
Bu dosya:

Konsoldan coin adı ister.

Eğer coin yoksa otomatik ekler.

Yeni fiyat ister, günceller.

coins.json dosyasına yazar.

ZeroMQ ile coin güncellemesini yayınlar.

🛠 Nasıl Çalıştırılır?
Gerekli paketleri yükle:
`npm install zeromq fs readline`

coins.json adında bir dosya oluştur:
`[]`

Terminalde manualPublisher.js dosyasını çalıştır:
`node manualPublisher.js`


Sana şu şekilde sorular sorar:

`🔹 Coin sembolü girin (örnek: BTC):
BTC
💰 Yeni fiyatı girin (BTC): 
59000
✅ BTC fiyatı güncellendi: 59000
`

Bu fiyatı coins.json dosyasına kaydeder ve ZeroMQ ile yayar.

✅ .env Dosyası Örneği
Bu örnek, Twilio ile SMS gönderimi, ZeroMQ portu, ve diğer temel bilgileri içerir:
1. Paket Kurulumu
`npm install dotenv
`

2. Uygulamanın Başında .env Yükle
Her .js dosyasının en üstüne şunu ekle:
`require('dotenv').config();`

3. .env

`
TWILIO_SID=xxx
TWILIO_AUTH=xxx
TWILIO_FROM=+xxx
`
