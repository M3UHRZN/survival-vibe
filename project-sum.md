# Project Summary

## Snapshot

`Frontier Loop`, Three.js tabanli izometrik 3D survival prototipidir. Proje artik yalnizca
tek oyunculu bir tarayici denemesi degil; `client / server / shared` ayrimina gecmis ve
multiplayer omurgasi `Phase 3: Resource Authority` seviyesine ulasmiştir.

Su anda oyunda:

- oyuncu hareketi (server-authoritative)
- kaynak toplama (server-authoritative — Phase 3)
- hayvan davranislari (client-local, Phase 4 hedefi)
- hasar / can sistemi
- XP / level / upgrade
- build menu ve yapi yerlestirme
- cok oyunculu hareket senkronizasyonu
- cok oyunculu kaynak senkronizasyonu

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
│   ├── core/           ← Phase 3'te eklendi (spawn-generator)
│   ├── data/           ← Phase 3'te eklendi (resource-spawns)
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
- `server/src/rooms/SurvivalRoom.js`: room lifecycle, move + interact mesaji kabul, resource tick
- `server/src/state/player-state.js`: replicate edilen player schema
- `server/src/state/survival-state.js`: room state schema (players + resources)
- `server/src/state/resource-state.js`: replicate edilen resource schema (Phase 3)
- `server/src/systems/movement-system.js`: authoritative hareket hesabi
- `server/src/systems/resource-system.js`: resource init, interact validate, respawn tick (Phase 3)

## Shared Tarafi

- `shared/constants/gameplay.js`: world limit, action speed, move basis, interaction range
- `shared/constants/network.js`: room adi, port, tick ve input rate
- `shared/data/resource-spawns.js`: RESOURCE_DEFINITIONS + RESOURCE_SPAWNS (Phase 3 — tek kaynak)
- `shared/core/spawn-generator.js`: deterministik spawn algoritmasi (Phase 3 — server + client ayni ID uretiyor)
- `shared/messages/message-types.js`: CLIENT_MESSAGE_TYPES + SERVER_MESSAGE_TYPES
- `shared/messages/move-message.js`: move payload normalize etme
- `shared/messages/interact-message.js`: interact payload normalize etme (Phase 3)

## Tamamlanan Gameplay Sistemleri

- Izometrik orthographic kamera ve dead-zone takip
- Procedural kaynak ve hayvan dagilimi
- `Space/E` basili tutarak sabit hizli vurma/toplama
- `attackSpeed` stat'i ve buna bagli upgrade'ler
- XP, level-up ve branch secimi
- Builder / Hunter / Prospector progression
- Build menu ve structure placement

## Tamamlanan Multiplayer Milestone'lar

### Phase 0-2: Movement MVP
- client npm/Vite tabanli hale getirildi
- Colyseus server eklendi
- server-authoritative player movement
- remote player render ve interpolation
- local prediction + reconciliation

### Phase 3: Resource Authority ✅
- `INTERACT` mesaji ile client kaynak hit'i server'a bildiriyor
- Server mesafe + aktiflik dogrulamasi yapiyor
- Server `ResourceState` schema ile (active, health, respawnTimer) replicate ediyor
- Iki farkli oyuncu ayni kaynaga vurursa hasar ortak pool'dan gidiyor
- Server `INVENTORY_CHANGED` event'i ile onaylanan hit'i istemciye bildiriyor
- Kaynak respawn server tarafindan yonetiliyor
- Deterministik spawn algoritmasi `shared/core/spawn-generator.js`'e tasinarak her iki taraf ayni resource ID'leri uretiyor
- Offline (tek oyunculu) fallback korunuyor

## Henuz Server'a Tasinmayan Sistemler

- hayvan AI authority (Phase 4)
- build placement authority (Phase 5)
- inventory authority (Phase 6)
- XP / level / upgrade authority (Phase 6)
- persistence (Phase 7)

Su an resource toplama ve oyuncu pozisyonlari multiplayer'da tutarli ve server-authoritative.
Hayvan davranislari halen client-local.

## Devam Kurallari

- Yeni gameplay sistemi eklenirken once state ownership belirlenmeli.
- Ortak state degistiren her ozellik sonunda server'a tasinacak sekilde tasarlanmali.
- Render kodu ile authority kodu ayni dosyada karistirilmamali.
- Three.js tarafinda `Group`, `Mesh`, `Scene` kompozisyonu ve katman ayrimi korunmali.
- `shared/` altindaki datalar tek kaynak olarak korunmali; client kopyasi olmamali.

## Dogrulama

Bu ozetin yazildigi durumda:

- `npm install` tamamlandi
- server baslatildiginda `http://localhost:2567` dinliyor
- iki farkli sekme/tarayici ile ayni odaya girilip kaynak saldirisi test edildi
- hasar paylasimi (Phase 3) dogru calistigi goruldu

Ana acik risk:

- client build tek chunk olarak buyuyor
- hayvan AI ve combat client-local olmaya devam ediyor
