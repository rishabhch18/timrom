# Timrom

Your time builds a home. A cozy 3D life app where every room is an activity timer, finished minutes earn coins, and friends live next door in a shared world.

## What's here

| Path | What it is |
| --- | --- |
| `timrom.html` | The whole web prototype (Three.js, GSAP, Web Audio). Open it through a local web server. |
| `models.json` | All 3D models packed as base64 GLB. The page loads this at startup. |
| `models/` | The original `.glb` model files (Kenney, CC0). |
| `Timrom_Feature_Guide.pdf` | Illustrated guide to every feature. |
| `build_pdf.py` | Script that builds the feature guide from screenshots in `shots/`. |

## Run locally

```bash
python -m http.server 8765
```

Then open http://localhost:8765/timrom.html. Opening the file directly (file://) will not load the models.

## Backend

The product and backend architecture (data model, REST API, realtime protocol, economy rules, roadmap) is in the shared doc "Timrom — Product & Backend Architecture".

## Credits

3D models by [Kenney](https://kenney.nl) (Furniture Kit, Mini Characters, Cube Pets, City Kit Suburban), CC0 1.0 public domain, via [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets).
