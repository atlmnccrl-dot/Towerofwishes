# Dinosaur sprites

Renders the Quaternius "Dinosaur Animated Pack" (CC0, `holdfast/art_source/dinos/`) into
8-direction pixel sprite sheets in `holdfast/assets/cast/dino_*.png|json`, in the same format as
the Character Creator cast (frames trimmed, anchor at the body's centre on the ground).

```sh
cd holdfast/tools/dino
npm install three@0.160.0                 # once
mkdir -p models && cp ../../art_source/dinos/*.fbx models/
NODE_PATH=$(npm root -g) node render.js ../../assets/cast        # all species
```

Headless Chromium (Playwright) renders each clip through an orthographic camera at 40 degrees,
flat-shaded with a per-species palette (the FBX colours load very dark), adds a 1 px outline and
packs the frames. Clips: Idle, Walk, Run, Attack, Die.
