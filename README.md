# 🐚 99 Noći u Koralu

> ▶️ **Igraj odmah (link):** https://claude.ai/code/artifact/309b801c-63a1-4415-88c7-656a25e5e571
> (privatno na tvom claude.ai nalogu — otvori na tabletu dok si ulogovan, ili klikni *Share* na
> artefaktu pa „bilo ko sa linkom" da otvoriš bez logovanja)

**2D podvodna survival avantura za decu.** Mali dečak preživljava u koralnom svetu:
istražuje, skuplja hranu (korale i školjke), bori se protiv kanto-mačevaca, nalazi signal,
spasava prijatelja **Bublinga**, ukrašava jazbinu i pokušava da preživi noći.

Prototip ima **3 noći**, ali je kod napravljen tako da se lako proširi na pravih **99 noći**.

> Igra radi u svakom modernom web pretraživaču. Sva grafika se crta programski (nema učitavanja
> slika), pa nema „pokvarenih” sličica i radi i offline.

---

## ▶️ Kako se pokreće (na kompjuteru)

**Najlakše:** otvori `dist/index.html` dvoklikom (jedan samostalan fajl, sve unutra).

**Ili** iz foldera pokreni lokalni server (preporučeno, da radi signal/PWA):

```bash
cd 99-noci-u-koralu
python3 -m http.server 8000
# pa otvori http://localhost:8000 u pretraživaču
```

**Da napraviš/obnoviš samostalan fajl** (`dist/index.html`):

```bash
node build.js
```

---

## 📱 Kako da se igra na Android tabletu

Igra je napravljena za tablet: ima **kontrole na ekranu** (džojstik + dugmad), prilagođava se
veličini ekrana i može da radi **offline kao aplikacija (PWA)**.

Tri načina, od najlakšeg:

### 1) Kućni način — server na kompjuteru, tablet na istom WiFi-ju (bez interneta, bez naloga)
```bash
cd 99-noci-u-koralu
python3 -m http.server 8000
```
- Saznaj IP adresu kompjutera (Mac: System Settings → Wi-Fi → Details, npr. `192.168.0.12`).
- Na tabletu otvori Chrome i ukucaj `http://192.168.0.12:8000`.
- Tapni **IGRAJ** (uđe u pun ekran). Za „pravu aplikaciju”: Chrome meni → **Dodaj na početni ekran**.

### 2) Trajno + instalabilno — besplatan hosting (GitHub Pages / Netlify)
- Postavi folder na GitHub Pages ili prevuci ga na [netlify.com/drop](https://app.netlify.com/drop).
- Otvori dobijeni link na tabletu → Chrome → **Dodaj na početni ekran**.
- Sada radi kao app sa ikonicom, u punom ekranu i **offline** (zahvaljujući `sw.js`).
- *(Mogu da ti podesim GitHub Pages — samo reci.)*

### 3) Jedan fajl direktno na tablet
- Kopiraj `dist/index.html` na tablet (USB, Google Drive, email).
- Otvori ga aplikacijom za fajlove koja ume da otvori HTML u Chrome-u.
- *(Najmanje pouzdano — Android ponekad teško otvara lokalne fajlove; ako zapne, koristi način 1 ili 2.)*

### APK (napredno)
PWA se može „upakovati” u pravi `.apk` pomoću [PWABuilder](https://www.pwabuilder.com/) ili
Bubblewrap-a, ako želiš instalaciju kao iz prodavnice.

---

## 🎮 Kontrole

| Akcija | Tastatura | Tablet (na ekranu) |
|---|---|---|
| Kretanje | WASD / strelice | levi džojstik (prevuci prstom) |
| Trčanje | Shift (ili gurni džojstik do kraja) | gurni džojstik do kraja |
| Napad kopljem | Space | dugme **NAPAD** |
| Interakcija / spasi | E | dugme **E** |
| Jedi hranu | F | dugme **JEDI** |
| Signal (nađi prijatelja) | Q | dugme **SIGNAL** |
| Inventar | Tab | dugme 🎒 |
| Ukrasi jazbinu | B | dugme ✨ (vidi se u jazbini) |
| Pauza | Esc | dugme ⏸ |

---

## 🎯 Cilj (demo pobeda) i poraz

**Pobediš ako:** preživiš 3 noći • spasiš Bublinga • postaviš bar 1 ukras u jazbini • ostaneš živ.

**Izgubiš ako:** ti zdravlje padne na 0 (od neprijatelja, bossa **ili gladi**).

**Osnovna petlja:** istraži → nađi korale 🪸 / školjke 🐚 → jedi (F) da ne ogladniš → bori se i
skupljaj signal 📡 → prati strelicu do kaveza → pobedi čuvare i spasi prijatelja (E) →
vrati ga u jazbinu → ukrasi jazbinu (B) → preživi noći.

---

## ✅ Šta je implementirano (prototip)

- 2D mapa sa kamerom koja prati igrača, pesak/voda/koralni dekori
- Glavni junak (dečak sa kopljem) — hodanje, trčanje, napad
- Kružna **jazbina** kao bezbedna zona (neprijatelji i boss ne mogu unutra; tu se isceljuješ)
- Tri statusa: **Zdravlje**, **Glad** (glavna mehanika), **Energija** — sa pravilima iz opisa
- Hrana: **korali** (+15 gladi) i **školjke** (+35 gladi, +20 energije), jedenje (F)
- Inventar (Tab) sa hranom i resursima (alge, kamen, token)
- Obični neprijatelji: **Kanto Mačevci** (patrola, juriš, napad, plen)
- Boss: **Morski Grgo (Basso Medo)** — juriš, ugriz, boss-bar; pobeda nad njim je bonus
- Borba kopljem (luk udarca), efekti, blagi „crtani” poraz neprijatelja (bez krvi)
- **Signalni zadatak**: prvi poraženi neprijatelj ispušta signal → Q pokazuje strelicu do prijatelja
- Jedan zarobljeni prijatelj **Bubling** + spasavanje (pobedi čuvare → E na kavezu → vrati kući)
- **Dan/noć ciklus** (3 noći; noću su neprijatelji brži i ima ih više; glad brže opada)
- HUD (avatar, srca, energija, traka gladi, brojač noći, resursi, strelica zadatka, boss-bar, poruke)
- Ukrašavanje jazbine (B) — postavljanje dekoracija uz cenu u resursima
- Win / lose ekrani sa razlogom poraza
- **Kontrole na ekranu (multi-touch) + responsivno + PWA/offline** za tablet
- Mini zvučni efekti (WebAudio)

---

## 🧱 Arhitektura koda

```
99-noci-u-koralu/
├── index.html              # ulaz (učitava skripte redom; PWA meta)
├── css/style.css           # full-screen, bez skrolovanja/zumiranja (za tablet)
├── js/
│   ├── config.js           # SVE podesive vrednosti (balans) — npr. dayNight.totalNights
│   ├── utils.js            # matematika/pomoćno
│   ├── art.js              # programsko crtanje svih likova/objekata (stil asset sheet-ova)
│   ├── input.js            # tastatura + multi-touch (džojstik + dugmad na platnu)
│   ├── world.js            # mapa, pozadina (offscreen), jazbina, zone hrane, kavez
│   ├── entities.js         # Player, Enemy, Boss, Friend, Pickup (kretanje + AI + borba)
│   ├── systems.js          # Hunger/Stamina/Health, Inventory, Food, DayNight, Quest, Rescue, Decoration
│   ├── ui.js               # UIManager: HUD, kontrole, ekrani (start/pauza/inventar/win/lose)
│   └── game.js             # GameManager: petlja, povezivanje, spawn, win/lose, kamera, zvuk
├── assets/
│   ├── icon.svg            # ikonica aplikacije (PWA)
│   └── reference/          # originalni asset sheet-ovi (za buduće prave sprite-ove)
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # service worker (offline)
├── build.js                # pravi dist/index.html (jedan samostalan fajl)
└── dist/index.html         # generisani build za prenos/hosting
```

Svi sistemi su modularni; logika je odvojena od crtanja. Balans se menja samo u `config.js`.

---

## 🚀 Sledeći koraci ka punoj igri (99 noći)

1. **99 noći:** u `config.js` postavi `dayNight.totalNights = 99` (i prilagodi dužine dana/noći).
2. **Više prijatelja:** Kora (hobotnica), Šiljo (jež), Perla (školjka-lekar), Flopsi (krastavac)
   — svaki sa svojim kavezom i mini-zadatkom; lista u `entities.js`/`world.js`.
3. **Pravi sprite-ovi:** zameni programsko crtanje u `art.js` sečenjem sheet-ova iz `assets/reference/`.
4. **Više vrsta neprijatelja i varijacija bossa**, jače noći, talasi napada.
5. **Razvoj jazbine:** više ukrasa, krevet za spavanje (preskakanje noći), skladište resursa.
6. **Crafting/alat:** koplje se nadograđuje, signalna kaciga, mehur-signal.
7. **Čuvanje napretka** (localStorage), izbor jezika, muzika.
8. **Mapa/kompas, više biоma** (plići teren, dublji kanali, špilje).

---

## 🎨 Asseti

Originalni asset sheet-ovi (karakter, ekspresije, animacije, HUD, propsovi, neprijatelji, boss,
prijatelji, okruženje) nalaze se u `assets/reference/`. Korišćeni su kao **stilski vodič** — likovi
u prototipu su nacrtani programski u istom duhu (vedar crtani stil, paleta mora). Imena likova su
inspirisana, ne kopirana.
