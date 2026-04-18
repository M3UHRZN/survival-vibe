# Network Plan

## Goal

Bu dokumanin amaci, mevcut tek oyunculu `Three.js` survival prototipini
kontrollu sekilde cok oyunculu hale getirmek icin uygulanabilir bir plan
tanimlamaktir.

Hedef:

- Server-authoritative multiplayer
- Oda bazli oyun oturumlari
- Oyuncu hareketi ve ortak dunya state senkronizasyonu
- Kaynak, NPC, build placement, inventory ve XP gibi sistemlerin server
  tarafinda dogrulanmasi

Bu plan, "once ozellik sonra network" yaklasiminin yaratacagi teknik borcu
engellemek icin yazildi.

## Chosen Direction

## Recommended Stack

- Client: mevcut `Three.js` oyun istemcisi
- Server: `Node.js`
- Realtime layer: `Colyseus`
- State authority: server
- Transport: WebSocket tabanli Colyseus room baglantisi

## Why Colyseus

Bu proje icin `Colyseus` secilmesinin nedeni:

- Room mantigi ile survival session yapisina uygun olmasi
- Server state senkronizasyonunu oyun odakli sekilde sunmasi
- Tick/simulation interval mantigi ile NPC, kaynak, combat ve build
  sistemlerine uygun olmasi
- Socket.IO veya `ws` gibi daha dusuk seviye araclara gore daha az altyapi
  kodu gerektirmesi

## Why Not Socket.IO First

`Socket.IO` kotu oldugu icin degil, bu proje icin daha fazla manuel is
gerektirdigi icin ikinci tercih.

Socket.IO ile su yapilari bizim yazmamiz gerekir:

- room state ownership
- patch / replication mantigi
- oyuncu lifecycle yonetimi
- state conflict cozumleri
- snapshot / delta stratejileri

Bu tip survival oyunda bunlari sifirdan yazmak gereksiz maliyet olur.

## High-Level Architecture

Planlanan yapi:

```text
gemini-play/
├── client/          # Three.js istemci
├── server/          # Colyseus sunucu
├── shared/          # Ortak sabitler / mesaj tipleri / state contractlari
└── docs/            # Teknik notlar (opsiyonel)
```

## Important Decision Before Networking

Su anki client dogrudan CDN tabanli ES modules ile calisiyor.

Network implementasyonundan once alinmasi gereken pratik karar:

### Decision: client npm tabanli hale gecmeli

Oneri:

- Client tarafini `Vite` veya benzeri hafif bir build araci ile npm tabanli
  hale getirmek

Neden:

- `colyseus.js` istemci paketini temiz kullanmak
- `shared/` altindaki ortak tipleri veya sabitleri kullanabilmek
- Multiplayer buyudukce CDN-temelli daginik import yapisindan kurtulmak

Bu, network fazindan once yapilmasi gereken en mantikli teknik duzenlemedir.

## Server Authority Rules

Asagidaki sistemler server tarafinda authoritative olacak:

- oyuncu pozisyonu
- kaynak hit ve depletion
- hayvan davranisi ve hasari
- build placement sonucu
- inventory artisi / eksilisi
- XP, level, upgrade

Client tarafinda kalacak seyler:

- input toplama
- kamera
- animasyonlar
- HUD
- interpolation / rendering
- tahmini hareket gorsellestirmesi

Temel kural:

- client "yaptim" demez
- client "bunu yapmak istiyorum" der
- server "oldu / olmadi / state su" cevabini verir

## State Ownership Plan

## Server State

Server room state icinde tutulacak ana alanlar:

- `players`
  - session id
  - display name
  - x, y, z
  - rotation
  - hp
  - inventory
  - xp
  - level
  - selected path
  - unlocked tools
  - unlocked recipes
- `resources`
  - id
  - type
  - position
  - active
  - health
  - respawn timer
- `animals`
  - id
  - type
  - position
  - hp
  - ai state
  - target / aggro
  - respawn timer
- `structures`
  - id
  - type
  - owner session id
  - position
  - rotation
  - createdAt
- `room meta`
  - world seed
  - tick
  - match started

## Client Local State

Client'ta tutulacak local state:

- local input buffer
- render entity cache
- interpolation buffer
- camera state
- gecici UI state
- build menu acik/kapali

## Networking Model

## Connection Model

Her oyuncu:

1. client acilir
2. lobby veya room secilir
3. Colyseus room'a baglanir
4. sunucu full state snapshot yollar
5. bundan sonra state patch / event akisi baslar

## Tick Model

Onerilen baslangic:

- server simulation tick: `10-20 Hz`
- client render tick: `requestAnimationFrame`
- movement replication: input gonderimi + server reconciliation

Baslangic icin pratik secim:

- server simulation: `15 Hz`
- client input send: `10-15 Hz`

Bu ilk faz icin yeterlidir. Daha sonra ihtiyaca gore arttirilir.

## Message Model

Client -> Server:

- `move`
  - input axes
  - sprint flag
  - seq number
- `interact`
  - target id
  - action type
- `build_request`
  - recipe id
- `upgrade_select`
  - upgrade id

Server -> Client:

- room state patch
- `action_rejected`
- `damage_taken`
- `inventory_changed`
- `level_up_choices`
- `build_placed`

Not:

- Surekli degisen ortak state icin Colyseus state sync
- Anlik olaylar icin mesaj/event

## Rollout Phases

## Phase 0: Client Preparation

Amaç:

- Client'i multiplayer'a hazirlamak

Yapilacaklar:

1. Mevcut client yapisini `client/` altina tasimak
2. CDN tabanli import yapisini npm/Vite tabanli hale getirmek
3. `shared/` klasoru icin temel iskelet kurmak
4. State ve entity olusturma kodunda "local player" ile "remote player"
   ayrimini baslatmak

Teslim:

- Proje npm tabanli calisir
- Mevcut tek oyunculu davranis bozulmadan devam eder

## Phase 1: Server Bootstrap

Amaç:

- Colyseus sunucu iskeletini kurmak

Yapilacaklar:

1. `server/` altinda Node.js projesi acmak
2. Colyseus room iskeletini kurmak
3. Basit room state tanimlamak
4. `join/leave` akisini calistirmak
5. Client'tan room'a baglanmayi saglamak

Teslim:

- Oyuncu room'a baglanabilir
- Server oyuncu listesi tutar
- Client baglanti durumunu bilir

## Phase 2: Multiplayer Movement MVP

Amaç:

- Birden fazla oyuncunun ayni dunyada gorunmesi

Yapilacaklar:

1. Local input server'a gonderilir
2. Server oyuncu hareketini hesaplar veya dogrular
3. Server tum oyuncu pozisyonlarini replicate eder
4. Client remote player entity render eder
5. Interpolation eklenir

Teslim:

- 2+ oyuncu ayni dunyada dolasir
- Remote movement yumusak gorunur

Not:

- Bu ilk multiplayer milestone olmalidir

## Phase 3: Resource Authority

Amaç:

- Kaynak dugumlerinin ortak state haline gelmesi

Yapilacaklar:

1. Resource spawnlari server state'e tasinir
2. Client interact istegi gonderir
3. Server target ve mesafeyi dogrular
4. Server resource health / depletion / respawn hesaplar
5. Inventory artisi server tarafinda uygulanir

Teslim:

- Iki oyuncu ayni agaci ayni anda kesmeye calistiginda tek dogru sonuc cikar

## Phase 4: Animal / Combat Authority

Amaç:

- NPC ve combat state'ini server'a almak

Yapilacaklar:

1. Animal AI loop server tarafina gecir
2. Aggro, chase, flee ve attack server'da hesaplanir
3. Damage, death, loot ve respawn server'da hesaplanir
4. Client sadece goruntu ve animasyonu uygular

Teslim:

- Hayvan davranislari tum oyuncular icin ortak ve tutarli olur

## Phase 5: Build System Authority

Amaç:

- Yapilarin ortak dunyada kalici ve tutarli olmasi

Yapilacaklar:

1. Build request server'a gider
2. Recipe unlock ve inventory maliyeti server'da kontrol edilir
3. Placement collision server'da hesaplanir
4. Structure room state'e eklenir
5. Tum client'lar yapiyi gorur

Teslim:

- Ayni yere iki client ayni anda yapi koyamaz

## Phase 6: Progression Authority

Amaç:

- XP, level ve upgrade secimlerini server'a almak

Yapilacaklar:

1. XP kaynagi server state'ine baglanir
2. Level-up server'da hesaplanir
3. Upgrade choice event ile client'a bildirilir
4. Upgrade sonucu server state'e yazilir

Teslim:

- Client tarafinda XP veya level hilesi ile state bozulamaz

## Phase 7: Persistence

Amaç:

- Oyun verisini oturum disinda saklamak

Yapilacaklar:

1. Auth modeli belirlemek
2. Oyuncu profili ve progression kaydini eklemek
3. Room bazli kalici structure/state stratejisi belirlemek

Bu faz ilk multiplayer icin zorunlu degil.

## Recommended First Milestone

Simdi yapilacak ilk network milestone su olmali:

### Milestone A

- Colyseus server ayaga kalksin
- Client room'a baglansin
- Iki oyuncu ayni dunyada birbirini gorsun
- Movement sync calissin
- Remote players interpolation ile yumusak gorunsun

Bu milestone tamamlanmadan:

- resource authority
- build authority
- NPC authority

eklenmemeli.

## Folder Plan

Onerilen hedef yapi:

```text
gemini-play/
├── client/
│   ├── src/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── rooms/
│   │   ├── state/
│   │   └── systems/
│   └── package.json
├── shared/
│   ├── constants/
│   ├── messages/
│   └── types/
├── README.md
├── project-sum.md
└── network-plan.md
```

## Server Module Plan

Server tarafinda beklenen moduller:

- `rooms/SurvivalRoom`
  - room lifecycle
  - onJoin / onLeave / onMessage
- `state/`
  - player schema
  - resource schema
  - animal schema
  - structure schema
- `systems/movement`
- `systems/resources`
- `systems/animals`
- `systems/building`
- `systems/progression`

Bu, mevcut client moduler yapisiyla uyumludur.

## Risks

## 1. Simdi network eklerken client mantigini cift yerde tutmak

Risk:
- Ayni gameplay kurallarini hem client hem server tarafinda farkli sekilde
  yazmak

Cozum:
- Kurallarin sahibi server olacak
- Client sadece prediction / presentation yapacak

## 2. CDN tabanli client ile shared contract yurutmek

Risk:
- Ortak tiplerin dagilmasi ve surum sapmasi

Cozum:
- Client'i npm tabanli yap

## 3. Tum sistemleri bir anda network yapmak

Risk:
- Debug zorlasir
- Sorun kaynagi belirsizlesir

Cozum:
- Phase sirasi korunmali
- Once movement multiplayer
- Sonra ortak dunya state

## Non-Goals For First Network Iteration

Ilk network iterasyonda bunlar hedef degil:

- auth
- kalici database
- matchmaking
- anti-cheat'in ileri seviyeleri
- voice/chat
- large-scale shard/world streaming

Ilk hedef:

- calisan authoritative multiplayer temelini kurmak

## Practical Next Step

Bir sonraki uygulama adimi olarak su yapilmali:

1. Client tarafini npm/Vite tabanli hale getir
2. `server/` altinda Colyseus bootstrap kur
3. Basit `SurvivalRoom` ac
4. `players` state'i senkronize et
5. Remote player render ekle

Bu adim tamamlandiginda proje tek oyunculu prototipten gercek multiplayer
altyapisina gecmis olacak.
