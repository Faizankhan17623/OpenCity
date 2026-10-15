# Open City Basic

Version 0.1.0: edition foundation. The visual makeover and resolution presets are still in development.

Run with Node.js 20 or newer: `npm start`. No npm dependencies are required. Three.js 0.170.0 loads from jsDelivr; an internet connection is needed on first load.

Most vehicles and scenery are procedural. A small set of approved exported models (buildings, characters, props and vehicles) ships as `.glb` files under `assets/`; Blender source files are not included.

WASD moves, E enters/exits vehicles, Shift runs, P pauses. Fuel is per vehicle; hold E while stopped beside a petrol pump to refill at $2/L.

Saves use an edition-specific namespace. Existing legacy saves are retained; automatic conversion is not implemented yet. Banking remains local; no account backend is bundled.
