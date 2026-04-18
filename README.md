# Frontier Loop

Three.js ile yazilan izometrik 3D survival prototipi. Proje `client / server / shared`
ayrimina gecmis durumda. Multiplayer omurgasi Phase 3 (Resource Authority) seviyesine ulasti.

## Calistirma

```bash
npm install
```

Server:

```bash
npm run dev:server
```

Client:

```bash
npm run dev:client
```

Varsayilan adresler:

- Client: `http://localhost:5173`
- Server: `http://localhost:2567`
- Health: `http://localhost:2567/health`

Production build:

```bash
npm run build:client
```

## Kontroller

- `WASD` / ok tuslari: hareket
- `Shift`: sprint
- `Space` veya `E`: basili tut, sabit vurus hiziyla topla / vur
- `B`: build menu
- `Esc`: build menu kapat
- `R`: local run reset

## Mevcut Mimari

```text
gemini-play/
├── client/   # Vite + Three.js istemci
├── server/   # Colyseus authoritative server
├── shared/   # Ortak gameplay/network sabitleri ve mesaj contractlari
├── README.md
├── project-sum.md
└── network-plan.md
```

Client tarafinda:

- `client/src/game.js`: oyun orkestrasyonu
- `client/src/world/`: dunya, kaynaklar, hayvanlar, remote player render
- `client/src/entities/`: player, animal, resource, structure, remote-player
- `client/src/ui/`: HUD, level-up overlay, build menu
- `client/src/network/network-client.js`: Colyseus baglantisi, room state callback'leri, input gonderimi

Server tarafinda:

- `server/src/index.js`: Colyseus bootstrap
- `server/src/rooms/SurvivalRoom.js`: room lifecycle ve input kabul katmani
- `server/src/state/`: oyuncu ve room state schema'lari
- `server/src/systems/movement-system.js`: authoritative hareket hesabi

Shared tarafinda:

- `shared/constants/gameplay.js`: dunya limiti, hareket hizi, izometrik move basis, interaction range
- `shared/constants/network.js`: room adi, tick ve input hizlari
- `shared/data/resource-spawns.js`: RESOURCE_DEFINITIONS + RESOURCE_SPAWNS (tek kaynak, Phase 3)
- `shared/core/spawn-generator.js`: deterministik spawn algoritmasi (Phase 3)
- `shared/messages/`: move + interact mesaji ve message type sabitleri

## Multiplayer Durumu

Bu surumde aktif olan network omurgasi:

**Phase 0-2 — Movement MVP:**
- Colyseus room bootstrap
- `join / leave`
- server-authoritative player movement
- local input -> server message akisi
- server state replication
- remote player render
- local prediction + reconciliation
- remote player interpolation

**Phase 3 — Resource Authority ✅:**
- `INTERACT` mesaji ile hit server'a iletiliyor
- Server mesafe + aktiflik dogrulamasi yapiyor
- `ResourceState` (active, health, respawnTimer) Colyseus ile tum client'lara replicate ediliyor
- Iki oyuncu ayni kaynaga vurursa hasar ortak pool'dan gidiyor
- Server `INVENTORY_CHANGED` event'i ile onaylanan hit'te yield bildiriyor
- Kaynak respawn server yonetiyor
- Offline / tek oyunculu fallback korunuyor

Henuz server-authoritative olmayan kisimlar:

- hayvan AI ve hasar (Phase 4)
- build placement (Phase 5)
- inventory, XP, level, upgrade (Phase 6)

## Oyun Icerigi

- Kaynaklar: agac, kaya, altin
- Hayvanlar: inek, koyun, kurt, ayi
- Progression: XP, level-up, universal/path upgrade secimleri
- Build path'leri: Builder, Hunter, Prospector
- Build menu: `Campfire`, `Storage Crate`, `Workbench`, `Snare Trap`, `Smelter`

## Mimari Kurallar

- Yeni ozellikler tek dosyada buyutulmez.
- Three.js scene graph yapisi `Scene`, `Group`, `Mesh`, `Light`, `Camera` kompozisyonu ile korunur.
- Ortak state'i etkileyen her yeni sistem server-authoritative dusunulerek eklenir.
- Client render/input/HUD tarafinda kalir; authority server'a dogru tasinmaya devam eder.

## Son Dogrulama

Bu migration sonrasi su kontroller yapildi:

- tum `client/`, `server/`, `shared/` `.js` dosyalari `node --check` ile gecti
- `npm install` basarili tamamlandi
- `npm run build:client` basarili tamamlandi
- server bootstrap kisa sureli baslatilip `http://localhost:2567` uzerinde dinledigi goruldu

Build cikti boyutunda Vite chunk uyarisi var; bu bir bloklayici degil, ama ileride code-splitting
ile toparlanabilir.
