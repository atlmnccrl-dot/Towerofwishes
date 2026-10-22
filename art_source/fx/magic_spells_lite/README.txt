Magic Spells VFX Lite
=====================

6 pixel art spell effects, 64x64 per frame, transparent background.
Made to pair with Magic Spells SFX: every effect has the same name as its sound.

CONTENTS
  cast            8 frames  one-shot
  impact          8 frames  one-shot
  fire_impact    11 frames  one-shot
  ice_shatter    12 frames  one-shot
  zap             8 frames  one-shot
  heal           12 frames  loop

EACH EFFECT FOLDER
  <name>_sheet.png      horizontal sprite sheet, 64x64 frames, left to right
  frames/<name>_NN.png  the same frames as single PNG files

  manifest.json lists every effect with its frame count, suggested frame
  duration in milliseconds and whether it loops.

USING THEM
  Pixel art: import with nearest-neighbour filtering (Unity: Filter Mode
  Point, Compression None; Godot: Texture Filter Nearest) and scale by whole
  numbers (2x, 3x, 4x) so the pixels stay crisp.
  Unity:     Sprite Mode Multiple, Slice > Grid By Cell Size 64x64.
  Godot:     AnimatedSprite2D > SpriteFrames > Add frames from sprite sheet,
             Horizontal = frame count, Vertical = 1.
  GameMaker: Import Strip Image, frame count from manifest.json.

HOW IT WAS MADE
  Every frame is computed by code written for this pack: particles, fields and
  shapes quantised to a small palette. No AI, no traced or third-party art.

LICENSE
  Free for commercial use, royalty free, no attribution required. Reselling or
  redistributing the files as an asset pack is not permitted. Full terms in
  LICENSE.txt
