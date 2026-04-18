# Project Summary

## Snapshot

`Frontier Loop`, Three.js tabanli izometrik 3D survival prototipidir. Proje artik yalnizca
tek oyunculu bir tarayici denemesi degil; `client / server / shared` ayrimina gecmis ve ilk
multiplayer omurgasi kurulmus durumdadir.

Su anda oyunda:

- oyuncu hareketi
- kaynak toplama
- hayvan davranislari
- hasar / can sistemi
- XP / level / upgrade
- build menu ve yapi yerlestirme
- cok oyunculu hareket senkronizasyonu

vardir.

## Ana Mimari Kararlar

### 1. Three.js render tarafinda kullaniliyor

- `Three.js` sahne, kamera, mesh, isik ve world composition icin kullaniliyor.
- Inventory, AI, progression ve multiplayer authority mantigi oyun kodunda ayrik modullerle yaziliyor.

### 2. Tek script yerine moduler yapi

- Kod tek dosyada buyutulmuyor.
- `game`, `world`, `entities`, `ui`, `core`, `network`, `server systems`, `shared constants`
  ayrimi korunuyor.

### 3. Shared contract ayrimi

- Client ve server ayni movement basis, world limit ve message shape'lerini `shared/` altindan
  kullaniyor.
- Bu, network eklendikce kural sapmasini azaltmak icin secildi.

### 4. Server-authoritative yon

- Multiplayer katmaninda client sonucu dayatmiyor.
- Client input gonderiyor.
- Server hareketi hesaplayip state'i replicate ediyor.
- Diger ortak sistemler de asamali olarak ayni yone tasinacak.

## Guncel Dosya Yapisi

```text
gemini-play/
├── client/
│   ├── main.js
│   ├── index.html
│   ├── styles.css
│   ├── package.json
│   ├── vite.config.js
│   └── src/
├── server/
│   ├── package.json
│   └── src/
├── shared/
│   ├── constants/
│   └── messages/
├── README.md
├── project-sum.md
└── network-plan.md
```

## Client Tarafi

- `client/src/game.js`: ana loop, UI akislari, local gameplay, network entegrasyonu
- `client/src/world/world.js`: terrain, resource, animal, structure ve remote player katmanlari
- `client/src/network/network-client.js`: Colyseus client, room callbacks, snapshot cache, input send
- `client/src/entities/player.js`: local oyuncu hareket ve mesh
- `client/src/entities/remote-player.js`: remote oyuncu interpolation/render
- `client/src/ui/`: HUD, upgrade overlay, build menu

## Server Tarafi

- `server/src/index.js`: Colyseus server bootstrap
- `server/src/rooms/SurvivalRoom.js`: room lifecycle, move message kabul, player join/leave
- `server/src/state/player-state.js`: replicate edilen player schema
- `server/src/state/survival-state.js`: room state schema
- `server/src/systems/movement-system.js`: authoritative hareket hesabi

## Shared Tarafi

- `shared/constants/gameplay.js`: world limit, action speed, move basis
- `shared/constants/network.js`: room adi, port, tick ve input rate
- `shared/messages/message-types.js`: message id'leri
- `shared/messages/move-message.js`: move payload normalize etme

## Tamamlanan Gameplay Sistemleri

- Izometrik orthographic kamera ve dead-zone takip
- Procedural kaynak ve hayvan dagilimi
- `Space/E` basili tutarak sabit hizli vurma/toplama
- `attackSpeed` stat'i ve buna bagli upgrade'ler
- XP, level-up ve branch secimi
- Builder / Hunter / Prospector progression
- Build menu ve structure placement

## Tamamlanan Multiplayer Milestone

`network-plan.md` icindeki ilk hedef uygulanmis durumda:

- client npm/Vite tabanli hale getirildi
- Colyseus server eklendi
- client room'a baglanabiliyor
- server player state tutuyor
- local input server'a gonderiliyor
- server hareketi hesapliyor
- remote player'lar ayni dunyada gorunuyor
- local oyuncu server state ile reconcile ediliyor

Bu, planlanan `Movement Multiplayer MVP` milestone'una karsilik gelir.

## Henuz Server'a Tasinmayan Sistemler

- kaynak dugumu authority
- hayvan AI authority
- build authority
- inventory authority
- XP / level / upgrade authority
- persistence

Su an bu sistemler client-local kaldigi icin multiplayer davranisi sadece oyuncu pozisyonlarinda
ortak ve tutarlidir.

## Devam Kurallari

- Yeni gameplay sistemi eklenirken once state ownership belirlenmeli.
- Ortak state degistiren her ozellik sonunda server'a tasinacak sekilde tasarlanmali.
- Render kodu ile authority kodu ayni dosyada karistirilmamali.
- Three.js tarafinda `Group`, `Mesh`, `Scene` kompozisyonu ve katman ayrimi korunmali.

## Dogrulama

Bu ozetin yazildigi durumda:

- `npm install` tamamlandi
- `npm run build:client` gecti
- server bootstrap lokal olarak acildi
- tum JS dosyalari syntax kontrolunden gecti

Ana acik risk:

- client build tek chunk olarak buyuyor
- authority henuz sadece movement katmaninda
