# Open City — Basic Edition

A GTA-style open-world game that runs entirely in the browser. Swing across a
10×10-block city on webs, drive, fly, sail the harbor, take jobs, run crimes
and play dozens of minigames. Built with [Three.js](https://threejs.org/) and
plain JavaScript modules: no build step, no npm dependencies.

- **Version:** 0.1.0 (Basic edition)
- **Engine:** Three.js 0.170.0, loaded from jsDelivr
- **Runs on:** desktop browsers (keyboard + mouse or gamepad) and phones (touch
  controls; installable as an app)

---

## Quick start

Requirements: **Node.js 20 or newer** and an internet connection on first load
(Three.js and its 3D-model decoder come from the jsDelivr CDN).

```sh
npm start
```

Then open **http://localhost:8082**.

- Set a different port with `PORT=9000 npm start`.
- The server listens on `127.0.0.1` only and serves just the files listed in
  `release-files.json`.
- After the first visit a service worker caches the page and scripts, so the
  game keeps working offline.

### Hosting it online

The game is plain static files, so any static host works, including GitHub
Pages. All paths are relative, so it runs from a domain root or from a
subfolder such as `https://<user>.github.io/OpenCity/`.

For GitHub Pages: repository **Settings → Pages**, choose **Deploy from a
branch**, pick `main` and `/ (root)`, and save. The `.nojekyll` file is
already in the repository, so Pages serves the files as they are.

On the start screen, pick a save slot and a character (**WEAVER** balanced,
**BOLT** fast, **BRICK** tough), then press **FREE ROAM** or **STORY**.

---

## Controls

| Key | Action |
|---|---|
| **W A S D** | Move · drive · fly |
| **Mouse** | Look / aim |
| **Left click** | Shoot |
| **Right click** | Hold to web-swing · tap to zip up |
| **Ctrl** | Aim |
| **Mouse wheel**, **1–3**, **X** | Change weapon |
| **Space** | Jump · helicopter up |
| **Shift** | Sprint · nitro · helicopter down |
| **E** | Enter/exit vehicles · use, start or interact |
| **F** | Punch combo · air web-dash |
| **Q** | Web-shot (press again to yank) |
| **C** | Super-jump |
| **T** | Trampoline |
| **J** | Jetpack (once bought) |
| **Z** | REX the dog bites on command |
| **Y** | Bribe a cop |
| **H** | Start the arena (at the stadium) |
| **B** | Buy a property under a green beam |
| **M** | Map (click a spot to set a waypoint) |
| **L** | Legend completion board |
| **O** | Instant replay of the last 20 seconds |
| **G** | Screenshot |
| **F2** | First / third person |
| **F4** | Vehicles & city services |
| **Shift+K** | Bank |
| **P** | Pause |

- **Phones:** left joystick moves, drag the screen to look. Only core buttons
  show; tap **⋯** for the map, pause, jetpack, REX and more. The buttons change
  when you're driving.
- **Gamepad:** supported.
- **Accessibility** (Pause → ♿ Accessibility): rebindable keys, colour-blind
  minimap palettes, reduced motion, aim assist and HUD scaling, plus an FPS
  meter and an automatic performance governor.

---

## The city

- **Spider traversal:** web-swing, zip to rooftops, wall-run, web-parachute,
  trampolines and a style meter that pays cash.
- **Drive, fly and sail:** cars, motorbikes, helicopters, a seaplane, speedboats
  and a jet-ski. Each vehicle has its own fuel tank: hold **E** beside a petrol
  pump to refill at $2/L. Nitro, stunt ramps and garage tuning (respray, engine,
  armor, nitro).
- **Combat:** pistol, machine gun, shotgun, sniper, RPG, grenades, melee combos,
  web-yank finishers and a dodge roll.
- **Heat:** a 5-star wanted level: cops, then drones, SWAT and finally an army
  tank you can steal.
- **A living city:** day/night, five weather states (clear, cloudy, rain, storm,
  fog), pedestrians who remember what you did, a news ticker that reports it,
  and persistent street damage after a firefight.
- **Landmarks:** the 150 m Spire, the stadium, central park and the harbor past
  the east edge.

### Jobs

| Job | Where / how |
|---|---|
| **City Line bus** | CITY LINE depot; bring a vehicle, run a five-stop loop |
| **Sanitation run** | SANITATION yard; empty the bins before the clock runs out |
| **City Tow** | CITY TOW yard; hook a flagged car, haul it to impound |
| **Postal run** | POST OFFICE; five addresses on a timer |
| **Pizza delivery** | PIZZA shop |
| **Taxi, air taxi, water taxi** | Fares come to you in a car, a helicopter or any boat |
| **Lifeguard rescue** | Tower on the beach; swim or boat out, tow swimmers to shore |
| **Cat rescue** | Lost-pets board by spawn; fetch a cat stranded on a rooftop |
| **Billboard hacker** | NETRUNNER stand by spawn; hack four rooftop billboards on one clock |
| **Taco Loco food truck** | Taco truck by spawn; serve a 75-second lunch rush with keys 1–4, tips for speed |
| **Bomb squad** | A device is planted somewhere in the city; reach it and hold E to defuse |
| **Ambulance, fire, cop career, vigilante, bounty hunting** | Classic city jobs |

### Activities and minigames

- **Night out:** a fireworks show from the harbor barge (20:00–02:00), a
  fairground with a ferris wheel and strongman bell, karaoke, darts and pool at
  the corner bar, the nightclub and a bare-knuckle fight club.
- **Games:** pinball, Strike Lanes bowling, an archery range, a go-kart circuit,
  golf, chess, the arcade, and blackjack, slots, roulette and poker at the
  Lucky 7.
- **Thrills:** a bungee crane, BASE jumps off the Spire, skydiving, wingsuit,
  ziplines, a hot-air balloon, golden sky hoops and stunt ramps.
- **Races:** street circuits, harbor boat races, a rooftop swing trial and a
  racing championship across the circuits.
- **Beach:** a metal-detector treasure hunt and fishing.
- **Shops and services:** barber, tattoo parlor, gym, wardrobe suits, car wash,
  dealership, garage, law office, armor surplus and bodyguards for hire.

### Crime and money

- **Heists:** a daily bank job, The Vault (a multi-stage planned score),
  a casino heist, a train job, a roaming armored truck, jewelry and store
  robberies, and lockpicking high-end cars.
- **Empire:** gang turf wars, a property empire of legitimate businesses that
  pay out every night (upgrade them through three tiers), casino, stadium and
  Spire ownership, and a stock market.
- **Banking:** cash in hand is capped; the rest goes to the bank. Local loans
  and mission advances are available at the bank.

### Progression

XP levels unlock double-jump, web-dash and slow-motion aim. There are
achievements, rotating daily challenges, reputation tiers, 20 hidden rooftop
packages, and the **Legend** board (press **L**): finish all 16 items and the
city crowns you.

---

## Saves

- **Three save slots** on the start screen, each with export and import
  (download a slot as a file, or load one from a file) and a "restore previous
  save" option.
- Saves live in the browser's local storage under an edition-specific
  namespace (`opencity.basic.*`), so this edition never overwrites another
  edition's saves. Legacy saves are kept; automatic conversion is not
  implemented yet.
- **Everything stays on your device.** Online banking and cloud saves exist in
  the code but are switched off in this edition (`services.bank: false` in
  `js/runtime-profile.js`). See [`privacy.html`](privacy.html).

---

## Project layout

```
index.html            Start screen, HUD markup and styles; loads js/boot.js
js/boot.js            Loading screen; imports js/main.js
js/main.js            The game loop: wires every system's init/update/save
js/*.js               240 modules: one per system or activity (missions.js,
                      police.js, lifeguard.js, fireworks.js, ...)
js/propKit.js         Storefronts and street signs for activity buildings
js/mapMarkers.js      Minimap and full-map markers, icons and labels
js/runtime-profile.js This edition's settings (save keys, vehicles, graphics
                      tiers, services, presentationArt)
assets/               Approved .glb models: buildings, characters, props,
                      vehicles (collision meshes alongside)
scripts/serve.mjs     The local static server behind `npm start`
release-files.json    Every file the edition ships; the server serves only these
core-lock.json        Hashes pinning the shared core both editions run
sw.js, manifest.json  Offline cache and install-as-an-app support
privacy.html          Privacy policy
```

Most vehicles and scenery are procedural. The `.glb` models under `assets/`
are the approved exports; Blender sources and other model files are kept out of
the repository by `.gitignore`.

---

## Developing

### Adding an activity

Every activity follows the same pattern. `js/catrescue.js` or
`js/lifeguard.js` are good examples to copy.

1. Create `js/youractivity.js` exporting `initX(scene, world, save)`,
   `updateX(world, dt, keys, pressed)` and `xSave(world)`.
2. Place static sites with `placeStreetSite(world.city, pos, radius, label)`
   from `js/site-layout.js`. It moves the site off roads, out of buildings
   and away from other activities.
3. Give buildings a storefront and players a readable name with
   `storefront(...)` or `postSign(...)` from `js/propKit.js`.
4. Show prompts by setting `world.xHint`, and objectives by setting
   `world.xBlip = { x, z }`. Add a friendly name for the blip in `BLIP_LABELS`
   in `js/mapMarkers.js`.
5. Wire it into `js/main.js`: import, init, update, `...xSave(world)` in
   `saveGame()`, and the hint in the on-foot hint chain (plus the in-vehicle
   hint list if it runs from a vehicle).
6. Add the file to `release-files.json` (or the server won't serve it) and
   to `core-lock.json` (see below). Optionally list it on the start screen's
   Features tab in `index.html`.

Watch out for the shared keys:
- **E:** if an activity offers E to a driver, set `world.carActionE = true`
  that frame, or E will also start exiting the car.
- **Number keys:** if a menu uses the number keys, set
  `world.nearKiosk = true` so they don't switch weapons.
- **WASD:** avoid them for minigame controls; they move the player.

### The shared core lock

`core-lock.json` pins the files this edition shares with the other edition.
After changing a pinned file (or adding one), update its entry:

- **Per file:** `sha256` of the file contents **with LF converted to CRLF**.
- **Top-level `sha256`:** `sha256` of the `files` map serialised as compact
  JSON (`JSON.stringify(files)` with no spaces, keys in their existing sorted
  order).
- Bump `version` and describe the change in `source`.

### Checking your work

- `node --check js/*.js` catches syntax errors quickly.
- The page exposes `window.__debug` (world, player, camera, `setClock`,
  `enterCarDirect`, `boardBoat`, `openBigMap` and more) for scripted testing.
  It works well with Playwright against `npm start`.

### Local asset overrides

To test a model without adding it to the repository, point an environment
variable at it, for example
`OPEN_CITY_HATCH_ASSET=/path/to/hatch.glb npm start`. Also supported:
`OPEN_CITY_SHOWROOM_ASSET` and `OPEN_CITY_NITRO_ASSET`. For more, create
`local-assets.mjs` (git-ignored) exporting `mounts`, a map from served path to
local file.

---

## Known limitations

- **First load needs the internet:** Three.js comes from jsDelivr.
- **Missing art:** this edition ships without the loading screens, map-marker
  icons and story portraits (`presentationArt: false`). The map draws its own
  vector icons instead.
- **Untested on mobile:** the newest activities have not yet been tested with
  touch controls.
